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
}

interface ContactSearchResult {
  contacts: ContactInfo[];
  sources: string[];
  success: boolean;
  error?: string;
}

export class ContactSearchClient {
  private apiKey: string;
  private baseUrl = 'https://api.perplexity.ai';

  constructor() {
    this.apiKey = process.env.PERPLEXITY_API_KEY!;
    if (!this.apiKey) {
      throw new Error('PERPLEXITY_API_KEY manquante');
    }
  }

  async searchContacts(request: ContactSearchRequest): Promise<ContactSearchResult> {
    console.log('🔍 Début recherche contacts pour:', request.nomEntreprise);
    
    const prompt = this.buildContactSearchPrompt(request);
    console.log('📝 Prompt généré:', prompt.substring(0, 200) + '...');
    
    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: 'sonar', // Modèle standard
          messages: [
            { role: 'system', content: this.getSystemPrompt() },
            { role: 'user', content: prompt }
          ],
          max_tokens: 4000,
          temperature: 0.1
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 secondes timeout
        }
      );
      
      console.log('✅ Réponse API reçue, status:', response.status);
      return this.parseContactResponse(response.data);
    } catch (error: any) {
      console.error('❌ Erreur Perplexity API:', {
        status: error.response?.status,
        message: error.message,
        data: error.response?.data
      });
      
      return {
        contacts: [],
        sources: [],
        success: false,
        error: `Erreur API: ${error.response?.status || 'Timeout'} - ${error.message}`
      };
    }
  }

  private getSystemPrompt(): string {
    return `Tu es un expert en recherche de contacts B2B. Tu dois répondre UNIQUEMENT en JSON valide.

RÉPONSE OBLIGATOIRE - FORMAT JSON STRICT:
{
  "contacts": [
    {
      "nom": "Nom",
      "prenom": "Prénom", 
      "poste": "Poste exact",
      "email": "email@entreprise.com",
      "phone": "+33123456789",
      "linkedin_url": "https://linkedin.com/in/profil",
      "verified": true,
      "accroche_personnalisee": "Accroche personnalisée",
      "sources": ["url1", "url2"]
    }
  ],
  "sources": ["url1", "url2"]
}

RÈGLES CRITIQUES:
- Réponse UNIQUEMENT en JSON, pas de texte avant/après
- Contacts réels avec coordonnées vérifiées
- Email obligatoire OU LinkedIn OU téléphone
- Accroche personnalisée basée sur le profil réel
- Sources vérifiables et récentes`;
  }

  private buildContactSearchPrompt(request: ContactSearchRequest): string {
    const { nomEntreprise, posteRecherche, secteurActivite } = request;
    
    return `Recherche contacts décisionnaires pour "${nomEntreprise}".

ENTREPRISE: ${nomEntreprise}
${secteurActivite ? `SECTEUR: ${secteurActivite}` : ''}

POSTES RECHERCHÉS:
- Directeur Technique/R&D/Innovation
- Responsable Achats/Approvisionnement  
- Directeur Production/Qualité
- Direction Générale
${posteRecherche ? `- ${posteRecherche}` : ''}

SOURCES À CONSULTER:
- Site web officiel ${nomEntreprise}
- LinkedIn profiles ${nomEntreprise}
- Annuaires professionnels
- Communiqués de presse

CONSIGNES:
- Chercher "${nomEntreprise} équipe dirigeante contact"
- Chercher "${nomEntreprise} directeur technique LinkedIn"
- Vérifier pages "Équipe" et "Direction"
- Trouver emails/LinkedIn/téléphones réels

RÉPONSE: JSON uniquement avec 3-5 contacts vérifiés.`;
  }

  private parseContactResponse(response: any): ContactSearchResult {
    try {
      const content = response.choices[0]?.message?.content || '';
      console.log('🔍 Réponse brute Perplexity:', content.substring(0, 500));
      
      // Nettoyage du contenu pour extraire le JSON
      let cleanContent = content.trim();
      
      // Supprimer les markdown code blocks
      cleanContent = cleanContent.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // Chercher le JSON principal
      const jsonMatch = cleanContent.match(/\{[\s\S]*"contacts"[\s\S]*\[[\s\S]*\][\s\S]*\}/);
      
      if (!jsonMatch) {
        console.log('❌ Aucun JSON trouvé, contenu:', cleanContent);
        return {
          contacts: [],
          sources: [],
          success: false,
          error: 'Format JSON non trouvé - contenu reçu: ' + cleanContent.substring(0, 200)
        };
      }

      let jsonString = jsonMatch[0];
      console.log('📋 JSON extrait:', jsonString);

      const parsed = JSON.parse(jsonString);
      
      if (!parsed || !Array.isArray(parsed.contacts)) {
        console.log('❌ Structure contacts invalide:', parsed);
        return {
          contacts: [],
          sources: [],
          success: false,
          error: 'Structure JSON invalide - contacts non trouvés'
        };
      }

      // Nettoyage et validation des contacts
      const cleanedContacts: ContactInfo[] = parsed.contacts
        .filter((contact: any) => contact && typeof contact === 'object')
        .map((contact: any) => {
          // In your parseContactResponse method, when creating the cleaned contact object:

const cleaned: ContactInfo = {
  nom: String(contact.nom || '').trim(),
  prenom: String(contact.prenom || '').trim(),
  poste: String(contact.poste || '').trim(),
  email: contact.email && this.isValidEmail(contact.email) ? contact.email : undefined,
  phone: contact.phone ? this.cleanPhoneNumber(contact.phone) : undefined,
  linkedin_url: contact.linkedin_url && this.isValidLinkedInUrl(contact.linkedin_url) ? contact.linkedin_url : undefined,
  verified: Boolean(contact.verified),
  accroche_personnalisee: contact.accroche_personnalisee ? String(contact.accroche_personnalisee).trim() : undefined,
  sources: Array.isArray(contact.sources) ? contact.sources.filter(this.isValidUrl) : [],
  
  // Add alternative field names for frontend compatibility
  accroche: contact.accroche_personnalisee ? String(contact.accroche_personnalisee).trim() : undefined,
  pitch: contact.accroche_personnalisee ? String(contact.accroche_personnalisee).trim() : undefined
};
          
          console.log('✅ Contact nettoyé:', cleaned);
          return cleaned;
        })
        .filter((contact: ContactInfo) => {
  // Only require basic contact info (name, firstname, position)
  // Contact methods (email, phone, linkedin) are now optional
  const isValid = contact.nom && 
                 contact.prenom && 
                 contact.poste;
  
  if (!isValid) {
    console.log('❌ Contact rejeté (données manquantes):', contact);
  }
  return isValid;
});

      const sources = Array.isArray(parsed.sources) ? parsed.sources.filter(this.isValidUrl) : [];

      console.log(`✅ ${cleanedContacts.length} contacts validés`);
      
      return {
        contacts: cleanedContacts,
        sources,
        success: true
      };
    } catch (error: any) {
      console.error('❌ Erreur parsing JSON:', error);
      return {
        contacts: [],
        sources: [],
        success: false,
        error: `Erreur parsing JSON: ${error.message}`
      };
    }
  }

  private extractContactsFromText(lines: string[]): ContactSearchResult {
    // Méthode de fallback simplifiée
    return {
      contacts: [],
      sources: [],
      success: false,
      error: 'Extraction de texte non implémentée'
    };
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
    // Nettoie et formate le numéro de téléphone
    return phone.replace(/[^\d+\s\-\.]/g, '').trim();
  }
}