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
  relevance_score?: number;
  
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
  method?: 'apollo' | 'sonar';
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

const improveRoleMatching = (contactPoste: string, requestedRoles: string[]): {
  score: number;
  matchedRoles: string[];
  isRelevant: boolean;
} => {
  const poste = contactPoste.toLowerCase().trim();
  let totalScore = 0;
  const matchedRoles: string[] = [];
  
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
  };
  
  requestedRoles.forEach(requestedRole => {
    const normalizedRole = requestedRole.toLowerCase().trim();
    const keywords = roleKeywords[normalizedRole] || [normalizedRole];
    
    if (poste.includes(normalizedRole)) {
      totalScore += 100;
      matchedRoles.push(requestedRole);
      return;
    }
    
    let roleScore = 0;
    keywords.forEach(keyword => {
      if (poste.includes(keyword.toLowerCase())) {
        if (keyword.length > 8) {
          roleScore += 30;
        } else if (keyword.length > 5) {
          roleScore += 20;
        } else {
          roleScore += 10;
        }
      }
    });
    
    if (roleScore > 0) {
      totalScore += roleScore;
      matchedRoles.push(requestedRole);
    }
  });
  
  const isBusinessRelevant = [
    'directeur', 'director', 'manager', 'responsable', 'head', 'chief',
    'president', 'vice president', 'vp', 'lead', 'senior'
  ].some(title => poste.includes(title));
  
  const isRelevant = totalScore > 25 || 
    (isBusinessRelevant && totalScore > 10) ||
    (requestedRoles.length === 0);
  
  return {
    score: totalScore,
    matchedRoles,
    isRelevant
  };
};

export class ContactSearchClient {
  private apolloApiKey: string;
  private perplexityApiKey: string;
  private apolloBaseUrl = 'https://api.apollo.io/api/v1';
  private perplexityBaseUrl = 'https://api.perplexity.ai';

  private readonly roleMapping: Record<string, string[]> = {
    "responsable achat": ["procurement manager", "purchasing manager", "sourcing manager", "head of procurement", "acheteur senior", "responsable approvisionnement"],
    "acheteur": ["buyer", "purchasing specialist", "procurement specialist", "sourcing specialist", "senior buyer", "lead buyer", "strategic buyer"],
    "directeur achat": ["procurement director", "chief procurement officer", "CPO", "head of purchasing"],
    "directeur technique": ["technical director", "CTO", "chief technical officer", "R&D director", "innovation director"],
    "directeur production": ["production director", "manufacturing director", "plant manager", "operations director"],
  };

  private readonly highRelevanceKeywords = [
    "buyer", "procurement", "sourcing", "purchasing", "acheteur", "achat",
    "engineer", "technical", "R&D", "innovation", "ingénieur",
    "production", "manufacturing", "quality", "operations"
  ];

  private readonly excludedRoles = [
    " IT ", "informatique", "système", "security", "network", "software", "digital",
    "marketing", "communication", "commercial", "vente", "sales", " PR ",
    "RH", "human resources", "recrutement",
    "finance", "comptabilité", "accounting", "controller", "audit",
    "legal", "juridique", "compliance", " risk "
  ];

  constructor() {
    this.apolloApiKey = process.env.APOLLO_API_KEY!;
    this.perplexityApiKey = process.env.PERPLEXITY_API_KEY!;
    
    if (!this.apolloApiKey) {
      throw new Error('APOLLO_API_KEY manquante dans les variables d\'environnement');
    }
    if (!this.perplexityApiKey) {
      throw new Error('PERPLEXITY_API_KEY manquante dans les variables d\'environnement');
    }
  }

  async searchContacts(request: ContactSearchRequest): Promise<ContactSearchResult> {
    console.log('🔍 Début recherche contacts pour:', request.nomEntreprise);
    
    // Essayer d'abord Apollo
    const apolloResult = await this.searchWithApollo(request);
    
    if (apolloResult.success && apolloResult.contacts.length > 0) {
      console.log('✅ Contacts trouvés via Apollo:', apolloResult.contacts.length);
      return { ...apolloResult, method: 'apollo' };
    }
    
    // Fallback vers Sonar si Apollo ne trouve rien
    console.log('⚠️ Apollo n\'a pas trouvé de contacts, utilisation de Sonar en fallback...');
    const sonarResult = await this.searchWithSonar(request);
    
    return { ...sonarResult, method: 'sonar' };
  }

  private async searchWithApollo(request: ContactSearchRequest): Promise<ContactSearchResult> {
    console.log('🔍 Recherche via Apollo...');
    
    try {
      const searchParams = this.buildApolloSearchParams(request);
      
      const response = await axios.post<ApolloSearchResponse>(
        `${this.apolloBaseUrl}/mixed_people/search`,
        searchParams,
        {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'X-Api-Key': this.apolloApiKey
          },
          timeout: 30000
        }
      );
      
      console.log('✅ Réponse Apollo reçue:', {
        status: response.status,
        totalContacts: response.data.people?.length || 0
      });
      
      return this.parseApolloResponse(response.data, request);
      
    } catch (error: any) {
      console.error('❌ Erreur Apollo API:', error.message);
      return {
        contacts: [],
        sources: ['Apollo.io'],
        success: false,
        error: `Erreur Apollo: ${error.message}`
      };
    }
  }

  private async searchWithSonar(request: ContactSearchRequest): Promise<ContactSearchResult> {
    console.log('🔍 Recherche via Sonar (Perplexity)...');
    
    const prompt = this.buildSonarSearchPrompt(request);
    
    try {
      const response = await axios.post(
        `${this.perplexityBaseUrl}/chat/completions`,
        {
          model: 'sonar',
          messages: [
            { role: 'system', content: this.getSonarSystemPrompt() },
            { role: 'user', content: prompt }
          ],
          temperature: 0.2,
          max_tokens: 4000
        },
        {
          headers: {
            'Authorization': `Bearer ${this.perplexityApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000
        }
      );
      
      console.log('✅ Réponse Sonar reçue');
      return this.parseSonarResponse(response.data, request);
      
    } catch (error: any) {
      console.error('❌ Erreur Sonar API:', error.message);
      return {
        contacts: [],
        sources: ['Sonar'],
        success: false,
        error: `Erreur Sonar: ${error.message}`
      };
    }
  }

  private getSonarSystemPrompt(): string {
    return `Tu es un expert en recherche de contacts B2B industriels. Tu dois rechercher des décideurs dans l'entreprise cible et répondre UNIQUEMENT en JSON valide.

🎯 EXPERTISE CGR INTERNATIONAL:
- Fabricant de ressorts sur mesure et composants mécaniques
- Technologies: formage à froid, surmoulage métal, co-ingénierie  
- Secteurs: automobile, aéronautique, industrie

FORMAT JSON OBLIGATOIRE:
{
  "contacts": [
    {
      "nom": "Nom",
      "prenom": "Prénom", 
      "poste": "Poste exact",
      "email": "email@entreprise.com",
      "phone": "+33...",
      "linkedin_url": "https://linkedin.com/in/...",
      "verified": true,
      "relevance_score": 0.85,
      "sources": ["url1", "url2"]
    }
  ],
  "sources": ["url1", "url2"]
}

🚨 RÈGLES CRITIQUES:
- PRIORITÉ aux rôles ACHAT, TECHNIQUE, PRODUCTION
- EXCLURE: IT, Marketing, RH, Finance, Legal, Commercial
- Vérifier que le poste correspond aux besoins de composants mécaniques
- Score de pertinence obligatoire (0.0 à 1.0)

✅ RÔLES CIBLES:
- Achat: responsable achat, acheteur, procurement manager, CPO, senior buyer
- Technique: directeur technique, R&D, ingénieur produit, CTO
- Production: directeur production, responsable qualité, manufacturing manager

❌ EXCLUSIONS ABSOLUES:
- IT, Security, Software, Digital
- Marketing, Sales, Communication  
- RH, Finance, Legal, Audit`;
  }

  private buildSonarSearchPrompt(request: ContactSearchRequest): string {
    const { nomEntreprise, contactRoles, secteurActivite, siteWebEntreprise, zoneGeographique } = request;
    
    let rolesSection = '';
    if (contactRoles && contactRoles.length > 0) {
      rolesSection = `
🎯 RÔLES SPÉCIFIQUES RECHERCHÉS:
${contactRoles.map(role => {
        const synonyms = this.roleMapping[role.toLowerCase()] || [];
        return `- ${role}\n  Synonymes: ${synonyms.join(', ')}`;
      }).join('\n')}`;
    }

    return `Recherche de contacts décisionnaires pour "${nomEntreprise}".

🏢 ENTREPRISE: ${nomEntreprise}
${secteurActivite ? `🏭 SECTEUR: ${secteurActivite}` : ''}
${siteWebEntreprise ? `🌐 SITE WEB: ${siteWebEntreprise}` : ''}
${zoneGeographique ? `📍 ZONE: ${zoneGeographique}` : ''}

${rolesSection}

🔍 SOURCES À CONSULTER EN PRIORITÉ:
1. Site web de l'entreprise: "${nomEntreprise} équipe dirigeants contacts"
2. LinkedIn: "${nomEntreprise} procurement achat responsable"
3. Annuaires professionnels: Kompass, Viadeo, Manageo.fr, Verif, Societe.com
4. Pages entreprise: "${nomEntreprise} organigramme direction technique"
5. Annuaires industriels: Pappers, Infogreffe, rapports annuels
6. BOAMP pour marchés publics si applicable
7. Pages "équipe" ou "about us" du site officiel

⚡ INSTRUCTIONS CRITIQUES:
1. Rechercher dans les sources françaises fiables (Kompass, Verif, Societe.com, Manageo)
2. Vérifier les organigrammes d'entreprise et pages équipe
3. Privilégier LinkedIn pour les profils professionnels actuels
4. Valider que les contacts sont actuellement en poste
5. Attribuer un score de pertinence basé sur l'adéquation au besoin

🎯 CRITÈRES DE SCORING:
- 0.9-1.0: Correspondance parfaite (CPO, Directeur Achat)
- 0.7-0.8: Très pertinent (Senior Buyer, Directeur Technique)  
- 0.5-0.6: Moyennement pertinent (Acheteur, Ingénieur)
- <0.5: Non pertinent (à exclure)

🎯 OBJECTIF: ${request.nombreResultats || 5} contacts ULTRA-QUALIFIÉS avec coordonnées vérifiées.

RÉPONSE: JSON strict avec contacts filtrés et sources vérifiables.`;
  }

  private async parseSonarResponse(response: any, request: ContactSearchRequest): Promise<ContactSearchResult> {
    try {
      const content = response.choices[0]?.message?.content || '';
      console.log('🔍 Contenu Sonar reçu:', content.substring(0, 300));
      
      let cleanContent = content.trim();
      cleanContent = cleanContent.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      const jsonMatch = cleanContent.match(/\{[\s\S]*"contacts"[\s\S]*\[[\s\S]*\][\s\S]*\}/);
      
      if (!jsonMatch) {
        return {
          contacts: [],
          sources: ['Sonar'],
          success: false,
          error: 'Format JSON non trouvé dans la réponse Sonar'
        };
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      if (!parsed || !Array.isArray(parsed.contacts)) {
        return {
          contacts: [],
          sources: ['Sonar'],
          success: false,
          error: 'Structure JSON invalide'
        };
      }

      const qualifiedContacts: ContactInfo[] = [];

      for (const contact of parsed.contacts.filter((c: any) => c && typeof c === 'object')) {
        if (!contact.nom || !contact.prenom || !contact.poste) {
          continue;
        }

        const relevanceCheck = await this.validateRoleRelevance(
          contact.poste, 
          request.contactRoles || []
        );

        if (!relevanceCheck.isRelevant) {
          console.log('❌ Contact Sonar rejeté:', contact.poste);
          continue;
        }

        const qualifiedContact: ContactInfo = {
          nom: String(contact.nom || '').trim(),
          prenom: String(contact.prenom || '').trim(),
          poste: String(contact.poste || '').trim(),
          email: contact.email ? String(contact.email).trim() : undefined,
          phone: contact.phone ? this.cleanPhoneNumber(String(contact.phone)) : undefined,
          linkedin_url: contact.linkedin_url ? String(contact.linkedin_url).trim() : undefined,
          verified: Boolean(contact.verified),
          relevance_score: relevanceCheck.score,
          sources: Array.isArray(contact.sources) ? contact.sources.filter(this.isValidUrl) : ['Sonar']
        };

        qualifiedContact.accroche_personnalisee = this.generatePersonalizedPitch(
          { first_name: qualifiedContact.prenom, title: qualifiedContact.poste },
          request.nomEntreprise,
          { score: relevanceCheck.score, matchedRoles: [], isRelevant: true }
        );
        qualifiedContact.accroche = qualifiedContact.accroche_personnalisee;
        qualifiedContact.pitch = qualifiedContact.accroche_personnalisee;

        qualifiedContacts.push(qualifiedContact);
      }

      qualifiedContacts.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));

      const sources = Array.isArray(parsed.sources) ? parsed.sources.filter(this.isValidUrl) : ['Sonar'];
      
      return {
        contacts: qualifiedContacts,
        sources,
        success: qualifiedContacts.length > 0
      };
    } catch (error: any) {
      console.error('❌ Erreur parsing Sonar:', error);
      return {
        contacts: [],
        sources: ['Sonar'],
        success: false,
        error: `Erreur parsing: ${error.message}`
      };
    }
  }

  private async validateRoleRelevance(poste: string, targetRoles: string[]): Promise<{isRelevant: boolean, score: number}> {
    const posteLower = poste.toLowerCase();
    
    for (const excluded of this.excludedRoles) {
      if (posteLower.includes(excluded.toLowerCase().trim())) {
        return { isRelevant: false, score: 0.0 };
      }
    }

    let maxScore = 0.0;

    for (const keyword of this.highRelevanceKeywords) {
      if (posteLower.includes(keyword.toLowerCase())) {
        maxScore = Math.max(maxScore, 0.75);
      }
    }

    for (const targetRole of targetRoles) {
      const synonyms = this.roleMapping[targetRole.toLowerCase()] || [];
      for (const synonym of synonyms) {
        if (posteLower.includes(synonym.toLowerCase())) {
          maxScore = Math.max(maxScore, 0.85);
        }
      }
    }

    return {
      isRelevant: maxScore >= 0.7,
      score: maxScore
    };
  }

  private buildApolloSearchParams(request: ContactSearchRequest): any {
    const titleSearchTerms: string[] = [];
    
    if (request.contactRoles && request.contactRoles.length > 0) {
      request.contactRoles.forEach(role => {
        const mappedTitles = this.roleMapping[role.toLowerCase()] || [role];
        titleSearchTerms.push(...mappedTitles);
      });
    }

    const searchParams: any = {
      page: 1,
      per_page: request.nombreResultats || 25,
      q_organization_name: request.nomEntreprise,
      person_titles: titleSearchTerms.length > 0 ? titleSearchTerms : undefined,
    };

    if (request.zoneGeographique) {
      searchParams.person_locations = [request.zoneGeographique];
    }

    Object.keys(searchParams).forEach(key => {
      if (searchParams[key] === undefined) {
        delete searchParams[key];
      }
    });

    return searchParams;
  }

  private parseApolloResponse(response: ApolloSearchResponse, request: ContactSearchRequest): ContactSearchResult {
    try {
      if (!response.people || !Array.isArray(response.people)) {
        return {
          contacts: [],
          sources: ['Apollo.io'],
          success: false
        };
      }

      const contacts: ContactInfo[] = response.people
        .filter((person) => {
          const organizationName = person.organization?.name?.toLowerCase().trim() || '';
          const targetCompany = request.nomEntreprise.toLowerCase().trim();
          return organizationName.includes(targetCompany) || targetCompany.includes(organizationName);
        })
        .map((person) => {
          let phone: string | undefined;
          if (person.phone_numbers && person.phone_numbers.length > 0) {
            const primaryPhone = person.phone_numbers.find(p => p.type === 'work') || person.phone_numbers[0];
            phone = this.formatFrenchPhone(primaryPhone.sanitized_number || primaryPhone.raw_number);
          }

          const contact: ContactInfo = {
            nom: person.last_name || '',
            prenom: person.first_name || '',
            poste: person.title || '',
            email: person.email && this.isValidEmail(person.email) ? person.email : undefined,
            phone: phone,
            linkedin_url: person.linkedin_url && this.isValidLinkedInUrl(person.linkedin_url) ? person.linkedin_url : undefined,
            verified: true,
            accroche_personnalisee: this.generatePersonalizedPitch(
              person,
              request.nomEntreprise,
              improveRoleMatching(person.title || '', request.contactRoles || [])
            ),
            sources: ['Apollo.io']
          };

          contact.accroche = contact.accroche_personnalisee;
          contact.pitch = contact.accroche_personnalisee;

          return contact;
        })
        .filter(contact => {
          const hasBasicInfo = contact.nom && contact.prenom && contact.poste;
          const hasContactMethod = contact.email || contact.phone || contact.linkedin_url;
          const roleMatch = improveRoleMatching(contact.poste, request.contactRoles || []);
          return hasBasicInfo && hasContactMethod && (roleMatch.isRelevant || !request.contactRoles || request.contactRoles.length === 0);
        });

      const limitedContacts = contacts.slice(0, request.nombreResultats || 25);

      return {
        contacts: limitedContacts,
        sources: ['Apollo.io'],
        success: limitedContacts.length > 0
      };

    } catch (error: any) {
      return {
        contacts: [],
        sources: ['Apollo.io'],
        success: false,
        error: error.message
      };
    }
  }

  private generatePersonalizedPitch(person: any, entreprise: string, roleMatch: any): string {
    const prenom = person.first_name || '';
    const poste = person.title || 'votre rôle';
    
    return `Bonjour ${prenom}, en tant que ${poste} chez ${entreprise}, nous pensons que notre expertise en composants mécaniques pourrait vous intéresser. Seriez-vous disponible pour un échange rapide ?`;
  }

  private formatFrenchPhone(phone: string): string {
    if (!phone) return '';
    let cleaned = phone.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '+33' + cleaned.substring(1);
    }
    return cleaned;
  }

  private cleanPhoneNumber(phone: string): string {
    return phone.replace(/[^\d+\s\-\.]/g, '').trim();
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
}