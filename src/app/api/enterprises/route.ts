// app/api/enterprises/route.ts - Complete implementation with sonar-deep-research
import { NextRequest, NextResponse } from 'next/server';
import { PerplexityEnterpriseClient } from '@/lib/perplexity';
import { getCachedResult, setCachedResult, generateCacheKey } from '@/lib/cache';

// Type definitions
interface Enterprise {
  nom_entreprise: string;
  site_web: string;
  description_activite: string;
  produits_entreprise: string[];
  potentiel_cgr: {
    produits_cibles_chez_le_prospect: string[];
    produits_cgr_a_proposer: string[];
    argumentaire_approche: string;
  };
  fournisseur_actuel_estimation: string;
  sources: string[];
  taille_entreprise: string;
  zone_geographique: string;
}

interface EnterpriseSearchData {
  secteursActivite: string[];
  zoneGeographique: string[];
  tailleEntreprise: string;
  motsCles: string;
  produitsCGR: string[];
  clientsExclure: string;
  usinesCGR: string[];
  nombreResultats: number;
  typeRecherche?: string;
  secteurActiviteLibre?: string;
  zoneGeographiqueLibre?: string;
  autresProduits?: string;
}

interface FinalProspect {
  company: string;
  sector: string;
  size: string;
  address: string;
  website: string;
  score: number;
  reason: string;
  sources: string[];
  cgrData?: {
    produits_cibles_chez_le_prospect: string[];
    produits_cgr_a_proposer: string[];
    fournisseur_actuel_estimation: string;
    produits_entreprise: string[];
  };
}

interface SearchRequest {
  secteursActivite?: string[];
  zoneGeographique?: string[];
  tailleEntreprise?: string;
  motsCles?: string;
  produitsCGR?: string[];
  autresProduits?: string;
  clientsExclure?: string;
  usinesCGR?: string[];
  nombreResultats?: number;
  secteurActiviteLibre?: string;
  zoneGeographiqueLibre?: string;
}

interface EnterpriseResult {
  enterprises: Enterprise[];
  total: number;
  success: boolean;
  error?: string;
}

// Optimized timeout wrapper with cancellation
const createTimeoutPromise = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timeoutHandle: NodeJS.Timeout;
  
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([
    promise.finally(() => clearTimeout(timeoutHandle)),
    timeoutPromise
  ]);
};

// Enhanced scoring algorithm with stricter quality criteria
const calculateOptimizedScore = (enterprise: Enterprise): number => {
  let score = 0;

  // 1. Target products quality (0-3 points) - Increased weight
  const targetCount = enterprise.potentiel_cgr.produits_cibles_chez_le_prospect.length;
  if (targetCount >= 3) score += 3;
  else if (targetCount >= 2) score += 2;
  else if (targetCount >= 1) score += 1;

  // 2. CGR products to propose (0-2.5 points)
  const cgrCount = enterprise.potentiel_cgr.produits_cgr_a_proposer.length;
  score += Math.min(2.5, cgrCount * 0.8);

  // 3. Argument quality (0-2.5 points) - Stricter requirements
  const argumentLength = enterprise.potentiel_cgr.argumentaire_approche.length;
  const hasFactoryLocation = /usine|production|fabrication|manufacturing|plant|factory/i.test(enterprise.potentiel_cgr.argumentaire_approche);
  const hasSpecificProducts = /produits|composants|équipements/i.test(enterprise.potentiel_cgr.argumentaire_approche);
  
  if (argumentLength > 400 && hasFactoryLocation && hasSpecificProducts) {
    score += 2.5;
  } else if (argumentLength > 250 && (hasFactoryLocation || hasSpecificProducts)) {
    score += 1.8;
  } else if (argumentLength > 150) {
    score += 1;
  } else if (argumentLength > 80) {
    score += 0.5;
  }

  // 4. Company products diversity (0-1.5 points)
  const productCount = enterprise.produits_entreprise.length;
  score += Math.min(1.5, productCount * 0.3);

  // 5. Supplier identification (0-1 point) - More detailed
  const supplier = enterprise.fournisseur_actuel_estimation;
  if (supplier && supplier !== 'Non identifié' && supplier !== 'À identifier' && supplier !== 'Non spécifié') {
    if (supplier.length > 20 && supplier.includes(',')) {
      score += 1; // Multiple suppliers identified
    } else if (supplier.length > 10) {
      score += 0.7;
    } else {
      score += 0.3;
    }
  }

  // 6. Sources quality (0-0.5 points) - Stricter validation
  const sourcesCount = enterprise.sources?.length || 0;
  const hasQualitySources = enterprise.sources?.some(source => 
    source.includes('http') || source.includes('linkedin') || source.includes('societe.com')
  ) || false;
  
  if (sourcesCount >= 3 && hasQualitySources) {
    score += 0.5;
  } else if (sourcesCount >= 2) {
    score += 0.3;
  } else if (sourcesCount >= 1) {
    score += 0.1;
  }

  // 7. Website presence (0-0.3 points)
  if (enterprise.site_web && enterprise.site_web.startsWith('http')) {
    score += 0.3;
  }

  // 8. Description quality (0-0.2 points) - Manufacturing focus
  const hasManufacturingTerms = /fabricant|manufacturer|usine|production|conception/i.test(enterprise.description_activite);
  if (enterprise.description_activite.length > 150 && hasManufacturingTerms) {
    score += 0.2;
  } else if (hasManufacturingTerms) {
    score += 0.1;
  }

  // PENALTY: Reduce score for potential distributors/resellers
  const suspiciousTerms = /distributeur|revendeur|négociant|importateur|commercial|vente|distribution/i;
  if (suspiciousTerms.test(enterprise.description_activite) || 
      suspiciousTerms.test(enterprise.potentiel_cgr.argumentaire_approche)) {
    score -= 1.5;
  }

  // BONUS: Manufacturing indicators
  const manufacturingBonus = /R&D|recherche|développement|bureau d'études|ingénierie|conception/i;
  if (manufacturingBonus.test(enterprise.potentiel_cgr.argumentaire_approche)) {
    score += 0.5;
  }

  // Ensure score is between 0 and 10
  return Math.min(10, Math.max(0, Math.round(score * 10) / 10));
};

// Enhanced validation with manufacturing focus
const validateSearchRequest = (data: SearchRequest): { isValid: boolean; error?: string } => {
  // Check sectors
  const hasPredefinedSectors = data.secteursActivite?.some(s => s?.trim());
  const hasFreeTextSector = data.secteurActiviteLibre?.trim();
  
  if (!hasPredefinedSectors && !hasFreeTextSector) {
    return { isValid: false, error: "Au moins un secteur d'activité est requis" };
  }

  // Check zones
  const hasPredefinedZones = data.zoneGeographique?.some(z => z?.trim());
  const hasFreeTextZone = data.zoneGeographiqueLibre?.trim();
  
  if (!hasPredefinedZones && !hasFreeTextZone) {
    return { isValid: false, error: "Au moins une zone géographique est requise" };
  }

  // Validate requested number of results
  if (data.nombreResultats && data.nombreResultats > 15) {
    return { isValid: false, error: "Maximum 15 résultats autorisés par recherche" };
  }

  return { isValid: true };
};

// Cache key generator (removed volume references)
const generateOptimizedCacheKey = (data: SearchRequest): string => {
  const sectors = [
    ...(data.secteursActivite || []),
    ...(data.secteurActiviteLibre ? [data.secteurActiviteLibre.trim()] : [])
  ].filter(Boolean).sort().join(',');
  
  const zones = [
    ...(data.zoneGeographique || []),
    ...(data.zoneGeographiqueLibre ? [data.zoneGeographiqueLibre.trim()] : [])
  ].filter(Boolean).sort().join(',');
  
  const products = [
    ...(data.produitsCGR || []),
    ...(data.autresProduits ? [data.autresProduits.trim()] : [])
  ].filter(Boolean).sort().join(',');
  
  const keyComponents = [
    sectors,
    zones,
    products,
    data.tailleEntreprise || 'all',
    data.motsCles || '',
    String(data.nombreResultats || 10)
  ];
  
  return generateCacheKey(
    keyComponents[2], // products
    keyComponents[1], // zones
    keyComponents.slice(0, 1).concat(keyComponents.slice(3)) // sectors + other params
  );
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const searchData: SearchRequest = await request.json();
    
    // Ensure minimum of 10 results requested
    searchData.nombreResultats = Math.max(searchData.nombreResultats || 10, 10);
    
    console.log('🔍 Nouvelle recherche entreprises CGR avec Deep Research');
    console.log('📊 Paramètres reçus:', {
      secteurs: searchData.secteursActivite?.length || 0,
      secteurLibre: !!searchData.secteurActiviteLibre,
      zones: searchData.zoneGeographique?.length || 0,
      zoneLibre: !!searchData.zoneGeographiqueLibre,
      taille: searchData.tailleEntreprise,
      resultats: searchData.nombreResultats
    });

    // Validation
    const validation = validateSearchRequest(searchData);
    if (!validation.isValid) {
      console.log('❌ Validation échouée:', validation.error);
      return NextResponse.json(
        { error: validation.error, type: 'validation_error' },
        { status: 400 }
      );
    }

    // Cache check
    const cacheKey = generateOptimizedCacheKey(searchData);
    const cachedResult = await getCachedResult(cacheKey);
    if (cachedResult) {
      console.log('⚡ Résultat en cache trouvé');
      return NextResponse.json({ ...cachedResult, cached: true });
    }

    // Initialize Perplexity client
    const perplexityClient = new PerplexityEnterpriseClient();
    
    // Prepare search parameters (removed volumePieces)
    const searchParams: EnterpriseSearchData = {
      secteursActivite: searchData.secteursActivite?.filter(s => s?.trim()) || [],
      zoneGeographique: searchData.zoneGeographique?.filter(z => z?.trim()) || [],
      secteurActiviteLibre: searchData.secteurActiviteLibre?.trim() || '',
      zoneGeographiqueLibre: searchData.zoneGeographiqueLibre?.trim() || '',
      tailleEntreprise: searchData.tailleEntreprise || 'Toutes tailles',
      motsCles: [searchData.motsCles, searchData.autresProduits].filter(Boolean).join(' ').trim(),
      produitsCGR: searchData.produitsCGR?.filter(p => p?.trim()) || [],
      clientsExclure: searchData.clientsExclure || '',
      usinesCGR: searchData.usinesCGR?.filter(u => u?.trim()) || ['Saint-Yorre', 'PMPC', 'Igé'],
      nombreResultats: searchData.nombreResultats,
      autresProduits: searchData.autresProduits
    };

    console.log('🔍 Lancement recherche Perplexity Deep Research...');
    
    // Execute search with extended timeout for deep research
    const enterpriseResult: EnterpriseResult = await createTimeoutPromise(
      perplexityClient.searchEnterprises(searchParams),
      900000 // 15 minutes timeout for deep research
    );

    if (!enterpriseResult.success) {
      console.log('❌ Recherche échouée:', enterpriseResult.error);
      return NextResponse.json({
        error: 'Erreur lors de la recherche d\'entreprises',
        details: enterpriseResult.error,
        type: 'search_error'
      }, { status: 500 });
    }

    if (enterpriseResult.enterprises.length === 0) {
      console.log('❌ Aucune entreprise trouvée');
      return NextResponse.json({
        error: 'Aucune entreprise trouvée avec les critères spécifiés',
        type: 'no_results',
        suggestions: [
          'Utiliser le modèle sonar-deep-research pour une recherche plus approfondie',
          'Élargir la zone géographique',
          'Modifier les secteurs d\'activité',
          'Ajuster la taille d\'entreprise',
          'Réduire les critères d\'exclusion'
        ]
      }, { status: 404 });
    }

    console.log(`✅ ${enterpriseResult.enterprises.length} entreprises trouvées avant filtrage qualité`);

    // Transform and apply quality filtering
    let finalProspects: FinalProspect[] = enterpriseResult.enterprises
      .map((enterprise: Enterprise) => {
        const score = calculateOptimizedScore(enterprise);
        
        return {
          company: enterprise.nom_entreprise,
          sector: enterprise.description_activite,
          size: searchData.tailleEntreprise || 'Non spécifié',
          address: enterprise.zone_geographique || 'À identifier',
          website: enterprise.site_web,
          score: score,
          reason: enterprise.potentiel_cgr.argumentaire_approche,
          sources: enterprise.sources || [],
          cgrData: {
            produits_cibles_chez_le_prospect: enterprise.potentiel_cgr.produits_cibles_chez_le_prospect,
            produits_cgr_a_proposer: enterprise.potentiel_cgr.produits_cgr_a_proposer,
            fournisseur_actuel_estimation: enterprise.fournisseur_actuel_estimation,
            produits_entreprise: enterprise.produits_entreprise
          }
        };
      })
      .sort((a, b) => b.score - a.score);

    // If we have fewer than requested after quality filtering, keep lower-scored ones
    if (finalProspects.length < searchData.nombreResultats * 0.7) {
      console.log(`⚠️ Moins de prospects de qualité (${finalProspects.length}), inclusion de prospects score >= 2.0`);
      
      const additionalProspects = enterpriseResult.enterprises
        .map((enterprise: Enterprise) => {
          const score = calculateOptimizedScore(enterprise);
          return {
            company: enterprise.nom_entreprise,
            sector: enterprise.description_activite,
            size: searchData.tailleEntreprise || 'Non spécifié',
            address: enterprise.zone_geographique || 'À identifier',
            website: enterprise.site_web,
            score: score,
            reason: enterprise.potentiel_cgr.argumentaire_approche,
            sources: enterprise.sources || [],
            cgrData: {
              produits_cibles_chez_le_prospect: enterprise.potentiel_cgr.produits_cibles_chez_le_prospect,
              produits_cgr_a_proposer: enterprise.potentiel_cgr.produits_cgr_a_proposer,
              fournisseur_actuel_estimation: enterprise.fournisseur_actuel_estimation,
              produits_entreprise: enterprise.produits_entreprise
            }
          };
        })
        .filter(prospect => prospect.score >= 2.0 && prospect.score < 3.0)
        .sort((a, b) => b.score - a.score);
      
      finalProspects = [...finalProspects, ...additionalProspects];
    }

    // Limit to requested number
    finalProspects = finalProspects.slice(0, searchData.nombreResultats);

    // Calculate statistics
    const scores = finalProspects.map(p => p.score);
    const stats = {
      total: finalProspects.length,
      average: scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0,
      highest: Math.max(...scores, 0),
      lowest: Math.min(...scores, 10),
      qualityDistribution: {
        excellent: scores.filter(s => s >= 7).length,
        good: scores.filter(s => s >= 5 && s < 7).length,
        average: scores.filter(s => s >= 3 && s < 5).length,
        poor: scores.filter(s => s < 3).length
      },
      processingTime: Date.now() - startTime
    };

    console.log('📊 Statistiques qualité:', stats);

    const response = {
      searchType: 'entreprises' as const,
      prospects: finalProspects,
      totalFound: finalProspects.length,
      cached: false,
      sources: [...new Set(finalProspects.flatMap(p => p.sources))].slice(0, 20),
      stats: stats,
      debug: {
        searchParams: searchParams,
        cacheKey: cacheKey.substring(0, 50) + '...',
        processingTime: `${stats.processingTime}ms`,
        modelUsed: 'sonar-deep-research',
        qualityFiltering: 'Applied (minimum score 2.0)'
      }
    };

    // Cache successful results
    if (finalProspects.length > 0) {
      await setCachedResult(cacheKey, response, 2592000); // 30 days
      console.log('💾 Résultats sauvegardés en cache');
    }

    console.log(`✅ Recherche terminée: ${finalProspects.length} prospects qualifiés en ${stats.processingTime}ms`);
    return NextResponse.json(response);

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ Erreur recherche entreprises (${processingTime}ms):`, error.message);

    if (error.message?.includes('timed out')) {
      return NextResponse.json({
        error: 'Délai d\'attente dépassé pour la recherche approfondie',
        details: 'La recherche deep-research a pris trop de temps. Les résultats partiels peuvent être disponibles.',
        type: 'timeout',
        processingTime: processingTime
      }, { status: 408 });
    }

    return NextResponse.json({
      error: 'Erreur interne du serveur',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Une erreur inattendue s\'est produite',
      type: 'internal_error',
      processingTime: processingTime
    }, { status: 500 });
  }
}

// GET endpoint for cache retrieval and health check
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sector = searchParams.get('sector');
    const location = searchParams.get('location');
    const action = searchParams.get('action');

    // Health check endpoint
    if (action === 'health') {
      return NextResponse.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '2.1.0',
        modelUsed: 'sonar-deep-research'
      });
    }

    // Cache retrieval
    if (sector && location) {
      const cacheKey = generateCacheKey('default', location, [sector]);
      const cachedResult = await getCachedResult(cacheKey);
      
      if (cachedResult) {
        return NextResponse.json({
          ...cachedResult,
          cached: true,
          retrieved: new Date().toISOString()
        });
      } else {
        return NextResponse.json({
          error: 'Aucune recherche en cache pour ces critères',
          type: 'cache_miss'
        }, { status: 404 });
      }
    }

    return NextResponse.json({
      error: 'Paramètres manquants',
      required: ['sector', 'location'],
      type: 'missing_params'
    }, { status: 400 });

  } catch (error: any) {
    console.error('❌ Erreur GET /api/enterprises:', error);
    return NextResponse.json({
      error: 'Erreur lors de la récupération',
      type: 'retrieval_error'
    }, { status: 500 });
  }
}