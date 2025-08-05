// app/api/search/route.ts (Updated with competitor identification integration)
import { NextRequest, NextResponse } from 'next/server';

interface EnhancedSearchData {
  typeRecherche: 'entreprises' | 'brainstorming' | 'concurrent' | 'contacts' | 'competitor-identification' | 'identification_concurrents';
  secteursActivite: string[];
  zoneGeographique: string[];
  tailleEntreprise?: string;
  motsCles?: string;
  produitsCGR?: string[];
  autresProduits?: string; // Add this line after produitsCGR

  volumePieces?: number[];
  clientsExclure?: string;
  usinesCGR?: string[];
  nombreResultats?: number;
  nomConcurrent?: string;
  nomEntreprise?: string;
  siteWebEntreprise?: string;
  includeMarketAnalysis?: boolean;
  includeCompetitorAnalysis?: boolean;
  secteurActiviteLibre?: string;
  zoneGeographiqueLibre?: string;
  competitorNames?: string[];
  posteRecherche?: string;
  secteurActivite?: string;
  includeEmails?: boolean;
  includeLinkedIn?: boolean;
  contactRoles?: string[]; // New field for contact roles
  // New fields for competitor identification
  regionGeographique?: string;
  regionPersonnalisee?: string;
  typeProduitConcurrent?: 'ressort_fil' | 'ressort_feuillard' | 'piece_plastique';
  volumeProductionConcurrent?: 'petite_serie' | 'moyenne_serie' | 'grande_serie';
  nombreConcurrents?: number;
  criteresAdditionnels?: string;
  rechercheMultiple?: boolean;
  criteresSupplementaires?: {
    region_geographique: string;
    produit: 'ressort_fil' | 'ressort_feuillard' | 'piece_plastique';
    volume_production: 'petite_serie' | 'moyenne_serie' | 'grande_serie';
  }[];
}

// Enhanced request queue with proper user isolation
class RequestQueue {
  private static instance: RequestQueue;
  private activeRequests: Map<string, Promise<any>> = new Map();
  private requestCount: number = 0;
  private readonly MAX_CONCURRENT_REQUESTS = 10;

  static getInstance(): RequestQueue {
    if (!RequestQueue.instance) {
      RequestQueue.instance = new RequestQueue();
    }
    return RequestQueue.instance;
  }

  async executeRequest<T>(
    requestId: string,
    requestFn: () => Promise<T>,
    timeout: number = 180000,
    allowDeduplication: boolean = false // New parameter to control deduplication
  ): Promise<T> {
    // Only deduplicate if explicitly allowed (for same user requests)
    if (allowDeduplication && this.activeRequests.has(requestId)) {
      console.log(`🔄 Request ${requestId} already in progress, waiting for result`);
      return this.activeRequests.get(requestId);
    }

    // Wait if too many concurrent requests
    while (this.requestCount >= this.MAX_CONCURRENT_REQUESTS) {
      console.log(`⏳ Queue full, waiting... (${this.requestCount}/${this.MAX_CONCURRENT_REQUESTS})`);
      await this.delay(1000);
    }

    this.requestCount++;
    console.log(`🚀 Starting request ${requestId} (${this.requestCount}/${this.MAX_CONCURRENT_REQUESTS})`);

    const requestPromise = this.withTimeout(requestFn(), timeout)
      .finally(() => {
        this.requestCount--;
        this.activeRequests.delete(requestId);
        console.log(`✅ Completed request ${requestId} (${this.requestCount}/${this.MAX_CONCURRENT_REQUESTS})`);
      });

    // Only store in cache if deduplication is allowed
    if (allowDeduplication) {
      this.activeRequests.set(requestId, requestPromise);
    }
    
    return requestPromise;
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Generate user-specific request ID
function generateRequestId(searchData: EnhancedSearchData, userId?: string): string {
  const key = {
    userId: userId || 'anonymous',
    timestamp: Date.now(),
    type: searchData.typeRecherche,
    sectors: searchData.secteursActivite?.sort(),
    secteurLibre: searchData.secteurActiviteLibre, // Nouveau
    zone: searchData.zoneGeographique?.sort(),
    zoneLibre: searchData.zoneGeographiqueLibre, // Nouveau
    size: searchData.tailleEntreprise,
    keywords: searchData.motsCles,
    products: searchData.produitsCGR?.sort(),
    competitor: searchData.nomConcurrent,
    company: searchData.nomEntreprise,
    regionGeo: searchData.regionGeographique,
    regionCustom: searchData.regionPersonnalisee,
    productType: searchData.typeProduitConcurrent,
    volumeType: searchData.volumeProductionConcurrent,
    competitorCount: searchData.nombreConcurrents
,    autresProduits: searchData.autresProduits // Add this line after products

  };
  
  return Buffer.from(JSON.stringify(key)).toString('base64').slice(0, 32);
}

// Extract user ID from request (multiple strategies)
function getUserId(request: NextRequest): string {
  // Strategy 1: From Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    // Extract user ID from JWT or session token
    try {
      // If using JWT, decode it here
      // const token = authHeader.replace('Bearer ', '');
      // const decoded = jwt.decode(token);
      // return decoded.userId;
      return authHeader.replace('Bearer ', '').slice(0, 16); // Simple fallback
    } catch (e) {
      console.warn('Failed to decode auth token');
    }
  }

  // Strategy 2: From custom header
  const customUserId = request.headers.get('x-user-id');
  if (customUserId) {
    return customUserId;
  }

  // Strategy 3: From IP + User-Agent (fallback)
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  // Create a simple hash from IP + User-Agent
  const fallbackId = Buffer.from(`${ip}-${userAgent}`).toString('base64').slice(0, 16);
  
  console.log(`🔍 Generated fallback user ID: ${fallbackId} (IP: ${ip})`);
  return fallbackId;
}

// Enhanced error handling with retry logic
async function makeApiCall(
  url: string, 
  body: any, 
  retries: number = 2
): Promise<Response> {
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      console.log(`📡 API call attempt ${attempt}/${retries + 1}: ${url}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        return response;
      }

      // Don't retry on 4xx errors (client errors)
      if (response.status >= 400 && response.status < 500) {
        return response;
      }

      // Retry on 5xx errors
      if (attempt <= retries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`⏳ Retrying in ${delay}ms... (attempt ${attempt}/${retries + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      return response;

    } catch (error) {
      console.error(`❌ API call attempt ${attempt} failed:`, error);
      
      if (attempt <= retries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  
  throw new Error('All retry attempts failed');
}

function getBaseUrl(request: NextRequest): string {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export async function POST(request: NextRequest) {
  const requestQueue = RequestQueue.getInstance();
  
  try {
    const searchData: EnhancedSearchData = await request.json();
    
    if (!searchData.typeRecherche) {
      return NextResponse.json(
        { error: 'Type de recherche requis' },
        { status: 400 }
      );
    }

    // Get unique user ID for this request
    const userId = getUserId(request);
    const requestId = generateRequestId(searchData, userId);
    
    console.log(`🔍 New search request: ${searchData.typeRecherche} (ID: ${requestId}, User: ${userId})`);

    // Execute request through queue WITHOUT deduplication (each user gets fresh results)
    const result = await requestQueue.executeRequest(
      requestId,
      () => executeSearch(searchData, request),
      200000, // 200s timeout for complex searches
      false // Disable deduplication to prevent cross-user result sharing
    );

    // Ensure the result is JSON serializable
    const serializedResult = JSON.parse(JSON.stringify(result));
    
    console.log('✅ Search completed successfully:', searchData.typeRecherche);
    return NextResponse.json(serializedResult);

  } catch (error: any) {
    console.error('❌ Search orchestrator error:', error);
    
    if (error.message?.includes('timed out')) {
      return NextResponse.json(
        { 
          error: 'Timeout de la recherche',
          details: 'La recherche a pris trop de temps. Veuillez réessayer.',
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

async function executeSearch(searchData: EnhancedSearchData, request: NextRequest) {
  switch (searchData.typeRecherche) {
    case 'brainstorming':
      return await handleBrainstormingSearch(searchData, request);
    case 'concurrent':
      return await handleCompetitorSearch(searchData, request);
    case 'contacts':
      return await handleContactSearch(searchData, request);
    case 'competitor-identification':
    case 'identification_concurrents':
      return await handleCompetitorIdentificationSearch(searchData, request);
    case 'entreprises':
    default:
      return await handleEnterpriseSearch(searchData, request);
  }
}

async function handleContactSearch(searchData: EnhancedSearchData, request: NextRequest) {
  if (!searchData.nomEntreprise) {
    throw new Error('Nom de l\'entreprise requis pour la recherche de contacts');
  }
  
  const baseUrl = getBaseUrl(request);
  const response = await makeApiCall(`${baseUrl}/api/contacts`, {
    nomEntreprise: searchData.nomEntreprise,
    posteRecherche: searchData.posteRecherche,
    contactRoles: searchData.contactRoles,
    secteurActivite: searchData.secteurActivite,
    includeEmails: searchData.includeEmails,
    includeLinkedIn: searchData.includeLinkedIn
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Contact search failed');
  }
  
  return await response.json();
}

async function handleBrainstormingSearch(searchData: EnhancedSearchData, request: NextRequest) {
  const baseUrl = getBaseUrl(request);
  const response = await makeApiCall(`${baseUrl}/api/brainstorming`, {
    secteursActivite: searchData.secteursActivite,
        secteurActiviteLibre: searchData.secteurActiviteLibre, // Nouveau
    autresProduits: searchData.autresProduits, // Add this line
    zoneGeographique: searchData.zoneGeographique,
        zoneGeographiqueLibre: searchData.zoneGeographiqueLibre, // Nouveau

    produitsCGR: searchData.produitsCGR,
    clientsExclure: searchData.clientsExclure
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Brainstorming search failed');
  }
  
  return await response.json();
}

async function handleCompetitorSearch(searchData: EnhancedSearchData, request: NextRequest) {
  if (!searchData.nomConcurrent) {
    throw new Error('Nom du concurrent requis');
  }
  
  const baseUrl = getBaseUrl(request);
  const response = await makeApiCall(`${baseUrl}/api/competitors`, {
    nomConcurrent: searchData.nomConcurrent
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Competitor search failed');
  }
  
  return await response.json();
}

async function handleCompetitorIdentificationSearch(searchData: EnhancedSearchData, request: NextRequest) {
  // Validate required fields for competitor identification
  const region = searchData.regionGeographique || searchData.regionPersonnalisee;
  if (!region) {
    throw new Error('Région géographique requise pour l\'identification de concurrents');
  }
  
  if (!searchData.typeProduitConcurrent) {
    throw new Error('Type de produit requis pour l\'identification de concurrents');
  }
  
  if (!searchData.volumeProductionConcurrent) {
    throw new Error('Volume de production requis pour l\'identification de concurrents');
  }
  
  const baseUrl = getBaseUrl(request);
  
  // Prepare request body matching the competitor identification API
  const requestBody = {
    region_geographique: region,
    produit: searchData.typeProduitConcurrent,
    volume_production: searchData.volumeProductionConcurrent,
    recherche_multiple: searchData.rechercheMultiple || false,
    criteres_additionnels: searchData.criteresSupplementaires || []
  };
  
  console.log('🏭 Calling competitor identification with:', requestBody);
  
  const response = await makeApiCall(`${baseUrl}/api/competitor-identification`, requestBody);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Competitor identification failed');
  }
  
  const result = await response.json();
  console.log('🎯 Competitor identification result received:', {
    success: !!result.competitors,
    count: result.competitors?.length || 0,
    searchType: result.searchType,
    hasCompetitors: result.hasCompetitors
  });
  
  // Debug: Log the structure we're returning
  console.log('🔍 Result structure:', {
    searchType: result.searchType,
    competitors: result.competitors?.length || 0,
    totalFound: result.totalFound,
    statistics: !!result.statistics,
    sources: result.sources?.length || 0
  });
  
  return result;
}

// Remplacer la fonction handleEnterpriseSearch dans app/api/search/route.ts

// Replace the handleEnterpriseSearch function in app/api/search/route.ts

async function handleEnterpriseSearch(searchData: EnhancedSearchData, request: NextRequest) {
   // Validation côté search route aussi pour être cohérent
   const hasPredefinedSectors = searchData.secteursActivite && searchData.secteursActivite.length > 0;
   const hasFreeTextSector = searchData.secteurActiviteLibre && searchData.secteurActiviteLibre.trim() !== '';

   if (!hasPredefinedSectors && !hasFreeTextSector) {
       throw new Error("Au moins un secteur d'activité (prédéfini ou libre) est requis.");
   }

   const baseUrl = getBaseUrl(request);

   const response = await makeApiCall(`${baseUrl}/api/enterprises`, {
     secteursActivite: searchData.secteursActivite,
     secteurActiviteLibre: searchData.secteurActiviteLibre,
     zoneGeographique: searchData.zoneGeographique,
     zoneGeographiqueLibre: searchData.zoneGeographiqueLibre,
     autresProduits: searchData.autresProduits, // ✅ This was missing!
     tailleEntreprise: searchData.tailleEntreprise,
     motsCles: searchData.motsCles,
     produitsCGR: searchData.produitsCGR,
     volumePieces: searchData.volumePieces,
     clientsExclure: searchData.clientsExclure,
     usinesCGR: searchData.usinesCGR,
     nombreResultats: searchData.nombreResultats
   });
  
   if (!response.ok) {
     const error = await response.json();
     
     // Gestion spécifique des erreurs 404 (aucun résultat)
     if (response.status === 404) {
       return {
         searchType: 'entreprises',
         prospects: [],
         totalFound: 0,
         cached: false,
         sources: [],
         message: error.error || 'Aucune entreprise trouvée avec les critères spécifiés',
         debug: {
           companiesFound: 0,
           enterpriseDetails: [],
           scoreStats: {
             average: 0,
             highest: 0,
             lowest: 0
           }
         }
       };
     }
     
     // Pour les autres erreurs, on relance l'exception
     throw new Error(error.error || 'Enterprise search failed');
   }
  
   let result = await response.json();
  
   // Handle additional analyses with parallel execution
   const additionalAnalyses = [];
  
   if (searchData.includeMarketAnalysis) {
     additionalAnalyses.push(
       makeApiCall(`${baseUrl}/api/brainstorming`, {
         secteursActivite: searchData.secteursActivite,
         secteurActiviteLibre: searchData.secteurActiviteLibre, // ✅ Add this too
         zoneGeographique: searchData.zoneGeographique,
         zoneGeographiqueLibre: searchData.zoneGeographiqueLibre, // ✅ Add this too
         produitsCGR: searchData.produitsCGR,
         autresProduits: searchData.autresProduits, // ✅ Add this too
         clientsExclure: searchData.clientsExclure
       }).then(async (res) => {
         if (res.ok) {
           const marketResult = await res.json();
           return { type: 'market', data: marketResult.marketOpportunities };
         }
         return null;
       }).catch(() => null)
     );
   }
  
   if (searchData.includeCompetitorAnalysis && searchData.competitorNames?.length) {
     const competitorPromises = searchData.competitorNames.map(competitorName =>
       makeApiCall(`${baseUrl}/api/competitors`, {
         nomConcurrent: competitorName
       }).then(async (res) => {
         if (res.ok) {
           const competitorResult = await res.json();
           return { name: competitorName, analysis: competitorResult.competitorAnalysis };
         }
         return null;
       }).catch(() => null)
     );
    
     additionalAnalyses.push(
       Promise.all(competitorPromises).then(results => ({
         type: 'competitor',
         data: results.filter(Boolean)
       }))
     );
   }
  
   // Wait for all additional analyses
   if (additionalAnalyses.length > 0) {
     const additionalResults = await Promise.allSettled(additionalAnalyses);
    
     additionalResults.forEach((settledResult) => {
       if (settledResult.status === 'fulfilled' && settledResult.value) {
         const { type, data } = settledResult.value;
         if (type === 'market') {
           result.marketAnalysis = data;
         } else if (type === 'competitor' && data.length > 0) {
           result.competitorAnalysis = data;
         }
       }
     });
   }
  
   return result;
}