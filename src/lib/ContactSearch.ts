import axios from 'axios';

interface ContactResult {
  name: string;
  position: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  verified: boolean;
}

interface CompanyContacts {
  company: string;
  contacts: ContactResult[];
  totalFound: number;
  searchStatus: 'success' | 'no_results' | 'error';
  errorMessage?: string;
}

export class ContactSearchClient {
  private apolloApiKey: string;
  private baseUrl = 'https://api.apollo.io/v1';

  constructor() {
    this.apolloApiKey = process.env.APOLLO_API_KEY!;
    if (!this.apolloApiKey) {
      throw new Error('APOLLO_API_KEY manquante');
    }
  }

  async searchContacts(company: string, targetTitles: string[] = []): Promise<CompanyContacts> {
    try {
      console.log(`🔍 Recherche contacts pour: ${company}`);
      
      // Titres ciblés pour CGR
      const defaultTitles = [
        'R&D', 'Recherche', 'Développement',
        'Achat', 'Achats', 'Procurement',
        'Production', 'Manufacturing',
        'Engineering', 'Ingénieur', 'Technique',
        'Director', 'Manager', 'Directeur',
        'CEO', 'CTO', 'Président'
      ];
      
      const searchTitles = targetTitles.length > 0 ? targetTitles : defaultTitles;
      
      console.log(`  📋 Titres recherchés: ${searchTitles.join(', ')}`);
      
      const requestData = {
        q_organization_name: company,
        person_titles: searchTitles,
        contact_email_status: ['verified', 'guessed'],
        // CORRECTION: Ajout des paramètres pour révéler les emails et téléphones
        reveal_personal_emails: true,
        reveal_phone_number: true,
        per_page: 10,
        page: 1
      };
      
      console.log(`  📤 Requête Apollo:`, requestData);
      
      const response = await axios.post(`${this.baseUrl}/mixed_people/search`, requestData, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'X-Api-Key': this.apolloApiKey
        }
      });
      
      console.log(`  📥 Réponse Apollo status: ${response.status}`);
      
      // AJOUT: Vérifier les headers de rate limit pour diagnostiquer les problèmes
      if (response.headers) {
        console.log('📊 Limites API actuelles:');
        console.log(`  - Requêtes horaires restantes: ${response.headers['x-hourly-requests-left'] || 'N/A'}`);
        console.log(`  - Requêtes quotidiennes restantes: ${response.headers['x-daily-requests-left'] || 'N/A'}`);
        console.log(`  - Requêtes mensuelles restantes: ${response.headers['x-monthly-requests-left'] || 'N/A'}`);
      }
      
      const people = response.data.people || [];
      const totalResults = response.data.pagination?.total_entries || people.length;
      
      console.log(`  👥 Personnes trouvées: ${people.length}/${totalResults}`);
      
      if (people.length === 0) {
        console.log(`  ⚠️  Aucun contact trouvé pour ${company}`);
        return {
          company,
          contacts: [],
          totalFound: 0,
          searchStatus: 'no_results'
        };
      }
      
      const contacts: ContactResult[] = people.map((person: any) => {
        const contact = {
          name: `${person.first_name || ''} ${person.last_name || ''}`.trim(),
          position: person.title || 'Position non spécifiée',
          email: person.email || undefined,
          phone: person.phone_numbers?.[0]?.sanitized_number || undefined,
          linkedin: person.linkedin_url || undefined,
          verified: person.email_status === 'verified'
        };
        
        // AJOUT: Diagnostic détaillé pour comprendre pourquoi les emails sont verrouillés
        if (contact.email && contact.email.includes('email_not_unlocked')) {
          console.log(`    ⚠️  ${contact.name} - Email verrouillé (statut: ${person.email_status || 'N/A'}, locked: ${person.locked || false})`);
        } else {
          console.log(`    👤 ${contact.name} - ${contact.position} - ${contact.email || 'Pas d\'email'}`);
        }
        
        return contact;
      });
      
      const limitedContacts = contacts.slice(0, 3); // Max 3 contacts par entreprise
      
      console.log(`  ✅ ${limitedContacts.length} contacts retenus pour ${company}`);
      
      return {
        company,
        contacts: limitedContacts,
        totalFound: totalResults,
        searchStatus: 'success'
      };
      
    } catch (error: any) {
      console.error(`❌ Erreur Apollo pour ${company}:`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      // Vérifier si c'est un problème d'API key
      if (error.response?.status === 401) {
        console.error('🔑 Problème d\'authentification Apollo API');
      }
      
      // Vérifier si c'est un problème de rate limiting
      if (error.response?.status === 429) {
        console.error('⏰ Rate limit atteint sur Apollo API');
      }
      
      // AJOUT: Vérifier si c'est un problème de crédits insuffisants
      if (error.response?.status === 402 || error.response?.data?.message?.includes('credits')) {
        console.error('💳 Crédits Apollo insuffisants pour révéler les emails');
      }
      
      return {
        company,
        contacts: [],
        totalFound: 0,
        searchStatus: 'error',
        errorMessage: error.response?.data?.message || error.message
      };
    }
  }

  async searchMultipleCompanies(companies: string[]): Promise<CompanyContacts[]> {
    const results: CompanyContacts[] = [];
    
    console.log(`🔍 Recherche contacts pour ${companies.length} entreprises`);
    
    for (let i = 0; i < companies.length; i++) {
      const company = companies[i];
      console.log(`\n📞 [${i + 1}/${companies.length}] Recherche pour: ${company}`);
      
      const contacts = await this.searchContacts(company);
      results.push(contacts);
      
      // Rate limiting plus intelligent
      const delay = contacts.searchStatus === 'error' ? 2000 : 1000;
      if (i < companies.length - 1) {
        console.log(`  ⏳ Attente ${delay}ms avant la prochaine recherche...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // Statistiques finales
    const successful = results.filter(r => r.searchStatus === 'success').length;
    const withContacts = results.filter(r => r.contacts.length > 0).length;
    const totalContacts = results.reduce((acc, r) => acc + r.contacts.length, 0);
    const withEmails = results.reduce((acc, r) => acc + r.contacts.filter(c => c.email && !c.email.includes('email_not_unlocked')).length, 0);
    
    console.log(`\n📊 Résultats recherche contacts:`);
    console.log(`  - Recherches réussies: ${successful}/${companies.length}`);
    console.log(`  - Entreprises avec contacts: ${withContacts}/${companies.length}`);
    console.log(`  - Total contacts trouvés: ${totalContacts}`);
    console.log(`  - Contacts avec emails débloqués: ${withEmails}/${totalContacts}`);
    
    return results;
  }

  // AJOUT: Méthode pour vérifier les crédits restants
  async checkCredits(): Promise<void> {
    try {
      const response = await axios.get(`${this.baseUrl}/auth/health`, {
        headers: {
          'X-Api-Key': this.apolloApiKey
        }
      });
      
      console.log('💳 Statut Apollo API:', response.data);
      
      // Vérifier les headers de rate limit dans la réponse
      if (response.headers) {
        console.log('📊 Headers de la réponse:');
        console.log('  - X-Hourly-Requests-Left:', response.headers['x-hourly-requests-left']);
        console.log('  - X-Daily-Requests-Left:', response.headers['x-daily-requests-left']);
        console.log('  - X-Monthly-Requests-Left:', response.headers['x-monthly-requests-left']);
      }
    } catch (error: any) {
      console.error('❌ Erreur vérification crédits:', error.response?.data || error.message);
    }
  }

  // AJOUT: Méthode pour diagnostiquer pourquoi les emails ne sont pas révélés
  async diagnoseEmailReveal(): Promise<void> {
    console.log('\n🔍 Diagnostic des révélations d\'emails...');
    
    try {
      // Test avec une recherche simple
      const testData = {
        q_organization_name: 'Microsoft',
        person_titles: ['CEO'],
        reveal_personal_emails: true,
        per_page: 1,
        page: 1
      };
      
      const response = await axios.post(`${this.baseUrl}/mixed_people/search`, testData, {
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.apolloApiKey
        }
      });
      
      console.log('📊 Analyse de la réponse test:');
      console.log('  - Status:', response.status);
      console.log('  - Personnes trouvées:', response.data.people?.length || 0);
      
      if (response.data.people?.[0]) {
        const person = response.data.people[0];
        console.log('  - Email révélé:', person.email || 'Non disponible');
        console.log('  - Email status:', person.email_status || 'Non défini');
        console.log('  - Locked:', person.locked || false);
      }
      
      // Vérifier les headers de rate limit
      if (response.headers) {
        console.log('📈 Limites API:');
        console.log('  - Requêtes horaires restantes:', response.headers['x-hourly-requests-left']);
        console.log('  - Requêtes quotidiennes restantes:', response.headers['x-daily-requests-left']);
        console.log('  - Requêtes mensuelles restantes:', response.headers['x-monthly-requests-left']);
      }
      
    } catch (error: any) {
      console.error('❌ Erreur diagnostic:', error.response?.data || error.message);
      
      if (error.response?.status === 402) {
        console.log('💡 Solution: Votre compte Apollo n\'a pas assez de crédits pour révéler les emails');
        console.log('   → Consultez https://www.apollo.io/pricing pour upgrader votre plan');
      } else if (error.response?.status === 401) {
        console.log('💡 Solution: Vérifiez votre clé API Apollo');
      } else if (error.response?.status === 429) {
        console.log('💡 Solution: Vous avez atteint la limite de requêtes, attendez avant de réessayer');
      }
    }
  }

  // AJOUT: Méthode pour tester différentes approches de révélation d'emails
  async testEmailRevealApproaches(company: string): Promise<void> {
    console.log(`\n🧪 Test des approches de révélation d'emails pour: ${company}`);
    
    const approaches = [
      {
        name: 'Approche 1: reveal_personal_emails seulement',
        data: {
          q_organization_name: company,
          person_titles: ['CEO'],
          reveal_personal_emails: true,
          per_page: 1
        }
      },
      {
        name: 'Approche 2: contact_email_status avec reveal',
        data: {
          q_organization_name: company,
          person_titles: ['CEO'],
          contact_email_status: ['verified'],
          reveal_personal_emails: true,
          per_page: 1
        }
      },
      {
        name: 'Approche 3: Sans révélation (pour comparaison)',
        data: {
          q_organization_name: company,
          person_titles: ['CEO'],
          contact_email_status: ['verified'],
          per_page: 1
        }
      }
    ];
    
    for (const approach of approaches) {
      try {
        console.log(`\n🔍 ${approach.name}:`);
        
        const response = await axios.post(`${this.baseUrl}/mixed_people/search`, approach.data, {
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': this.apolloApiKey
          }
        });
        
        const person = response.data.people?.[0];
        if (person) {
          console.log(`  - Nom: ${person.first_name} ${person.last_name}`);
          console.log(`  - Email: ${person.email || 'Non disponible'}`);
          console.log(`  - Email status: ${person.email_status || 'Non défini'}`);
          console.log(`  - Locked: ${person.locked || false}`);
        } else {
          console.log('  - Aucune personne trouvée');
        }
        
      } catch (error: any) {
        console.log(`  ❌ Erreur: ${error.response?.data?.message || error.message}`);
      }
      
      // Délai entre les tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}