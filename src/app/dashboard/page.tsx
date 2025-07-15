'use client';

import React, { useState } from 'react';
import SearchForm from '@/components/ui/SearchForm';
import ResultsDisplay from '@/components/ui/ResultsDisplay';
import { Prospect, SearchResponse } from '@/types';

export default function Dashboard() {
  const [results, setResults] = useState<any>(null);
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
      console.log('🔍 API Response:', data);
      
      // Transform the API response to match ResultsDisplay expectations
      const transformedData = transformApiResponse(data);
      console.log('🔄 Transformed Data:', transformedData);
      
      setResults(transformedData);
    } catch (err) {
      setError('Erreur lors de la recherche. Veuillez réessayer.');
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const transformApiResponse = (data: any) => {
    const baseResponse = {
      searchType: data.type,
      totalFound: data.totalFound || 0,
      cached: data.cached || false,
      sources: data.sources || []
    };

    switch (data.type) {
      case 'brainstorming':
        return {
          ...baseResponse,
          marketOpportunities: data.markets?.map((market: any) => ({
            nom_marche: market.nom_marche,
            justification: market.justification,
            produits_cgr_applicables: market.produits_cgr_applicables || [],
            exemples_entreprises: market.exemples_entreprises || []
          })) || []
        };
        
     case 'concurrent': 
  return { 
    ...baseResponse, 
    competitorAnalysis: data?.competitorAnalysis ? {
      nom_entreprise: data.competitorAnalysis.nom_entreprise || '',
      synthese: data.competitorAnalysis.synthese || '',
      produits_services: data.competitorAnalysis.produits_services || [],
      marches_cibles: data.competitorAnalysis.marches_cibles || [],
      forces_apparentes: data.competitorAnalysis.forces_apparentes || [],
      faiblesses_potentielles: data.competitorAnalysis.faiblesses_potentielles || [],
      strategie_communication: data.competitorAnalysis.strategie_communication || '',
      sources: data.competitorAnalysis.sources || []
    } : null 
  };

      case 'enterprises':
        return {
          ...baseResponse,
          prospects: data.prospects?.map((prospect: any) => ({
            nom_entreprise: prospect.company,
            site_web: prospect.website || '',
            description_activite: prospect.sector || '',
            produits_entreprise: prospect.cgrData?.produits_entreprise || [],
            potentiel_cgr: {
              produits_cibles_chez_le_prospect: prospect.cgrData?.produits_cibles_chez_le_prospect || [],
              produits_cgr_a_proposer: prospect.cgrData?.produits_cgr_a_proposer || [],
              argumentaire_approche: prospect.reason || ''
            },
            fournisseur_actuel_estimation: prospect.cgrData?.fournisseur_actuel_estimation || '',
            contacts: prospect.contacts?.map((contact: any) => ({
              nom: contact.name?.split(' ').pop() || '',
              prenom: contact.name?.split(' ').slice(0, -1).join(' ') || contact.name || '',
              poste: contact.position || '',
              email: contact.email || undefined,
              phone: contact.phone || undefined,
              linkedin_url: contact.linkedin || undefined,
              verified: contact.verified || false
            })) || [],
            score: prospect.score || 0,
            sources: prospect.sources || []
          })) || []
        };

      default:
        return baseResponse;
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
          <div className="mt-8">
            <ResultsDisplay {...results} />
          </div>
        )}
      </div>
    </div>
  );
}