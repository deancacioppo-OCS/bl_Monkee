
import { Client, BlogPost } from '../types';

async function uploadFeaturedImage(client: Client, blogPost: BlogPost): Promise<{ mediaId: number; mediaUrl: string }> {
  const { wp } = client;
  const endpoint = `${wp.url.replace(/\/$/, '')}/wp-json/wp/v2/media`;
  
  const imageBlob = await (await fetch(`data:image/jpeg;base64,${blogPost.featuredImageBase64}`)).blob();

  const formData = new FormData();
  formData.append('file', imageBlob, `${blogPost.title.replace(/\s+/g, '-').toLowerCase()}-featured.jpg`);
  formData.append('title', blogPost.title);
  formData.append('alt_text', `Featured image for blog post titled: ${blogPost.title}`);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${wp.username}:${wp.appPassword}`)}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(`Failed to upload image: ${response.status} ${response.statusText} - ${errorData.message}`);
  }

  const data = await response.json();
  return { mediaId: data.id, mediaUrl: data.source_url };
}

export async function publishToWordPress(client: Client, blogPost: BlogPost, status: 'publish' | 'draft'): Promise<string> {
  // Step 1: Upload the featured image
  const { mediaId } = await uploadFeaturedImage(client, blogPost);

  // Step 2: Create the post
  const { wp } = client;
  const endpoint = `${wp.url.replace(/\/$/, '')}/wp-json/wp/v2/posts`;
  
  const postData = {
    title: blogPost.title,
    content: blogPost.content,
    status: status,
    featured_media: mediaId,
    meta: {
      seo_keywords: blogPost.keywords.join(', '),
    },
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${btoa(`${wp.username}:${wp.appPassword}`)}`,
    },
    body: JSON.stringify(postData),
  });

  if (!response.ok) {
     const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
     throw new Error(`Failed to create post: ${response.status} ${response.statusText} - ${errorData.message}`);
  }

  const data = await response.json();
  return data.link;
}
