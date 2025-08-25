const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const winston = require('winston');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Configure Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Create a new PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Function to create tables if they don't exist
const createTables = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS used_topics (
        id SERIAL PRIMARY KEY,
        client_id TEXT NOT NULL,
        topic TEXT NOT NULL
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS sitemap_urls (
        id SERIAL PRIMARY KEY,
        client_id TEXT NOT NULL,
        url TEXT NOT NULL
      )
    `);
    logger.info('Tables created or already exist.');
  } catch (err) {
    logger.error('Error creating tables:', err);
  } finally {
    client.release();
  }
};

// Call the function to create tables when the server starts
createTables();

// Function to crawl a website and extract URLs
async function crawlWebsite(url) {
  const crawledUrls = new Set();
  const queue = [url];
  const baseUrl = new URL(url).origin;

  while (queue.length > 0) {
    const currentUrl = queue.shift();
    if (crawledUrls.has(currentUrl)) {
      continue;
    }

    try {
      const response = await fetch(currentUrl);
      if (!response.ok) {
        continue;
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('text/html')) {
        continue;
      }

      crawledUrls.add(currentUrl);

      const html = await response.text();
      const $ = cheerio.load(html);

      $('a').each((i, link) => {
        const href = $(link).attr('href');
        if (href) {
          const absoluteUrl = new URL(href, baseUrl).href;
          if (absoluteUrl.startsWith(baseUrl) && !crawledUrls.has(absoluteUrl)) {
            queue.push(absoluteUrl);
          }
        }
      });
    } catch (error) {
      logger.error(`Error crawling ${currentUrl}: ${error.message}`);
    }
  }

  return crawledUrls;
}

app.get('/api/clients/:clientId/used-topics', async (req, res, next) => {
  const { clientId } = req.params;
  logger.info(`Fetching used topics for client: ${clientId}`);
  try {
    const { rows } = await pool.query('SELECT topic FROM used_topics WHERE client_id = $1', [clientId]);
    logger.info(`Successfully fetched ${rows.length} used topics for client: ${clientId}`);
    res.json(rows.map(row => row.topic));
  } catch (err) {
    logger.error(`Error fetching used topics for client ${clientId}: ${err.message}`);
    next(err);
  }
});

app.post('/api/clients/:clientId/used-topics', async (req, res, next) => {
  const { clientId } = req.params;
  const { topic } = req.body;
  logger.info(`Attempting to add used topic "${topic}" for client: ${clientId}`);
  try {
    const { rows } = await pool.query('INSERT INTO used_topics (client_id, topic) VALUES ($1, $2) RETURNING id', [clientId, topic]);
    logger.info(`Successfully added used topic "${topic}" for client ${clientId} with ID: ${rows[0].id}`);
    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    logger.error(`Error adding used topic "${topic}" for client ${clientId}: ${err.message}`);
    next(err);
  }
});

app.get('/api/clients/:clientId/sitemap-urls', async (req, res, next) => {
  const { clientId } = req.params;
  logger.info(`Fetching sitemap URLs for client: ${clientId}`);
  try {
    const { rows } = await pool.query('SELECT url FROM sitemap_urls WHERE client_id = $1', [clientId]);
    logger.info(`Successfully fetched ${rows.length} sitemap URLs for client ${clientId}`);
    res.json(rows.map(row => row.url));
  } catch (err) {
    logger.error(`Error fetching sitemap URLs for client ${clientId}: ${err.message}`);
    next(err);
  }
});

app.post('/api/clients/:clientId/sitemap-urls', async (req, res, next) => {
  const { clientId } = req.params;
  const { url } = req.body;
  logger.info(`Attempting to add sitemap URL "${url}" for client: ${clientId}`);
  try {
    const { rows } = await pool.query('INSERT INTO sitemap_urls (client_id, url) VALUES ($1, $2) RETURNING id', [clientId, url]);
    logger.info(`Successfully added sitemap URL "${url}" for client ${clientId} with ID: ${rows[0].id}`);
    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    logger.error(`Error adding sitemap URL "${url}" for client ${clientId}: ${err.message}`);
    next(err);
  }
});

// Sitemap Proxy Endpoint
app.get('/api/sitemap-proxy', async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'Sitemap URL is required.' });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch sitemap from ${url}: ${response.statusText}`);
    }
    const sitemapContent = await response.text();
    res.set('Content-Type', 'application/xml');
    res.send(sitemapContent);
  } catch (error) {
    logger.error(`Error proxying sitemap from ${url}: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch sitemap.', details: error.message });
  }
});

// Crawl Endpoint
app.get('/api/crawl', async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required.' });
  }

  try {
    const crawledUrls = await crawlWebsite(url);
    res.json(Array.from(crawledUrls));
  } catch (error) {
    logger.error(`Error crawling website from ${url}: ${error.message}`);
    res.status(500).json({ error: 'Failed to crawl website.', details: error.message });
  }
});

// Gemini Proxy Endpoint
app.post('/api/gemini-proxy', async (req, res) => {
  const GEMINI_API_KEY_BACKEND = process.env.GEMINI_API_KEY_BACKEND;
  if (!GEMINI_API_KEY_BACKEND) {
    logger.error('GEMINI_API_KEY_BACKEND environment variable not set on backend.');
    return res.status(500).json({ error: 'Server-side Gemini API key not configured.' });
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY_BACKEND);
  const { model, contents, config } = req.body;

  try {
    // Check if this is an image generation request
    if (config.isImageGeneration) {
      const aiModel = genAI.getGenerativeModel({ model: model });
      const result = await aiModel.generateImages({
        prompt: contents,
        ...config
      });
      
      if (result.generatedImages && result.generatedImages.length > 0) {
        const imageBytes = result.generatedImages[0].image.imageBytes;
        res.json({ 
          imageBytes: imageBytes,
          success: true 
        });
      } else {
        throw new Error("Image generation failed to produce an image.");
      }
    } else {
      // Handle text generation - Fix the content format
      const aiModel = genAI.getGenerativeModel({ model: model });
      
      // Ensure contents is properly formatted for Gemini API
      const formattedContents = Array.isArray(contents) ? contents : [{ text: contents }];
      
      const result = await aiModel.generateContent({ 
        contents: formattedContents, 
        ...config 
      });
      const response = await result.response;
      
      // Extract the text content from the response
      const text = response.text();
      res.json({ text: text });
    }
  } catch (error) {
    logger.error(`Error calling Gemini API via proxy: ${error.message}`, { stack: error.stack });
    res.status(500).json({ error: 'Failed to call Gemini API.', details: error.message });
  }
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack, path: req.path, method: req.method, ip: req.ip });
  res.status(500).json({ error: 'An unexpected error occurred.' });
});

app.listen(port, () => {
  logger.info(`Server is running on http://localhost:${port}`);
});
