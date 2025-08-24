
import React, { useState, useMemo } from 'react';
import { Client, BlogPost } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import ClientManager from './components/ClientManager';
import GenerationWorkflow from './components/GenerationWorkflow';
import ContentEditor from './components/ContentEditor';




import { BrainCircuitIcon } from './components/icons/BrainCircuitIcon';

export default function App(): React.ReactNode {
  const [clients, setClients] = useLocalStorage<Client[]>('blog-monkee-clients', []);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [currentBlogPost, setCurrentBlogPost] = useState<BlogPost | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const selectedClient = useMemo(() => {
    return clients.find(c => c.id === selectedClientId) ?? null;
  }, [clients, selectedClientId]);

  const handleSelectClient = (clientId: string | null) => {
    setSelectedClientId(clientId);
    setCurrentBlogPost(null);
  };
  
  const resetToWorkflow = () => {
    setCurrentBlogPost(null);
  };

  return (
    <div className="flex h-screen font-sans bg-slate-900 text-slate-200">
      <aside className="w-1/4 max-w-sm h-full bg-slate-800/50 border-r border-slate-700 p-4 flex flex-col">
        <div className="flex items-center gap-3 mb-6">
            <BrainCircuitIcon className="w-8 h-8 text-indigo-400" />
            <h1 className="text-xl font-bold text-slate-100">Blog MONKEE</h1>
        </div>
        <ClientManager
          clients={clients}
          setClients={setClients}
          selectedClientId={selectedClientId}
          onSelectClient={handleSelectClient}
          isGenerating={isGenerating}
        />
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        {selectedClient ? (
          currentBlogPost ? (
            <ContentEditor
              client={selectedClient}
              blogPost={currentBlogPost}
              setBlogPost={setCurrentBlogPost}
              onBack={resetToWorkflow}
            />
          ) : (
            <GenerationWorkflow
              client={selectedClient}
              onGenerationStart={() => setIsGenerating(true)}
              onGenerationComplete={(post) => {
                setCurrentBlogPost(post);
                setIsGenerating(false);
              }}
            />
          )
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <BrainCircuitIcon className="w-24 h-24 text-slate-700 mb-4" />
            <h2 className="text-2xl font-bold text-slate-400">Welcome to Blog MONKEE</h2>
            <p className="text-slate-500 mt-2">Please select a client from the sidebar, or add a new one to begin.</p>
          </div>
        )}
      </main>
    </div>
  );
}
