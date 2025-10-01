// app/api/brainstorming/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { OpenAIBrainstormingClient } from '@/lib/openai'; // Keep the same import
import { getCachedResult, setCachedResult, generateCacheKey } from '@/lib/cache';

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
  secteurActiviteLibre?: string;
  zoneGeographique: string[];
  produitsCGR: string[];
  clientsExclure: string;
  tailleEntreprise?: string;
  usinesCGR?: string[];
  motsCles?: string;
  nombreResultats?: number;
}

interface BrainstormingRequest {
  secteursActivite: string[];
  secteurActiviteLibre?: string;
  zoneGeographique?: string[];
  zoneGeographiqueLibre?: string;
  produitsCGR?: string[];
  clientsExclure?: string;
  tailleEntreprise?: string;
  usinesCGR?: string[];
  motsCles?: string;
  nombreResultats?: number;
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
    
    // Extract niche specification
    const secteurGeneral = requestData.secteursActivite[0] || allSecteurs[0];
    const nicheSpecifique = requestData.secteurActiviteLibre?.trim() || '';
    
    console.log('🧠 Recherche brainstorming demandée:', {
      secteurGeneral,
      nicheSpecifique: nicheSpecifique || 'Mode exploratoire',
      produits: requestData.produitsCGR,
      zones: allZones
    });
    
    // Enhanced cache key including niche
    const cacheKey = generateCacheKey(
      `brainstorming-${secteurGeneral}-${nicheSpecifique}`,
      allZones.join(',') || 'global',
      requestData.produitsCGR || []
    );
    
    const cachedResult = await getCachedResult(cacheKey);
    if (cachedResult) {
      console.log('⚡ Résultat brainstorming en cache trouvé');
      return NextResponse.json({ ...cachedResult, cached: true });
    }
    
    // Prepare data with defaults
    const brainstormingData: BrainstormingData = {
      secteursActivite: allSecteurs,
      secteurActiviteLibre: nicheSpecifique,
      zoneGeographique: allZones.length > 0 ? allZones : ['France'],
      produitsCGR: requestData.produitsCGR && requestData.produitsCGR.length > 0 
        ? requestData.produitsCGR 
        : ['Ressorts fil', 'Ressorts plats', 'Pièces découpées', 'Formage de tubes', 'Assemblages automatisés', 'Mécatronique', 'Injection plastique'],
      clientsExclure: requestData.clientsExclure || '',
      tailleEntreprise: requestData.tailleEntreprise,
      usinesCGR: requestData.usinesCGR,
      motsCles: requestData.motsCles,
      nombreResultats: requestData.nombreResultats || 5
    };
    
    console.log('📋 Données brainstorming finales:', {
      ...brainstormingData,
      modeRecherche: nicheSpecifique ? 'Ciblé sur niche' : 'Exploratoire'
    });
    
    // Generate market analysis with Perplexity (through OpenAIBrainstormingClient)
    const openaiClient = new OpenAIBrainstormingClient();
    const marketResult = await withTimeout(
      openaiClient.generateMarketBrainstorming(brainstormingData),
      60000 // 60 seconds for Perplexity (includes web search)
    );
    
    console.log('🎯 Résultat:', { 
      success: marketResult.success, 
      marketsCount: marketResult.markets?.length,
      modeRecherche: marketResult.mode_recherche,
      nicheSpecifiee: marketResult.niche_specifiee,
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
      sources: marketResult.sources || [],
      analyseTendances: marketResult.analyse_tendances,
      modeRecherche: marketResult.mode_recherche,
      nicheSpecifiee: marketResult.niche_specifiee,
      debug: {
        marketsGenerated: marketResult.markets?.length || 0,
        searchCriteria: {
          secteurGeneral,
          nicheSpecifique: nicheSpecifique || 'Aucune (mode exploratoire)',
          produits: brainstormingData.produitsCGR,
          zones: brainstormingData.zoneGeographique,
          tailleEntreprise: brainstormingData.tailleEntreprise
        },
        originalProduitsCGR: requestData.produitsCGR,
        usedDefaultProducts: !requestData.produitsCGR || requestData.produitsCGR.length === 0,
        sectorsUsed: allSecteurs,
        zonesUsed: allZones,
        perplexityUsed: true,
        realTimeSearch: true
      }
    };
    
    // Save to cache only if we have results
    if (marketResult.markets && marketResult.markets.length > 0) {
      // Shorter cache for niche-specific (more dynamic data)
      const cacheTime = nicheSpecifique ? 43200 : 86400; // 12h for niche, 24h for general
      await setCachedResult(cacheKey, response, cacheTime);
      console.log(`💾 Résultats sauvegardés en cache (${cacheTime/3600}h)`);
    }
    
    console.log('✅ Brainstorming terminé:', {
      opportunites: marketResult.markets?.length || 0,
      mode: nicheSpecifique ? 'Ciblé' : 'Exploratoire',
      niche: nicheSpecifique || 'N/A'
    });
    
    return NextResponse.json(response);
    
  } catch (error: any) {
    console.error('❌ Erreur brainstorming:', error);
    
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
    
    if (error.message?.includes('PERPLEXITY_API_KEY')) {
      return NextResponse.json(
        { 
          error: 'Configuration manquante',
          details: 'Clé API Perplexity non configurée',
          type: 'config_error'
        },
        { status: 500 }
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