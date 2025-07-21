// app/api/search/route.ts (Updated version)
import { NextRequest, NextResponse } from 'next/server';

interface EnhancedSearchData {
  typeRecherche: 'entreprises' | 'brainstorming' | 'concurrent' | 'contacts';
  secteursActivite: string[];
  zoneGeographique: string[];
  tailleEntreprise?: string;
  motsCles?: string;
  produitsCGR?: string[];
  volumePieces?: number[];
  clientsExclure?: string;
  usinesCGR?: string[];
  nombreResultats?: number;
  nomConcurrent?: string;
  nomEntreprise?: string;
  siteWebEntreprise?: string;
  includeMarketAnalysis?: boolean;
  includeCompetitorAnalysis?: boolean;
  competitorNames?: string[];
  // Contact search specific fields
  posteRecherche?: string;
  secteurActivite?: string;
  includeEmails?: boolean;
  includeLinkedIn?: boolean;
}

// Helper function to get the base URL
function getBaseUrl(request: NextRequest): string {
  // For server-side API calls, use the request URL to determine the base
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export async function POST(request: NextRequest) {
  try {
    const searchData: EnhancedSearchData = await request.json();
    
    // Enhanced validation
    if (!searchData.typeRecherche) {
      return NextResponse.json(
        { error: 'Type de recherche requis' },
        { status: 400 }
      );
    }
    
    console.log('🔍 Recherche CGR demandée:', JSON.stringify(searchData, null, 2));
    
    // Route to appropriate endpoint based on search type
    switch (searchData.typeRecherche) {
      case 'brainstorming':
        return await handleBrainstormingSearch(searchData, request);
      case 'concurrent':
        return await handleCompetitorSearch(searchData, request);
      case 'contacts':
        return await handleContactSearch(searchData, request);
      case 'entreprises':
      default:
        return await handleEnterpriseSearch(searchData, request);
    }
    
  } catch (error: any) {
    console.error('❌ Erreur API:', error);
    
    // Enhanced error handling with specific error types
    if (error.message?.includes('timed out')) {
      return NextResponse.json(
        { 
          error: 'Timeout de la recherche',
          details: 'La recherche a pris trop de temps. Veuillez réessayer avec des critères plus spécifiques.',
          type: 'timeout'
        },
        { status: 408 }
      );
    }
    
    return NextResponse.json(
      {
        error: 'Erreur lors de la recherche CGR',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne du serveur',
        type: 'server_error'
      },
      { status: 500 }
    );
  }
}

async function handleContactSearch(searchData: EnhancedSearchData, request: NextRequest) {
  try {
    if (!searchData.nomEntreprise) {
      return NextResponse.json(
        { error: 'Nom de l\'entreprise requis pour la recherche de contacts' },
        { status: 400 }
      );
    }
    
    const baseUrl = getBaseUrl(request);
    const response = await fetch(`${baseUrl}/api/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nomEntreprise: searchData.nomEntreprise,
        posteRecherche: searchData.posteRecherche,
        secteurActivite: searchData.secteurActivite,
        includeEmails: searchData.includeEmails,
        includeLinkedIn: searchData.includeLinkedIn
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }
    
    const result = await response.json();
    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error('❌ Erreur delegation contacts:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la recherche de contacts', details: error.message },
      { status: 500 }
    );
  }
}

async function handleBrainstormingSearch(searchData: EnhancedSearchData, request: NextRequest) {
  try {
    const baseUrl = getBaseUrl(request);
    const response = await fetch(`${baseUrl}/api/brainstorming`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secteursActivite: searchData.secteursActivite,
        zoneGeographique: searchData.zoneGeographique,
        produitsCGR: searchData.produitsCGR,
        clientsExclure: searchData.clientsExclure
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }
    
    const result = await response.json();
    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error('❌ Erreur delegation brainstorming:', error);
    return NextResponse.json(
      { error: 'Erreur lors du brainstorming', details: error.message },
      { status: 500 }
    );
  }
}

async function handleCompetitorSearch(searchData: EnhancedSearchData, request: NextRequest) {
  try {
    if (!searchData.nomConcurrent) {
      return NextResponse.json(
        { error: 'Nom du concurrent requis' },
        { status: 400 }
      );
    }
    
    const baseUrl = getBaseUrl(request);
    const response = await fetch(`${baseUrl}/api/competitors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nomConcurrent: searchData.nomConcurrent
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }
    
    const result = await response.json();
    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error('❌ Erreur delegation concurrent:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'analyse concurrent', details: error.message },
      { status: 500 }
    );
  }
}

async function handleEnterpriseSearch(searchData: EnhancedSearchData, request: NextRequest) {
  try {
    const baseUrl = getBaseUrl(request);
    const response = await fetch(`${baseUrl}/api/enterprises`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secteursActivite: searchData.secteursActivite,
        zoneGeographique: searchData.zoneGeographique,
        tailleEntreprise: searchData.tailleEntreprise,
        motsCles: searchData.motsCles,
        produitsCGR: searchData.produitsCGR,
        volumePieces: searchData.volumePieces,
        clientsExclure: searchData.clientsExclure,
        usinesCGR: searchData.usinesCGR,
        nombreResultats: searchData.nombreResultats
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }
    
    const result = await response.json();
    
    // If additional analyses are requested, call them separately
    if (searchData.includeMarketAnalysis) {
      try {
        const marketResponse = await fetch(`${baseUrl}/api/brainstorming`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            secteursActivite: searchData.secteursActivite,
            zoneGeographique: searchData.zoneGeographique,
            produitsCGR: searchData.produitsCGR,
            clientsExclure: searchData.clientsExclure
          })
        });
        
        if (marketResponse.ok) {
          const marketResult = await marketResponse.json();
          result.marketAnalysis = marketResult.marketOpportunities;
        }
      } catch (error) {
        console.error('❌ Erreur analyse de marché supplémentaire:', error);
        // Continue without market analysis
      }
    }
    
    // If competitor analysis is requested
    if (searchData.includeCompetitorAnalysis && searchData.competitorNames?.length) {
      try {
        const competitorAnalyses = [];
        
        for (const competitorName of searchData.competitorNames) {
          const competitorResponse = await fetch(`${baseUrl}/api/competitors`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              nomConcurrent: competitorName
            })
          });
          
          if (competitorResponse.ok) {
            const competitorResult = await competitorResponse.json();
            competitorAnalyses.push({
              name: competitorName,
              analysis: competitorResult.competitorAnalysis
            });
          }
        }
        
        if (competitorAnalyses.length > 0) {
          result.competitorAnalysis = competitorAnalyses;
        }
      } catch (error) {
        console.error('❌ Erreur analyses concurrents supplémentaires:', error);
        // Continue without competitor analysis
      }
    }
    
    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error('❌ Erreur delegation entreprises:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la recherche entreprises', details: error.message },
      { status: 500 }
    );
  }
}