import axios from 'axios';

// ==================== TYPES ====================

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
  method?: 'apollo+perplexity+deep-research' | 'apollo+perplexity' | 'perplexity-fallback';
}

interface PerplexityAsyncResponse {
  id?: string;
  request_id?: string;
  status?: string;
  response?: {
    choices?: Array<{
      message: {
        content: string;
      };
    }>;
    search_results?: Array<{
      title?: string;
      url?: string;
      date?: string;
      published_date?: string;
    }>;
  };
  error_message?: string;
}

// ==================== JSON SCHEMAS ====================

const STANDARD_CONTACT_SCHEMA = {
  type: "object",
  properties: {
    contacts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          nom: { type: "string" },
          prenom: { type: "string" },
          poste: { type: "string" },
          email: { type: "string" },
          phone: { type: "string" },
          sources: {
            type: "array",
            items: { type: "string" }
          }
        },
        required: ["nom", "poste", "email", "phone", "sources"],
        additionalProperties: false
      }
    },
    sources: {
      type: "array",
      items: { type: "string" }
    }
  },
  required: ["contacts", "sources"],
  additionalProperties: false
};

const DEEP_RESEARCH_CONTACT_SCHEMA = {
  type: "object",
  properties: {
    contacts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          nom: { type: "string" },
          prenom: { type: "string" },
          poste: { type: "string" },
          email: { type: "string" },
          phone: { type: "string" },
          linkedin_url: { type: "string" }
        },
        required: ["nom", "prenom", "poste"],
        additionalProperties: false
      }
    }
  },
  required: ["contacts"],
  additionalProperties: false
};

// ==================== CLIENT ====================

export class ContactSearchClient {
  private apolloApiKey: string;
  private perplexityApiKey: string;
  private apolloBaseUrl = 'https://api.apollo.io/api/v1';
  private perplexityBaseUrl = 'https://api.perplexity.ai';

  // Mapping des rôles français vers recherche Apollo
  private roleToTitleMapping: { [key: string]: string[] } = {
    "Directeur des Achats": ["Director of Purchasing", "Head of Procurement", "Chief Procurement Officer", "Directeur Achats"],
    "Responsable Achats": ["Purchasing Manager", "Procurement Manager", "Responsable Achats"],
    "Acheteur": ["Buyer", "Purchaser", "Acheteur"],
    "Acheteur Senior": ["Senior Buyer", "Senior Purchaser"],
    "Acheteur Junior": ["Junior Buyer", "Assistant Buyer"],
    "Acheteur Projet": ["Project Buyer", "Project Purchaser"],
    "Acheteur Industriel": ["Industrial Buyer", "Manufacturing Buyer"],
    "Acheteur International": ["International Buyer", "Global Buyer"],
    "Buyer": ["Buyer", "Purchaser"],
    "Senior Buyer": ["Senior Buyer"],
    "Junior Buyer": ["Junior Buyer", "Assistant Buyer"],
    "Commodity Buyer": ["Commodity Buyer", "Commodity Manager"],
    "Acheteur Commodité": ["Commodity Buyer", "Commodity Manager"],
    "Acheteur Famille": ["Category Buyer", "Family Buyer"],
    "Category Buyer": ["Category Buyer", "Category Manager"],
    "Strategic Buyer": ["Strategic Buyer", "Strategic Sourcing"],
    "Operational Buyer": ["Operational Buyer", "Tactical Buyer"],
    "Procurement Manager": ["Procurement Manager", "Purchasing Manager"],
    "Procurement Specialist": ["Procurement Specialist", "Purchasing Specialist"],
    "Purchasing Manager": ["Purchasing Manager", "Procurement Manager"],
    "Head of Procurement": ["Head of Procurement", "Director of Procurement"],
    "Chief Procurement Officer (CPO)": ["Chief Procurement Officer", "CPO"],
    "Sourcing Manager": ["Sourcing Manager", "Strategic Sourcing Manager"],
    "Sourcing Specialist": ["Sourcing Specialist", "Sourcing Analyst"],
    "Responsable achat": ["Purchasing Manager", "Procurement Manager", "Head of Purchasing"],
    "Responsable achat ressort": ["Spring Purchasing Manager", "Spring Buyer"],
    "Acheteur projet": ["Project Buyer", "Project Purchaser"],
    "Acheteur commodité": ["Commodity Buyer", "Commodity Manager"],
    "Responsable découpe": ["Cutting Manager", "Cutting Department Head"],
    "Responsable achat métal": ["Metal Purchasing Manager", "Metal Buyer"],
    "Responsable Achats/Approvisionnement": ["Purchasing and Supply Manager", "Head of Procurement and Supply"]
  };

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

  // ==================== MÉTHODE PRINCIPALE ====================

  async searchContacts(request: ContactSearchRequest): Promise<ContactSearchResult> {
    console.log('🔍 Début recherche contacts pour:', request.nomEntreprise);
    console.log('📍 Zone géographique:', request.zoneGeographique || 'Non spécifiée');
    console.log('👥 Rôles recherchés:', request.contactRoles?.length || 0);
    console.log('📊 Résultats demandés:', request.nombreResultats || 'illimité');

    const allContacts: ContactInfo[] = [];
    const allSources: string[] = [];

    // 1️⃣ STANDARD - Recherche coordonnées entreprise (Perplexity Sonar avec JSON Schema)
    console.log('\n📞 [ÉTAPE 1/3] Recherche coordonnées standard...');
    const standardResult = await this.searchCompanyStandardWithRetry(request, 3);
    
    if (standardResult.success && standardResult.contacts.length > 0) {
      const validStandard = this.validateStandardContact(standardResult.contacts[0]);
      if (validStandard) {
        allContacts.push(validStandard);
        allSources.push(...standardResult.sources);
        console.log('✅ Contact standard ajouté');
      }
    } else {
      console.warn('⚠️ Échec récupération contact standard');
    }

    // 2️⃣ APOLLO - Recherche contacts spécifiques
    console.log('\n🎯 [ÉTAPE 2/3] Recherche contacts Apollo (limite: 8)...');
    
    const apolloResult = await this.searchWithApollo({
      ...request,
      nombreResultats: 8
    });
    
    if (apolloResult.success && apolloResult.contacts.length > 0) {
      allContacts.push(...apolloResult.contacts);
      allSources.push(...apolloResult.sources);
      console.log(`✅ ${apolloResult.contacts.length} contacts Apollo ajoutés`);
    } else {
      console.log('ℹ️ Aucun contact Apollo trouvé');
    }

    // 3️⃣ DEEP RESEARCH - Recherche approfondie Perplexity
    console.log('\n🔬 [ÉTAPE 3/3] Recherche Deep Research...');
    const deepResult = await this.searchWithDeepResearch(request);
    
    if (deepResult.success && deepResult.contacts.length > 0) {
      // Ajouter TOUS les contacts Deep Research directement
      allContacts.push(...deepResult.contacts);
      allSources.push(...deepResult.sources);
      
      console.log(`✅ ${deepResult.contacts.length} contacts Deep Research ajoutés`);
    } else {
      console.log('ℹ️ Aucun contact Deep Research trouvé');
    }

    const uniqueSources = [...new Set(allSources)];
    const finalCount = allContacts.length;

    console.log('\n📊 RÉSUMÉ FINAL:');
    console.log(`   Total contacts: ${finalCount}`);
    console.log(`   - Standard: ${standardResult.contacts.length}`);
    console.log(`   - Apollo: ${apolloResult.contacts?.length || 0}`);
    console.log(`   - Deep Research: ${deepResult.contacts?.length || 0}`);
    console.log(`   Sources: ${uniqueSources.join(', ')}`);

    if (finalCount === 0) {
      return {
        contacts: [],
        sources: uniqueSources,
        success: false,
        error: 'Aucun contact trouvé avec les 3 méthodes',
        method: 'perplexity-fallback'
      };
    }

    return {
      contacts: allContacts,
      sources: uniqueSources,
      success: true,
      method: 'apollo+perplexity+deep-research'
    };
  }

  // ==================== 1️⃣ STANDARD CONTACT ====================

  private async searchCompanyStandardWithRetry(
    request: ContactSearchRequest, 
    maxRetries: number = 3
  ): Promise<ContactSearchResult> {
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Tentative Standard ${attempt}/${maxRetries}`);
        
        const result = attempt <= 2 
          ? await this.searchCompanyStandardTargeted(request)
          : await this.searchCompanyStandardBroad(request);
        
        if (this.isValidStandardContact(result.contacts[0])) {
          console.log(`✅ Succès tentative ${attempt}`);
          return result;
        }
        
        console.warn(`⚠️ Tentative ${attempt} - Contact incomplet`);
        
      } catch (error: any) {
        console.error(`❌ Tentative ${attempt} échouée:`, error.message);
      }

      if (attempt < maxRetries) {
        await this.delay(1500 * attempt);
      }
    }

    return {
      contacts: [],
      sources: ['Perplexity Standard'],
      success: false,
      error: 'Échec après toutes les tentatives'
    };
  }

  private async searchCompanyStandardTargeted(request: ContactSearchRequest): Promise<ContactSearchResult> {
    const prompt = `Trouve les coordonnées OFFICIELLES de l'entreprise "${request.nomEntreprise}"${request.zoneGeographique ? ` en ${request.zoneGeographique}` : ''}.

Tu dois retourner un JSON avec:
- contacts: tableau contenant UN contact avec nom (nom entreprise), prenom (vide), poste ("Standard"), email (email trouvé), phone (numéro international), sources (liste des sources)
- sources: liste des sources utilisées

IMPORTANT:
- Le email doit être un vrai email trouvé (pas de placeholder)
- Le phone doit être au format international (+33...)
- Cherche sur le site officiel de l'entreprise`;

    return await this.executePerplexitySearch(prompt, request, 'sonar', STANDARD_CONTACT_SCHEMA);
  }

  private async searchCompanyStandardBroad(request: ContactSearchRequest): Promise<ContactSearchResult> {
    const prompt = `Recherche des coordonnées de contact de "${request.nomEntreprise}"${request.zoneGeographique ? ` en ${request.zoneGeographique}` : ''}.

Retourne un JSON avec les coordonnées trouvées (email et téléphone au format international).`;

    return await this.executePerplexitySearch(prompt, request, 'sonar', STANDARD_CONTACT_SCHEMA);
  }

  private async executePerplexitySearch(
    prompt: string, 
    request: ContactSearchRequest,
    model: 'sonar' | 'sonar-deep-research',
    jsonSchema?: any
  ): Promise<ContactSearchResult> {
    
    try {
      const payload: any = {
        model: model,
        messages: [
          { 
            role: 'system', 
            content: 'Tu es un assistant qui retourne UNIQUEMENT du JSON valide selon le schéma fourni.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 2000,
        return_citations: true
      };

      // Ajouter JSON Schema si fourni
      if (jsonSchema) {
        payload.response_format = {
          type: "json_schema",
          json_schema: {
            schema: jsonSchema
          }
        };
      }

      const response = await axios.post(
        `${this.perplexityBaseUrl}/chat/completions`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.perplexityApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000
        }
      );

      const content = response.data.choices[0]?.message?.content || '';
      
      // Avec JSON Schema, le contenu devrait déjà être du JSON valide
      // Mais on nettoie quand même au cas où
      const cleanedJson = this.cleanJsonResponse(content);
      const parsed = JSON.parse(cleanedJson);

      const contacts = (parsed.contacts || [])
        .map((contact: any) => this.formatStandardContact(contact, request))
        .filter((contact: ContactInfo | null) => contact !== null);

      return {
        contacts: contacts,
        sources: parsed.sources || ['Perplexity'],
        success: contacts.length > 0
      };

    } catch (error: any) {
      console.error('❌ Erreur Perplexity:', error.message);
      throw error;
    }
  }

  // ==================== 2️⃣ APOLLO CONTACTS ====================

  private async searchWithApollo(request: ContactSearchRequest): Promise<ContactSearchResult> {
    console.log('🔍 Recherche via Apollo...');
    
    try {
      const searchParams = this.buildApolloSearchParams(request);
      
      const response = await axios.post(
        `${this.apolloBaseUrl}/mixed_people/search`,
        searchParams,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': this.apolloApiKey
          },
          timeout: 30000
        }
      );
      
      console.log('✅ Réponse Apollo:', response.data.people?.length || 0, 'contacts');
      
      return this.parseApolloResponse(response.data, request);
      
    } catch (error: any) {
      console.error('❌ Erreur Apollo:', error.message);
      return {
        contacts: [],
        sources: ['Apollo.io'],
        success: false,
        error: error.message
      };
    }
  }

  private buildApolloSearchParams(request: ContactSearchRequest): any {
    const searchParams: any = {
      page: 1,
      per_page: request.nombreResultats || 8,
      q_organization_name: request.nomEntreprise
    };

    if (request.zoneGeographique) {
      searchParams.person_locations = [request.zoneGeographique];
    }

    if (request.contactRoles && request.contactRoles.length > 0) {
      const titles = this.convertRolesToApolloTitles(request.contactRoles);
      if (titles.length > 0) {
        searchParams.person_titles = titles;
      }
    }

    return searchParams;
  }

  private convertRolesToApolloTitles(roles: string[]): string[] {
    const allTitles = new Set<string>();
    
    roles.forEach(role => {
      const mappedTitles = this.roleToTitleMapping[role];
      if (mappedTitles) {
        mappedTitles.forEach(title => allTitles.add(title));
      } else {
        allTitles.add(role);
      }
    });

    return Array.from(allTitles);
  }

  private parseApolloResponse(response: any, request: ContactSearchRequest): ContactSearchResult {
    try {
      if (!response.people || !Array.isArray(response.people)) {
        return {
          contacts: [],
          sources: ['Apollo.io'],
          success: true
        };
      }

      const contacts: ContactInfo[] = response.people
        .filter((person: any) => {
          const orgName = person.organization?.name?.toLowerCase().trim() || '';
          const targetCompany = request.nomEntreprise.toLowerCase().trim();
          return orgName.includes(targetCompany) || targetCompany.includes(orgName);
        })
        .map((person: any) => {
          let phone: string | undefined;
          if (person.phone_numbers && person.phone_numbers.length > 0) {
            const primaryPhone = person.phone_numbers.find((p: any) => p.type === 'work') || person.phone_numbers[0];
            phone = this.formatInternationalPhone(primaryPhone.sanitized_number || primaryPhone.raw_number);
          }

          const contact: ContactInfo = {
            nom: person.last_name || '',
            prenom: person.first_name || '',
            poste: person.title || '',
            email: this.validateAndCleanEmail(person.email),
            phone: phone,
            linkedin_url: person.linkedin_url || undefined,
            verified: true,
            accroche_personnalisee: this.generatePersonalizedPitch(person, request.nomEntreprise),
            sources: ['Apollo.io'],
            relevance_score: 0.7
          };

          contact.accroche = contact.accroche_personnalisee;
          contact.pitch = contact.accroche_personnalisee;

          return contact;
        })
        .filter((contact: ContactInfo) => contact.nom && contact.prenom && contact.poste);

      return {
        contacts: contacts,
        sources: ['Apollo.io'],
        success: true
      };

    } catch (error: any) {
      console.error('❌ Erreur parsing Apollo:', error);
      return {
        contacts: [],
        sources: ['Apollo.io'],
        success: false,
        error: error.message
      };
    }
  }

  // ==================== 3️⃣ DEEP RESEARCH ====================

  private async searchWithDeepResearch(request: ContactSearchRequest): Promise<ContactSearchResult> {
    console.log('🔬 Lancement Deep Research...');
    
    try {
      const jobId = await this.startDeepResearchJob(request);
      console.log(`📝 Job ID: ${jobId}`);
      
      const result = await this.pollDeepResearchJob(jobId, request);
      
      return result;
      
    } catch (error: any) {
      console.error('❌ Erreur Deep Research:', error.message);
      return {
        contacts: [],
        sources: ['Perplexity Deep Research'],
        success: false,
        error: error.message
      };
    }
  }

  private async startDeepResearchJob(request: ContactSearchRequest): Promise<string> {
    const rolesText = request.contactRoles && request.contactRoles.length > 0
      ? request.contactRoles.join(', ')
      : 'Responsable achats, Directeur achats, Acheteur, Buyer';

    const prompt = `Trouve des contacts professionnels RÉELS chez "${request.nomEntreprise}"${request.zoneGeographique ? ` en ${request.zoneGeographique}` : ''}.

RÔLES RECHERCHÉS: ${rolesText}

Tu dois retourner un JSON avec:
- contacts: tableau d'objets avec nom, prenom, poste, email (optionnel), phone (optionnel), linkedin_url (optionnel)

IMPORTANT:
- Cherche des personnes RÉELLES avec leurs vrais noms
- Les emails et téléphones sont optionnels
- Le LinkedIn est optionnel
- Focus sur la qualité des informations`;

    const payload = {
      request: {
        model: 'sonar-deep-research',
        messages: [
          { 
            role: 'system', 
            content: 'Tu es un assistant de recherche professionnel. Tu retournes UNIQUEMENT du JSON valide selon le schéma fourni.' 
          },
          { role: 'user', content: prompt }
        ],
        search_mode: 'web',
        reasoning_effort: 'high',
        temperature: 0.0,
        response_format: {
          type: "json_schema",
          json_schema: {
            schema: DEEP_RESEARCH_CONTACT_SCHEMA
          }
        }
      }
    };

    try {
      const response = await axios.post(
        `${this.perplexityBaseUrl}/async/chat/completions`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.perplexityApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const jobId = response.data.id || response.data.request_id;
      
      if (!jobId) {
        throw new Error('Pas de job ID retourné par Perplexity');
      }

      return jobId;

    } catch (error: any) {
      if (error.response) {
        console.error('Erreur API Perplexity:', error.response.status, error.response.data);
        throw new Error(`Erreur API: ${error.response.status}`);
      }
      throw error;
    }
  }

  private async pollDeepResearchJob(
    jobId: string, 
    request: ContactSearchRequest,
    pollInterval: number = 10000,
    timeout: number = 600000
  ): Promise<ContactSearchResult> {
    
    const startTime = Date.now();
    const url = `${this.perplexityBaseUrl}/async/chat/completions/${jobId}`;

    console.log('⏳ Polling du job Deep Research (intervalle: 10s)...');
    let pollCount = 0;

    while (true) {
      try {
        pollCount++;
        const response = await axios.get<PerplexityAsyncResponse>(url, {
          headers: {
            'Authorization': `Bearer ${this.perplexityApiKey}`
          },
          timeout: 30000
        });

        const data = response.data;
        const status = (data.status || '').toUpperCase();

        if (pollCount % 3 === 0 || status !== 'IN_PROGRESS') {
          const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
          console.log(`📊 Status: ${status} (${elapsedSeconds}s elapsed, poll #${pollCount})`);
        }

        if (status === 'COMPLETED' || data.response) {
          console.log(`✅ Job terminé après ${pollCount} polls (${Math.round((Date.now() - startTime) / 1000)}s)`);
          return this.parseDeepResearchResponse(data, request);
        }

        if (status === 'FAILED') {
          throw new Error(`Job échoué: ${data.error_message || 'Erreur inconnue'}`);
        }

        if (Date.now() - startTime > timeout) {
          throw new Error(`Timeout après ${timeout / 1000}s`);
        }

        await this.delay(pollInterval);

      } catch (error: any) {
        if (error.message.includes('Timeout') || error.message.includes('Job échoué')) {
          throw error;
        }
        console.error('❌ Erreur polling:', error.message);
        throw error;
      }
    }
  }

  /**
   * 🔥 PARSING AVEC JSON SCHEMA - Parsing simplifié car structure garantie
   */
  private parseDeepResearchResponse(
    data: PerplexityAsyncResponse,
    request: ContactSearchRequest
  ): ContactSearchResult {
    
    try {
      const resp = data.response || {};
      let content = resp.choices?.[0]?.message?.content || '';

      if (!content) {
        console.warn('⚠️ Pas de contenu dans la réponse');
        return this.createEmptyContactResult('Réponse vide');
      }

      console.log('📄 Contenu brut (premiers 500 chars):', content.substring(0, 500));

      // Nettoyer les balises <think> pour les modèles reasoning
      content = this.cleanDeepResearchContent(content);
      
      console.log('🧹 Après nettoyage (premiers 500 chars):', content.substring(0, 500));

      // Avec JSON Schema, le parsing devrait être plus simple
      const cleanedJson = this.cleanJsonResponse(content);
      console.log('🔧 JSON final (premiers 500 chars):', cleanedJson.substring(0, 500));
      
      const parsed = JSON.parse(cleanedJson);

      const searchResults = resp.search_results || [];
      const sources = searchResults.map((s: any) => s.title || s.url || 'Source').slice(0, 5);

      const contacts: ContactInfo[] = (parsed.contacts || [])
        .map((contact: any) => this.formatDeepResearchContact(contact, request))
        .filter((contact: ContactInfo | null) => contact !== null);

      console.log(`✅ ${contacts.length} contacts Deep Research parsés`);

      return {
        contacts: contacts,
        sources: sources.length > 0 ? sources : ['Perplexity Deep Research'],
        success: contacts.length > 0
      };

    } catch (error: any) {
      console.error('❌ Erreur parsing:', error.message);
      return this.createEmptyContactResult(`Parsing error: ${error.message}`);
    }
  }

  /**
   * 🔥 NETTOYAGE COMPLET DE LA RÉPONSE DEEP RESEARCH
   */
  private cleanDeepResearchContent(content: string): string {
    let cleaned = content;

    // 1️⃣ Retirer TOUTES les balises <think>...</think> (même multi-lignes)
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '');
    
    // 2️⃣ Retirer tout le texte AVANT le premier vrai { d'un objet JSON
    const firstRealJsonMatch = cleaned.match(/\{\s*"/);
    if (firstRealJsonMatch) {
      const startIndex = cleaned.indexOf(firstRealJsonMatch[0]);
      cleaned = cleaned.substring(startIndex);
    }
    
    // 3️⃣ Retirer le markdown
    cleaned = cleaned.replace(/```json/gi, '').replace(/```/g, '');
    
    // 4️⃣ Retirer les titres markdown
    cleaned = cleaned.replace(/^#+\s+.+$/gm, '');
    
    // 5️⃣ Nettoyer les espaces multiples
    cleaned = cleaned.trim().replace(/\n\n+/g, '\n');

    return cleaned;
  }

  private createEmptyContactResult(reason?: string): ContactSearchResult {
    return {
      contacts: [],
      sources: ['Perplexity Deep Research'],
      success: false,
      error: reason || 'Aucun contact trouvé'
    };
  }

  private cleanJsonResponse(content: string): string {
    let cleaned = content.trim();
    
    // Retirer les blocs de code markdown
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
    cleaned = cleaned.replace(/^```\s*/i, '').replace(/\s*```$/i, '');
    cleaned = cleaned.replace(/^#+\s+.+$/gm, '');
    
    // Extraire le JSON
    const jsonMatches = cleaned.match(/\{[\s\S]*\}/);
    
    if (!jsonMatches) {
      const arrayMatches = cleaned.match(/\[[\s\S]*\]/);
      if (!arrayMatches) {
        throw new Error('Pas de JSON trouvé');
      }
      cleaned = `{"contacts": ${arrayMatches[0]}}`;
    } else {
      cleaned = jsonMatches[0];
    }
    
    // Nettoyer les virgules trailing et guillemets simples
    cleaned = cleaned
      .replace(/,(\s*[}\]])/g, '$1')
      .replace(/:\s*'([^']*)'/g, ': "$1"')
      .replace(/\n\s*\n/g, '\n');
    
    return cleaned;
  }

  private formatDeepResearchContact(rawContact: any, request: ContactSearchRequest): ContactInfo | null {
    try {
      if (!rawContact.nom || !rawContact.prenom) {
        return null;
      }

      const email = this.validateAndCleanEmail(rawContact.email);
      const phone = rawContact.phone ? this.validateAndCleanPhone(rawContact.phone) : undefined;
      const linkedinUrl = this.validateLinkedInUrl(rawContact.linkedin_url);

      return {
        nom: rawContact.nom.trim(),
        prenom: rawContact.prenom.trim(),
        poste: rawContact.poste || 'Non spécifié',
        email: email,
        phone: phone,
        linkedin_url: linkedinUrl,
        verified: false,
        sources: Array.isArray(rawContact.sources) ? rawContact.sources : ['Perplexity Deep Research'],
        relevance_score: 0.6,
        accroche_personnalisee: this.generatePersonalizedPitch(
          { 
            first_name: rawContact.prenom, 
            title: rawContact.poste 
          }, 
          request.nomEntreprise
        )
      };

    } catch (error: any) {
      console.error('❌ Erreur formatage:', error.message);
      return null;
    }
  }

  private validateLinkedInUrl(url: string | null | undefined): string | undefined {
    if (!url) return undefined;
    
    const cleanUrl = url.trim();
    
    // Vérifier que c'est une URL LinkedIn valide
    if (!cleanUrl.includes('linkedin.com/in/')) {
      return undefined;
    }
    
    // Normaliser l'URL
    let normalizedUrl = cleanUrl;
    
    // Ajouter https:// si manquant
    if (normalizedUrl.startsWith('http://')) {
      normalizedUrl = normalizedUrl.replace('http://', 'https://');
    } else if (!normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }
    
    // ✅ PAS de validation sur le nom de la personne
    // Les usernames LinkedIn peuvent être différents du nom réel
    // Exemples: "john-smith-12345", "jsmith", "igvillalba", etc.
    
    return normalizedUrl;
  }

  // ==================== HELPERS ====================

  private filterDuplicates(newContacts: ContactInfo[], existingContacts: ContactInfo[]): ContactInfo[] {
    return newContacts.filter(newContact => {
      const isDuplicate = existingContacts.some(existing => {
        const sameName = existing.nom.toLowerCase() === newContact.nom.toLowerCase() &&
                        existing.prenom.toLowerCase() === newContact.prenom.toLowerCase();
        
        const sameEmail = existing.email && newContact.email &&
                         existing.email.toLowerCase() === newContact.email.toLowerCase();
        
        const sameLinkedIn = existing.linkedin_url && newContact.linkedin_url &&
                            existing.linkedin_url === newContact.linkedin_url;
        
        return sameName || sameEmail || sameLinkedIn;
      });
      
      return !isDuplicate;
    });
  }

  private formatStandardContact(rawContact: any, request: ContactSearchRequest): ContactInfo | null {
    const email = this.validateAndCleanEmail(rawContact.email);
    const phone = this.validateAndCleanPhone(rawContact.phone);

    if (!email || !phone) {
      return null;
    }

    return {
      nom: rawContact.nom || request.nomEntreprise,
      prenom: '',
      poste: rawContact.poste || 'Standard / Accueil',
      email: email,
      phone: phone,
      linkedin_url: undefined,
      verified: true,
      relevance_score: 1.0,
      sources: Array.isArray(rawContact.sources) ? rawContact.sources : ['Site officiel']
    };
  }

  private validateStandardContact(contact: ContactInfo | undefined): ContactInfo | null {
    if (!contact) return null;

    const isValid = Boolean(
      contact.nom &&
      contact.email &&
      contact.phone &&
      this.isValidEmail(contact.email) &&
      this.isValidPhone(contact.phone)
    );

    if (!isValid) {
      console.error('❌ Contact standard invalide');
      return null;
    }

    return contact;
  }

  private isValidStandardContact(contact: ContactInfo | undefined): boolean {
    if (!contact) return false;
    
    return Boolean(
      contact.nom &&
      contact.email &&
      contact.phone &&
      this.isValidEmail(contact.email) &&
      this.isValidPhone(contact.phone)
    );
  }

  private validateAndCleanEmail(email: any): string | undefined {
    if (!email || typeof email !== 'string') return undefined;
    
    const cleaned = email.trim().toLowerCase();
    
    if (!this.isValidEmail(cleaned)) return undefined;
    
    return cleaned;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[a-z0-9][a-z0-9._-]*@[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i;
    if (!emailRegex.test(email)) return false;
    
    const invalidPatterns = [
      'example.com',
      'test.com',
      'placeholder',
      'noreply',
      'no-reply',
      'donotreply',
      'email_trouvé',
      'email_officiel'
    ];
    
    return !invalidPatterns.some(pattern => email.includes(pattern));
  }

  private validateAndCleanPhone(phone: any): string | undefined {
    if (!phone || typeof phone !== 'string') return undefined;
    
    const cleaned = this.formatInternationalPhone(phone);
    
    if (!this.isValidPhone(cleaned)) return undefined;
    
    return cleaned;
  }

  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^\+\d{10,15}$/;
    if (!phoneRegex.test(phone)) return false;
    
    const invalidPatterns = [
      'telephone_trouvé',
      'numéro_format',
      '0000000000',
      '1111111111'
    ];
    
    return !invalidPatterns.some(pattern => phone.includes(pattern));
  }

  private formatInternationalPhone(phone: string): string {
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      cleaned = '+33' + cleaned.substring(1);
    } else if (cleaned.startsWith('00')) {
      cleaned = '+' + cleaned.substring(2);
    } else if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    
    return cleaned;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generatePersonalizedPitch(person: any, entreprise: string): string {
    const prenom = person.first_name || '';
    const poste = person.title || 'votre rôle';
    
    return `Bonjour ${prenom}, en tant que ${poste} chez ${entreprise}, nous pensons que notre expertise en composants mécaniques pourrait vous intéresser. Seriez-vous disponible pour un échange rapide ?`;
  }
}