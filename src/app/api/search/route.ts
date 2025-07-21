// app/api/search/route.ts (Enhanced with concurrency control)
import { NextRequest, NextResponse } from 'next/server';

interface EnhancedSearchData {
  typeRecherche: 'entreprises' | 'brainstorming' | 'concurrent' | 'contacts';
  secteursActivite: string[];
  zoneGeographique: string[];
  tailleEntreprise?: string;
  motsCles?: string;
  produitsCGR?: string[];
  volumePieces?: number[];
  clientsExclure?: string;
  usinesCGR?: string[];
  nombreResultats?: number;
  nomConcurrent?: string;
  nomEntreprise?: string;
  siteWebEntreprise?: string;
  includeMarketAnalysis?: boolean;
  includeCompetitorAnalysis?: boolean;
  competitorNames?: string[];
  posteRecherche?: string;
  secteurActivite?: string;
  includeEmails?: boolean;
  includeLinkedIn?: boolean;
}

// Enhanced request queue and concurrency management
class RequestQueue {
  private static instance: RequestQueue;
  private activeRequests: Map<string, Promise<any>> = new Map();
  private requestCount: number = 0;
  private readonly MAX_CONCURRENT_REQUESTS = 10; // Adjust based on your needs

  static getInstance(): RequestQueue {
    if (!RequestQueue.instance) {
      RequestQueue.instance = new RequestQueue();
    }
    return RequestQueue.instance;
  }

  async executeRequest<T>(
    requestId: string,
    requestFn: () => Promise<T>,
    timeout: number = 180000
  ): Promise<T> {
    // Check if same request is already in progress (deduplication)
    if (this.activeRequests.has(requestId)) {
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

    this.activeRequests.set(requestId, requestPromise);
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

// Generate unique request ID for deduplication
function generateRequestId(searchData: EnhancedSearchData): string {
  const key = {
    type: searchData.typeRecherche,
    sectors: searchData.secteursActivite?.sort(),
    zone: searchData.zoneGeographique?.sort(),
    size: searchData.tailleEntreprise,
    keywords: searchData.motsCles,
    products: searchData.produitsCGR?.sort(),
    competitor: searchData.nomConcurrent,
    company: searchData.nomEntreprise
  };
  
  return Buffer.from(JSON.stringify(key)).toString('base64').slice(0, 32);
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

    const requestId = generateRequestId(searchData);
    console.log(`🔍 New search request: ${searchData.typeRecherche} (ID: ${requestId})`);

    // Execute request through queue with deduplication
    const result = await requestQueue.executeRequest(
      requestId,
      () => executeSearch(searchData, request),
      200000 // 200s timeout for complex searches
    );

    return NextResponse.json(result);

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
    zoneGeographique: searchData.zoneGeographique,
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

async function handleEnterpriseSearch(searchData: EnhancedSearchData, request: NextRequest) {
  const baseUrl = getBaseUrl(request);
  const response = await makeApiCall(`${baseUrl}/api/enterprises`, {
    secteursActivite: searchData.secteursActivite,
    zoneGeographique: searchData.zoneGeographique,
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
    throw new Error(error.error || 'Enterprise search failed');
  }
  
  let result = await response.json();
  
  // Handle additional analyses with parallel execution
  const additionalAnalyses = [];
  
  if (searchData.includeMarketAnalysis) {
    additionalAnalyses.push(
      makeApiCall(`${baseUrl}/api/brainstorming`, {
        secteursActivite: searchData.secteursActivite,
        zoneGeographique: searchData.zoneGeographique,
        produitsCGR: searchData.produitsCGR,
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