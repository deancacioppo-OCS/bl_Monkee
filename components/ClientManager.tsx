
import React, { useState } from 'react';
import { Client } from '../types';
import ClientForm from './ClientForm';
import { Button } from './ui/Button';
import { PlusIcon } from './icons/PlusIcon';
import { EditIcon } from './icons/EditIcon';
import { TrashIcon } from './icons/TrashIcon';

interface ClientManagerProps {
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  selectedClientId: string | null;
  onSelectClient: (clientId: string | null) => void;
  isGenerating: boolean;
}

const ClientManager: React.FC<ClientManagerProps> = ({ clients, setClients, selectedClientId, onSelectClient, isGenerating }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const handleSaveClient = (client: Client, sitemapUrls: string[]) => {
    const clientToSave: Client = {
      ...client,
      sitemapUrls: sitemapUrls,
    };
    setClients(prev => {
      const existing = prev.find(c => c.id === clientToSave.id);
      if (existing) {
        return prev.map(c => c.id === clientToSave.id ? clientToSave : c);
      }
      return [...prev, clientToSave];
    });
    // If this is the first client, select it
    if(clients.length === 0) {
      onSelectClient(client.id);
    }
  };

  const handleDeleteClient = (clientId: string) => {
    if (window.confirm('Are you sure you want to delete this client? This cannot be undone.')) {
      setClients(prev => prev.filter(c => c.id !== clientId));
      if (selectedClientId === clientId) {
        onSelectClient(null);
      }
    }
  };

  const openFormForEdit = (client: Client) => {
    setEditingClient(client);
    setIsFormOpen(true);
  };

  const openFormForNew = () => {
    setEditingClient(null);
    setIsFormOpen(true);
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-slate-300">Clients</h2>
        <Button onClick={openFormForNew} disabled={isGenerating}>
          <PlusIcon className="w-4 h-4" />
          New
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-2">
        {clients.length > 0 ? clients.map(client => (
          <div
            key={client.id}
            onClick={() => !isGenerating && onSelectClient(client.id)}
            className={`p-3 rounded-lg border-2 cursor-pointer transition-colors duration-200 ${
              selectedClientId === client.id 
                ? 'bg-indigo-600/20 border-indigo-500' 
                : 'bg-slate-700/50 border-transparent hover:border-slate-600'
            } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-slate-100">{client.name}</h3>
                <p className="text-sm text-slate-400">{client.industry}</p>
              </div>
              <div className="flex gap-2 items-center">
                <button onClick={(e) => { e.stopPropagation(); openFormForEdit(client); }} className="p-1 text-slate-400 hover:text-white" disabled={isGenerating}><EditIcon className="w-4 h-4" /></button>
                <button onClick={(e) => { e.stopPropagation(); handleDeleteClient(client.id); }} className="p-1 text-red-400 hover:text-red-300" disabled={isGenerating}><TrashIcon className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        )) : (
            <div className="text-center py-10 px-4">
                <p className="text-slate-500">No clients found. Add one to get started.</p>
            </div>
        )}
      </div>

      <ClientForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveClient}
        existingClient={editingClient}
      />
    </div>
  );
};

export default ClientManager;
