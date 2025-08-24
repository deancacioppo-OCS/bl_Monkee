
export interface WordPressCredentials {
  url: string;
  username: string;
  appPassword?: string;
}

export interface Client {
  id: string;
  name: string;
  industry: string;
  websiteUrl: string;
  uniqueValueProp: string;
  brandVoice: string;
  contentStrategy: string;
  wp: WordPressCredentials;
  sitemapUrl?: string;
  sitemapUrls?: string[];
}

export interface BlogPost {
  title: string;
  angle: string;
  keywords: string[];
  outline: string;
  content: string; // HTML content
  featuredImageBase64: string; // base64 string of the image
}
