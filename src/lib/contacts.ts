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
  contactRoles?: string[];
  siteWebEntreprise?: string;
  zoneGeographique?: string;
  nombreResultats?: number;
}

interface ContactSearchResult {
  contacts: ContactInfo[];
  sources: string[];
  success: boolean;
  error?: string;
}

interface ApolloSearchResponse {
  people: Array<{
    id: string;
    first_name: string;
    last_name: string;
    title: string;
    email: string;
    phone_numbers: Array<{
      raw_number: string;
      sanitized_number: string;
      type: string;
    }>;
    linkedin_url: string;
    organization: {
      name: string;
      website_url: string;
    };
    state: string;
    country: string;
  }>;
  pagination: {
    page: number;
    per_page: number;
    total_entries: number;
    total_pages: number;
  };
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
  
  // Dictionnaire de mots-clés pour chaque type de rôle (plus complet)
  const roleKeywords: Record<string, string[]> = {
    "acheteur projet": ["acheteur", "achat", "procurement", "sourcing", "projet", "project", "buyer", "purchasing"],
    "responsable achat": ["responsable achat", "procurement manager", "sourcing manager", "purchasing manager", "head of procurement", "achat", "sourcing", "procurement"],
    "directeur achat": ["directeur achat", "procurement director", "chief procurement", "cpo", "achat", "sourcing"],
    "acheteur": ["acheteur", "buyer", "purchasing", "procurement specialist", "sourcing specialist"],
    "directeur technique": ["directeur technique", "technical director", "cto", "chief technical", "r&d", "innovation", "engineering director"],
    "responsable technique": ["responsable technique", "technical manager", "engineering manager", "r&d manager"],
    "directeur production": ["directeur production", "production director", "manufacturing director", "operations director", "plant manager", "production"],
    "responsable production": ["responsable production", "production manager", "manufacturing manager", "operations manager"],
    "directeur qualité": ["directeur qualité", "quality director", "qhse director", "quality manager", "qualité"],
    "responsable qualité": ["responsable qualité", "quality manager", "qhse manager", "qualité"],
    "directeur général": ["directeur général", "ceo", "chief executive", "managing director", "général", "president"],
    "directeur commercial": ["directeur commercial", "sales director", "commercial director", "business development director", "commercial"],
    "responsable commercial": ["responsable commercial", "sales manager", "account manager", "business development manager"],
    "directeur supply chain": ["supply chain director", "logistics director", "directeur logistique", "supply chain", "logistique"],
    "responsable supply chain": ["supply chain manager", "logistics manager", "responsable logistique", "supply chain", "logistique"],
    "directeur industriel": ["directeur industriel", "industrial director", "manufacturing director", "industriel"],
    "responsable maintenance": ["responsable maintenance", "maintenance manager", "facility manager", "maintenance"],
    "directeur financier": ["directeur financier", "cfo", "chief financial", "finance director", "financier"],
    "contrôleur de gestion": ["contrôleur de gestion", "management controller", "financial controller", "contrôle de gestion"]
  };
  
  requestedRoles.forEach(requestedRole => {
    const normalizedRole = requestedRole.toLowerCase().trim();
    const keywords = roleKeywords[normalizedRole] || [normalizedRole];
    
    // Vérification directe du nom du rôle (score maximum)
    if (poste.includes(normalizedRole)) {
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
          roleScore += 30; // Mots-clés spécifiques (ex: "procurement manager")
        } else if (keyword.length > 5) {
          roleScore += 20; // Mots-clés moyens (ex: "achat")
        } else {
          roleScore += 10; // Mots-clés courts (ex: "r&d")
        }
      }
    });
    
    if (roleScore > 0) {
      totalScore += roleScore;
      matchedRoles.push(requestedRole);
    }
  });
  
  // Un contact est considéré comme pertinent selon plusieurs critères
  const isBusinessRelevant = [
    'directeur', 'director', 'manager', 'responsable', 'head', 'chief',
    'president', 'vice president', 'vp', 'lead', 'senior'
  ].some(title => poste.includes(title));
  
  // Critères de pertinence plus stricts
  const isRelevant = totalScore > 25 || 
    (isBusinessRelevant && totalScore > 10) ||
    (requestedRoles.length === 0); // Si aucun rôle spécifique, accepter tous
  
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
      throw new Error('APOLLO_API_KEY manquante dans les variables d\'environnement');
    }
  }

  async searchContacts(request: ContactSearchRequest): Promise<ContactSearchResult> {
    console.log('🔍 Début recherche contacts Apollo pour:', request.nomEntreprise);
    console.log('👥 Rôles recherchés:', request.contactRoles);
    
    try {
      // Construire les paramètres de recherche Apollo
      const searchParams = this.buildApolloSearchParams(request);
      console.log('📋 Paramètres Apollo:', JSON.stringify(searchParams, null, 2));
      
      // Appel à l'API Apollo
      const response = await axios.post<ApolloSearchResponse>(
        `${this.baseUrl}/mixed_people/search`,
        searchParams,
        {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'X-Api-Key': this.apiKey
          },
          timeout: 30000
        }
      );
      
      console.log('✅ Réponse Apollo reçue:', {
        status: response.status,
        totalContacts: response.data.people?.length || 0,
        totalEntries: response.data.pagination?.total_entries || 0
      });
      
      return this.parseApolloResponse(response.data, request);
      
    } catch (error: any) {
      console.error('❌ Erreur Apollo API:', {
        status: error.response?.status,
        message: error.message,
        data: error.response?.data
      });
      
      return {
        contacts: [],
        sources: ['Apollo.io'],
        success: false,
        error: `Erreur Apollo API: ${error.response?.status || 'Network Error'} - ${error.response?.data?.message || error.message}`
      };
    }
  }

  private buildApolloSearchParams(request: ContactSearchRequest): any {
    const {
      nomEntreprise,
      posteRecherche,
      secteurActivite,
      contactRoles,
      zoneGeographique,
      nombreResultats
    } = request;

    // Mapping des rôles vers des titres Apollo
    const titleSearchTerms: string[] = [];
    
    if (contactRoles && contactRoles.length > 0) {
      contactRoles.forEach(role => {
        const normalizedRole = role.toLowerCase().trim();
        
        // Mapping français -> anglais pour Apollo
        const roleMapping: Record<string, string[]> = {
          "acheteur projet": ["Project Buyer", "Project Purchaser", "Purchasing Project"],
          "responsable achat": ["Procurement Manager", "Purchasing Manager", "Head of Procurement"],
          "directeur achat": ["Procurement Director", "Chief Procurement Officer", "CPO", "Director of Procurement"],
          "acheteur": ["Buyer", "Purchaser", "Procurement Specialist"],
          "acheteur commodité": ["Commodity Buyer", "Acheteur Commodité"],
          "directeur technique": ["Technical Director", "CTO", "Chief Technical Officer", "Engineering Director"],
          "responsable technique": ["Technical Manager", "Engineering Manager", "R&D Manager"],
          "directeur production": ["Production Director", "Manufacturing Director", "Operations Director"],
          "responsable production": ["Production Manager", "Manufacturing Manager", "Plant Manager"],
          "directeur qualité": ["Quality Director", "QHSE Director", "Quality Manager"],
          "responsable qualité": ["Quality Manager", "QHSE Manager", "Quality Assurance Manager"],
          "directeur général": ["CEO", "Chief Executive Officer", "Managing Director", "General Manager"],
          "directeur commercial": ["Sales Director", "Commercial Director", "Chief Commercial Officer"],
          "responsable commercial": ["Sales Manager", "Account Manager", "Business Development Manager"],
          "directeur supply chain": ["Supply Chain Director", "Logistics Director", "Chief Supply Chain Officer"],
          "responsable supply chain": ["Supply Chain Manager", "Logistics Manager"],
          "directeur industriel": ["Industrial Director", "Manufacturing Director"],
          "responsable maintenance": ["Maintenance Manager", "Facility Manager"],
          "directeur financier": ["CFO", "Chief Financial Officer", "Finance Director"],
          "contrôleur de gestion": ["Management Controller", "Financial Controller"]
        };
        
        const mappedTitles = roleMapping[normalizedRole] || [role];
        titleSearchTerms.push(...mappedTitles);
      });
    } else if (posteRecherche) {
      titleSearchTerms.push(posteRecherche);
    }

    // Construction des paramètres de recherche Apollo avec q_organization_name pour un filtrage plus strict
    const searchParams: any = {
      page: 1,
      per_page: nombreResultats || 25,
      // Utiliser q_organization_name au lieu de organization_names pour un filtrage exact
      q_organization_name: nomEntreprise,
      person_titles: titleSearchTerms.length > 0 ? titleSearchTerms : undefined,
    };

    // Ajout du filtre géographique
    if (zoneGeographique) {
      if (zoneGeographique.toLowerCase().includes('france')) {
        searchParams.person_locations = ['France'];
      } else {
        searchParams.person_locations = [zoneGeographique];
      }
    }

    // Ajout du secteur d'activité si disponible
    if (secteurActivite) {
      searchParams.organization_industry_tag_ids = [secteurActivite];
    }

    // Nettoyer les valeurs undefined
    Object.keys(searchParams).forEach(key => {
      if (searchParams[key] === undefined) {
        delete searchParams[key];
      }
    });

    return searchParams;
  }

  private parseApolloResponse(
    response: ApolloSearchResponse,
    request: ContactSearchRequest
  ): ContactSearchResult {
    try {
      if (!response.people || !Array.isArray(response.people)) {
        console.log('❌ Pas de contacts dans la réponse Apollo');
        return {
          contacts: [],
          sources: ['Apollo.io'],
          success: false,
          error: 'Aucun contact trouvé dans la base Apollo'
        };
      }

      console.log(`📊 Traitement de ${response.people.length} contacts Apollo`);

      const contacts: ContactInfo[] = response.people
        .filter((person) => {
          // VALIDATION CRITIQUE: Vérifier que le contact appartient bien à l'entreprise cible
          const organizationName = person.organization?.name?.toLowerCase().trim() || '';
          const targetCompany = request.nomEntreprise.toLowerCase().trim();
          
          // Vérification stricte du nom de l'entreprise
          const isCorrectCompany = organizationName.includes(targetCompany) || 
                                   targetCompany.includes(organizationName) ||
                                   organizationName === targetCompany;
          
          if (!isCorrectCompany) {
            console.log('❌ Contact filtré (mauvaise entreprise):', {
              nom: `${person.first_name} ${person.last_name}`,
              poste: person.title,
              entrepriseTrouvee: person.organization?.name,
              entrepriseCible: request.nomEntreprise,
              raison: 'N\'appartient pas à l\'entreprise cible'
            });
          }
          
          return isCorrectCompany;
        })
        .map((person, index) => {
          // Extraction du téléphone
          let phone: string | undefined;
          if (person.phone_numbers && person.phone_numbers.length > 0) {
            const primaryPhone = person.phone_numbers.find(p => p.type === 'work') || person.phone_numbers[0];
            phone = this.formatFrenchPhone(primaryPhone.sanitized_number || primaryPhone.raw_number);
          }

          // Validation de l'email
          const email = person.email && this.isValidEmail(person.email) 
            ? person.email 
            : undefined;

          // Validation de l'URL LinkedIn
          const linkedin_url = person.linkedin_url && this.isValidLinkedInUrl(person.linkedin_url)
            ? person.linkedin_url
            : undefined;

          // Vérification de la pertinence du rôle
          const roleMatch = improveRoleMatching(
            person.title || '',
            request.contactRoles || []
          );

          // Construction du contact
          const contact: ContactInfo = {
            nom: person.last_name || '',
            prenom: person.first_name || '',
            poste: person.title || '',
            email: email,
            phone: phone,
            linkedin_url: linkedin_url,
            verified: true, // Contacts Apollo sont vérifiés
            accroche_personnalisee: this.generatePersonalizedPitch(
              person,
              request.nomEntreprise,
              roleMatch
            ),
            sources: ['Apollo.io'],
            accroche: undefined,
            pitch: undefined
          };

          // Ajout des champs alternatifs
          contact.accroche = contact.accroche_personnalisee;
          contact.pitch = contact.accroche_personnalisee;

          console.log(`✅ Contact ${index + 1} (${person.organization?.name}):`, {
            nom: contact.nom,
            prenom: contact.prenom,
            poste: contact.poste,
            entreprise: person.organization?.name,
            hasEmail: !!contact.email,
            hasPhone: !!contact.phone,
            hasLinkedIn: !!contact.linkedin_url,
            roleScore: roleMatch.score,
            isRelevant: roleMatch.isRelevant
          });

          return contact;
        })
        .filter(contact => {
          // Validation finale
          const hasBasicInfo = contact.nom && contact.prenom && contact.poste;
          const hasContactMethod = contact.email || contact.phone || contact.linkedin_url;
          
          // Vérification de la pertinence du rôle
          const roleMatch = improveRoleMatching(
            contact.poste,
            request.contactRoles || []
          );

          const isValid = hasBasicInfo && hasContactMethod && 
            (roleMatch.isRelevant || !request.contactRoles || request.contactRoles.length === 0);

          if (!isValid) {
            console.log('❌ Contact rejeté:', {
              nom: contact.nom,
              poste: contact.poste,
              raison: !hasBasicInfo ? 'Infos manquantes' :
                     !hasContactMethod ? 'Pas de moyen de contact' :
                     'Rôle non pertinent'
            });
          }

          return isValid;
        });

      console.log(`✅ ${contacts.length} contacts validés sur ${response.people.length}`);

      // Limiter au nombre demandé
      const limitedContacts = contacts.slice(0, request.nombreResultats || 25);

      return {
        contacts: limitedContacts,
        sources: ['Apollo.io'],
        success: limitedContacts.length > 0
      };

    } catch (error: any) {
      console.error('❌ Erreur parsing réponse Apollo:', error);
      return {
        contacts: [],
        sources: ['Apollo.io'],
        success: false,
        error: `Erreur traitement réponse: ${error.message}`
      };
    }
  }

  private generatePersonalizedPitch(
    person: any,
    entreprise: string,
    roleMatch: { score: number; matchedRoles: string[]; isRelevant: boolean }
  ): string {
    const prenom = person.first_name || '';
    const poste = person.title || 'votre rôle';
    const organization = person.organization?.name || entreprise;

    let pitch = `Bonjour ${prenom}, `;

    if (roleMatch.matchedRoles.length > 0) {
      pitch += `en tant que ${poste} chez ${organization}, `;
      pitch += `nous pensons que notre solution pourrait répondre à vos besoins en matière de ${roleMatch.matchedRoles[0].toLowerCase()}. `;
    } else {
      pitch += `en tant que ${poste} chez ${organization}, `;
      pitch += `nous souhaiterions échanger avec vous sur vos besoins et défis actuels. `;
    }

    pitch += `Seriez-vous disponible pour un échange rapide ?`;

    return pitch;
  }

  private formatFrenchPhone(phone: string): string {
    if (!phone) return '';
    
    // Nettoyer le numéro
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // Ajouter le préfixe français si nécessaire
    if (cleaned.startsWith('0')) {
      cleaned = '+33' + cleaned.substring(1);
    } else if (!cleaned.startsWith('+')) {
      // Si pas de préfixe, vérifier si c'est un numéro français (9 chiffres après le 0)
      if (cleaned.length === 9) {
        cleaned = '+33' + cleaned;
      } else if (cleaned.length === 10) {
        cleaned = '+33' + cleaned.substring(1);
      }
    }
    
    // Formater en groupes de 2 chiffres
    if (cleaned.startsWith('+33')) {
      const number = cleaned.substring(3);
      const formatted = number.match(/.{1,2}/g)?.join(' ') || number;
      return `+33 ${formatted}`;
    }
    
    return cleaned;
  }

  private isValidEmail(email: string): boolean {
    if (!email) return false;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && 
           !email.includes('example.com') &&
           !email.includes('test.com') &&
           !email.includes('@email.com') &&
           !email.includes('noemail');
  }

  private isValidLinkedInUrl(url: string): boolean {
    if (!url) return false;
    
    return (url.includes('linkedin.com/in/') || url.includes('linkedin.com/company/')) && 
           this.isValidUrl(url);
  }

  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }
}