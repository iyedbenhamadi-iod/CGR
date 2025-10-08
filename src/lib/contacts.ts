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
  method?: 'apollo' | 'perplexity-fallback' | 'apollo+perplexity';
}

export class ContactSearchClient {
  private apolloApiKey: string;
  private perplexityApiKey: string;
  private apolloBaseUrl = 'https://api.apollo.io/api/v1';
  private perplexityBaseUrl = 'https://api.perplexity.ai';

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

    // 1️⃣ Recherche OBLIGATOIRE du contact standard via Perplexity avec retry renforcé
    console.log('📞 [PRIORITAIRE] Recherche coordonnées standard avec Perplexity...');
    const perplexityResult = await this.searchCompanyStandardWithRetry(request, 3);

    // Validation stricte du contact standard
    const standardContact = this.validateStandardContact(perplexityResult.contacts[0]);
    
    if (!standardContact) {
      console.error('❌ ÉCHEC CRITIQUE : Aucun contact standard valide trouvé');
      return {
        contacts: [],
        sources: ['Perplexity (échec)'],
        success: false,
        error: 'Impossible de récupérer les coordonnées standard de l\'entreprise'
      };
    }

    console.log('✅ Contact standard validé:', {
      nom: standardContact.nom,
      email: standardContact.email,
      phone: standardContact.phone,
      sources: standardContact.sources
    });

    // 2️⃣ Recherche Apollo (contacts spécifiques - optionnel)
    const apolloResult = await this.searchWithApollo(request);

    // Construction de la liste finale
    let mergedContacts: ContactInfo[];
    let method: 'apollo+perplexity' | 'perplexity-fallback';

    if (apolloResult.contacts && apolloResult.contacts.length > 0) {
      // Standard en premier + contacts Apollo
      mergedContacts = [standardContact, ...apolloResult.contacts];
      method = 'apollo+perplexity';
      console.log(`✅ Résultat final: 1 standard + ${apolloResult.contacts.length} Apollo = ${mergedContacts.length} contacts`);
    } else {
      // Uniquement le contact standard
      mergedContacts = [standardContact];
      method = 'perplexity-fallback';
      console.log('✅ Résultat final: 1 contact standard uniquement');
    }

    const allSources = [
      ...standardContact.sources,
      ...(apolloResult.sources || [])
    ];

    return {
      contacts: mergedContacts,
      sources: [...new Set(allSources)],
      success: true,
      method
    };
  }

  /**
   * Recherche robuste du contact standard avec retry et multiples stratégies
   */
  private async searchCompanyStandardWithRetry(
    request: ContactSearchRequest, 
    maxRetries: number = 3
  ): Promise<ContactSearchResult> {
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Tentative Perplexity ${attempt}/${maxRetries}`);
        
        // Stratégie 1: Recherche ciblée (tentatives 1-2)
        if (attempt <= 2) {
          const result = await this.searchCompanyStandardTargeted(request);
          if (this.isValidStandardContact(result.contacts[0])) {
            console.log(`✅ Succès tentative ${attempt} (ciblée)`);
            return result;
          }
        }
        
        // Stratégie 2: Recherche élargie (tentative 3)
        if (attempt === 3) {
          const result = await this.searchCompanyStandardBroad(request);
          if (this.isValidStandardContact(result.contacts[0])) {
            console.log(`✅ Succès tentative ${attempt} (élargie)`);
            return result;
          }
        }
        
        console.warn(`⚠️ Tentative ${attempt}/${maxRetries} - Contact incomplet`);
        
      } catch (error: any) {
        console.error(`❌ Tentative ${attempt}/${maxRetries} échouée:`, error.message);
      }

      // Attente progressive entre les tentatives
      if (attempt < maxRetries) {
        const delayMs = 1500 * attempt;
        console.log(`⏳ Attente de ${delayMs}ms avant nouvelle tentative...`);
        await this.delay(delayMs);
      }
    }

    // Échec complet après toutes les tentatives
    console.error('❌ ÉCHEC TOTAL : Impossible de récupérer les coordonnées standard');
    return {
      contacts: [],
      sources: ['Perplexity (échec)'],
      success: false,
      error: 'Toutes les tentatives ont échoué'
    };
  }

  /**
   * Stratégie 1: Recherche ciblée et précise
   */
  private async searchCompanyStandardTargeted(request: ContactSearchRequest): Promise<ContactSearchResult> {
    const prompt = `
Trouve les coordonnées OFFICIELLES de contact de l'entreprise "${request.nomEntreprise}"${request.zoneGeographique ? ` située en ${request.zoneGeographique}` : ''}.

RECHERCHE OBLIGATOIRE :
1. Email de contact général (contact@, info@, commercial@, accueil@)
2. Numéro de téléphone du standard

SOURCES À CONSULTER EN PRIORITÉ :
- Site web officiel de l'entreprise
- Pages "Contact" ou "Nous contacter"
- Mentions légales
- Annuaires professionnels officiels

RETOURNE UNIQUEMENT CE JSON (aucun texte avant/après) :
{
  "contacts": [{
    "nom": "${request.nomEntreprise}",
    "prenom": "",
    "poste": "Standard",
    "email": "email_officiel_trouvé",
    "phone": "telephone_standard_au_format_+33XXXXXXXXX",
    "sources": ["Site officiel", "Page contact"]
  }],
  "sources": ["Site officiel"]
}

RÈGLES STRICTES :
- Email ET téléphone sont OBLIGATOIRES
- Format téléphone : +33XXXXXXXXX (sans espaces)
- Si l'un des deux manque : chercher plus profondément
- NE PAS inventer de coordonnées
- Retourner UNIQUEMENT le JSON valide
`;

    return await this.executePerplexitySearch(prompt, request);
  }

  /**
   * Stratégie 2: Recherche élargie avec plusieurs sources
   */
  private async searchCompanyStandardBroad(request: ContactSearchRequest): Promise<ContactSearchResult> {
    const prompt = `
Recherche EXHAUSTIVE des coordonnées de "${request.nomEntreprise}"${request.zoneGeographique ? ` en ${request.zoneGeographique}` : ''}.

MISSION CRITIQUE : Trouver email ET téléphone

SOURCES À EXPLORER :
1. Site web officiel (toutes les pages)
2. Réseaux sociaux professionnels (LinkedIn, Facebook)
3. Annuaires (Pages Jaunes, Kompass, etc.)
4. Articles de presse mentionnant l'entreprise
5. Bases de données publiques

FORMAT DE RÉPONSE (JSON uniquement) :
{
  "contacts": [{
    "nom": "${request.nomEntreprise}",
    "prenom": "",
    "poste": "Contact entreprise",
    "email": "adresse_email_trouvée",
    "phone": "numéro_format_international",
    "sources": ["sources_utilisées"]
  }],
  "sources": ["sources_principales"]
}

IMPORTANT :
- Les deux coordonnées (email + téléphone) sont INDISPENSABLES
- Vérifier plusieurs sources pour fiabilité
- Préférer les coordonnées génériques officielles
- Format téléphone international obligatoire
`;

    return await this.executePerplexitySearch(prompt, request);
  }

  /**
   * Exécution de la recherche Perplexity avec parsing robuste
   */
  private async executePerplexitySearch(
    prompt: string, 
    request: ContactSearchRequest
  ): Promise<ContactSearchResult> {
    
    try {
      const response = await axios.post(
        `${this.perplexityBaseUrl}/chat/completions`,
        {
          model: 'sonar',
          messages: [
            { 
              role: 'system', 
              content: 'Tu es un assistant de recherche spécialisé dans la recherche de coordonnées d\'entreprises. Tu retournes UNIQUEMENT du JSON valide RFC 8259, sans aucun texte additionnel, markdown ou commentaire.' 
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.1,
          max_tokens: 2000,
          return_citations: true,
          search_recency_filter: 'month'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.perplexityApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000 // 60 secondes pour recherche approfondie
        }
      );

      const content = response.data.choices[0]?.message?.content || '';
      console.log('📄 Réponse Perplexity reçue:', content.substring(0, 200));
      
      // Nettoyage et parsing JSON
      const cleanedJson = this.cleanJsonResponse(content);
      const parsed = JSON.parse(cleanedJson);

      // Formatage et validation du contact
      const contacts = (parsed.contacts || [])
        .map((contact: any) => this.formatStandardContact(contact, request))
        .filter((contact: ContactInfo | null) => contact !== null);

      if (contacts.length === 0) {
        throw new Error('Aucun contact valide après parsing');
      }

      console.log('✅ Contact standard parsé:', {
        hasEmail: !!contacts[0].email,
        hasPhone: !!contacts[0].phone
      });

      return {
        contacts: contacts,
        sources: parsed.sources || ['Perplexity'],
        success: true
      };

    } catch (error: any) {
      console.error('❌ Erreur executePerplexitySearch:', error.message);
      throw error;
    }
  }

  /**
   * Formatage strict du contact standard
   */
  private formatStandardContact(
    rawContact: any, 
    request: ContactSearchRequest
  ): ContactInfo | null {
    
    const email = this.validateAndCleanEmail(rawContact.email);
    const phone = this.validateAndCleanPhone(rawContact.phone);

    // Contact invalide si manque email OU téléphone
    if (!email || !phone) {
      console.warn('⚠️ Contact incomplet:', { 
        hasEmail: !!email, 
        hasPhone: !!phone 
      });
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

  /**
   * Validation stricte du contact standard
   */
  private validateStandardContact(contact: ContactInfo | undefined): ContactInfo | null {
    if (!contact) {
      console.error('❌ Contact undefined');
      return null;
    }

    const isValid = Boolean(
      contact.nom &&
      contact.email &&
      contact.phone &&
      this.isValidEmail(contact.email) &&
      this.isValidPhone(contact.phone)
    );

    if (!isValid) {
      console.error('❌ Contact standard invalide:', {
        hasNom: !!contact.nom,
        hasEmail: !!contact.email,
        hasPhone: !!contact.phone,
        emailValid: contact.email ? this.isValidEmail(contact.email) : false,
        phoneValid: contact.phone ? this.isValidPhone(contact.phone) : false
      });
      return null;
    }

    return contact;
  }

  /**
   * Validation et nettoyage d'email
   */
  private validateAndCleanEmail(email: any): string | undefined {
    if (!email || typeof email !== 'string') return undefined;
    
    const cleaned = email.trim().toLowerCase();
    
    if (!this.isValidEmail(cleaned)) return undefined;
    
    return cleaned;
  }

  private isValidEmail(email: string): boolean {
    // Format basique
    const emailRegex = /^[a-z0-9][a-z0-9._-]*@[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i;
    if (!emailRegex.test(email)) return false;
    
    // Exclusions
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

  /**
   * Validation et nettoyage de téléphone
   */
  private validateAndCleanPhone(phone: any): string | undefined {
    if (!phone || typeof phone !== 'string') return undefined;
    
    const cleaned = this.formatInternationalPhone(phone);
    
    if (!this.isValidPhone(cleaned)) return undefined;
    
    return cleaned;
  }

  private isValidPhone(phone: string): boolean {
    // Doit être au format international avec au moins 10 chiffres
    const phoneRegex = /^\+\d{10,15}$/;
    if (!phoneRegex.test(phone)) return false;
    
    // Exclusions
    const invalidPatterns = [
      'telephone_trouvé',
      'numéro_format',
      '0000000000',
      '1111111111'
    ];
    
    return !invalidPatterns.some(pattern => phone.includes(pattern));
  }

  private formatInternationalPhone(phone: string): string {
    // Nettoyer tous les caractères non-numériques sauf le +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // Convertir les formats français
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      cleaned = '+33' + cleaned.substring(1);
    } else if (cleaned.startsWith('00')) {
      cleaned = '+' + cleaned.substring(2);
    } else if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Vérification de validité du contact standard
   */
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

  /**
   * Nettoyage robuste JSON
   */
  private cleanJsonResponse(content: string): string {
    let cleaned = content.trim();
    
    // Supprimer markdown
    cleaned = cleaned.replace(/```(?:json)?\s*/gi, '');
    
    // Extraire JSON
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    
    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error('Pas de JSON trouvé dans la réponse');
    }
    
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    
    // Corrections
    cleaned = cleaned
      .replace(/,(\s*[}\]])/g, '$1')
      .replace(/:\s*'([^']*)'/g, ': "$1"');
    
    return cleaned;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Recherche Apollo (inchangée)
   */
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

  private buildApolloSearchParams(request: ContactSearchRequest): any {
    const searchParams: any = {
      page: 1,
      per_page: request.nombreResultats || 25,
      q_organization_name: request.nomEntreprise
    };

    if (request.zoneGeographique) {
      searchParams.person_locations = [request.zoneGeographique];
    }

    return searchParams;
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
          const organizationName = person.organization?.name?.toLowerCase().trim() || '';
          const targetCompany = request.nomEntreprise.toLowerCase().trim();
          return organizationName.includes(targetCompany) || targetCompany.includes(organizationName);
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
            linkedin_url: person.linkedin_url ? person.linkedin_url : undefined,
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

      const limitedContacts = contacts.slice(0, request.nombreResultats || 25);

      console.log(`✅ ${limitedContacts.length} contacts Apollo retournés`);

      return {
        contacts: limitedContacts,
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

  private generatePersonalizedPitch(person: any, entreprise: string): string {
    const prenom = person.first_name || '';
    const poste = person.title || 'votre rôle';
    
    return `Bonjour ${prenom}, en tant que ${poste} chez ${entreprise}, nous pensons que notre expertise en composants mécaniques pourrait vous intéresser. Seriez-vous disponible pour un échange rapide ?`;
  }
}