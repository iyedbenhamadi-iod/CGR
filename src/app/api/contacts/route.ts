// app/api/contacts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ContactSearchClient } from '@/lib/contacts';
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

interface ContactRequest {
  nomEntreprise: string;
  posteRecherche?: string;
  secteurActivite?: string;
  includeEmails?: boolean;
  includeLinkedIn?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const requestData: ContactRequest = await request.json();
    
    // Enhanced validation
    if (!requestData.nomEntreprise) {
      return NextResponse.json(
        { error: 'Nom de l\'entreprise requis' },
        { status: 400 }
      );
    }
    
    console.log('👤 Recherche contacts demandée:', JSON.stringify(requestData, null, 2));
    
    // Check cache
    const cacheKey = generateCacheKey(
      `contacts-${requestData.nomEntreprise}`,
      'search',
      [
        `company-${requestData.nomEntreprise}`,
        `position-${requestData.posteRecherche || 'all'}`,
        `sector-${requestData.secteurActivite || 'all'}`
      ]
    );
    
    const cachedResult = await getCachedResult(cacheKey);
    if (cachedResult) {
      console.log('⚡ Résultat contacts en cache trouvé');
      return NextResponse.json({ ...cachedResult, cached: true });
    }
    
    // Search contacts with timeout
    const contactClient = new ContactSearchClient();
    const contactResult = await withTimeout(
      contactClient.searchContacts(requestData),
      120000 // 2 minutes for contact search
    );
    
    console.log('🔍 Résultat recherche contacts:', {
      success: contactResult.success,
      contactsFound: contactResult.contacts?.length || 0,
      error: contactResult.error
    });
    
    if (!contactResult.success) {
      return NextResponse.json({ 
        error: 'Erreur lors de la recherche contacts',
        details: contactResult.error,
        type: 'contact_search_error'
      }, { status: 500 });
    }
    
    // Transform the contacts to match frontend expectations
    const transformedContacts = contactResult.contacts?.map(contact => ({
      nom: contact.nom || '',
      prenom: contact.prenom || '',
      poste: contact.poste || '',
      email: contact.email || undefined,
      phone: contact.phone || undefined,
      linkedin_url: contact.linkedin_url || undefined,
      verified: contact.verified || false,
      accroche_personnalisee: contact.accroche_personnalisee || undefined,
      entreprise: requestData.nomEntreprise,
      secteur: requestData.secteurActivite || '',
      sources: contact.sources || []
    })) || [];
    
    // Debug: Log the transformed contacts
    console.log('🔄 Contacts transformés:', transformedContacts.length);
    
    const response = {
      searchType: 'contacts',
      contacts: transformedContacts,
      totalFound: transformedContacts.length,
      cached: false,
      sources: contactResult.sources || [],
      hasContacts: transformedContacts.length > 0,
      searchCriteria: {
        entreprise: requestData.nomEntreprise,
        posteRecherche: requestData.posteRecherche,
        secteurActivite: requestData.secteurActivite,
        includeEmails: requestData.includeEmails,
        includeLinkedIn: requestData.includeLinkedIn
      },
      debug: {
        contactsFound: transformedContacts.length,
        searchComplete: true,
        originalResult: contactResult.contacts,
        transformedFields: transformedContacts.map(contact => ({
          nom: !!contact.nom,
          prenom: !!contact.prenom,
          poste: !!contact.poste,
          email: !!contact.email,
          phone: !!contact.phone,
          linkedin_url: !!contact.linkedin_url,
          verified: contact.verified,
          accroche_personnalisee: !!contact.accroche_personnalisee
        }))
      }
    };
    
    // Debug: Log the final response structure
    console.log('📤 Réponse finale contacts:', {
      searchType: response.searchType,
      hasContacts: response.hasContacts,
      contactsCount: response.contacts.length,
      totalFound: response.totalFound
    });
    
    // Save to cache
    await setCachedResult(cacheKey, response, 43200); // 12h cache (contacts change more frequently)
    console.log('✅ Recherche contacts terminée:', requestData.nomEntreprise);
    
    return NextResponse.json(response);
    
  } catch (error: any) {
    console.error('❌ Erreur recherche contacts:', error);
    
    // Enhanced error handling with specific error types
    if (error.message?.includes('timed out')) {
      return NextResponse.json(
        { 
          error: 'Timeout de la recherche contacts',
          details: 'La recherche de contacts a pris trop de temps. Veuillez réessayer.',
          type: 'timeout'
        },
        { status: 408 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Erreur lors de la recherche contacts', 
        details: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne du serveur',
        type: 'contact_search_error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for retrieving cached contact searches
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyName = searchParams.get('company');
    const position = searchParams.get('position');
    const sector = searchParams.get('sector');
    
    if (!companyName) {
      return NextResponse.json(
        { error: 'Nom de l\'entreprise requis' },
        { status: 400 }
      );
    }
    
    const cacheKey = generateCacheKey(
      `contacts-${companyName}`,
      'search',
      [
        `company-${companyName}`,
        `position-${position || 'all'}`,
        `sector-${sector || 'all'}`
      ]
    );
    
    const cachedResult = await getCachedResult(cacheKey);
    
    if (cachedResult) {
      return NextResponse.json({ ...cachedResult, cached: true });
    } else {
      return NextResponse.json(
        { error: 'Aucune recherche en cache pour cette entreprise' },
        { status: 404 }
      );
    }
    
  } catch (error: any) {
    console.error('❌ Erreur récupération cache contacts:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du cache' },
      { status: 500 }
    );
  }
}