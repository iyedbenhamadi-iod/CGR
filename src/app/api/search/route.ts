import { NextRequest, NextResponse } from 'next/server';
import { PerplexityEnterpriseClient } from '@/lib/perplexity';
import { OpenAIBrainstormingClient } from '@/lib/openai';
import { CompetitorAnalysisClient } from '@/lib/competitors';
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

interface EnhancedSearchData {
  typeRecherche: 'entreprises' | 'brainstorming' | 'concurrent';
  secteursActivite: string[];
  zoneGeographique: string[];
  tailleEntreprise: string;
  motsCles: string;
  produitsCGR: string[];
  volumePieces: number[];
  clientsExclure: string;
  usinesCGR: string[];
  nombreResultats: number;
  nomConcurrent?: string;
  nomEntreprise?: string;
  siteWebEntreprise?: string;
  includeMarketAnalysis?: boolean;
  includeCompetitorAnalysis?: boolean;
  competitorNames?: string[];
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
    
    // Add timeout to the main handler
    const result = await withTimeout(
      handleSearchRequest(searchData),
      250000 // 25 seconds timeout
    );
    
    return result;
    
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

async function handleSearchRequest(searchData: EnhancedSearchData) {
  switch (searchData.typeRecherche) {
    case 'brainstorming':
      return await handleBrainstormingSearch(searchData);
    case 'concurrent':
      return await handleCompetitorSearch(searchData);
    case 'entreprises':
    default:
      return await handleEnterpriseSearch(searchData);
  }
}

async function handleBrainstormingSearch(searchData: EnhancedSearchData) {
  try {
    console.log('🧠 Recherche brainstorming...');
    
    // Enhanced validation
    if (!searchData.secteursActivite || searchData.secteursActivite.length === 0) {
      return NextResponse.json(
        { error: 'Au moins un secteur d\'activité requis pour le brainstorming' },
        { status: 400 }
      );
    }
    
    // Check cache with better key generation
    const cacheKey = generateCacheKey(
      `brainstorming-${searchData.secteursActivite.join(',')}`,
      searchData.zoneGeographique?.join(',') || 'global',
      [`brainstorming-${Date.now()}`]
    );
    
    const cachedResult = await getCachedResult(cacheKey);
    if (cachedResult) {
      console.log('⚡ Résultat brainstorming en cache trouvé');
      return NextResponse.json({ ...cachedResult, cached: true });
    }
    
    // Prepare data with defaults
    const brainstormingData = {
      secteursActivite: searchData.secteursActivite,
      zoneGeographique: searchData.zoneGeographique || ['France'],
      produitsCGR: searchData.produitsCGR && searchData.produitsCGR.length > 0 
        ? searchData.produitsCGR 
        : ['Ressorts fil', 'Ressorts plats', 'Pièces découpées', 'Formage de tubes', 'Assemblages automatisés', 'Mécatronique', 'Injection plastique'],
      clientsExclure: searchData.clientsExclure || ''
    };
    
    console.log('📋 Données brainstorming:', brainstormingData);
    
    // Generate market analysis with OpenAI (with timeout)
    const openaiClient = new OpenAIBrainstormingClient();
    const marketResult = await withTimeout(
      openaiClient.generateMarketBrainstorming(brainstormingData),
      300000 // 15 seconds for brainstorming
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
        originalProduitsCGR: searchData.produitsCGR,
        usedDefaultProducts: !searchData.produitsCGR || searchData.produitsCGR.length === 0
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

async function handleCompetitorSearch(searchData: EnhancedSearchData) {
  try {
    console.log('🏢 Recherche concurrent...');
    
    if (!searchData.nomConcurrent) {
      return NextResponse.json(
        { error: 'Nom du concurrent requis' },
        { status: 400 }
      );
    }
    
    // Check cache
    const cacheKey = generateCacheKey(
      `competitor-${searchData.nomConcurrent}`,
      'analysis',
      [`competitor-${Date.now()}`]
    );
    
    const cachedResult = await getCachedResult(cacheKey);
    if (cachedResult) {
      console.log('⚡ Résultat concurrent en cache trouvé');
      return NextResponse.json({ ...cachedResult, cached: true });
    }
    
    // Analyze competitor with Perplexity (with timeout)
    const competitorClient = new CompetitorAnalysisClient();
    const competitorResult = await withTimeout(
      competitorClient.analyzeCompetitor(searchData.nomConcurrent),
      150000 // 15 seconds for competitor analysis
    );
    
    console.log('🔍 Résultat analyse concurrent:', {
      success: competitorResult.success,
      hasAnalysis: !!competitorResult.analysis,
      error: competitorResult.error
    });
    
    if (!competitorResult.success) {
      return NextResponse.json({ 
        error: 'Erreur lors de l\'analyse concurrent',
        details: competitorResult.error,
        type: 'competitor_analysis_error'
      }, { status: 500 });
    }
    
    // Fix: Make sure the structure matches what the frontend expects
    const transformedAnalysis = {
      nom_entreprise: searchData.nomConcurrent,
      synthese: competitorResult.analysis?.synthese_entreprise || competitorResult.analysis?.synthese || '',
      produits_services: competitorResult.analysis?.produits_services || [],
      marches_cibles: competitorResult.analysis?.marches_cibles || [],
      forces_apparentes: competitorResult.analysis?.forces_apparentes || [],
      faiblesses_potentielles: competitorResult.analysis?.faiblesses_potentielles || [],
      strategie_communication: competitorResult.analysis?.strategie_communication || '',
      sources: competitorResult.analysis?.sources || []
    };
    
    // Debug: Log the transformed analysis
    console.log('🔄 Analyse transformée:', JSON.stringify(transformedAnalysis, null, 2));
    
    const response = {
  searchType: 'concurrent',
  competitorAnalysis: transformedAnalysis, // This is correct
  totalFound: 1,
  cached: false,
  sources: transformedAnalysis.sources,
  // Add this for debugging
  hasCompetitorAnalysis: true, // Add this flag
  debug: {
    competitorAnalyzed: searchData.nomConcurrent,
    analysisComplete: true,
    originalAnalysis: competitorResult.analysis,
    transformedFields: {
      nom_entreprise: !!transformedAnalysis.nom_entreprise,
      synthese: !!transformedAnalysis.synthese,
      produits_services: transformedAnalysis.produits_services.length,
      marches_cibles: transformedAnalysis.marches_cibles.length,
      forces_apparentes: transformedAnalysis.forces_apparentes.length,
      faiblesses_potentielles: transformedAnalysis.faiblesses_potentielles.length,
      strategie_communication: !!transformedAnalysis.strategie_communication,
      sources: transformedAnalysis.sources.length
    }
  }
};
    
    // Debug: Log the final response structure
    console.log('📤 Réponse finale:', {
      searchType: response.searchType,
      hasCompetitorAnalysis: !!response.competitorAnalysis,
      competitorName: response.competitorAnalysis?.nom_entreprise,
      totalFound: response.totalFound
    });
    
    // Save to cache
    await setCachedResult(cacheKey, response, 86400); // 24h cache
    console.log('✅ Analyse concurrent terminée:', searchData.nomConcurrent);
    
    return NextResponse.json(response);
    
  } catch (error: any) {
    console.error('❌ Erreur analyse concurrent:', error);
    return NextResponse.json(
      { 
        error: 'Erreur lors de l\'analyse concurrent', 
        details: error.message,
        type: 'competitor_analysis_error'
      },
      { status: 500 }
    );
  }
}

async function handleEnterpriseSearch(searchData: EnhancedSearchData) {
  try {
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
    
    console.log('🆕 Recherche entreprises CGR...');
    
    // Check cache with better key generation
    const cacheKey = generateCacheKey(
      searchData.produitsCGR?.join(',') || 'default',
      searchData.zoneGeographique.join(',') || 'global',
      [
        searchData.secteursActivite.join(','),
        searchData.motsCles || '',
        searchData.tailleEntreprise || '',
        searchData.includeMarketAnalysis ? 'market' : '',
        searchData.includeCompetitorAnalysis ? 'competitor' : ''
      ].filter(Boolean)
    );
    
    const cachedResult = await getCachedResult(cacheKey);
    if (cachedResult) {
      console.log('⚡ Résultat en cache trouvé');
      return NextResponse.json({ ...cachedResult, cached: true });
    }
    
    // Initialize clients
    const perplexityClient = new PerplexityEnterpriseClient();
    const openaiClient = new OpenAIBrainstormingClient();
    const competitorClient = new CompetitorAnalysisClient();
    
    // Step 1: Search enterprises with Perplexity (with timeout)
    console.log('🔍 Recherche entreprises avec Perplexity...');
    const enterpriseResult = await withTimeout(
      perplexityClient.searchEnterprises(searchData),
      150000 // 15 seconds for enterprise search
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
    
    // Step 2: Optional market analysis (with timeout)
    let marketAnalysis = null;
    if (searchData.includeMarketAnalysis) {
      console.log('🧠 Génération d\'analyse de marché...');
      try {
        const brainstormingData = {
          secteursActivite: searchData.secteursActivite,
          zoneGeographique: searchData.zoneGeographique,
          produitsCGR: searchData.produitsCGR || [],
          clientsExclure: searchData.clientsExclure
        };
        
        const marketResult = await withTimeout(
          openaiClient.generateMarketBrainstorming(brainstormingData),
          80000 // 8 seconds for market analysis
        );
        
        if (marketResult.success) {
          marketAnalysis = marketResult.markets;
          console.log(`✅ ${marketResult.markets?.length || 0} opportunités de marché identifiées`);
        }
      } catch (error) {
        console.error('❌ Erreur analyse de marché (continuant sans analyse):', error);
      }
    }
    
    // Step 3: Optional competitor analysis (with timeout)
    let competitorAnalysis = null;
    if (searchData.includeCompetitorAnalysis && searchData.competitorNames?.length) {
      console.log('🏢 Analyse des concurrents...');
      competitorAnalysis = [];
      
      for (const competitorName of searchData.competitorNames) {
        try {
          console.log(`  - Analyse de ${competitorName}...`);
          const competitorResult = await withTimeout(
            competitorClient.analyzeCompetitor(competitorName),
            50000 // 5 seconds per competitor
          );
          
          if (competitorResult.success && competitorResult.analysis) {
            competitorAnalysis.push({
              name: competitorName,
              analysis: competitorResult.analysis
            });
            console.log(`    ✅ Analyse de ${competitorName} terminée`);
          }
        } catch (error) {
          console.error(`❌ Erreur analyse concurrent ${competitorName} (continuant):`, error);
        }
      }
    }
    
    // Step 4: Create final prospects (without contacts)
    const finalProspects: FinalProspect[] = enterpriseResult.enterprises.map((enterprise: Enterprise) => {
      console.log(`🔗 Création prospect pour ${enterprise.nom_entreprise}`);
      
      // Calculate score based on CGR potential
      const score = Math.min(90, 
        (enterprise.potentiel_cgr.produits_cibles_chez_le_prospect.length * 20) +
        (enterprise.potentiel_cgr.produits_cgr_a_proposer.length * 15) +
        (enterprise.potentiel_cgr.argumentaire_approche.length > 100 ? 25 : 10) +
        10 // Base score
      );
      
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
    console.log(`  - Analyse de marché: ${marketAnalysis ? 'Incluse' : 'Non demandée'}`);
    console.log(`  - Analyse concurrentielle: ${competitorAnalysis ? competitorAnalysis.length + ' concurrents' : 'Non demandée'}`);
    
    const response = {
      searchType: 'entreprises',
      prospects: finalProspects,
      totalFound: finalProspects.length,
      cached: false,
      sources: finalProspects.flatMap(p => p.sources).filter(Boolean),
      marketAnalysis: marketAnalysis,
      competitorAnalysis: competitorAnalysis,
      debug: {
        companiesFound: enterpriseResult.enterprises.length,
        marketOpportunities: marketAnalysis?.length || 0,
        competitorsAnalyzed: competitorAnalysis?.length || 0,
        enterpriseDetails: finalProspects.map(p => ({
          company: p.company,
          score: p.score,
          website: p.website
        }))
      }
    };
    
    // Save to cache
    if (finalProspects.length > 0) {
      await setCachedResult(cacheKey, response, 2592000); // 30 days cache
      console.log('💾 Résultats sauvegardés en cache');
    }
    
    console.log('✅ Recherche CGR terminée:', finalProspects.length, 'prospects trouvés');
    return NextResponse.json(response);
    
  } catch (error: any) {
    console.error('❌ Erreur recherche entreprises:', error);
    return NextResponse.json(
      { 
        error: 'Erreur lors de la recherche entreprises', 
        details: error.message,
        type: 'enterprise_search_error'
      },
      { status: 500 }
    );
  }
}