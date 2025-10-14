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

// Fonction pour nettoyer et normaliser les noms pour la validation LinkedIn
const normalizeNameForLinkedIn = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[ñ]/g, 'n')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

// Fonction pour valider si une URL LinkedIn correspond au nom de la personne
const validateLinkedInUrl = (url: string, nom: string, prenom: string): boolean => {
  if (!url || !url.includes('linkedin.com/in/')) {
    return false;
  }
  
  try {
    // Extraire le nom d'utilisateur de l'URL LinkedIn
    const urlMatch = url.match(/linkedin\.com\/in\/([^/?]+)/);
    if (!urlMatch) return false;
    
    const linkedinUsername = urlMatch[1].toLowerCase();
    
    // Normaliser les noms
    const normalizedPrenom = normalizeNameForLinkedIn(prenom);
    const normalizedNom = normalizeNameForLinkedIn(nom);
    
    // Créer différentes combinaisons possibles
    const possibleCombinations = [
      `${normalizedPrenom}-${normalizedNom}`,
      `${normalizedNom}-${normalizedPrenom}`,
      `${normalizedPrenom}${normalizedNom}`,
      `${normalizedNom}${normalizedPrenom}`,
      normalizedPrenom,
      normalizedNom
    ];
    
    // Vérifier si l'username LinkedIn correspond à une des combinaisons
    const matches = possibleCombinations.some(combination => {
      return linkedinUsername.includes(combination) || 
             combination.includes(linkedinUsername) ||
             linkedinUsername === combination;
    });
    
    console.log('🔗 LinkedIn validation:', {
      url,
      nom: `${prenom} ${nom}`,
      linkedinUsername,
      possibleCombinations,
      matches
    });
    
    return matches;
    
  } catch (error) {
    console.warn('⚠️ Erreur validation LinkedIn URL:', error);
    return false;
  }
};

interface ContactRequest {
  nomEntreprise: string;
  posteRecherche?: string;
  secteurActivite?: string;
  includeEmails?: boolean;
  includeLinkedIn?: boolean;
  contactRoles?: string[];
  siteWebEntreprise?: string;
  nombreResultats?: number;
  location?: string; // ✅ AJOUTÉ : Support pour 'location' depuis /api/search
  zoneGeographique?: string; // ✅ Format attendu par ContactSearchClient
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
    
    // ✅ MAPPING: location → zoneGeographique
    const zoneGeo = requestData.location || requestData.zoneGeographique;
    
    // Enhanced cache key to include contact roles
    const cacheKeyParams = [
      `company-${requestData.nomEntreprise}`,
      `position-${requestData.posteRecherche || 'all'}`,
      `sector-${requestData.secteurActivite || 'all'}`,
      `roles-${requestData.contactRoles?.sort().join(',') || 'default'}`,
      `website-${requestData.siteWebEntreprise || 'none'}`,
      `zone-${zoneGeo || 'none'}`, // ✅ AJOUTÉ : Inclure zone dans cache
      `results-${requestData.nombreResultats || 50}`
    ];
    
    const cacheKey = generateCacheKey(
      `contacts-${requestData.nomEntreprise}`,
      'search',
      cacheKeyParams
    );
    
    const cachedResult = await getCachedResult(cacheKey);
    if (cachedResult) {
      console.log('⚡ Résultat contacts en cache trouvé');
      return NextResponse.json({ ...cachedResult, cached: true });
    }
    
    // ✅ TRANSFORMATION: Créer la requête avec zoneGeographique
    const searchRequest = {
      nomEntreprise: requestData.nomEntreprise,
      posteRecherche: requestData.posteRecherche,
      secteurActivite: requestData.secteurActivite,
      includeEmails: requestData.includeEmails,
      includeLinkedIn: requestData.includeLinkedIn,
      contactRoles: requestData.contactRoles,
      siteWebEntreprise: requestData.siteWebEntreprise,
      nombreResultats: requestData.nombreResultats,
      zoneGeographique: zoneGeo // ✅ MAPPING APPLIQUÉ
    };
    
    console.log('🌍 Zone géographique appliquée:', zoneGeo || 'Non spécifiée');
    
    // Search contacts with timeout
    const contactClient = new ContactSearchClient();
    const contactResult = await withTimeout(
      contactClient.searchContacts(searchRequest),
      6600000 // 2 minutes for contact search
    );
    
    console.log('🔍 Résultat recherche contacts:', {
      success: contactResult.success,
      contactsFound: contactResult.contacts?.length || 0,
      error: contactResult.error,
      contactRoles: requestData.contactRoles,
      zoneGeographique: zoneGeo
    });
    
    if (!contactResult.success) {
      return NextResponse.json({ 
        error: 'Erreur lors de la recherche contacts',
        details: contactResult.error,
        type: 'contact_search_error'
      }, { status: 500 });
    }
    
    // Transform the contacts to match frontend expectations with LinkedIn validation
    const transformedContacts = contactResult.contacts?.map(contact => {
      // Valider l'URL LinkedIn avant de l'inclure
      const hasValidLinkedIn = contact.linkedin_url && contact.nom && contact.prenom ? 
        validateLinkedInUrl(contact.linkedin_url, contact.nom, contact.prenom) : false;
      
      // Log des URLs LinkedIn invalides pour debugging
      if (contact.linkedin_url && !hasValidLinkedIn) {
        console.warn('❌ URL LinkedIn invalide détectée:', {
          nom: `${contact.prenom} ${contact.nom}`,
          linkedin_url: contact.linkedin_url,
          raison: 'Ne correspond pas au nom de la personne'
        });
      }
      
      return {
        nom: contact.nom || '',
        prenom: contact.prenom || '',
        poste: contact.poste || '',
        email: contact.email || undefined,
        phone: contact.phone || undefined,
        linkedin_url: hasValidLinkedIn ? contact.linkedin_url : undefined,
        linkedin_verified: hasValidLinkedIn,
        verified: contact.verified || false,
        accroche_personnalisee: contact.accroche_personnalisee || contact.accroche || contact.pitch || undefined,
        entreprise: requestData.nomEntreprise,
        secteur: requestData.secteurActivite || '',
        sources: contact.sources || [],
        matchedRoles: (contact as any).matchedRoles || [],
        roleScore: (contact as any).roleScore || 0,
        isRoleRelevant: (contact as any).isRoleRelevant !== undefined ? (contact as any).isRoleRelevant : true
      };
    }) || [];
    
    // ✅ PAS DE LIMITE - Retourner tous les contacts
    const limitedContacts = transformedContacts;
    
    // Debug: Log des statistiques LinkedIn et rôles
    const linkedinStats = {
      totalContacts: limitedContacts.length,
      contactsWithLinkedIn: limitedContacts.filter(c => c.linkedin_url).length,
      contactsWithVerifiedLinkedIn: limitedContacts.filter(c => c.linkedin_verified).length,
      contactsWithInvalidLinkedIn: contactResult.contacts?.filter((original, index) => 
        original.linkedin_url && !transformedContacts[index]?.linkedin_url
      ).length || 0
    };
    
    const roleStats = {
      rolesRequested: requestData.contactRoles || [],
      contactsWithMatchingRoles: limitedContacts.filter(c => c.matchedRoles && c.matchedRoles.length > 0).length,
      roleDistribution: requestData.contactRoles?.reduce((acc, role) => {
        acc[role] = limitedContacts.filter(c => 
          c.matchedRoles?.includes(role)
        ).length;
        return acc;
      }, {} as Record<string, number>) || {}
    };
    
    console.log('🔗 Statistiques LinkedIn:', linkedinStats);
    console.log('👥 Statistiques Rôles:', roleStats);
    
    // Debug: Log the transformed contacts
    console.log('🔄 Contacts transformés:', limitedContacts.length);
    
    const response = {
      searchType: 'contacts',
      contacts: limitedContacts,
      totalFound: limitedContacts.length,
      cached: false,
      sources: contactResult.sources || [],
      hasContacts: limitedContacts.length > 0,
      searchCriteria: {
        entreprise: requestData.nomEntreprise,
        posteRecherche: requestData.posteRecherche,
        secteurActivite: requestData.secteurActivite,
        includeEmails: requestData.includeEmails,
        includeLinkedIn: requestData.includeLinkedIn,
        contactRoles: requestData.contactRoles,
        siteWebEntreprise: requestData.siteWebEntreprise,
        nombreResultats: requestData.nombreResultats,
        zoneGeographique: zoneGeo // ✅ AJOUTÉ : Inclure dans searchCriteria
      },
      linkedinStats,
      roleStats,
      debug: {
        contactsFound: limitedContacts.length,
        searchComplete: true,
        rolesUsed: requestData.contactRoles || [],
        originalResultsCount: transformedContacts.length,
        limitApplied: false, // ✅ CHANGÉ : Plus de limite
        zoneGeographiqueApplied: zoneGeo || 'Non spécifiée',
        transformedFields: limitedContacts.map(contact => ({
          nom: !!contact.nom,
          prenom: !!contact.prenom,
          poste: !!contact.poste,
          email: !!contact.email,
          phone: !!contact.phone,
          linkedin_url: !!contact.linkedin_url,
          linkedin_verified: contact.linkedin_verified,
          verified: contact.verified,
          accroche_personnalisee: !!contact.accroche_personnalisee,
          matchedRoles: contact.matchedRoles
        }))
      }
    };
    
    // Debug: Log the final response structure
    console.log('📤 Réponse finale contacts:', {
      searchType: response.searchType,
      hasContacts: response.hasContacts,
      contactsCount: response.contacts.length,
      totalFound: response.totalFound,
      linkedinValidation: linkedinStats,
      roleMatching: roleStats,
      zoneGeographique: zoneGeo
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
    const roles = searchParams.get('roles');
    const website = searchParams.get('website');
    const zone = searchParams.get('zone'); // ✅ AJOUTÉ
    const results = searchParams.get('results');
    
    if (!companyName) {
      return NextResponse.json(
        { error: 'Nom de l\'entreprise requis' },
        { status: 400 }
      );
    }
    
    // Enhanced cache key matching POST method
    const cacheKeyParams = [
      `company-${companyName}`,
      `position-${position || 'all'}`,
      `sector-${sector || 'all'}`,
      `roles-${roles || 'default'}`,
      `website-${website || 'none'}`,
      `zone-${zone || 'none'}`, // ✅ AJOUTÉ
      `results-${results || '10'}`
    ];
    
    const cacheKey = generateCacheKey(
      `contacts-${companyName}`,
      'search',
      cacheKeyParams
    );
    
    const cachedResult = await getCachedResult(cacheKey);
    
    if (cachedResult) {
      return NextResponse.json({ ...cachedResult, cached: true });
    } else {
      return NextResponse.json(
        { error: 'Aucune recherche en cache pour cette entreprise avec ces paramètres' },
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