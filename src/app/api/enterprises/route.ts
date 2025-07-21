// app/api/enterprises/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PerplexityEnterpriseClient } from '@/lib/perplexity';
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

interface EnterpriseSearchData {
  secteursActivite: string[];
  zoneGeographique: string[];
  tailleEntreprise?: string;
  motsCles?: string;
  produitsCGR?: string[];
  volumePieces?: number[];
  clientsExclure?: string;
  usinesCGR?: string[];
  nombreResultats?: number;
}

// Fixed score calculation for a score out of 10
const calculateScore = (enterprise: Enterprise): number => {
  let score = 0;
  
  // Products targeted at prospect (max 3 points)
  const targetedProducts = enterprise.potentiel_cgr.produits_cibles_chez_le_prospect.length;
  score += Math.min(3, targetedProducts * 0.5);
  
  // CGR products to propose (max 3 points)
  const cgrProducts = enterprise.potentiel_cgr.produits_cgr_a_proposer.length;
  score += Math.min(3, cgrProducts * 0.5);
  
  // Quality of approach argument (max 3 points)
  const argumentLength = enterprise.potentiel_cgr.argumentaire_approche.length;
  if (argumentLength > 200) {
    score += 3;
  } else if (argumentLength > 100) {
    score += 2;
  } else if (argumentLength > 50) {
    score += 1;
  }
  
  // Base score (1 point for having basic info)
  score += 1;
  
  // Round to 1 decimal place
  return Math.round(score * 10) / 10;
};

export async function POST(request: NextRequest) {
  try {
    const searchData: EnterpriseSearchData = await request.json();
    
    // Enhanced validation
    if (!searchData.secteursActivite || searchData.secteursActivite.length === 0) {
      return NextResponse.json(
        { error: 'Au moins un secteur d\'activité requis' },
        { status: 400 }
      );
    }
    
    if (!searchData.zoneGeographique || searchData.zoneGeographique.length === 0) {
      return NextResponse.json(
        { error: 'Zone géographique requise' },
        { status: 400 }
      );
    }
    
    console.log('🆕 Recherche entreprises CGR demandée:', JSON.stringify(searchData, null, 2));
    
    // Check cache with better key generation
    const cacheKey = generateCacheKey(
      searchData.produitsCGR?.join(',') || 'default',
      searchData.zoneGeographique.join(',') || 'global',
      [
        searchData.secteursActivite.join(','),
        searchData.motsCles || '',
        searchData.tailleEntreprise || ''
      ].filter(Boolean)
    );
    
    const cachedResult = await getCachedResult(cacheKey);
    if (cachedResult) {
      console.log('⚡ Résultat en cache trouvé');
      return NextResponse.json({ ...cachedResult, cached: true });
    }
    
    // Initialize Perplexity client
    const perplexityClient = new PerplexityEnterpriseClient();
    
    // Search enterprises with Perplexity (with timeout)
    console.log('🔍 Recherche entreprises avec Perplexity...');
    const enterpriseResult = await withTimeout(
      perplexityClient.searchEnterprises({
        ...searchData,
        tailleEntreprise: searchData.tailleEntreprise || 'Toutes tailles',
        motsCles: searchData.motsCles || '',
        produitsCGR: searchData.produitsCGR || [],
        volumePieces: searchData.volumePieces || [],
        clientsExclure: searchData.clientsExclure || '',
        usinesCGR: searchData.usinesCGR || [],
        nombreResultats: searchData.nombreResultats || 5
      }),
      180000
    );
    
    if (!enterpriseResult.success) {
      return NextResponse.json({ 
        error: 'Erreur lors de la recherche d\'entreprises',
        details: enterpriseResult.error,
        type: 'enterprise_search_error'
      }, { status: 500 });
    }
    
    if (enterpriseResult.enterprises.length === 0) {
      return NextResponse.json({ 
        error: 'Aucune entreprise trouvée avec les critères spécifiés',
        type: 'no_results'
      }, { status: 404 });
    }
    
    console.log(`✅ ${enterpriseResult.enterprises.length} entreprises trouvées`);
    console.log('📋 Entreprises:', enterpriseResult.enterprises.map((e: Enterprise) => e.nom_entreprise));
    
    // Create final prospects
    const finalProspects: FinalProspect[] = enterpriseResult.enterprises.map((enterprise: Enterprise) => {
      console.log(`🔗 Création prospect pour ${enterprise.nom_entreprise}`);
      
      // Calculate score using the new function (out of 10)
      const score = calculateScore(enterprise);
      
      console.log(`📊 Score calculé pour ${enterprise.nom_entreprise}: ${score}/10`);
      console.log(`   - Produits ciblés: ${enterprise.potentiel_cgr.produits_cibles_chez_le_prospect.length}`);
      console.log(`   - Produits CGR à proposer: ${enterprise.potentiel_cgr.produits_cgr_a_proposer.length}`);
      console.log(`   - Longueur argumentaire: ${enterprise.potentiel_cgr.argumentaire_approche.length} caractères`);
      
      return {
        company: enterprise.nom_entreprise,
        sector: enterprise.description_activite,
        size: searchData.tailleEntreprise || 'Non spécifié',
        address: 'À identifier',
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
    });
    
    // Sort by score (descending)
    finalProspects.sort((a, b) => b.score - a.score);
    
    // Statistics
    console.log('📊 Statistiques finales:');
    console.log(`  - Entreprises trouvées: ${finalProspects.length}`);
    console.log(`  - Score moyen: ${(finalProspects.reduce((sum, p) => sum + p.score, 0) / finalProspects.length).toFixed(1)}/10`);
    console.log(`  - Score le plus élevé: ${finalProspects[0]?.score}/10`);
    console.log(`  - Score le plus bas: ${finalProspects[finalProspects.length - 1]?.score}/10`);
    
    const response = {
      searchType: 'entreprises',
      prospects: finalProspects,
      totalFound: finalProspects.length,
      cached: false,
      sources: finalProspects.flatMap(p => p.sources).filter(Boolean),
      debug: {
        companiesFound: enterpriseResult.enterprises.length,
        enterpriseDetails: finalProspects.map(p => ({
          company: p.company,
          score: p.score,
          website: p.website
        })),
        scoreStats: {
          average: Math.round((finalProspects.reduce((sum, p) => sum + p.score, 0) / finalProspects.length) * 10) / 10,
          highest: finalProspects[0]?.score || 0,
          lowest: finalProspects[finalProspects.length - 1]?.score || 0
        }
      }
    };
    
    // Save to cache
    if (finalProspects.length > 0) {
      await setCachedResult(cacheKey, response, 2592000); // 30 days cache
      console.log('💾 Résultats sauvegardés en cache');
    }
    
    console.log('✅ Recherche entreprises terminée:', finalProspects.length, 'prospects trouvés');
    return NextResponse.json(response);
    
  } catch (error: any) {
    console.error('❌ Erreur recherche entreprises:', error);
    
    // Enhanced error handling with specific error types
    if (error.message?.includes('timed out')) {
      return NextResponse.json(
        { 
          error: 'Timeout de la recherche d\'entreprises',
          details: 'La recherche d\'entreprises a pris trop de temps. Veuillez réessayer avec des critères plus spécifiques.',
          type: 'timeout'
        },
        { status: 408 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Erreur lors de la recherche entreprises', 
        details: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne du serveur',
        type: 'enterprise_search_error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for retrieving cached enterprise searches
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sector = searchParams.get('sector');
    const location = searchParams.get('location');
    
    if (!sector || !location) {
      return NextResponse.json(
        { error: 'Secteur et localisation requis' },
        { status: 400 }
      );
    }
    
    const cacheKey = generateCacheKey(
      'default',
      location,
      [sector]
    );
    
    const cachedResult = await getCachedResult(cacheKey);
    
    if (cachedResult) {
      return NextResponse.json({ ...cachedResult, cached: true });
    } else {
      return NextResponse.json(
        { error: 'Aucune recherche en cache pour ces critères' },
        { status: 404 }
      );
    }
    
  } catch (error: any) {
    console.error('❌ Erreur récupération cache entreprises:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du cache' },
      { status: 500 }
    );
  }
}