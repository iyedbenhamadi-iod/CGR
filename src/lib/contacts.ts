// lib/contacts.ts
import axios from 'axios';

interface ContactInfo {
  nom: string;
  prenom: string;
  poste: string;
  email?: string;
  phone?: string;
  linkedin_url?: string;
  verified: boolean;
  accroche_personnalisee?: string;
  sources: string[];
  
  // Alternative field names for frontend compatibility
  accroche?: string;
  pitch?: string;
}

interface ContactSearchRequest {
  nomEntreprise: string;
  posteRecherche?: string;
  secteurActivite?: string;
  includeEmails?: boolean;
  includeLinkedIn?: boolean;
  contactRoles?: string[]; // Nouveau champ pour les rôles spécifiques
  siteWebEntreprise?: string;
  nombreResultats?: number;
    location?: string; // Add this line

}

interface ContactSearchResult {
  contacts: ContactInfo[];
  sources: string[];
  success: boolean;
  error?: string;
}

// Fonction pour améliorer la correspondance des rôles
const improveRoleMatching = (contactPoste: string, requestedRoles: string[]): {
  score: number;
  matchedRoles: string[];
  isRelevant: boolean;
} => {
  const poste = contactPoste.toLowerCase().trim();
  let totalScore = 0;
  const matchedRoles: string[] = [];
  
  // Si aucun rôle spécifique demandé, accepter tous les contacts
  if (!requestedRoles || requestedRoles.length === 0) {
    return {
      score: 50,
      matchedRoles: [],
      isRelevant: true
    };
  }
  
  // Dictionnaire de mots-clés pour chaque type de rôle (amélioré)
  const roleKeywords: Record<string, string[]> = {
    "acheteur commodité": ["acheteur", "buyer", "purchasing", "procurement", "commodité", "commodity"],
    "acheteur projet": ["acheteur", "buyer", "purchasing", "procurement", "projet", "project"],
    "responsable achat": ["responsable achat", "achat", "purchasing manager", "procurement manager", "sourcing manager", "buyer"],
    "responsable achats/approvisionnement": ["achat", "purchasing", "procurement", "sourcing", "approvisionnement", "supply"],
    "directeur achat": ["directeur achat", "procurement director", "purchasing director", "chief procurement"],
    "directeur technique/r&d/innovation": ["directeur technique", "technical director", "cto", "r&d", "innovation", "engineering director", "chief technical"],
    "responsable technique": ["responsable technique", "technical manager", "engineering manager", "r&d manager"],
    "directeur production/qualité": ["directeur production", "production director", "manufacturing director", "operations director", "plant manager", "qualité", "quality director"],
    "responsable production": ["responsable production", "production manager", "manufacturing manager", "operations manager"],
    "directeur qualité": ["directeur qualité", "quality director", "qhse director"],
    "responsable qualité": ["responsable qualité", "quality manager", "qhse manager"],
    "direction générale": ["direction générale", "ceo", "chief executive", "managing director", "directeur général", "président", "president"],
    "directeur général": ["directeur général", "ceo", "chief executive", "managing director", "président", "president"],
    "directeur commercial": ["directeur commercial", "sales director", "commercial director", "business development director"],
    "responsable commercial": ["responsable commercial", "sales manager", "account manager", "business development manager"],
    "directeur supply chain": ["supply chain director", "logistics director", "directeur logistique"],
    "responsable supply chain": ["supply chain manager", "logistics manager", "responsable logistique"],
    "directeur industriel": ["directeur industriel", "industrial director", "manufacturing director"],
    "responsable maintenance": ["responsable maintenance", "maintenance manager", "facility manager"],
    "directeur financier": ["directeur financier", "cfo", "chief financial", "finance director"],
    "contrôleur de gestion": ["contrôleur de gestion", "management controller", "financial controller"],
    "responsable découpe": ["découpe", "cutting", "machining", "usinage", "production"]
  };
  
  requestedRoles.forEach(requestedRole => {
    const normalizedRole = requestedRole.toLowerCase().trim();
    const keywords = roleKeywords[normalizedRole] || [normalizedRole];
    
    // Vérification directe du nom du rôle (score maximum)
    if (poste.includes(normalizedRole.replace(/[\/\-]/g, ' '))) {
      totalScore += 100;
      matchedRoles.push(requestedRole);
      return;
    }
    
    // Vérification par mots-clés avec pondération
    let roleScore = 0;
    keywords.forEach(keyword => {
      if (poste.includes(keyword.toLowerCase())) {
        // Score plus élevé pour les mots-clés plus spécifiques
        if (keyword.length > 8) {
          roleScore += 40; // Mots-clés spécifiques
        } else if (keyword.length > 5) {
          roleScore += 25; // Mots-clés moyens
        } else {
          roleScore += 15; // Mots-clés courts
        }
      }
    });
    
    if (roleScore > 0) {
      totalScore += roleScore;
      matchedRoles.push(requestedRole);
    }
  });
  
  // Logique spéciale pour certains rôles génériques
  if (totalScore === 0) {
    // CEO/Directeur général devrait correspondre à "Direction Générale"
    if ((poste.includes('ceo') || poste.includes('chief executive') || poste.includes('directeur général')) &&
        requestedRoles.some(role => role.toLowerCase().includes('direction générale'))) {
      totalScore += 80;
      matchedRoles.push('Direction Générale');
    }
    
    // Director devrait correspondre aux rôles directeur
    if (poste.includes('director') || poste.includes('directeur')) {
      const directorRoles = requestedRoles.filter(role => 
        role.toLowerCase().includes('directeur') || role.toLowerCase().includes('direction')
      );
      if (directorRoles.length > 0) {
        totalScore += 30;
        matchedRoles.push(...directorRoles.slice(0, 1)); // Prendre le premier match
      }
    }
    
    // Manager devrait correspondre aux rôles responsable
    if (poste.includes('manager') || poste.includes('responsable')) {
      const managerRoles = requestedRoles.filter(role => 
        role.toLowerCase().includes('responsable') || role.toLowerCase().includes('manager')
      );
      if (managerRoles.length > 0) {
        totalScore += 25;
        matchedRoles.push(...managerRoles.slice(0, 1));
      }
    }
  }
  
  // Un contact est considéré comme pertinent selon plusieurs critères
  const isBusinessRelevant = [
    'directeur', 'director', 'manager', 'responsable', 'head', 'chief',
    'president', 'vice president', 'vp', 'lead', 'senior', 'ceo'
  ].some(title => poste.includes(title));
  
  // Critères de pertinence plus flexibles
  const isRelevant = totalScore > 15 || 
    (isBusinessRelevant && totalScore > 0) ||
    (requestedRoles.length === 0); // Si aucun rôle spécifique, accepter tous
  
  // Debug logging
  if (totalScore > 0 || isBusinessRelevant) {
    console.log('🎯 Role matching debug:', {
      poste,
      totalScore,
      matchedRoles,
      isRelevant,
      isBusinessRelevant
    });
  }
  
  return {
    score: totalScore,
    matchedRoles,
    isRelevant
  };
};

export class ContactSearchClient {
  private apiKey: string;
  private baseUrl = 'https://api.apollo.io/api/v1';

  constructor() {
    this.apiKey = process.env.APOLLO_API_KEY!;
    if (!this.apiKey) {
      throw new Error('APOLLO_API_KEY manquante');
    }
  }

  async searchContacts(request: ContactSearchRequest): Promise<ContactSearchResult> {
    console.log('🔍 Début recherche contacts Apollo pour:', request.nomEntreprise);
    console.log('👥 Rôles recherchés:', request.contactRoles);
    
    try {
      // 🔧 FIX: Use the correct Apollo API endpoint and parameters
      const searchRequest = {
        page: 1,
        per_page: Math.min(request.nombreResultats || 25, 25),
        // 🔧 Use organization_ids or q_organization_name instead
        q_organization_name: request.nomEntreprise,
        // Add domain as secondary filter
        ...(request.siteWebEntreprise && {
          organization_domains: [this.extractDomainFromUrl(request.siteWebEntreprise)]
        })
      };

      // Try alternative approach with organization search
      console.log('📝 Requête Apollo (v1):', JSON.stringify(searchRequest, null, 2));
      
      let response;
      try {
        response = await axios.post(
          `${this.baseUrl}/mixed_people/search`,
          searchRequest,
          {
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache',
              'X-Api-Key': this.apiKey
            },
            timeout: 30000
          }
        );
      } catch (firstError: any) {
        console.log('❌ Première tentative échouée, essai avec approche alternative...');
        
        // 🔧 Alternative approach: Search organizations first, then people
        const orgSearchRequest = {
          page: 1,
          per_page: 1,
          q_organization_name: request.nomEntreprise,
          ...(request.siteWebEntreprise && {
            organization_domains: [this.extractDomainFromUrl(request.siteWebEntreprise)]
          })
        };

        console.log('📝 Recherche organisation d\'abord:', JSON.stringify(orgSearchRequest, null, 2));
        
        // First, find the organization
        const orgResponse = await axios.post(
          `${this.baseUrl}/organizations/search`,
          orgSearchRequest,
          {
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache',
              'X-Api-Key': this.apiKey
            },
            timeout: 30000
          }
        );

        console.log('🏢 Organisations trouvées:', orgResponse.data?.organizations?.length || 0);
        
        if (!orgResponse.data?.organizations?.[0]?.id) {
          throw new Error('Aucune organisation trouvée avec ce nom');
        }

        const organizationId = orgResponse.data.organizations[0].id;
        console.log('🎯 ID organisation trouvé:', organizationId);

        // Then search people in that specific organization
        const peopleSearchRequest = {
          page: 1,
          per_page: Math.min(request.nombreResultats || 25, 25),
          organization_ids: [organizationId],
          // Add role filters if provided
          ...(request.contactRoles && request.contactRoles.length > 0 && {
            person_titles: this.getStandardTitles(request.contactRoles)
          })
        };

        console.log('📝 Recherche personnes avec ID org:', JSON.stringify(peopleSearchRequest, null, 2));

        response = await axios.post(
          `${this.baseUrl}/mixed_people/search`,
          peopleSearchRequest,
          {
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache',
              'X-Api-Key': this.apiKey
            },
            timeout: 30000
          }
        );
      }
      
      console.log('✅ Réponse Apollo reçue, status:', response.status);
      console.log('📊 Nombre de contacts trouvés:', response.data?.people?.length || 0);
      
      return this.parseApolloResponse(response.data, request);
    } catch (error: any) {
      console.error('❌ Erreur Apollo API:', {
        status: error.response?.status,
        message: error.message,
        data: error.response?.data,
        requestData: error.config?.data ? JSON.parse(error.config.data) : 'no request data'
      });
      
      return {
        contacts: [],
        sources: [],
        success: false,
        error: `Erreur API Apollo: ${error.response?.status || 'Timeout'} - ${error.message}`
      };
    }
  }

  private buildApolloSearchRequest(request: ContactSearchRequest): any {
    const {
      nomEntreprise,
      posteRecherche,
      contactRoles,
      siteWebEntreprise,
      nombreResultats = 25,
      location, // Add this

    } = request;

    // 🔧 SIMPLIFIED: Start with minimal, valid parameters
    const apolloRequest: any = {
      page: 1,
      per_page: Math.min(nombreResultats, 25)
    };

    // Primary filter: Organization name (required)
    apolloRequest.organization_names = [nomEntreprise];

    // Add domain filter if provided (most reliable way to target specific company)
    if (siteWebEntreprise) {
      const domain = this.extractDomainFromUrl(siteWebEntreprise);
      apolloRequest.organization_domains = [domain];
      console.log('🌐 Searching with domain filter:', domain);
    }

    // Add role-based filtering (simplified)
    if (contactRoles && contactRoles.length > 0) {
      // Use only the most common/standard role keywords
      const standardTitles = this.getStandardTitles(contactRoles);
      if (standardTitles.length > 0) {
        apolloRequest.person_titles = standardTitles;
      }
    } else if (posteRecherche) {
      apolloRequest.person_titles = [posteRecherche];
    }

    // Basic seniority filter (only standard Apollo values)
    apolloRequest.person_seniorities = ["manager", "director", "c_level"];

    console.log('🔧 Simplified Apollo request:', JSON.stringify(apolloRequest, null, 2));
     if (location) {
    apolloRequest.person_locations = [location];
    console.log('🌍 Searching with geographic filter:', location);
  }
    return apolloRequest;
  }

  // 🔧 NEW: Get only standard, validated titles for Apollo
  private getStandardTitles(roles: string[]): string[] {
    const standardTitleMap: Record<string, string> = {
      "acheteur commodité": "buyer",
      "acheteur projet": "project buyer",
      "directeur production/qualité": "production director",
      "directeur technique/r&d/innovation": "technical director",
      "direction générale": "ceo",
      "responsable achats/approvisionnement": "procurement manager",
      "responsable achat": "purchasing manager",
      "responsable achat métal": "buyer",
      "responsable achat ressort": "buyer",
      "responsable découpe": "manager"
    };

    const titles = new Set<string>();
    
    roles.forEach(role => {
      const normalizedRole = role.toLowerCase().trim();
      const standardTitle = standardTitleMap[normalizedRole];
      if (standardTitle) {
        titles.add(standardTitle);
      }
    });

    // Add some common variations
    if (titles.has("buyer")) {
      titles.add("purchasing");
      titles.add("procurement");
    }
    if (titles.has("ceo")) {
      titles.add("managing director");
      titles.add("general manager");
    }

    return Array.from(titles);
  }

  private extractDomainFromUrl(url: string): string {
    try {
      const domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
      return domain.replace('www.', '');
    } catch {
      return url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
    }
  }

  private parseApolloResponse(response: any, request: ContactSearchRequest): ContactSearchResult {
    try {
      if (!response || !response.people || !Array.isArray(response.people)) {
        console.log('❌ Structure Apollo invalide:', response);
        return {
          contacts: [],
          sources: ['https://app.apollo.io'],
          success: false,
          error: 'Aucun contact trouvé dans la réponse Apollo'
        };
      }

      console.log(`📋 Processing ${response.people.length} contacts from Apollo`);
      
      // 🔍 DEBUG: Log raw Apollo response structure
      console.log('🔍 DEBUG: Raw Apollo response sample:', JSON.stringify({
        totalPeople: response.people.length,
        firstContact: response.people[0] ? {
          name: `${response.people[0].first_name} ${response.people[0].last_name}`,
          title: response.people[0].title,
          organization: response.people[0].organization?.name,
          organizationId: response.people[0].organization?.id,
          email: response.people[0].email ? 'present' : 'missing',
          emailStatus: response.people[0].email_status
        } : 'no contacts'
      }, null, 2));

      // Transform Apollo contacts to our format
      const transformedContacts: ContactInfo[] = response.people
        .filter((person: any) => {
          // Basic data validation only
          const hasBasicData = person && person.first_name && person.last_name;
          if (!hasBasicData) {
            console.log('❌ Contact filtré (nom manquant):', {
              first_name: person?.first_name,
              last_name: person?.last_name,
              organization: person?.organization?.name
            });
          }
          return hasBasicData;
        })
        .map((person: any) => {
          // Extract organization info
          const organization = person.organization || {};
          
          // 🔍 DEBUG: Log organization validation
          console.log('🏢 Organization check:', {
            personName: `${person.first_name} ${person.last_name}`,
            organizationName: organization.name,
            requestedCompany: request.nomEntreprise,
            organizationId: organization.id,
            organizationDomain: organization.primary_domain
          });
          
          // Build personalized pitch
          const pitch = this.generatePersonalizedPitch(
            person,
            organization,
            request.contactRoles || [],
            request.nomEntreprise
          );

          const contact: ContactInfo = {
            nom: person.last_name || '',
            prenom: person.first_name || '',
            poste: person.title || person.headline || '',
            email: person.email || undefined,
            phone: person.phone_numbers?.[0]?.sanitized_number || undefined,
            linkedin_url: person.linkedin_url || undefined,
            verified: Boolean(person.email_status === 'verified' || person.email),
            accroche_personnalisee: pitch,
            sources: [
              'https://app.apollo.io',
              ...(person.linkedin_url ? [person.linkedin_url] : []),
              ...(organization.website_url ? [organization.website_url] : [])
            ].filter(Boolean),
            
            // Alternative field names for frontend compatibility
            accroche: pitch,
            pitch: pitch
          };

          console.log('✅ Contact transformé:', {
            nom: contact.nom,
            prenom: contact.prenom,
            poste: contact.poste,
            organization: organization.name, // 🔍 Add organization info
            hasEmail: !!contact.email,
            emailStatus: person.email_status,
            hasLinkedIn: !!contact.linkedin_url
          });

          return contact;
        })
        .filter((contact: ContactInfo) => {
          // Basic validation
          const isValid = contact.nom && 
                         contact.prenom && 
                         contact.poste &&
                         (contact.email || contact.linkedin_url || contact.phone);
          
          if (!isValid) {
            console.log('❌ Contact rejeté (données insuffisantes):', {
              nom: contact.nom,
              prenom: contact.prenom,
              poste: contact.poste,
              hasContactInfo: !!(contact.email || contact.linkedin_url || contact.phone),
              email: contact.email ? 'present' : 'missing',
              linkedin: contact.linkedin_url ? 'present' : 'missing',
              phone: contact.phone ? 'present' : 'missing'
            });
          }
          return isValid;
        });

      // Apply role-based filtering if specified
      let filteredContacts = transformedContacts;
      
      if (request.contactRoles && request.contactRoles.length > 0) {
        console.log('🎯 Application du filtrage par rôles...');
        
        const contactsWithScoring = transformedContacts.map(contact => {
          const roleMatch = improveRoleMatching(contact.poste, request.contactRoles!);
          return {
            ...contact,
            roleScore: roleMatch.score,
            matchedRoles: roleMatch.matchedRoles,
            isRoleRelevant: roleMatch.isRelevant
          };
        });
        
        // Filter and sort by relevance
        filteredContacts = contactsWithScoring
          .filter(contact => contact.isRoleRelevant)
          .sort((a, b) => {
            // Sort by role score descending
            if (b.roleScore !== a.roleScore) {
              return b.roleScore - a.roleScore;
            }
            // Then by number of matched roles
            return (b.matchedRoles?.length || 0) - (a.matchedRoles?.length || 0);
          });
        
        console.log(`🎯 Filtrage terminé: ${transformedContacts.length} → ${filteredContacts.length} contacts pertinents`);
        console.log('📊 Scores de correspondance:', filteredContacts.slice(0, 5).map(c => ({
          nom: `${c.prenom} ${c.nom}`,
          poste: c.poste,
          score: (c as any).roleScore,
          matchedRoles: (c as any).matchedRoles
        })));
      }

      const sources = [
        'https://app.apollo.io',
        `https://app.apollo.io/#/people?finderViewId=5b6dfc3e73f78b7b6818c9c1&organizationIds[]=${response.organization_id || ''}`
      ].filter(Boolean);

      console.log(`✅ ${filteredContacts.length} contacts validés et filtrés depuis Apollo`);
      
      return {
        contacts: filteredContacts.slice(0, request.nombreResultats || 25),
        sources,
        success: true
      };
    } catch (error: any) {
      console.error('❌ Erreur parsing réponse Apollo:', error);
      return {
        contacts: [],
        sources: ['https://app.apollo.io'],
        success: false,
        error: `Erreur parsing Apollo: ${error.message}`
      };
    }
  }

  private generatePersonalizedPitch(
    person: any,
    organization: any,
    requestedRoles: string[],
    companyName: string
  ): string {
    const firstName = person.first_name || '';
    const title = person.title || '';
    const orgName = organization.name || companyName;
    const industry = organization.industry || '';
    
    // Create role-specific pitch
    let roleContext = '';
    if (requestedRoles.length > 0) {
      const matchingRole = requestedRoles.find(role => 
        title.toLowerCase().includes(role.toLowerCase()) ||
        role.toLowerCase().includes(title.toLowerCase().split(' ')[0])
      );
      
      if (matchingRole) {
        roleContext = `en tant que ${matchingRole} chez ${orgName}`;
      } else {
        roleContext = `dans votre rôle de ${title} chez ${orgName}`;
      }
    } else {
      roleContext = `en tant que ${title} chez ${orgName}`;
    }
    
    // Industry-specific value propositions
    const industryPitches: Record<string, string> = {
      'manufacturing': 'optimiser vos processus de production et votre chaîne d\'approvisionnement',
      'automotive': 'améliorer l\'efficacité de votre chaîne de production automobile',
      'technology': 'accélérer votre transformation digitale et innovation',
      'healthcare': 'optimiser vos opérations tout en maintenant les standards de qualité',
      'default': 'améliorer l\'efficacité opérationnelle de votre entreprise'
    };
    
    const valueProp = industryPitches[industry.toLowerCase()] || industryPitches.default;
    
    return `Bonjour ${firstName}, j'aimerais échanger avec vous ${roleContext} sur des solutions qui pourraient ${valueProp}. Seriez-vous disponible pour un bref échange ?`;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && !email.includes('example.com');
  }

  private isValidLinkedInUrl(url: string): boolean {
    return url.includes('linkedin.com/in/') && this.isValidUrl(url);
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private cleanPhoneNumber(phone: string): string {
    return phone.replace(/[^\d+\s\-\.]/g, '').trim();
  }

  // 🔍 NEW: Method to validate if contact belongs to the requested company
  private validateContactCompany(person: any, requestedCompany: string, requestedDomain?: string): boolean {
    const organization = person.organization || {};
    const orgName = organization.name || '';
    const orgDomain = organization.primary_domain || organization.website_url || '';
    
    // Direct company name match
    if (orgName.toLowerCase().includes(requestedCompany.toLowerCase()) || 
        requestedCompany.toLowerCase().includes(orgName.toLowerCase())) {
      return true;
    }
    
    // Domain match if provided
    if (requestedDomain && orgDomain) {
      const cleanOrgDomain = this.extractDomainFromUrl(orgDomain);
      const cleanRequestedDomain = this.extractDomainFromUrl(requestedDomain);
      if (cleanOrgDomain === cleanRequestedDomain) {
        return true;
      }
    }
    
    // Log for debugging
    console.log('🔍 Company validation:', {
      contactName: `${person.first_name} ${person.last_name}`,
      orgName,
      requestedCompany,
      orgDomain,
      requestedDomain,
      match: false
    });
    
    return false;
  }
}