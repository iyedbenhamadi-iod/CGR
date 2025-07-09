"use client  "

import React, { useState } from 'react';
import { Search, MapPin, Link, Loader2 } from 'lucide-react';

interface SearchFormProps {
  onSearch: (data: any) => void;
  loading: boolean;
}

export default function SearchForm({ onSearch, loading }: SearchFormProps) {
  const [formData, setFormData] = useState({
    product: '',
    location: '',
    referenceUrls: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const searchData = {
      product: formData.product,
      location: formData.location,
      referenceUrls: formData.referenceUrls 
        ? formData.referenceUrls.split('\n').filter(url => url.trim())
        : []
    };
    
    onSearch(searchData);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      <div className="flex items-center gap-2 mb-6">
        <Search className="text-blue-600" size={24} />
        <h2 className="text-xl font-semibold text-gray-800">
          Recherche de Prospects IA
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Search size={16} />
            Produit / Service *
          </label>
          <input
            type="text"
            value={formData.product}
            onChange={(e) => setFormData(prev => ({ ...prev, product: e.target.value }))}
            placeholder="ex: CRM SaaS, Logiciel comptabilité, Services marketing..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <MapPin size={16} />
            Localisation *
          </label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
            placeholder="ex: Paris, France / London, UK / New York, USA..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Link size={16} />
            Sites de référence (optionnel)
          </label>
          <textarea
            value={formData.referenceUrls}
            onChange={(e) => setFormData(prev => ({ ...prev, referenceUrls: e.target.value }))}
            placeholder="https://exemple1.com&#10;https://exemple2.com&#10;(un site par ligne)"
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Sites d'entreprises similaires à celles que vous recherchez
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || !formData.product || !formData.location}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Recherche en cours...
            </>
          ) : (
            <>
              <Search size={20} />
              Lancer la recherche IA
            </>
          )}
        </button>
      </form>
    </div>
  );
}