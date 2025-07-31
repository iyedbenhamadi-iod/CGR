// app/api/competitor-identification/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { CompetitorIdentificationClient } from '@/lib/identification';
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

interface CompetitorIdentificationRequest {
  region_geographique: string;
  produit: 'ressort_fil' | 'ressort_feuillard' | 'piece_plastique';
  volume_production: 'petite_serie' | 'moyenne_serie' | 'grande_serie';
  recherche_multiple?: boolean; // Option pour recherche multi-critères
  criteres_additionnels?: {
    region_geographique: string;
    produit: 'ressort_fil' | 'ressort_feuillard' | 'piece_plastique';
    volume_production: 'petite_serie' | 'moyenne_serie' | 'grande_serie';
  }[]; // Critères supplémentaires pour recherche étendue
}

export async function POST(request: NextRequest) {
  try {
    const requestData: CompetitorIdentificationRequest = await request.json();
    
    // Enhanced validation
    if (!requestData.region_geographique || !requestData.produit || !requestData.volume_production) {
      return NextResponse.json(
        { error: 'Région géographique, produit et volume de production requis' },
        { status: 400 }
      );
    }

    // Validate product type
    const validProducts = ['ressort_fil', 'ressort_feuillard', 'piece_plastique'];
    if (!validProducts.includes(requestData.produit)) {
      return NextResponse.json(
        { error: 'Type de produit invalide. Valeurs acceptées: ressort_fil, ressort_feuillard, piece_plastique' },
        { status: 400 }
      );
    }

    // Validate volume type
    const validVolumes = ['petite_serie', 'moyenne_serie', 'grande_serie'];
    if (!validVolumes.includes(requestData.volume_production)) {
      return NextResponse.json(
        { error: 'Volume de production invalide. Valeurs acceptées: petite_serie, moyenne_serie, grande_serie' },
        { status: 400 }
      );
    }
    
    console.log('🏭 Identification concurrents demandée:', JSON.stringify(requestData, null, 2));
    
    // Enhanced cache key including all search criteria
    const mainCriteria = {
      region: requestData.region_geographique,
      produit: requestData.produit,
      volume: requestData.volume_production
    };
    
    const cacheKeyParams = [
      `region-${requestData.region_geographique}`,
      `produit-${requestData.produit}`,
      `volume-${requestData.volume_production}`,
      `multiple-${requestData.recherche_multiple || false}`,
      `additional-${requestData.criteres_additionnels?.length || 0}`
    ];
    
    const cacheKey = generateCacheKey(
      `competitor-identification`,
      'search',
      cacheKeyParams
    );
    
    const cachedResult = await getCachedResult(cacheKey);
    if (cachedResult) {
      console.log('⚡ Résultat identification concurrents en cache trouvé');
      return NextResponse.json({ ...cachedResult, cached: true });
    }
    
    // Initialize competitor identification client
    const competitorClient = new CompetitorIdentificationClient();
    
    let allCompetitors: any[] = [];
    let isConsolidated = false;
    let multipleResults: any[] = [];
    
    if (requestData.recherche_multiple && requestData.criteres_additionnels) {
      // Multiple criteria search
      const allCriteria = [
        {
          region_geographique: [requestData.region_geographique], // Convert to array
          produits: [requestData.produit], // Convert to array with correct field name
          type_serie: [requestData.volume_production], // Convert to array with correct field name
          secteurs_cibles: [], // Add empty sectors for now
          nombre_resultats: 10 // Default number
        },
        ...requestData.criteres_additionnels.map(criteria => ({
          region_geographique: [criteria.region_geographique], // Convert to array
          produits: [criteria.produit], // Convert to array with correct field name
          type_serie: [criteria.volume_production], // Convert to array with correct field name
          secteurs_cibles: [], // Add empty sectors for now
          nombre_resultats: 10 // Default number
        }))
      ];
      
      console.log(`🔍 Recherche multi-critères: ${allCriteria.length} ensembles de critères`);
      
      // Process each criteria individually since the client expects this format
      const searchPromises = allCriteria.map(criteria => 
        competitorClient.identifyCompetitors(criteria)
      );
      
      multipleResults = await withTimeout(
        Promise.all(searchPromises),
        300000 // 5 minutes for multiple criteria search
      );
      
      // Consolidate results and remove duplicates
      const allCompetitorsFlat = multipleResults
        .filter(result => result.success && result.competitors)
        .flatMap(result => result.competitors);
      
      // Simple deduplication by company name
      const competitorMap = new Map();
      allCompetitorsFlat.forEach(competitor => {
        const key = competitor.nom_entreprise?.toLowerCase();
        if (key && !competitorMap.has(key)) {
          competitorMap.set(key, competitor);
        }
      });
      
      allCompetitors = Array.from(competitorMap.values());
      isConsolidated = true;
      
    } else {
      // Single criteria search - fix the data structure mismatch
      const searchRequest = {
        region_geographique: [requestData.region_geographique], // Convert string to array
        produits: [requestData.produit], // Convert to array with correct field name
        type_serie: [requestData.volume_production], // Convert to array with correct field name
        secteurs_cibles: [], // Add empty sectors
        nombre_resultats: 10 // Default number
      };
      
      console.log('🔍 Recherche simple avec critères formatés:', searchRequest);
      
      const singleResult = await withTimeout(
        competitorClient.identifyCompetitors(searchRequest),
        180000 // 3 minutes for single criteria search
      );
      
      if (!singleResult.success) {
        return NextResponse.json({ 
          error: 'Erreur lors de l\'identification des concurrents',
          details: singleResult.error,
          type: 'competitor_identification_error'
        }, { status: 500 });
      }
      
      allCompetitors = singleResult.competitors || [];
      multipleResults = [singleResult];
    }
    
    console.log('🔍 Résultat identification concurrents:', {
      success: multipleResults.some(r => r.success),
      competitorsFound: allCompetitors.length,
      isConsolidated: isConsolidated,
      error: multipleResults.every(r => !r.success) ? 'Aucune recherche réussie' : undefined
    });
    
    // Check if any search was successful
    const hasSuccessfulSearch = multipleResults.some(r => r.success);
    if (!hasSuccessfulSearch) {
      const errorMessages = multipleResults.map(r => r.error).filter(Boolean);
      return NextResponse.json({ 
        error: 'Erreur lors de l\'identification des concurrents',
        details: errorMessages.length > 0 ? errorMessages.join('; ') : 'Aucune recherche réussie',
        type: 'competitor_identification_error'
      }, { status: 500 });
    }
    
    // Transform competitors to match frontend expectations
    // Transform competitors to match frontend expectations
const transformedCompetitors = allCompetitors.map(competitor => {
  console.log('🔧 Transforming competitor:', competitor.nom_entreprise, 'Raw data:', competitor);
  
  return {
    nom_entreprise: competitor.nom_entreprise || '',
    presence_geographique: Array.isArray(competitor.presence_geographique) 
      ? competitor.presence_geographique 
      : (competitor.presence_geographique ? [competitor.presence_geographique] : []),
    marches_cibles: Array.isArray(competitor.marches_cibles) 
      ? competitor.marches_cibles 
      : (competitor.marches_cibles ? [competitor.marches_cibles] : []),
    taille_estimee: competitor.taille_estimee || competitor.taille_entreprise || 'Non spécifiée',
    ca_estime: competitor.ca_estime || 'Non communiqué',
    publications_recentes: Array.isArray(competitor.publications_recentes) 
      ? competitor.publications_recentes 
      : [],
    actualites_recentes: Array.isArray(competitor.actualites_recentes) 
      ? competitor.actualites_recentes 
      : [],
    site_web: competitor.site_web || undefined,
    specialites: Array.isArray(competitor.specialites) 
      ? competitor.specialites 
      : (Array.isArray(competitor.specialites_produits) 
          ? competitor.specialites_produits 
          : []),
    forces_concurrentielles: Array.isArray(competitor.forces_concurrentielles) 
      ? competitor.forces_concurrentielles 
      : [],
    positionnement_marche: competitor.positionnement_marche || '',
    contact_info: competitor.contact_info || {},
    sources: Array.isArray(competitor.sources) ? competitor.sources : [],
    // Add search context
    criteres_correspondants: {
      region: requestData.region_geographique,
      produit: requestData.produit,
      volume: requestData.volume_production
    }
  };
});
    
    // Calculate statistics
    const statistics = {
      total_concurrents: transformedCompetitors.length,
      avec_site_web: transformedCompetitors.filter(c => c.site_web).length,
      avec_actualites: transformedCompetitors.filter(c => c.actualites_recentes.length > 0).length,
      avec_publications: transformedCompetitors.filter(c => c.publications_recentes.length > 0).length,
      regions_representees: [...new Set(transformedCompetitors.flatMap(c => c.presence_geographique))],
      marches_identifies: [...new Set(transformedCompetitors.flatMap(c => c.marches_cibles))],
      specialites_identifiees: [...new Set(transformedCompetitors.flatMap(c => c.specialites))]
    };
    
    // Debug: Log competitor names and key info
    console.log('🏭 Concurrents identifiés:', 
      transformedCompetitors.map(c => ({
        nom: c.nom_entreprise,
        regions: c.presence_geographique.slice(0, 2).join(', '),
        specialites: c.specialites.slice(0, 2).join(', ')
      }))
    );
    
    const response = {
      searchType: 'competitor-identification',
      competitors: transformedCompetitors,
      totalFound: transformedCompetitors.length,
      cached: false,
      searchCriteria: {
        region_geographique: requestData.region_geographique,
        produit: requestData.produit,
        volume_production: requestData.volume_production,
        recherche_multiple: requestData.recherche_multiple || false,
        criteres_additionnels: requestData.criteres_additionnels || []
      },
      statistics,
      hasCompetitors: transformedCompetitors.length > 0,
      consolidated: isConsolidated,
      debug: {
        competitorsFound: transformedCompetitors.length,
        searchComplete: true,
        criteriaUsed: requestData.recherche_multiple ? 
          [mainCriteria, ...(requestData.criteres_additionnels || [])] : [mainCriteria],
        originalResults: multipleResults.map(r => ({
          success: r.success,
          competitorCount: r.competitors?.length || 0,
          error: r.error
        })),
        transformedFields: transformedCompetitors.map(competitor => ({
          nom_entreprise: !!competitor.nom_entreprise,
          presence_geographique: competitor.presence_geographique.length,
          marches_cibles: competitor.marches_cibles.length,
          taille_estimee: !!competitor.taille_estimee,
          ca_estime: !!competitor.ca_estime,
          publications_recentes: competitor.publications_recentes.length,
          actualites_recentes: competitor.actualites_recentes.length,
          site_web: !!competitor.site_web,
          specialites: competitor.specialites.length
        }))
      }
    };
    
    // Debug: Log the final response structure
    console.log('📤 Réponse finale identification concurrents:', {
      searchType: response.searchType,
      hasCompetitors: response.hasCompetitors,
      competitorsCount: response.competitors.length,
      totalFound: response.totalFound,
      consolidated: response.consolidated,
      regions: statistics.regions_representees.length,
      marches: statistics.marches_identifies.length
    });
    
    // Log identified competitors for business intelligence
    if (transformedCompetitors.length > 0) {
      console.log('🎯 CONCURRENTS IDENTIFIÉS:', 
        transformedCompetitors.map(c => c.nom_entreprise).join(', '));
      console.log('🌍 RÉGIONS COUVERTES:', statistics.regions_representees.join(', '));
      console.log('🏢 MARCHÉS IDENTIFIÉS:', statistics.marches_identifies.join(', '));
    } else {
      console.log('⚠️ Aucun concurrent identifié pour les critères:', requestData);
    }
    
    // Save to cache - longer cache for competitor identification as it's less volatile
    await setCachedResult(cacheKey, response, 172800); // 48h cache
    console.log('✅ Identification concurrents terminée:', 
      `${transformedCompetitors.length} concurrents pour ${requestData.region_geographique} - ${requestData.produit}`);
    
    return NextResponse.json(response);
    
  } catch (error: any) {
    console.error('❌ Erreur identification concurrents:', error);
    
    // Enhanced error handling with specific error types
    if (error.message?.includes('timed out')) {
      return NextResponse.json(
        { 
          error: 'Timeout de l\'identification des concurrents',
          details: 'L\'identification des concurrents a pris trop de temps. Veuillez réessayer avec des critères plus spécifiques.',
          type: 'timeout'
        },
        { status: 408 }
      );
    }
    
    if (error.message?.includes('PERPLEXITY_API_KEY')) {
      return NextResponse.json(
        { 
          error: 'Configuration API manquante',
          details: 'La clé API Perplexity n\'est pas configurée.',
          type: 'api_configuration_error'
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Erreur lors de l\'identification des concurrents', 
        details: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne du serveur',
        type: 'competitor_identification_error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for retrieving cached competitor identification searches
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const region = searchParams.get('region');
    const produit = searchParams.get('produit');
    const volume = searchParams.get('volume');
    const multiple = searchParams.get('multiple');
    const additional = searchParams.get('additional');
    
    if (!region || !produit || !volume) {
      return NextResponse.json(
        { error: 'Région géographique, produit et volume de production requis' },
        { status: 400 }
      );
    }
    
    // Match cache key from POST method
    const cacheKeyParams = [
      `region-${region}`,
      `produit-${produit}`,
      `volume-${volume}`,
      `multiple-${multiple || 'false'}`,
      `additional-${additional || '0'}`
    ];
    
    const cacheKey = generateCacheKey(
      `competitor-identification`,
      'search',
      cacheKeyParams
    );
    
    const cachedResult = await getCachedResult(cacheKey);
    
    if (cachedResult) {
      return NextResponse.json({ ...cachedResult, cached: true });
    } else {
      return NextResponse.json(
        { error: 'Aucune identification en cache pour ces critères' },
        { status: 404 }
      );
    }
    
  } catch (error: any) {
    console.error('❌ Erreur récupération cache identification concurrents:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du cache' },
      { status: 500 }
    );
  }
}