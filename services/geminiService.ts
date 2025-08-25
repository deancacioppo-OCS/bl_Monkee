import { Client, BlogPost } from "../types";

import { buildApiUrl, API_CONFIG } from '../config/api';

// Helper function to call the backend Gemini proxy
async function callGeminiProxy(model: string, contents: string, config: any = {}): Promise<any> {
  try {
    const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.GEMINI_PROXY), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        contents,
        config
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(`Backend proxy error: ${response.status} ${response.statusText} - ${errorData.message}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error calling Gemini proxy:', error);
    throw new Error(`Failed to call Gemini API via proxy: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Helper function to call the backend Gemini proxy for image generation
async function callGeminiImageProxy(model: string, prompt: string, config: any = {}): Promise<string> {
  try {
    const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.GEMINI_PROXY), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        contents: prompt,
        config: {
          ...config,
          isImageGeneration: true
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(`Backend proxy error: ${response.status} ${response.statusText} - ${errorData.message}`);
    }

    const result = await response.json();
    return result.imageBytes || result.text; // Handle both image and text responses
  } catch (error) {
    console.error('Error calling Gemini image proxy:', error);
    throw new Error(`Failed to call Gemini Image API via proxy: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function findTrendingTopic(client: Client): Promise<string> {
  const prompt = `
    // Client ID: ${client.id}
    Using Google Search, find one current and highly relevant trending topic, news story, or popular question related to the '${client.industry}' industry. Provide only the topic name or headline.
  `;
  
  const response = await callGeminiProxy("gemini-2.5-flash", prompt, { 
    tools: [{googleSearch: {}}] 
  });
  
  return response.text.trim();
}

const blogDetailsSchema = {
  type: "object",
  properties: {
    title: { type: "string", description: "A compelling, SEO-friendly blog post title." },
    angle: { type: "string", description: "A unique angle or perspective for the article." },
    keywords: {
      type: "array",
      items: { type: "string" },
      description: "A list of 5-7 relevant SEO keywords."
    },
  },
  required: ["title", "angle", "keywords"],
};

async function generateBlogDetails(client: Client, topic: string): Promise<{ title: string; angle: string; keywords: string[] }> {
  const prompt = `
    // Client ID: ${client.id}
    You are an expert content strategist for a company in the '${client.industry}' industry.
    Company's unique value proposition: '${client.uniqueValueProp}'
    Company's brand voice: '${client.brandVoice}'
    Company's content strategy: '${client.contentStrategy}'
    We want to write a blog post about the following topic: '${topic}'

    Please generate a compelling, SEO-friendly blog post title, a unique angle for the article, and a list of 5-7 relevant SEO keywords.
  `;

  const response = await callGeminiProxy("gemini-2.5-flash", prompt, {
    responseMimeType: "application/json",
    responseSchema: blogDetailsSchema,
  });
  
  const jsonResponse = JSON.parse(response.text);
  return jsonResponse;
}

async function generateOutline(title: string, angle: string): Promise<string> {
  const prompt = `
    Based on the following title and angle, create a detailed blog post outline.
    Title: '${title}'
    Angle: '${angle}'

    The outline should have a clear hierarchical structure with H2 and H3 headings. Include an introduction and a conclusion. The blog title itself will be the H1, so do not include it in the outline. Output only the outline.
  `;
  
  const response = await callGeminiProxy("gemini-2.5-flash", prompt);
  return response.text.trim();
}

async function generateFullContent(title: string, outline: string, client: Client): Promise<string> {
  const prompt = `
    // Client ID: ${client.id}
    Write a complete blog post in HTML format based on the provided title and outline.
    Title (H1): '${title}'
    Outline:
    ${outline}

    Follow these instructions:
    - Adhere to the client's content strategy: '${client.contentStrategy}'.
    - Elaborate on each point in the outline. Use <p> tags for paragraphs.
    - Use <h2> and <h3> tags exactly as specified in the outline.
    - Do NOT include the H1 title in the generated content; it will be added separately.
    - Write in the following brand voice: '${client.brandVoice}'.
    - Naturally incorporate the company's unique value proposition where relevant: '${client.uniqueValueProp}'.
    - Ensure the tone is confident and expert. Avoid apologetic language or AI self-references.
    - The content must be original and engaging.
    - **IMPORTANT:** Include external HTML hyperlinks to relevant, high-authority referencing material where appropriate.
    - **CRITICAL:** Include between 4 and 8 internal HTML hyperlinks to relevant pages/blogs on the client's website. These links MUST be contextually relevant and naturally integrated into the content. Select these links from the following list of URLs:
      ${client.sitemapUrls && client.sitemapUrls.length > 0 ? client.sitemapUrls.join('\n') : 'No sitemap URLs available.'}
  `;
  
  const response = await callGeminiProxy("gemini-2.5-flash", prompt);
  let content = response.text.trim().replace(/^```html|```$/g, '').trim();

  const headings = content.match(/<h[23]>(.*?)<\/h[23]>/g) || [];
  let imageCount = 0;

  for (const heading of headings) {
    if (imageCount >= 2) break;

    const headingText = heading.replace(/<\/?h[23]>/g, '');
    try {
      const imageBase64 = await generateInBodyImage(headingText);
      const imageTag = `<img src="data:image/jpeg;base64,${imageBase64}" alt="${headingText}" />`;
      content = content.replace(heading, `${heading}\n${imageTag}`);
      imageCount++;
    } catch (error) {
      console.error(`Failed to generate image for heading: ${headingText}`, error);
    }
  }

  const faqSection = await generateFaqSection(title, content);
  content += faqSection;

  return content;
}

const faqSchema = {
  type: "object",
  properties: {
    faqs: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string", description: "A frequently asked question related to the blog post." },
          answer: { type: "string", description: "The answer to the question." },
        },
        required: ["question", "answer"],
      },
    },
  },
  required: ["faqs"],
};

async function generateFaqSection(title: string, content: string): Promise<string> {
  const prompt = `
    Based on the following blog post title and content, generate a list of at least 3 frequently asked questions (FAQs) with their answers.

    Title: ${title}

    Content:
    ${content.substring(0, 2000)}...

    Return the FAQs in a JSON object that conforms to the provided schema.
  `;

  const response = await callGeminiProxy("gemini-2.5-flash", prompt, {
    responseMimeType: "application/json",
    responseSchema: faqSchema,
  });

  const { faqs } = JSON.parse(response.text);

  const faqPageSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map((faq: { question: string; answer: string }) => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  let html = `
    <div class="faq-section">
      <h2>Frequently Asked Questions</h2>
  `;

  faqs.forEach((faq: { question: string; answer: string }) => {
    html += `
      <h3>${faq.question}</h3>
      <p>${faq.answer}</p>
    `;
  });

  html += `
    </div>
    <script type="application/ld+json">
      ${JSON.stringify(faqPageSchema)}
    </script>
  `;

  return html;
}

async function generateInBodyImage(prompt: string): Promise<string> {
  const fullPrompt = `${prompt}. A cinematic, photorealistic, high-quality image, no text or words on the image.`;
  
  const response = await callGeminiImageProxy("imagen-3.0-generate-002", fullPrompt, {
    numberOfImages: 1,
    aspectRatio: "16:9",
    outputMimeType: 'image/jpeg',
  });
  
  return response;
}

async function generateFeaturedImage(title: string, angle: string): Promise<string> {
  const prompt = `${title}. ${angle}. A cinematic, photorealistic, high-quality image, no text or words on the image.`;
  
  const response = await callGeminiImageProxy("imagen-3.0-generate-002", prompt, {
    numberOfImages: 1,
    aspectRatio: "16:9",
    outputMimeType: 'image/jpeg',
  });
  
  return response;
}

export async function generateFullBlog(client: Client, updateProgress: (message: string) => void): Promise<BlogPost> {
  updateProgress("Finding trending topic...");
  const topic = await findTrendingTopic(client);

  updateProgress(`Generating title, angle, and keywords for: "${topic}"`);
  const { title, angle, keywords } = await generateBlogDetails(client, topic);

  updateProgress("Creating blog post outline...");
  const outline = await generateOutline(title, angle);

  updateProgress("Writing full blog post content...");
  const content = await generateFullContent(title, outline, client);

  updateProgress("Generating featured image...");
  const featuredImageBase64 = await generateFeaturedImage(title, angle);
  
  updateProgress("Finalizing post...");

  return { title, angle, keywords, outline, content, featuredImageBase64 };
}