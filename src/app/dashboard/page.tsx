'use client';

import React, { useState } from 'react';
import SearchForm from '@/components/ui/SearchForm';
import ResultsDisplay from '@/components/ui/ResultsDisplay';
import { Prospect, SearchResponse } from '@/types';

export default function Dashboard() {
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (searchData: any) => {
    setLoading(true);
    setError('');
    setResults(null);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchData),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la recherche');
      }

      const data = await response.json();
      
      // Ensure prospects is always an array
      const resultsData: SearchResponse = {
        ...data,
        prospects: data.prospects || [] // Default to empty array if undefined
      };
      
      setResults(resultsData);
    } catch (err) {
      setError('Erreur lors de la recherche. Veuillez réessayer.');
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🎯 Prospection IA - CGR International
          </h1>
          <p className="text-gray-600">
            Trouvez des prospects qualifiés automatiquement avec l'IA
          </p>
        </header>

        <SearchForm onSearch={handleSearch} loading={loading} />

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {results && (
          <ResultsDisplay {...results} />
        )}
      </div>
    </div>
  );
}