
import React, { useState, useEffect, useMemo } from 'react';
import { Client, BlogPost } from './types';
import { buildApiUrl, API_CONFIG } from './config/api';
import ClientManager from './components/ClientManager';
import GenerationWorkflow from './components/GenerationWorkflow';
import ContentEditor from './components/ContentEditor';




import { BrainCircuitIcon } from './components/icons/BrainCircuitIcon';

export default function App(): React.ReactNode {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [currentBlogPost, setCurrentBlogPost] = useState<BlogPost | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load clients from backend on app start
  useEffect(() => {
    const loadClients = async () => {
      try {
        const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.CLIENTS));
        if (response.ok) {
          const backendClients = await response.json();
          
          // Load sitemap URLs for each client
          const clientsWithSitemaps = await Promise.all(
            backendClients.map(async (client: Client) => {
              try {
                const sitemapResponse = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.CLIENT_SITEMAP(client.id)));
                if (sitemapResponse.ok) {
                  const sitemapUrls = await sitemapResponse.json();
                  return { ...client, sitemapUrls };
                }
                return client;
              } catch (error) {
                console.error(`Error loading sitemap for client ${client.id}:`, error);
                return client;
              }
            })
          );
          
          setClients(clientsWithSitemaps);
        }
      } catch (error) {
        console.error('Error loading clients:', error);
        // Fall back to empty array on error
        setClients([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadClients();
  }, []);

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

  if (isLoading) {
    return (
      <div className="flex h-screen font-sans bg-slate-900 text-slate-200 items-center justify-center">
        <div className="text-center">
          <BrainCircuitIcon className="w-16 h-16 text-indigo-400 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-400">Loading clients...</p>
        </div>
      </div>
    );
  }

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
