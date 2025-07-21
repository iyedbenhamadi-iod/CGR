// app/api/competitors/route.ts
import { NextRequest, NextResponse } from 'next/server';
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

interface CompetitorRequest {
  nomConcurrent: string;
  includeAnalysis?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const requestData: CompetitorRequest = await request.json();
    
    // Enhanced validation
    if (!requestData.nomConcurrent) {
      return NextResponse.json(
        { error: 'Nom du concurrent requis' },
        { status: 400 }
      );
    }
    
    console.log('🏢 Recherche concurrent demandée:', JSON.stringify(requestData, null, 2));
    
    // Check cache
    const cacheKey = generateCacheKey(
      `competitor-${requestData.nomConcurrent}`,
      'analysis',
      [`competitor-${Date.now()}`]
    );
    
    const cachedResult = await getCachedResult(cacheKey);
    if (cachedResult) {
      console.log('⚡ Résultat concurrent en cache trouvé');
      return NextResponse.json({ ...cachedResult, cached: true });
    }
    
    // Analyze competitor with timeout
    const competitorClient = new CompetitorAnalysisClient();
    const competitorResult = await withTimeout(
      competitorClient.analyzeCompetitor(requestData.nomConcurrent),
      120000 // 2 minutes for competitor analysis
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
    
    // Transform the analysis to match frontend expectations
    const transformedAnalysis = {
      nom_entreprise: requestData.nomConcurrent,
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
      competitorAnalysis: transformedAnalysis,
      totalFound: 1,
      cached: false,
      sources: transformedAnalysis.sources,
      hasCompetitorAnalysis: true,
      debug: {
        competitorAnalyzed: requestData.nomConcurrent,
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
    console.log('✅ Analyse concurrent terminée:', requestData.nomConcurrent);
    
    return NextResponse.json(response);
    
  } catch (error: any) {
    console.error('❌ Erreur analyse concurrent:', error);
    
    // Enhanced error handling with specific error types
    if (error.message?.includes('timed out')) {
      return NextResponse.json(
        { 
          error: 'Timeout de l\'analyse concurrent',
          details: 'L\'analyse du concurrent a pris trop de temps. Veuillez réessayer.',
          type: 'timeout'
        },
        { status: 408 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Erreur lors de l\'analyse concurrent', 
        details: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne du serveur',
        type: 'competitor_analysis_error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for retrieving cached competitor analyses
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const competitorName = searchParams.get('name');
    
    if (!competitorName) {
      return NextResponse.json(
        { error: 'Nom du concurrent requis' },
        { status: 400 }
      );
    }
    
    const cacheKey = generateCacheKey(
      `competitor-${competitorName}`,
      'analysis',
      [`competitor-${Date.now()}`]
    );
    
    const cachedResult = await getCachedResult(cacheKey);
    
    if (cachedResult) {
      return NextResponse.json({ ...cachedResult, cached: true });
    } else {
      return NextResponse.json(
        { error: 'Aucune analyse en cache pour ce concurrent' },
        { status: 404 }
      );
    }
    
  } catch (error: any) {
    console.error('❌ Erreur récupération cache concurrent:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du cache' },
      { status: 500 }
    );
  }
}