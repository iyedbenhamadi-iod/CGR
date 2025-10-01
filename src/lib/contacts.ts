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

    // 1️⃣ Recherche Apollo (contacts spécifiques à l'entreprise et zone géographique)
    const apolloResult = await this.searchWithApollo(request);

    // 2️⃣ Recherche coordonnées standard via Perplexity (toujours exécutée)
    console.log('📞 Recherche coordonnées standard avec Perplexity...');
    const perplexityResult = await this.searchCompanyFallback(request);

    // Extraire le contact standard de Perplexity (si disponible)
    const standardContact = perplexityResult.contacts.length > 0 
      ? perplexityResult.contacts[0] 
      : null;

    // Construire la liste finale basée sur la disponibilité des contacts Apollo
    let mergedContacts: ContactInfo[];
    let method: 'apollo+perplexity' | 'perplexity-fallback';

    if (apolloResult.contacts && apolloResult.contacts.length > 0) {
      // Cas 1 : Apollo a trouvé des contacts → Standard + Apollo
      mergedContacts = [
        ...(standardContact ? [standardContact] : []),
        ...apolloResult.contacts
      ];
      method = 'apollo+perplexity';
      console.log(`✅ Apollo + Perplexity: ${standardContact ? 1 : 0} standard + ${apolloResult.contacts.length} Apollo`);
    } else {
      // Cas 2 : Apollo vide → Seulement le contact standard
      mergedContacts = standardContact ? [standardContact] : [];
      method = 'perplexity-fallback';
      console.log(`ℹ️ Pas de contacts Apollo → Utilisation du contact standard uniquement`);
    }

    const allSources = [
      ...(apolloResult.sources || []),
      ...(perplexityResult.sources || [])
    ];

    return {
      contacts: mergedContacts,
      sources: [...new Set(allSources)],
      success: mergedContacts.length > 0,
      method
    };
  }

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

  private async searchCompanyFallback(request: ContactSearchRequest): Promise<ContactSearchResult> {
    const prompt = `
Trouve pour l'entreprise "${request.nomEntreprise}" les coordonnées officielles standards en ${request.zoneGeographique || 'le pays ciblé'} :
- Adresse email générique de contact (contact@, info@, etc.)
- Numéro de téléphone principal standard de l'entreprise

IMPORTANT: Retourne UNIQUEMENT un objet JSON valide, sans texte avant ou après. Format exact:
{
  "contacts": [
    {
      "nom": "${request.nomEntreprise}",
      "prenom": "",
      "poste": "Standard / Contact entreprise",
      "email": "email_trouvé@entreprise.com",
      "phone": "numéro_trouvé",
      "linkedin_url": "",
      "verified": true,
      "relevance_score": 0.9,
      "sources": ["site officiel"]
    }
  ],
  "sources": ["site officiel"]
}
`;

    try {
      const response = await axios.post(
        `${this.perplexityBaseUrl}/chat/completions`,
        {
          model: 'sonar',
          messages: [
            { 
              role: 'system', 
              content: 'Tu es un assistant qui retourne UNIQUEMENT du JSON valide. Recherche les coordonnées officielles standards des entreprises : email générique et téléphone principal. Ne retourne QUE le JSON, sans texte explicatif.' 
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.1,
          max_tokens: 2000
        },
        {
          headers: {
            'Authorization': `Bearer ${this.perplexityApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 45000
        }
      );

      const content = response.data.choices[0]?.message?.content || '';
      
      // Nettoyage agressif du contenu
      let cleanContent = content.trim();
      
      // Supprimer les blocs de code markdown
      cleanContent = cleanContent.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // Trouver le premier { et le dernier } pour extraire uniquement le JSON
      const firstBrace = cleanContent.indexOf('{');
      const lastBrace = cleanContent.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1) {
        cleanContent = cleanContent.substring(firstBrace, lastBrace + 1);
      }
      
      // Parser le JSON
      const parsed = JSON.parse(cleanContent);

      // S'assurer que les contacts ont la structure correcte
      const formattedContacts = (parsed.contacts || []).map((contact: any) => ({
        nom: contact.nom || request.nomEntreprise,
        prenom: contact.prenom || '',
        poste: contact.poste || 'Standard / Contact entreprise',
        email: contact.email || undefined,
        phone: contact.phone || undefined,
        linkedin_url: contact.linkedin_url || undefined,
        verified: true,
        relevance_score: contact.relevance_score || 0.9,
        sources: contact.sources || parsed.sources || ['Perplexity']
      }));

      console.log(`✅ ${formattedContacts.length} contact standard Perplexity retourné`);

      return {
        contacts: formattedContacts,
        sources: parsed.sources || ['Perplexity'],
        success: formattedContacts.length > 0
      };
    } catch (error: any) {
      console.error('❌ Erreur fallback Perplexity:', error.message);
      
      // En cas d'échec du parsing, créer un contact générique basique
      console.log('⚠️ Création d\'un contact standard générique de secours');
      
      return {
        contacts: [{
          nom: request.nomEntreprise,
          prenom: '',
          poste: 'Standard / Contact entreprise',
          email: undefined,
          phone: undefined,
          linkedin_url: undefined,
          verified: false,
          relevance_score: 0.5,
          sources: ['Fallback générique']
        }],
        sources: ['Fallback générique'],
        success: true,
        error: `Erreur parsing Perplexity (contact générique créé): ${error.message}`
      };
    }
  }

  private buildApolloSearchParams(request: ContactSearchRequest): any {
    const searchParams: any = {
      page: 1,
      per_page: request.nombreResultats || 25,
      q_organization_name: request.nomEntreprise
    };

    // Filtrer par zone géographique (ex: France)
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
            phone = this.formatFrenchPhone(primaryPhone.sanitized_number || primaryPhone.raw_number);
          }

          const contact: ContactInfo = {
            nom: person.last_name || '',
            prenom: person.first_name || '',
            poste: person.title || '',
            email: person.email && this.isValidEmail(person.email) ? person.email : undefined,
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

  private formatFrenchPhone(phone: string): string {
    if (!phone) return '';
    let cleaned = phone.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '+33' + cleaned.substring(1);
    }
    return cleaned;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && !email.includes('example.com');
  }
}