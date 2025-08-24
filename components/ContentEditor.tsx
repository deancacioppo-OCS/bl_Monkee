
import React, { useState } from 'react';
import { Client, BlogPost } from '../types';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { publishToWordPress } from '../services/wordpressService';
import { LoaderIcon } from './icons/LoaderIcon';
import { WordPressIcon } from './icons/WordPressIcon';

interface ContentEditorProps {
  client: Client;
  blogPost: BlogPost;
  setBlogPost: React.Dispatch<React.SetStateAction<BlogPost | null>>;
  onBack: () => void;
}

const ContentEditor: React.FC<ContentEditorProps> = ({ client, blogPost, setBlogPost, onBack }) => {
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState<'draft' | 'publish' | null>(null);

  const handlePublish = async (status: 'draft' | 'publish') => {
    if (!client.wp.url || !client.wp.username || !client.wp.appPassword) {
      alert("WordPress credentials are not configured for this client. Please edit the client profile.");
      return;
    }
    
    setIsPublishing(true);
    setPublishStatus(status);
    try {
      const postUrl = await publishToWordPress(client, blogPost, status);
      alert(`Successfully published to WordPress as a ${status}!\nURL: ${postUrl}`);
      onBack();


    } catch (error) {
      console.error("Failed to publish to WordPress:", error);
      alert(`Failed to publish: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsPublishing(false);
      setPublishStatus(null);
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBlogPost(prev => prev ? { ...prev, content: e.target.value } : null);
  };
  
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     setBlogPost(prev => prev ? { ...prev, title: e.target.value } : null);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-900">
      <header className="bg-slate-800/80 p-4 border-b border-slate-700 flex justify-between items-center z-10">
        <div>
          <button onClick={onBack} className="text-sm text-indigo-400 hover:underline">&larr; Back to Workflow</button>
          <h2 className="text-xl font-bold text-slate-100 mt-1">Review & Publish</h2>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => handlePublish('draft')} variant="secondary" disabled={isPublishing}>
            {isPublishing && publishStatus === 'draft' ? <LoaderIcon className="w-4 h-4" /> : <WordPressIcon className="w-4 h-4" />}
            Post as Draft
          </Button>
          <Button onClick={() => handlePublish('publish')} disabled={isPublishing}>
            {isPublishing && publishStatus === 'publish' ? <LoaderIcon className="w-4 h-4" /> : <WordPressIcon className="w-4 h-4" />}
            Publish to WordPress
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 p-6 overflow-y-auto">
            <input 
                type="text" 
                value={blogPost.title}
                onChange={handleTitleChange}
                className="text-3xl font-bold bg-transparent w-full focus:outline-none mb-4 p-2 rounded hover:bg-slate-800 focus:bg-slate-800"
            />
          <textarea
            value={blogPost.content}
            onChange={handleContentChange}
            className="w-full h-[calc(100vh-250px)] bg-transparent text-slate-300 focus:outline-none resize-none leading-relaxed p-2 rounded hover:bg-slate-800 focus:bg-slate-800"
          />
        </main>

        <aside className="w-1/3 max-w-md p-6 bg-slate-800/50 border-l border-slate-700 overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4">Post Details</h3>
          <Card className="mb-4">
            <h4 className="font-semibold text-slate-300 mb-2">Featured Image</h4>
            <img src={`data:image/jpeg;base64,${blogPost.featuredImageBase64}`} alt="Featured" className="rounded-md" />
          </Card>
          <Card className="mb-4">
            <h4 className="font-semibold text-slate-300 mb-2">Angle</h4>
            <p className="text-sm text-slate-400">{blogPost.angle}</p>
          </Card>
          <Card>
            <h4 className="font-semibold text-slate-300 mb-2">Keywords</h4>
            <div className="flex flex-wrap gap-2">
              {blogPost.keywords.map((kw, i) => (
                <span key={i} className="bg-slate-700 text-slate-300 text-xs font-medium px-2.5 py-1 rounded-full">{kw}</span>
              ))}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
};

export default ContentEditor;
