// app/api/search/route.ts (Corrected with new competitor identification logic)
import { NextRequest, NextResponse } from 'next/server';

// --- INTERFACE DEFINITION (CORRECTED) ---
interface EnhancedSearchData {
  typeRecherche: 'entreprises' | 'brainstorming' | 'concurrent' | 'contacts' | 'competitor-identification' | 'identification_concurrents';
  secteursActivite: string[];
  zoneGeographique: string[];
  tailleEntreprise?: string;
  motsCles?: string;
  produitsCGR?: string[];
  autresProduits?: string;
  location?: string;
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
  contactRoles?: string[];
  regionGeographique?: string;
  regionPersonnalisee?: string;
  // REMOVED: typeProduitConcurrent (old field)
  // ADDED: New fields for competitor identification
  produitsCGRCompetitor?: string[];
  autresProduitsCompetitor?: string;
  volumeProductionConcurrent?: 'petite_serie' | 'moyenne_serie' | 'grande_serie';
  nombreConcurrents?: number;
  criteresAdditionnels?: string;
  rechercheMultiple?: boolean;
  criteresSupplementaires?: {
    region_geographique: string;
    produits: string[];
    volume_production: 'petite_serie' | 'moyenne_serie' | 'grande_serie';
  }[];
}

// RequestQueue and other utility functions remain the same...

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
    timeout: number = 1800000,
    allowDeduplication: boolean = false
  ): Promise<T> {
    if (allowDeduplication && this.activeRequests.has(requestId)) {
      console.log(`🔄 Request ${requestId} already in progress, waiting for result`);
      return this.activeRequests.get(requestId);
    }

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

// --- generateRequestId (CORRECTED) ---
function generateRequestId(searchData: EnhancedSearchData, userId?: string): string {
  const key = {
    userId: userId || 'anonymous',
    timestamp: Date.now(),
    type: searchData.typeRecherche,
    sectors: searchData.secteursActivite?.sort(),
    secteurLibre: searchData.secteurActiviteLibre,
    zone: searchData.zoneGeographique?.sort(),
    zoneLibre: searchData.zoneGeographiqueLibre,
    size: searchData.tailleEntreprise,
    keywords: searchData.motsCles,
    products: searchData.produitsCGR?.sort(),
    autresProduits: searchData.autresProduits,
    competitor: searchData.nomConcurrent,
    company: searchData.nomEntreprise,
    regionGeo: searchData.regionGeographique,
    regionCustom: searchData.regionPersonnalisee,
    // CORRECTED: Use the new product array for the key
    produitsCompetitor: searchData.produitsCGRCompetitor?.sort(),
    volumeType: searchData.volumeProductionConcurrent,
    competitorCount: searchData.nombreConcurrents,
  };
  
  return Buffer.from(JSON.stringify(key)).toString('base64').slice(0, 32);
}

function getUserId(request: NextRequest): string {
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    try {
      return authHeader.replace('Bearer ', '').slice(0, 16);
    } catch (e) {
      console.warn('Failed to decode auth token');
    }
  }
  const customUserId = request.headers.get('x-user-id');
  if (customUserId) {
    return customUserId;
  }
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const fallbackId = Buffer.from(`${ip}-${userAgent}`).toString('base64').slice(0, 16);
  console.log(`🔍 Generated fallback user ID: ${fallbackId} (IP: ${ip})`);
  return fallbackId;
}

// app/api/search/route.ts
// ⚠️ MODIFIEZ LA FONCTION makeApiCall

async function makeApiCall(url: string, body: any, retries: number = 2): Promise<Response> {
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      console.log(`📡 API call attempt ${attempt}/${retries + 1}: ${url}`);
      
      // ✅ AJOUT : AbortController pour gérer le timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 540000); // 9 min (540s)
      
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal // ✅ CRITIQUE : Ajouter le signal
        });

        clearTimeout(timeoutId); // ✅ Nettoyer le timeout si succès
        
        if (response.ok) return response;
        if (response.status >= 400 && response.status < 500) return response;

        if (attempt <= retries) {
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`⏳ Retrying in ${delay}ms... (attempt ${attempt}/${retries + 1})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        return response;
        
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        // ✅ Différencier timeout vs erreur réseau
        if (fetchError.name === 'AbortError') {
          throw new Error(`Request timeout after 9 minutes for ${url}`);
        }
        throw fetchError;
      }
      
    } catch (error: any) {
      console.error(`❌ API call attempt ${attempt} failed:`, error.message);
      
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
  // ... (POST handler remains the same)
  const requestQueue = RequestQueue.getInstance();
  
  try {
    const searchData: EnhancedSearchData = await request.json();
    
    if (!searchData.typeRecherche) {
      return NextResponse.json({ error: 'Type de recherche requis' }, { status: 400 });
    }

    const userId = getUserId(request);
    const requestId = generateRequestId(searchData, userId);
    
    console.log(`🔍 New search request: ${searchData.typeRecherche} (ID: ${requestId}, User: ${userId})`);

    const result = await requestQueue.executeRequest(
      requestId,
      () => executeSearch(searchData, request),
      2000000,
      false
    );

    const serializedResult = JSON.parse(JSON.stringify(result));
    
    console.log('✅ Search completed successfully:', searchData.typeRecherche);
    return NextResponse.json(serializedResult);

  } catch (error: any) {
    console.error('❌ Search orchestrator error:', error);
    
    if (error.message?.includes('timed out')) {
      return NextResponse.json({ 
          error: 'Timeout de la recherche',
          details: 'La recherche a pris trop de temps. Veuillez réessayer.',
          type: 'timeout'
        }, { status: 408 });
    }
    
    return NextResponse.json({
        error: 'Erreur lors de la recherche CGR',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne du serveur',
        type: 'server_error'
      }, { status: 500 });
  }
}

async function executeSearch(searchData: EnhancedSearchData, request: NextRequest) {
  // ... (executeSearch switch case remains the same)
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

// Other handlers (handleContactSearch, etc.) remain the same...
async function handleContactSearch(searchData: EnhancedSearchData, request: NextRequest) {
  // ...
  if (!searchData.nomEntreprise) throw new Error('Nom de l\'entreprise requis pour la recherche de contacts');
  const baseUrl = getBaseUrl(request);
  const response = await makeApiCall(`${baseUrl}/api/contacts`, {
    nomEntreprise: searchData.nomEntreprise,
    posteRecherche: searchData.posteRecherche,
    contactRoles: searchData.contactRoles,
    secteurActivite: searchData.secteurActivite,
    includeEmails: searchData.includeEmails,
    includeLinkedIn: searchData.includeLinkedIn,
    siteWebEntreprise: searchData.siteWebEntreprise,
    location: searchData.location,
    nombreResultats: searchData.nombreResultats
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Contact search failed');
  }
  return await response.json();
}

async function handleBrainstormingSearch(searchData: EnhancedSearchData, request: NextRequest) {
  // ...
  const baseUrl = getBaseUrl(request);
  const response = await makeApiCall(`${baseUrl}/api/brainstorming`, {
    secteursActivite: searchData.secteursActivite,
    secteurActiviteLibre: searchData.secteurActiviteLibre,
    autresProduits: searchData.autresProduits,
    zoneGeographique: searchData.zoneGeographique,
    zoneGeographiqueLibre: searchData.zoneGeographiqueLibre,
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
  // ...
  if (!searchData.nomConcurrent) throw new Error('Nom du concurrent requis');
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

// --- handleCompetitorIdentificationSearch (CORRECTED) ---
async function handleCompetitorIdentificationSearch(searchData: EnhancedSearchData, request: NextRequest) {
  // CORRECTED: Validate new fields
  const region = searchData.regionGeographique || searchData.regionPersonnalisee;
  if (!region) {
    throw new Error('Région géographique requise pour l\'identification de concurrents');
  }
  
  // CORRECTED: Check the new product array
  if (!searchData.produitsCGRCompetitor || searchData.produitsCGRCompetitor.length === 0) {
    throw new Error('Au moins un produit est requis pour l\'identification de concurrents');
  }
  
  if (!searchData.volumeProductionConcurrent) {
    throw new Error('Volume de production requis pour l\'identification de concurrents');
  }
  
  const baseUrl = getBaseUrl(request);
  
  // CORRECTED: Prepare request body with the new 'produits' array
  const requestBody = {
    region_geographique: region,
    produits: searchData.produitsCGRCompetitor, // Use the new product array
    volume_production: searchData.volumeProductionConcurrent,
    recherche_multiple: searchData.rechercheMultiple || false,
    criteres_additionnels: searchData.criteresSupplementaires || []
  };
  
  console.log('🏭 Calling competitor identification with:', requestBody);
  
  const response = await makeApiCall(`${baseUrl}/api/competitor-identification`, requestBody);
  
  if (!response.ok) {
    const error = await response.json();
    console.error('❌ Competitor identification API call failed:', error);
    throw new Error(error.error || 'Competitor identification failed');
  }
  
  const result = await response.json();
  console.log('🎯 Competitor identification result received:', {
    count: result.competitors?.length || 0,
    searchType: result.searchType
  });
  
  return result;
}

// handleEnterpriseSearch function remains the same...
async function handleEnterpriseSearch(searchData: EnhancedSearchData, request: NextRequest) {
  // ...
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
    autresProduits: searchData.autresProduits,
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
    if (response.status === 404) {
      return {
        searchType: 'entreprises',
        prospects: [],
        totalFound: 0,
        cached: false,
        sources: [],
        message: error.error || 'Aucune entreprise trouvée avec les critères spécifiés',
        debug: { companiesFound: 0, enterpriseDetails: [], scoreStats: { average: 0, highest: 0, lowest: 0 } }
      };
    }
    throw new Error(error.error || 'Enterprise search failed');
  }
  let result = await response.json();
  const additionalAnalyses = [];
  if (searchData.includeMarketAnalysis) {
    additionalAnalyses.push(
      makeApiCall(`${baseUrl}/api/brainstorming`, {
        secteursActivite: searchData.secteursActivite,
        secteurActiviteLibre: searchData.secteurActiviteLibre,
        zoneGeographique: searchData.zoneGeographique,
        zoneGeographiqueLibre: searchData.zoneGeographiqueLibre,
        produitsCGR: searchData.produitsCGR,
        autresProduits: searchData.autresProduits,
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
