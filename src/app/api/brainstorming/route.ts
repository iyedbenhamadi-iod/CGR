// app/api/brainstorming/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { OpenAIBrainstormingClient } from '@/lib/openai';
import { getCachedResult, setCachedResult, generateCacheKey } from '@/lib/cache';

// Add timeout wrapper for API calls
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
};

interface BrainstormingData {
  secteursActivite: string[];
  zoneGeographique: string[];
  produitsCGR: string[];
  clientsExclure: string;
}

interface BrainstormingRequest {
  secteursActivite: string[];
  secteurActiviteLibre?: string;
  zoneGeographique?: string[];
  zoneGeographiqueLibre?: string;
  produitsCGR?: string[];
  clientsExclure?: string;
}

export async function POST(request: NextRequest) {
  try {
    const requestData: BrainstormingRequest = await request.json();
    
    // Combine predefined sectors with free text sectors
    const allSecteurs = [
      ...(requestData.secteursActivite || []),
      ...(requestData.secteurActiviteLibre?.trim() ? [requestData.secteurActiviteLibre.trim()] : [])
    ];

    // Combine predefined zones with free text zones
    const allZones = [
      ...(requestData.zoneGeographique || []),
      ...(requestData.zoneGeographiqueLibre?.trim() ? [requestData.zoneGeographiqueLibre.trim()] : [])
    ];
    
    // Enhanced validation - check if we have at least one sector (predefined OR free text)
    if (allSecteurs.length === 0) {
      return NextResponse.json(
        { error: 'Au moins un secteur d\'activité requis pour le brainstorming (sélectionné ou saisi librement)' },
        { status: 400 }
      );
    }
    
    console.log('🧠 Recherche brainstorming demandée:', JSON.stringify({
      ...requestData,
      allSecteurs,
      allZones
    }, null, 2));
    
    // Check cache with better key generation
    const cacheKey = generateCacheKey(
      `brainstorming-${allSecteurs.join(',')}`,
      allZones.join(',') || 'global',
      [`brainstorming-${Date.now()}`]
    );
    
    const cachedResult = await getCachedResult(cacheKey);
    if (cachedResult) {
      console.log('⚡ Résultat brainstorming en cache trouvé');
      return NextResponse.json({ ...cachedResult, cached: true });
    }
    
    // Prepare data with defaults - use combined arrays
    const brainstormingData: BrainstormingData = {
      secteursActivite: allSecteurs,
      zoneGeographique: allZones.length > 0 ? allZones : ['France'],
      produitsCGR: requestData.produitsCGR && requestData.produitsCGR.length > 0 
        ? requestData.produitsCGR 
        : ['Ressorts fil', 'Ressorts plats', 'Pièces découpées', 'Formage de tubes', 'Assemblages automatisés', 'Mécatronique', 'Injection plastique'],
      clientsExclure: requestData.clientsExclure || ''
    };
    
    console.log('📋 Données brainstorming finales:', brainstormingData);
    
    // Generate market analysis with OpenAI (with timeout)
    const openaiClient = new OpenAIBrainstormingClient();
    const marketResult = await withTimeout(
      openaiClient.generateMarketBrainstorming(brainstormingData),
      150000 // 15 seconds for brainstorming
    );
    
    console.log('🎯 Résultat OpenAI:', { 
      success: marketResult.success, 
      marketsCount: marketResult.markets?.length, 
      error: marketResult.error 
    });
    
    if (!marketResult.success) {
      return NextResponse.json({ 
        error: 'Erreur lors du brainstorming', 
        details: marketResult.error,
        type: 'brainstorming_error'
      }, { status: 500 });
    }
    
    const response = {
      searchType: 'brainstorming',
      marketOpportunities: marketResult.markets || [],
      totalFound: marketResult.markets?.length || 0,
      cached: false,
      sources: [],
      debug: {
        marketsGenerated: marketResult.markets?.length || 0,
        searchCriteria: brainstormingData,
        originalProduitsCGR: requestData.produitsCGR,
        usedDefaultProducts: !requestData.produitsCGR || requestData.produitsCGR.length === 0,
        sectorsUsed: allSecteurs,
        zonesUsed: allZones
      }
    };
    
    // Save to cache only if we have results
    if (marketResult.markets && marketResult.markets.length > 0) {
      await setCachedResult(cacheKey, response, 86400); // 24h cache
      console.log('💾 Résultats sauvegardés en cache');
    }
    
    console.log('✅ Brainstorming terminé:', marketResult.markets?.length || 0, 'opportunités trouvées');
    
    return NextResponse.json(response);
    
  } catch (error: any) {
    console.error('❌ Erreur brainstorming:', error);
    
    // Enhanced error handling with specific error types
    if (error.message?.includes('timed out')) {
      return NextResponse.json(
        { 
          error: 'Timeout du brainstorming',
          details: 'Le brainstorming a pris trop de temps. Veuillez réessayer.',
          type: 'timeout'
        },
        { status: 408 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Erreur lors du brainstorming', 
        details: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne du serveur',
        type: 'brainstorming_error'
      },
      { status: 500 }
    );
  }
}