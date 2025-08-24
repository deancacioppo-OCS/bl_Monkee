
import React, { useState } from 'react';
import { Client, BlogPost } from '../types';
import { generateFullBlog } from '../services/geminiService';
import { Button } from './ui/Button';
import { LoaderIcon } from './icons/LoaderIcon';
import { Card } from './ui/Card';

interface GenerationWorkflowProps {
  client: Client;
  onGenerationStart: () => void;
  onGenerationComplete: (post: BlogPost) => void;
}

const GenerationWorkflow: React.FC<GenerationWorkflowProps> = ({ client, onGenerationStart, onGenerationComplete }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);
  
  const handleGenerate = async () => {
    setIsLoading(true);
    onGenerationStart();
    setProgress([]);
    try {
      const blogPost = await generateFullBlog(client, (message) => {
        setProgress(prev => [...prev, message]);
      });
      onGenerationComplete(blogPost);
    } catch (error) {
      console.error("Generation failed:", error);
      alert(`An error occurred during content generation: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const progressSteps = [
      "Finding trending topic...",
      "Generating title, angle, and keywords...",
      "Creating blog post outline...",
      "Writing full blog post content...",
      "Generating featured image...",
      "Finalizing post..."
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-900 overflow-y-auto">
        <Card className="w-full max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-slate-100">Generate New Blog Post</h2>
            <p className="text-slate-400 mt-2 mb-6">Create a new blog post for <span className="font-semibold text-indigo-400">{client.name}</span> based on their profile and industry trends.</p>

            {!isLoading ? (
                <Button onClick={handleGenerate} size="lg">
                    Generate New Blog
                </Button>
            ) : (
                <div className="mt-6 w-full">
                    <LoaderIcon className="w-8 h-8 mx-auto text-indigo-400 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-200">Generating...</h3>
                    <div className="text-left mt-4 space-y-2 max-w-md mx-auto">
                        {progressSteps.map((step, index) => (
                           <div key={step} className={`flex items-center gap-3 transition-opacity duration-500 ${index < progress.length ? 'opacity-100' : 'opacity-40'}`}>
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${index < progress.length -1 ? 'bg-green-500' : 'bg-slate-600'}`}>
                                    {index < progress.length -1 ? 
                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg> :
                                        (index === progress.length -1 && <LoaderIcon className="w-3 h-3" />)
                                    }
                                </div>
                                <span className="text-slate-300">{progress[index] || step}</span>
                           </div>
                        ))}
                    </div>
                </div>
            )}
        </Card>
    </div>
  );
};

export default GenerationWorkflow;
