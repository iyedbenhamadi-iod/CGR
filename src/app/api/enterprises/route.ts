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
  secteurActiviteLibre?: string;
  zoneGeographiqueLibre?: string
}

// Fixed score calculation for a score out of 10
// Fonction de scoring corrigée pour une échelle de 0 à 10
const calculateScore = (enterprise: Enterprise): number => {
  let score = 0;
  
  // 1. Produits ciblés chez le prospect (max 3 points)
  const targetedProducts = enterprise.potentiel_cgr.produits_cibles_chez_le_prospect.length;
  if (targetedProducts >= 4) {
    score += 3;
  } else if (targetedProducts >= 2) {
    score += 2;
  } else if (targetedProducts >= 1) {
    score += 1;
  }
  
  // 2. Produits CGR à proposer (max 3 points)
  const cgrProducts = enterprise.potentiel_cgr.produits_cgr_a_proposer.length;
  if (cgrProducts >= 4) {
    score += 3;
  } else if (cgrProducts >= 2) {
    score += 2;
  } else if (cgrProducts >= 1) {
    score += 1;
  }
  
  // 3. Qualité de l'argumentaire d'approche (max 3 points)
  const argumentLength = enterprise.potentiel_cgr.argumentaire_approche.length;
  if (argumentLength > 300) {
    score += 3;
  } else if (argumentLength > 150) {
    score += 2;
  } else if (argumentLength > 50) {
    score += 1;
  }
  
  // 4. Bonus pour la diversité des produits de l'entreprise (max 1 point)
  const companyProducts = enterprise.produits_entreprise.length;
  if (companyProducts >= 5) {
    score += 1;
  } else if (companyProducts >= 3) {
    score += 0.5;
  }
  
  // 5. Bonus pour l'identification du fournisseur actuel (max 1 point)
  if (enterprise.fournisseur_actuel_estimation && 
      enterprise.fournisseur_actuel_estimation !== 'Non identifié' &&
      enterprise.fournisseur_actuel_estimation.length > 10) {
    score += 1;
  }
  
  // 6. Bonus pour la qualité des sources (max 1 point)
  const sourcesCount = enterprise.sources?.length || 0;
  if (sourcesCount >= 3) {
    score += 1;
  } else if (sourcesCount >= 2) {
    score += 0.5;
  }
  
  // 7. Bonus pour la présence d'un site web (max 0.5 point)
  if (enterprise.site_web && enterprise.site_web !== 'Non disponible') {
    score += 0.5;
  }
  
  // 8. Bonus pour la qualité de la description d'activité (max 0.5 point)
  if (enterprise.description_activite && enterprise.description_activite.length > 100) {
    score += 0.5;
  }
  
  // Assurer que le score reste entre 0 et 10
  score = Math.min(10, Math.max(0, score));
  
  // Arrondir à 1 décimale
  return Math.round(score * 10) / 10;
};

// Version alternative avec pondération différente
const calculateScoreAlternative = (enterprise: Enterprise): number => {
  let score = 0;
  
  // Critères principaux (70% du score - 7 points max)
  
  // Adéquation produits (4 points max - 40% du score)
  const targetedProducts = enterprise.potentiel_cgr.produits_cibles_chez_le_prospect.length;
  const cgrProducts = enterprise.potentiel_cgr.produits_cgr_a_proposer.length;
  const productMatch = Math.min(4, (targetedProducts + cgrProducts) * 0.4);
  score += productMatch;
  
  // Qualité de l'approche commerciale (3 points max - 30% du score)
  const argumentLength = enterprise.potentiel_cgr.argumentaire_approche.length;
  if (argumentLength > 250) {
    score += 3;
  } else if (argumentLength > 150) {
    score += 2;
  } else if (argumentLength > 80) {
    score += 1.5;
  } else if (argumentLength > 30) {
    score += 1;
  }
  
  // Critères secondaires (30% du score - 3 points max)
  
  // Informations disponibles sur l'entreprise (1.5 points max)
  let infoBonus = 0;
  if (enterprise.site_web && enterprise.site_web !== 'Non disponible') infoBonus += 0.5;
  if (enterprise.produits_entreprise.length >= 3) infoBonus += 0.5;
  if (enterprise.fournisseur_actuel_estimation && enterprise.fournisseur_actuel_estimation !== 'Non identifié') infoBonus += 0.5;
  score += infoBonus;
  
  // Qualité des sources (1.5 points max)
  const sourcesCount = enterprise.sources?.length || 0;
  const sourceBonus = Math.min(1.5, sourcesCount * 0.3);
  score += sourceBonus;
  
  // Assurer que le score reste entre 0 et 10
  score = Math.min(10, Math.max(0, score));
  
  return Math.round(score * 10) / 10;
};

export async function POST(request: NextRequest) {
    try {
        const searchData: EnterpriseSearchData = await request.json();
        
        // --- NOUVELLE VALIDATION CORRIGÉE ---
        const hasPredefinedSectors = searchData.secteursActivite && searchData.secteursActivite.length > 0;
        const hasFreeTextSector = searchData.secteurActiviteLibre && searchData.secteurActiviteLibre.trim() !== '';

        if (!hasPredefinedSectors && !hasFreeTextSector) {
            return NextResponse.json(
                { error: "Au moins un secteur d'activité (prédéfini ou libre) est requis." },
                { status: 400 }
            );
        }

        const hasPredefinedZone = searchData.zoneGeographique && searchData.zoneGeographique.length > 0;
        const hasFreeTextZone = searchData.zoneGeographiqueLibre && searchData.zoneGeographiqueLibre.trim() !== '';

        if (!hasPredefinedZone && !hasFreeTextZone) {
            return NextResponse.json(
                { error: 'Au moins une zone géographique (prédéfinie ou libre) est requise.' },
                { status: 400 }
            );
        }
        // --- FIN DE LA VALIDATION ---
        
        console.log('🆕 Recherche entreprises CGR demandée:', JSON.stringify(searchData, null, 2));
        
        const cacheKey = generateCacheKey(
    searchData.produitsCGR?.join(',') || 'default',
    [searchData.zoneGeographique.join(','), searchData.zoneGeographiqueLibre].filter(Boolean).join(','),
    [
        searchData.secteursActivite.join(','),
        searchData.secteurActiviteLibre,
        searchData.motsCles,
        searchData.tailleEntreprise
    ].filter(Boolean) as string[] // FIX: On confirme à TypeScript que le tableau ne contient que des strings
);
        
        const cachedResult = await getCachedResult(cacheKey);
        if (cachedResult) {
            console.log('⚡ Résultat en cache trouvé');
            return NextResponse.json({ ...cachedResult, cached: true });
        }
        
        const perplexityClient = new PerplexityEnterpriseClient();
        
        console.log('🔍 Recherche entreprises avec Perplexity...');
        const enterpriseResult = await withTimeout(
            perplexityClient.searchEnterprises({
                ...searchData,
                // Transmission des champs libres
                secteurActiviteLibre: searchData.secteurActiviteLibre || '',
                zoneGeographiqueLibre: searchData.zoneGeographiqueLibre || '',
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
        
        // ... le reste de la fonction est inchangé ...

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
        
        const finalProspects: FinalProspect[] = enterpriseResult.enterprises.map((enterprise: Enterprise) => {
            console.log(`🔗 Création prospect pour ${enterprise.nom_entreprise}`);
            
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
        
        finalProspects.sort((a, b) => b.score - a.score);
        
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
        
        if (finalProspects.length > 0) {
            await setCachedResult(cacheKey, response, 2592000); // 30 days cache
            console.log('💾 Résultats sauvegardés en cache');
        }
        
        console.log('✅ Recherche entreprises terminée:', finalProspects.length, 'prospects trouvés');
        return NextResponse.json(response);
        
    } catch (error: any) {
        console.error('❌ Erreur recherche entreprises:', error);
        
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