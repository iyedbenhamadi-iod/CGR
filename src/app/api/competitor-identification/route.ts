// app/api/competitor-identification/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { CompetitorIdentificationClient } from '@/lib/identification';
import { getCachedResult, setCachedResult, generateCacheKey } from '@/lib/cache';

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
  produits: string[];
  volume_production: 'petite_serie' | 'moyenne_serie' | 'grande_serie';
  recherche_multiple?: boolean;
  criteres_additionnels?: {
    region_geographique: string;
    produits: string[];
    volume_production: 'petite_serie' | 'moyenne_serie' | 'grande_serie';
  }[];
}

export async function POST(request: NextRequest) {
  try {
    const requestData: CompetitorIdentificationRequest = await request.json();
    
    if (!requestData.region_geographique || !requestData.produits || requestData.produits.length === 0 || !requestData.volume_production) {
      return NextResponse.json(
        { error: 'Région géographique, au moins un produit, et volume de production sont requis' },
        { status: 400 }
      );
    }
    
    const validVolumes = ['petite_serie', 'moyenne_serie', 'grande_serie'];
    if (!validVolumes.includes(requestData.volume_production)) {
      return NextResponse.json(
        { error: 'Volume de production invalide.' },
        { status: 400 }
      );
    }
    
    console.log('🏭 Identification concurrents demandée:', JSON.stringify(requestData, null, 2));
    
    const cacheKeyParams = [
      `region-${requestData.region_geographique}`,
      `produits-${requestData.produits.join('_')}`,
      `volume-${requestData.volume_production}`,
      `multiple-${requestData.recherche_multiple || false}`,
      `additional-${requestData.criteres_additionnels?.length || 0}`
    ];
    
    const cacheKey = generateCacheKey('competitor-identification', 'search', cacheKeyParams);
    
    const cachedResult = await getCachedResult(cacheKey);
    if (cachedResult) {
      console.log('⚡ Résultat identification concurrents en cache trouvé');
      return NextResponse.json({ ...cachedResult, cached: true });
    }
    
    const competitorClient = new CompetitorIdentificationClient();
    
    const searchRequest = {
      region_geographique: [requestData.region_geographique],
      produits: requestData.produits,
      type_serie: [requestData.volume_production],
      secteurs_cibles: [],
      nombre_resultats: 10
    };
      
    console.log('🔍 Recherche simple avec critères formatés:', searchRequest);
      
    const singleResult = await withTimeout(
      competitorClient.identifyCompetitors(searchRequest),
      1800000
    );
      
    if (!singleResult.success || !singleResult.competitors) {
      return NextResponse.json({ 
        error: 'Erreur lors de l\'identification des concurrents',
        details: singleResult.error || 'Aucun concurrent retourné.',
        type: 'competitor_identification_error'
      }, { status: 500 });
    }
      
    const allCompetitors = singleResult.competitors;
    
    // --- CORRECTED DATA TRANSFORMATION ---
    const transformedCompetitors = allCompetitors.map((competitor: any) => {
      return {
        nom_entreprise: competitor.nom_entreprise || '',
        presence_geographique: Array.isArray(competitor.presence_geographique) 
          ? competitor.presence_geographique 
          : (competitor.presence_geographique ? [competitor.presence_geographique] : []),
        marches_cibles: Array.isArray(competitor.marches_cibles) 
          ? competitor.marches_cibles 
          : (competitor.marches_cibles ? [competitor.marches_cibles] : []),
        taille_estimee: competitor.taille_entreprise || 'Non spécifiée',
        ca_estime: competitor.ca_estime || 'Non communiqué',
        publications_recentes: competitor.publications_recentes || [],
        actualites_recentes: competitor.actualites_recentes || [],
        site_web: competitor.site_web || '',
        specialites: competitor.specialites_produits || [],
        forces_concurrentielles: competitor.forces_concurrentielles || [],
        positionnement_marche: competitor.positionnement_marche || '',
        contact_info: competitor.contact_info || {},
        sources: competitor.sources || [],
        // FIX: Convert the product array to a string for the frontend
        criteres_correspondants: {
          region: requestData.region_geographique,
          produit: requestData.produits.join(', '), // Join array into a single string
          volume: requestData.volume_production
        }
      };
    });
    
    const statistics = {
      total_concurrents: transformedCompetitors.length,
      avec_site_web: transformedCompetitors.filter(c => c.site_web).length,
      avec_actualites: transformedCompetitors.filter(c => c.actualites_recentes.length > 0).length,
      avec_publications: transformedCompetitors.filter(c => c.publications_recentes.length > 0).length,
      regions_representees: [...new Set(transformedCompetitors.flatMap(c => c.presence_geographique))],
      marches_identifies: [...new Set(transformedCompetitors.flatMap(c => c.marches_cibles))],
      specialites_identifiees: [...new Set(transformedCompetitors.flatMap(c => c.specialites))]
    };
    
    const response = {
      searchType: 'competitor-identification',
      competitors: transformedCompetitors,
      totalFound: transformedCompetitors.length,
      cached: false,
      searchCriteria: {
        region_geographique: requestData.region_geographique,
        produits: requestData.produits,
        volume_production: requestData.volume_production,
      },
      statistics,
      hasCompetitors: transformedCompetitors.length > 0,
      debug: {
        competitorsFound: transformedCompetitors.length,
        searchComplete: true,
        criteriaUsed: searchRequest,
        originalResults: [{
          success: singleResult.success,
          competitorCount: singleResult.competitors?.length || 0,
          error: singleResult.error
        }],
      }
    };
    
    console.log('✅ Identification concurrents terminée:', 
      `${transformedCompetitors.length} concurrents pour ${requestData.region_geographique}`);
    
    await setCachedResult(cacheKey, response, 172800);
    
    return NextResponse.json(response);
    
  } catch (error: any) {
    console.error('❌ Erreur globale dans /api/competitor-identification:', error);
    
    if (error.message?.includes('timed out')) {
      return NextResponse.json(
        { 
          error: 'Timeout de l\'identification des concurrents',
          details: 'La recherche a pris trop de temps. Veuillez réessayer.',
          type: 'timeout'
        },
        { status: 408 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Erreur interne du serveur', 
        details: process.env.NODE_ENV === 'development' ? error.message : 'Une erreur inattendue est survenue.',
        type: 'internal_server_error'
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
    const produits = searchParams.get('produits');
    const volume = searchParams.get('volume');
    const multiple = searchParams.get('multiple');
    const additional = searchParams.get('additional');
    
    if (!region || !produits || !volume) {
      return NextResponse.json(
        { error: 'Région géographique, produits et volume de production requis' },
        { status: 400 }
      );
    }
    
    const cacheKeyParams = [
      `region-${region}`,
      `produits-${produits}`,
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
