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
      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        industry TEXT NOT NULL,
        website_url TEXT,
        unique_value_prop TEXT,
        brand_voice TEXT,
        content_strategy TEXT,
        wp_url TEXT,
        wp_username TEXT,
        wp_app_password TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS sitemap_urls (
        id SERIAL PRIMARY KEY,
        client_id TEXT NOT NULL,
        url TEXT NOT NULL,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
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

// CLIENT MANAGEMENT ENDPOINTS

// Get all clients
app.get('/api/clients', async (req, res, next) => {
  logger.info('Fetching all clients');
  try {
    const { rows } = await pool.query('SELECT * FROM clients ORDER BY created_at DESC');
    const clients = rows.map(row => ({
      id: row.id,
      name: row.name,
      industry: row.industry,
      websiteUrl: row.website_url,
      uniqueValueProp: row.unique_value_prop,
      brandVoice: row.brand_voice,
      contentStrategy: row.content_strategy,
      wp: {
        url: row.wp_url,
        username: row.wp_username,
        appPassword: row.wp_app_password
      }
    }));
    logger.info(`Successfully fetched ${clients.length} clients`);
    res.json(clients);
  } catch (err) {
    logger.error(`Error fetching clients: ${err.message}`);
    next(err);
  }
});

// Get single client by ID
app.get('/api/clients/:clientId', async (req, res, next) => {
  const { clientId } = req.params;
  logger.info(`Fetching client: ${clientId}`);
  try {
    const { rows } = await pool.query('SELECT * FROM clients WHERE id = $1', [clientId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    const row = rows[0];
    const client = {
      id: row.id,
      name: row.name,
      industry: row.industry,
      websiteUrl: row.website_url,
      uniqueValueProp: row.unique_value_prop,
      brandVoice: row.brand_voice,
      contentStrategy: row.content_strategy,
      wp: {
        url: row.wp_url,
        username: row.wp_username,
        appPassword: row.wp_app_password
      }
    };
    logger.info(`Successfully fetched client: ${clientId}`);
    res.json(client);
  } catch (err) {
    logger.error(`Error fetching client ${clientId}: ${err.message}`);
    next(err);
  }
});

// Create new client
app.post('/api/clients', async (req, res, next) => {
  const { id, name, industry, websiteUrl, uniqueValueProp, brandVoice, contentStrategy, wp } = req.body;
  logger.info(`Creating new client: ${name}`);
  try {
    const { rows } = await pool.query(
      `INSERT INTO clients (id, name, industry, website_url, unique_value_prop, brand_voice, content_strategy, wp_url, wp_username, wp_app_password) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
       RETURNING id`,
      [id, name, industry, websiteUrl, uniqueValueProp, brandVoice, contentStrategy, wp?.url, wp?.username, wp?.appPassword]
    );
    logger.info(`Successfully created client: ${name} with ID: ${rows[0].id}`);
    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    logger.error(`Error creating client ${name}: ${err.message}`);
    next(err);
  }
});

// Update client
app.put('/api/clients/:clientId', async (req, res, next) => {
  const { clientId } = req.params;
  const { name, industry, websiteUrl, uniqueValueProp, brandVoice, contentStrategy, wp } = req.body;
  logger.info(`Updating client: ${clientId}`);
  try {
    const { rows } = await pool.query(
      `UPDATE clients SET 
       name = $1, industry = $2, website_url = $3, unique_value_prop = $4, 
       brand_voice = $5, content_strategy = $6, wp_url = $7, wp_username = $8, wp_app_password = $9,
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 
       RETURNING id`,
      [name, industry, websiteUrl, uniqueValueProp, brandVoice, contentStrategy, wp?.url, wp?.username, wp?.appPassword, clientId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    logger.info(`Successfully updated client: ${clientId}`);
    res.json({ id: rows[0].id });
  } catch (err) {
    logger.error(`Error updating client ${clientId}: ${err.message}`);
    next(err);
  }
});

// Delete client
app.delete('/api/clients/:clientId', async (req, res, next) => {
  const { clientId } = req.params;
  logger.info(`Deleting client: ${clientId}`);
  try {
    const { rows } = await pool.query('DELETE FROM clients WHERE id = $1 RETURNING id', [clientId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    logger.info(`Successfully deleted client: ${clientId}`);
    res.json({ message: 'Client deleted successfully' });
  } catch (err) {
    logger.error(`Error deleting client ${clientId}: ${err.message}`);
    next(err);
  }
});

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
      
      // Extract the text content from the response and send it in the format frontend expects
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
