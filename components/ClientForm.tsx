import React, { useState, useEffect } from 'react';
import { Client } from '../types';
import { buildApiUrl, API_CONFIG } from '../config/api';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { Button } from './ui/Button';

interface ClientFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (client: Client, sitemapUrls: string[]) => void;
  existingClient: Client | null;
}

const ClientForm: React.FC<ClientFormProps> = ({ isOpen, onClose, onSave, existingClient }) => {
  const [formData, setFormData] = useState<Omit<Client, 'id'>>({
    name: '',
    industry: '',
    websiteUrl: '',
    uniqueValueProp: '',
    brandVoice: '',
    contentStrategy: '',
    wp: { url: '', username: '', appPassword: '' },
  });
  const [sitemapUrls, setSitemapUrls] = useState<string[]>([]);
  const [isCrawling, setIsCrawling] = useState(false);

  useEffect(() => {
    if (existingClient) {
      setFormData({
        ...existingClient,
        contentStrategy: existingClient.contentStrategy || '',
        wp: { ...existingClient.wp, appPassword: '' }
      });
      setSitemapUrls(existingClient.sitemapUrls || []);
    } else {
      setFormData({
        name: '', industry: '', websiteUrl: '', uniqueValueProp: '', brandVoice: '', contentStrategy: '',
        wp: { url: '', username: '', appPassword: '' },
      });
      setSitemapUrls([]);
    }
  }, [existingClient, isOpen]);

  const handleCrawl = async () => {
    if (!formData.websiteUrl) {
      alert('Please enter a website URL to crawl.');
      return;
    }
    setIsCrawling(true);
    try {
      const response = await fetch(buildApiUrl(`${API_CONFIG.ENDPOINTS.CRAWL}?url=${encodeURIComponent(formData.websiteUrl)}`));
      if (!response.ok) {
        throw new Error('Failed to crawl website.');
      }
      const urls = await response.json();
      setSitemapUrls(urls);
      alert(`Successfully crawled ${urls.length} URLs.`);
    } catch (error) {
      console.error('Crawling error:', error);
      alert('Failed to crawl website.');
    } finally {
      setIsCrawling(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('wp.')) {
      const wpField = name.split('.')[1];
      setFormData(prev => ({ ...prev, wp: { ...prev.wp, [wpField]: value } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.industry) {
        alert("Client Name and Industry are required.");
        return;
    }

    const clientToSave: Client = {
      ...formData,
      id: existingClient?.id || crypto.randomUUID(),
      wp: {
        ...formData.wp,
        appPassword: formData.wp.appPassword || existingClient?.wp.appPassword,
      },
      sitemapUrls: sitemapUrls,
    };
    onSave(clientToSave, sitemapUrls);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={existingClient ? 'Edit Client' : 'Add New Client'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input id="name" name="name" label="Client Name*" value={formData.name} onChange={handleChange} required />
          <Input id="industry" name="industry" label="Industry*" value={formData.industry} onChange={handleChange} required />
        </div>
        <div className="flex items-end gap-2">
          <Input id="websiteUrl" name="websiteUrl" label="Website URL" value={formData.websiteUrl} onChange={handleChange} className="flex-grow" />
          <Button type="button" onClick={handleCrawl} disabled={isCrawling}>
            {isCrawling ? 'Crawling...' : 'Crawl for Links'}
          </Button>
        </div>
        <Textarea id="uniqueValueProp" name="uniqueValueProp" label="Unique Value Proposition" value={formData.uniqueValueProp} onChange={handleChange} rows={3} />
        <Textarea id="brandVoice" name="brandVoice" label="Brand Voice Description" value={formData.brandVoice} onChange={handleChange} rows={3} />
        <Textarea id="contentStrategy" name="contentStrategy" label="Content Strategy" value={formData.contentStrategy} onChange={handleChange} rows={3} />

        <h3 className="text-lg font-semibold border-t border-slate-700 pt-4 mt-4 text-slate-300">WordPress Credentials</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input id="wp.url" name="wp.url" label="WordPress Site URL" value={formData.wp.url} onChange={handleChange} placeholder="https://example.com" />
          <Input id="wp.username" name="wp.username" label="WP Username" value={formData.wp.username} onChange={handleChange} />
        </div>
        <Input id="wp.appPassword" name="wp.appPassword" label="WP Application Password" value={formData.wp.appPassword || ''} onChange={handleChange} type="password" placeholder={existingClient ? 'Leave blank to keep existing' : ''} />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">Save Client</Button>
        </div>
      </form>
    </Modal>
  );
};

export default ClientForm;