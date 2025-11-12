import axios from 'axios';

// ==================== TYPES ====================

interface ContactInfo {
  nom: string;
  prenom: string;
  poste: string;
  email?: string;
  phone?: string;
  linkedin_url?: string;
  linkedin_headline?: string; // LinkedIn headline/entête
  verified: boolean;
  sources: string[];
  relevance_score?: number;
}

interface ContactSearchRequest {
  nomEntreprise: string;
  posteRecherche?: string;
  secteurActivite?: string;
  includeEmails?: boolean;
  includeLinkedIn?: boolean;
  contactRoles?: string[];
  customRole?: string; // Custom free text role field
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
      description: "Liste de contacts professionnels réels avec coordonnées complètes",
      items: {
        type: "object",
        properties: {
          nom: {
            type: "string",
            description: "Nom de famille de la personne"
          },
          prenom: {
            type: "string",
            description: "Prénom de la personne"
          },
          poste: {
            type: "string",
            description: "Titre du poste ou fonction actuelle"
          },
          email: {
            type: "string",
            description: "Adresse email professionnelle directe (format: prenom.nom@entreprise.com). Rechercher activement dans les signatures, communiqués, pages de contact."
          },
          phone: {
            type: "string",
            description: "Numéro de téléphone direct professionnel au format international (+33...). Rechercher dans les annuaires, communiqués de presse, pages de contact."
          },
          linkedin_url: {
            type: "string",
            description: "URL complète du profil LinkedIn professionnel (https://www.linkedin.com/in/...). Vérifier que le profil est actif et récent."
          },
          sources: {
            type: "array",
            description: "URLs des sources où les informations ont été trouvées",
            items: { type: "string" }
          }
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
    console.log('\n📞 [ÉTAPE 1/2] Recherche coordonnées standard...');
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
    console.log('\n🎯 [ÉTAPE 2/2] Recherche contacts Apollo...');

    const apolloResult = await this.searchWithApollo(request);

    if (apolloResult.success && apolloResult.contacts.length > 0) {
      allContacts.push(...apolloResult.contacts);
      allSources.push(...apolloResult.sources);
      console.log(`✅ ${apolloResult.contacts.length} contacts Apollo ajoutés`);
    } else {
      console.log('ℹ️ Aucun contact Apollo trouvé');
    }

    const uniqueSources = [...new Set(allSources)];
    const finalCount = allContacts.length;

    console.log('\n📊 RÉSUMÉ FINAL:');
    console.log(`   Total contacts: ${finalCount}`);
    console.log(`   - Standard: ${standardResult.contacts.length}`);
    console.log(`   - Apollo: ${apolloResult.contacts?.length || 0}`);
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

      // Parse initial response WITHOUT automatic enrichment
      // Users will manually reveal contact info when needed
      const initialResult = this.parseApolloResponse(response.data, request);

      return initialResult;

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

  /**
   * 🔓 ENRICHMENT - Reveal emails and phone numbers for Apollo contacts
   *
   * Now enriches ALL contacts to reveal both emails AND phone numbers via webhook.
   */
  private async enrichApolloContacts(contacts: ContactInfo[]): Promise<ContactInfo[]> {
    const enrichedContacts: ContactInfo[] = [];

    for (const contact of contacts) {
      try {
        // Skip if contact already has both email AND phone
        if (contact.email && contact.phone) {
          console.log(`✓ Contact ${contact.prenom} ${contact.nom} - déjà complet (email + téléphone)`);
          enrichedContacts.push(contact);
          continue;
        }

        const needsEmail = !contact.email;
        const needsPhone = !contact.phone;
        console.log(`🔍 Enrichissement de ${contact.prenom} ${contact.nom} (besoin: ${needsEmail ? 'email' : ''}${needsEmail && needsPhone ? ' + ' : ''}${needsPhone ? 'téléphone' : ''})...`);

        const enrichedData = await this.enrichPersonData({
          first_name: contact.prenom,
          last_name: contact.nom,
          organization_name: contact.linkedin_url ? undefined : contact.poste,
          linkedin_url: contact.linkedin_url
        });

        if (enrichedData) {
          // Merge enriched data with existing contact
          const mergedContact: ContactInfo = {
            ...contact,
            email: enrichedData.email || contact.email,
            phone: enrichedData.phone || contact.phone,
            linkedin_url: enrichedData.linkedin_url || contact.linkedin_url,
            linkedin_headline: enrichedData.linkedin_headline || contact.linkedin_headline
          };

          console.log(`✅ Enrichi: ${mergedContact.prenom} ${mergedContact.nom}`, {
            has_email: !!mergedContact.email,
            has_phone: !!mergedContact.phone
          });

          enrichedContacts.push(mergedContact);
        } else {
          // Keep original contact if enrichment failed
          console.log(`⚠️ Enrichissement échoué, conservation du contact original`);
          enrichedContacts.push(contact);
        }

        // Rate limiting: wait between enrichment calls (includes webhook delay)
        await this.delay(500);

      } catch (error: any) {
        console.error(`❌ Erreur enrichissement ${contact.prenom} ${contact.nom}:`, error.message);
        // Keep original contact on error
        enrichedContacts.push(contact);
      }
    }

    const emailCount = enrichedContacts.filter(c => c.email).length;
    const phoneCount = enrichedContacts.filter(c => c.phone).length;
    console.log(`📊 Enrichissement terminé: ${emailCount}/${contacts.length} avec email, ${phoneCount}/${contacts.length} avec téléphone`);

    return enrichedContacts;
  }

  /**
   * 🔓 APOLLO PEOPLE ENRICHMENT - Single person enrichment with phone numbers
   *
   * This now includes phone number enrichment using our webhook endpoint.
   * Phone numbers are received asynchronously via webhook and retrieved after a delay.
   */
  private async enrichPersonData(params: {
    first_name?: string;
    last_name?: string;
    organization_name?: string;
    domain?: string;
    linkedin_url?: string;
  }): Promise<{
    email?: string;
    phone?: string;
    linkedin_url?: string;
    linkedin_headline?: string;
  } | null> {

    try {
      // Construct webhook URL
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const webhookUrl = `${baseUrl}/api/apollo-webhook`;

      // Check if webhook URL is HTTPS (Apollo requirement)
      const isHttps = webhookUrl.startsWith('https://');

      const payload: any = {
        reveal_personal_emails: true
      };

      // Only request phone numbers if we have a valid HTTPS webhook URL
      if (isHttps) {
        payload.reveal_phone_number = true;
        payload.webhook_url = webhookUrl;
        console.log(`📞 Requesting phone reveal with webhook: ${webhookUrl}`);
      } else {
        console.warn(`⚠️ Skipping phone enrichment - webhook requires HTTPS URL. Current: ${webhookUrl}`);
        console.warn(`💡 To enable phone numbers: Deploy to production or use ngrok for local HTTPS`);
      }

      // Add available identifiers
      if (params.first_name) payload.first_name = params.first_name;
      if (params.last_name) payload.last_name = params.last_name;
      if (params.organization_name) payload.organization_name = params.organization_name;
      if (params.domain) payload.domain = params.domain;
      if (params.linkedin_url) payload.linkedin_url = params.linkedin_url;

      const response = await axios.post(
        `${this.apolloBaseUrl}/people/match`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': this.apolloApiKey
          },
          timeout: 30000
        }
      );

      const person = response.data.person;

      if (!person) {
        console.warn('⚠️ Aucune correspondance trouvée');
        return null;
      }

      // Extract email (available immediately)
      let email: string | undefined;
      if (person.email) {
        email = this.validateAndCleanEmail(person.email);
      }

      // Extract phone from immediate response (may be available)
      let phone: string | undefined;
      if (person.phone_numbers && person.phone_numbers.length > 0) {
        const primaryPhone = person.phone_numbers.find((p: any) => p.type === 'mobile')
          || person.phone_numbers.find((p: any) => p.type === 'work')
          || person.phone_numbers[0];
        phone = this.formatInternationalPhone(primaryPhone.sanitized_number || primaryPhone.raw_number);
      }

      // Extract LinkedIn info
      let linkedinUrl: string | undefined;
      let linkedinHeadline: string | undefined;

      if (person.linkedin_url) {
        linkedinUrl = this.validateLinkedInUrl(person.linkedin_url);
      }

      if (person.headline) {
        linkedinHeadline = person.headline;
      } else if (person.title) {
        linkedinHeadline = person.title;
      }

      // If phone not available immediately, try to retrieve from webhook cache after delay
      if (!phone && params.first_name && params.last_name && isHttps) {
        console.log(`⏳ Attente de la réception du téléphone via webhook...`);
        await this.delay(3000); // Wait 3 seconds for webhook to receive data

        const cachedPhone = await this.retrievePhoneFromWebhook(
          params.first_name,
          params.last_name,
          params.organization_name
        );

        if (cachedPhone) {
          phone = cachedPhone;
          console.log(`✅ Téléphone récupéré via webhook`);
        }
      }

      return {
        email,
        phone,
        linkedin_url: linkedinUrl,
        linkedin_headline: linkedinHeadline
      };

    } catch (error: any) {
      if (error.response) {
        console.error('❌ Erreur API Apollo Enrichment:', error.response.status, error.response.data);
      } else {
        console.error('❌ Erreur enrichissement:', error.message);
      }
      return null;
    }
  }

  /**
   * Retrieve phone number from webhook cache
   */
  private async retrievePhoneFromWebhook(
    firstName: string,
    lastName: string,
    organization?: string
  ): Promise<string | undefined> {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const params = new URLSearchParams({
        first_name: firstName,
        last_name: lastName,
        ...(organization && { organization })
      });

      const response = await axios.get(`${baseUrl}/api/apollo-webhook?${params}`);

      if (response.data.found && response.data.phone) {
        return this.formatInternationalPhone(response.data.phone);
      }
    } catch (error: any) {
      console.error('❌ Erreur récupération téléphone webhook:', error.message);
    }

    return undefined;
  }

  private buildApolloSearchParams(request: ContactSearchRequest): any {
    const searchParams: any = {
      page: 1,
      per_page: 15,
      q_organization_name: request.nomEntreprise
    };

    if (request.zoneGeographique) {
      searchParams.person_locations = [request.zoneGeographique];
    }

    // Combine predefined roles and custom role
    const allRoles: string[] = [];
    if (request.contactRoles && request.contactRoles.length > 0) {
      allRoles.push(...request.contactRoles);
    }
    if (request.customRole && request.customRole.trim() !== '') {
      allRoles.push(request.customRole.trim());
    }

    if (allRoles.length > 0) {
      const titles = this.convertRolesToApolloTitles(allRoles);
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

          // Extract LinkedIn headline with fallback to title or first employment
          let linkedinHeadline: string | undefined;

          // Debug: Log Apollo person data structure
          console.log('🔍 Apollo person data:', {
            name: `${person.first_name} ${person.last_name}`,
            headline: person.headline,
            linkedin_headline: person.linkedin_headline,
            title: person.title,
            employment_history_length: person.employment_history?.length || 0,
            first_job_title: person.employment_history?.[0]?.title
          });

          if (person.headline) {
            linkedinHeadline = person.headline;
          } else if (person.linkedin_headline) {
            linkedinHeadline = person.linkedin_headline;
          } else if (person.title) {
            linkedinHeadline = person.title;
          } else if (person.employment_history && person.employment_history.length > 0) {
            const currentJob = person.employment_history[0];
            linkedinHeadline = currentJob.title || undefined;
          }

          console.log('✅ Extracted headline:', linkedinHeadline);

          // Debug: Log email and phone data from Apollo
          console.log('📧 Apollo contact details:', {
            name: `${person.first_name} ${person.last_name}`,
            raw_email: person.email,
            email_status: person.email_status,
            phone_numbers: person.phone_numbers?.length || 0,
            raw_phone: person.phone_numbers?.[0]
          });

          const contact: ContactInfo = {
            nom: person.last_name || '',
            prenom: person.first_name || '',
            poste: person.title || '',
            email: this.validateAndCleanEmail(person.email),
            phone: phone,
            linkedin_url: person.linkedin_url || undefined,
            linkedin_headline: linkedinHeadline,
            verified: true,
            sources: ['Apollo.io'],
            relevance_score: 0.7
          };

          console.log('✅ Processed contact:', {
            name: `${contact.prenom} ${contact.nom}`,
            has_email: !!contact.email,
            has_phone: !!contact.phone
          });

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
    // Combine predefined roles and custom role
    const allRoles: string[] = [];
    if (request.contactRoles && request.contactRoles.length > 0) {
      allRoles.push(...request.contactRoles);
    }
    if (request.customRole && request.customRole.trim() !== '') {
      allRoles.push(request.customRole.trim());
    }

    const rolesText = allRoles.length > 0
      ? allRoles.join(', ')
      : 'Responsable achats, Directeur achats, Acheteur, Buyer';

    const websiteInfo = request.siteWebEntreprise ? `\nSITE WEB DE L'ENTREPRISE: ${request.siteWebEntreprise}` : '';
    const locationFilter = request.zoneGeographique ? request.zoneGeographique : '';

    const prompt = `Recherche approfondie de contacts professionnels RÉELS chez "${request.nomEntreprise}"${locationFilter ? ` STRICTEMENT en ${locationFilter}` : ''}.${websiteInfo}

RÔLES RECHERCHÉS: ${rolesText}

⚠️ CONTRAINTE GÉOGRAPHIQUE ABSOLUE:
${locationFilter ? `- Tu DOIS UNIQUEMENT trouver des contacts qui travaillent à ${locationFilter}
- REJETTE IMMÉDIATEMENT tout contact qui n'est PAS basé à ${locationFilter}
- Vérifie OBLIGATOIREMENT la localisation dans le profil LinkedIn (doit indiquer "${locationFilter}")
- Si la localisation n'est pas "${locationFilter}", NE PAS INCLURE ce contact
- EXEMPLE: Si je demande "Paris", rejette les contacts de "Lyon", "Toulouse", "Brésil", etc.` : '- Aucune contrainte géographique spécifique'}

🎯 OBJECTIF: Trouver AU MINIMUM 6-7 contacts avec coordonnées complètes (nom, prénom, poste, email, téléphone direct, LinkedIn URL exacte) de personnes RÉELLES.

📋 SOURCES PRIORITAIRES À CONSULTER:
1. LinkedIn - Profils professionnels complets avec coordonnées
2. Site web de l'entreprise - Pages "Équipe", "Contact", "About Us", sections leadership
3. Annuaires professionnels - Kompass, Europages, Pages Jaunes Pro
4. Communiqués de presse - Mentions de responsables avec coordonnées
5. Articles de presse - Interviews, citations avec informations de contact
6. Réseaux sociaux professionnels - Twitter, posts de blog d'entreprise
7. Bases de données publiques - SIRENE, registres commerciaux

📞 EXTRACTION D'EMAILS ET TÉLÉPHONES:
- Cherche les emails directs professionnels (prenom.nom@entreprise.com)
- Cherche les numéros de téléphone DIRECTS individuels (pas le standard général)
- NE JAMAIS inventer ou deviner un numéro - si tu ne trouves pas de ligne directe, laisse vide
- Vérifie les signatures d'emails dans les communiqués
- Recherche dans les fichiers PDF publics (rapports annuels, brochures)
- Consulte les pages "Nous contacter" et organigrammes

🔗 LINKEDIN URLs - RÈGLES STRICTES:
- Tu DOIS copier l'URL EXACTE du profil LinkedIn trouvé
- Format attendu: https://www.linkedin.com/in/[username-exact]
- NE JAMAIS inventer ou modifier l'URL LinkedIn
- Si tu ne trouves pas le profil LinkedIn exact, laisse le champ vide
- Vérifie que l'URL existe réellement avant de l'inclure

⚠️ CRITÈRES DE QUALITÉ OBLIGATOIRES:
- Personnes RÉELLES uniquement (pas de contacts génériques)
- Emails personnels professionnels (éviter info@, contact@)
- Téléphones directs UNIQUEMENT (pas de standards +33 1 XX XX XX XX génériques)
- URLs LinkedIn EXACTES et vérifiables (pas d'URLs inventées)
- Profils LinkedIn récents et actifs avec localisation vérifiée
- Informations vérifiées et à jour
- Minimum 6-7 contacts complets

FORMAT DE RETOUR:
- contacts: tableau d'objets avec nom, prenom, poste, email, phone, linkedin_url
- Remplis TOUS les champs possibles pour chaque contact
- Si un champ n'est pas trouvé, laisse-le vide mais continue à chercher les autres

🔍 STRATÉGIE DE RECHERCHE (OBLIGATOIRE):
1. Commence par LinkedIn: Recherche "${request.nomEntreprise} ${rolesText}${locationFilter ? ` ${locationFilter}` : ''}"
2. Site web officiel: Pages équipe, leadership, contacts
3. Annuaires professionnels: Kompass, Europages, Pages Jaunes avec filtres géographiques
4. Articles et communiqués: Mentions récentes avec coordonnées
5. Bases de données: ZoomInfo, RocketReach, Apollo avec filtres de localisation
6. IMPÉRATIF: Continue jusqu'à avoir 6-7 contacts valides
7. VÉRIFICATION FINALE: Chaque contact doit avoir la bonne localisation (${locationFilter || 'non spécifiée'})

📊 QUANTITÉ REQUISE: AU MINIMUM 6-7 contacts complets
Si moins de 6 contacts, continue la recherche avec d'autres sources!`;

    const payload = {
      request: {
        model: 'sonar-deep-research',
        messages: [
          {
            role: 'system',
            content: `Tu es un expert en intelligence commerciale et OSINT (Open Source Intelligence) spécialisé dans la recherche de coordonnées professionnelles.

EXPERTISE:
- Extraction de données de contact depuis sources publiques
- Validation et vérification croisée d'informations
- Recherche approfondie sur LinkedIn, sites web d'entreprises, annuaires professionnels
- Identification d'emails et téléphones directs professionnels

MÉTHODE:
1. Recherche multi-sources systématique
2. Priorisation des sources officielles et vérifiées
3. Extraction méthodique des emails professionnels (format: prenom.nom@entreprise.com)
4. Recherche de numéros directs dans les annuaires et communiqués
5. Validation des profils LinkedIn actifs et récents

QUALITÉ:
- Contacts réels et vérifiables uniquement
- Maximum d'informations par contact (nom, prénom, poste, email, téléphone, LinkedIn)
- Préférer 5 contacts complets à 10 contacts incomplets
- Sources fiables et à jour

Tu retournes UNIQUEMENT du JSON valide selon le schéma fourni, avec le maximum de champs remplis pour chaque contact.`
          },
          { role: 'user', content: prompt }
        ],
        search_mode: 'web',
        reasoning_effort: 'high',
        temperature: 0.0,
        search_domain_filter: [
          'linkedin.com',
          'pages-jaunes.fr',
          'pagesjaunes.fr',
          'kompass.com',
          'europages.com',
          'societe.com',
          'verif.com',
          'companieshouse.gov.uk',
          'northdata.com',
          'crunchbase.com',
          'zoominfo.com',
          'rocketreach.com',
          'hunter.io',
          'apollo.io'
        ],
        search_recency_filter: 'month',
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
          return await this.parseDeepResearchResponse(data, request);
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
  private async parseDeepResearchResponse(
    data: PerplexityAsyncResponse,
    request: ContactSearchRequest
  ): Promise<ContactSearchResult> {
    
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

      let contacts: ContactInfo[] = (parsed.contacts || [])
        .map((contact: any) => this.formatDeepResearchContact(contact, request))
        .filter((contact: ContactInfo | null) => contact !== null);

      console.log(`✅ ${contacts.length} contacts Deep Research parsés`);

      // 🔥 ENRICHISSEMENT APOLLO pour valider LinkedIns et obtenir téléphones
      console.log('🔍 Enrichissement Apollo des contacts Deep Research...');
      const enrichedContacts: ContactInfo[] = [];

      for (const contact of contacts) {
        try {
          const enriched = await this.enrichPersonData({
            first_name: contact.prenom,
            last_name: contact.nom,
            organization_name: request.nomEntreprise,
            domain: request.siteWebEntreprise?.replace(/^https?:\/\/(www\.)?/, ''),
            linkedin_url: contact.linkedin_url
          });

          if (enriched) {
            console.log(`✅ Contact enrichi: ${contact.prenom} ${contact.nom}`);
            // Merge enriched data with deep research data
            enrichedContacts.push({
              ...contact,
              email: enriched.email || contact.email,
              phone: enriched.phone || contact.phone, // Apollo phone prioritized
              linkedin_url: enriched.linkedin_url || contact.linkedin_url, // Apollo LinkedIn verified
              linkedin_headline: enriched.linkedin_headline || contact.linkedin_headline,
              verified: true, // Mark as verified by Apollo
              sources: [...(contact.sources || []), 'Apollo Enrichment']
            });
          } else {
            // Keep original if enrichment fails
            enrichedContacts.push(contact);
          }
        } catch (error: any) {
          console.warn(`⚠️ Enrichment échoué pour ${contact.prenom} ${contact.nom}:`, error.message);
          // Keep original contact even if enrichment fails
          enrichedContacts.push(contact);
        }
      }

      console.log(`✅ ${enrichedContacts.length} contacts après enrichissement Apollo`);

      return {
        contacts: enrichedContacts,
        sources: sources.length > 0 ? sources : ['Perplexity Deep Research'],
        success: enrichedContacts.length > 0
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
        linkedin_headline: rawContact.poste, // Use poste as fallback headline for Perplexity results
        verified: false,
        sources: Array.isArray(rawContact.sources) ? rawContact.sources : ['Perplexity Deep Research'],
        relevance_score: 0.6
      };

    } catch (error: any) {
      console.error('❌ Erreur formatage:', error.message);
      return null;
    }
  }

  private validateLinkedInUrl(url: string | null | undefined): string | undefined {
    if (!url) return undefined;

    const cleanUrl = url.trim();
    if (!cleanUrl) return undefined;

    // Accept all LinkedIn URLs from Apollo - just normalize the protocol
    let normalizedUrl = cleanUrl;

    // Ajouter https:// si manquant
    if (normalizedUrl.startsWith('http://')) {
      normalizedUrl = normalizedUrl.replace('http://', 'https://');
    } else if (!normalizedUrl.startsWith('https://') && !normalizedUrl.startsWith('http://')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

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

    // Reject placeholder and generic patterns
    const invalidPatterns = [
      'telephone_trouvé',
      'numéro_format',
      '0000000000',
      '1111111111'
    ];

    if (invalidPatterns.some(pattern => phone.includes(pattern))) {
      return false;
    }

    // Reject common generic French switchboard numbers (too generic)
    const genericFrenchSwitchboards = [
      '+33141705000',  // Generic Valeo switchboard format
      '+33140',        // Common Paris switchboard prefix (too generic if it's just switchboard)
    ];

    // Only reject if it's an EXACT match to known generic switchboards
    // Allow specific extensions or longer numbers
    for (const generic of genericFrenchSwitchboards) {
      if (phone === generic) {
        console.warn(`⚠️ Rejet du numéro de standard générique: ${phone}`);
        return false;
      }
    }

    return true;
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

}