import { useState } from 'react';
import { WordPressCredentials, BlogPost } from '../types';

// This is a placeholder. In a real app, you'd use a library or a more robust fetch call.
// Note: This is a simplified example and does not handle all edge cases.
// It also assumes you are running this in a secure client-side environment
// where exposing API details is not a concern. For a production app,
// these calls should be made from a backend server.

async function mockPublish(credentials: WordPressCredentials, post: BlogPost): Promise<any> {
    console.log("Attempting to publish to:", credentials.url);
    console.log("With post:", post.title);

    // Basic validation
    if (!credentials.url || !credentials.username || !credentials.appPassword) {
        throw new Error("Missing WordPress URL, username, or application password.");
    }
    
    // This is a mock. It will always succeed after a short delay.
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log("Mock publish successful!");

    return {
        id: Date.now(),
        title: { rendered: post.title },
        content: { rendered: post.content },
        link: `${credentials.url}/mock-post-${Date.now()}`,
        status: 'publish'
    };
}


export const useWordPress = (credentials: WordPressCredentials) => {
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishedPost, setPublishedPost] = useState<any | null>(null);

  const publish = async (post: BlogPost) => {
    setIsPublishing(true);
    setError(null);
    setPublishedPost(null);

    try {
      // In a real app, you would make an API call to your backend,
      // which would then securely connect to the WordPress REST API.
      // We are mocking this call for demonstration purposes.
      const result = await mockPublish(credentials, post);
      setPublishedPost(result);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'An unknown error occurred';
      setError(errorMsg);
    } finally {
      setIsPublishing(false);
    }
  };

  return { publish, isPublishing, error, publishedPost };
};