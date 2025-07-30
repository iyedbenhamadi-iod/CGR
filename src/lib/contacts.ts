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
  private baseUrl = 'https://api.perplexity.ai';

  constructor() {
    this.apiKey = process.env.PERPLEXITY_API_KEY!;
    if (!this.apiKey) {
      throw new Error('PERPLEXITY_API_KEY manquante');
    }
  }

  async searchContacts(request: ContactSearchRequest): Promise<ContactSearchResult> {
    console.log('🔍 Début recherche contacts pour:', request.nomEntreprise);
    console.log('👥 Rôles recherchés:', request.contactRoles);
    
    const prompt = this.buildContactSearchPrompt(request);
    console.log('📝 Prompt généré:', prompt.substring(0, 300) + '...');
    
    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: 'sonar',
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
          timeout: 30000
        }
      );
      
      console.log('✅ Réponse API reçue, status:', response.status);
      return this.parseContactResponse(response.data, request);
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
    return `Tu es un expert en recherche de contacts B2B spécialisé dans l'identification précise de décideurs par rôle. Tu dois répondre UNIQUEMENT en JSON valide.

RÉPONSE OBLIGATOIRE - FORMAT JSON STRICT:
{
  "contacts": [
    {
      "nom": "Nom",
      "prenom": "Prénom", 
      "poste": "Poste exact avec responsabilités",
      "email": "email@entreprise.com",
      "phone": "+33123456789",
      "linkedin_url": "https://linkedin.com/in/profil-exact",
      "verified": true,
      "accroche_personnalisee": "Accroche spécifique au rôle et contexte métier",
      "sources": ["url1", "url2"]
    }
  ],
  "sources": ["url1", "url2"]
}

RÈGLES CRITIQUES DE CIBLAGE:
- PRIORITÉ ABSOLUE aux rôles exactement demandés
- Correspondance stricte des titres de poste avec la demande
- Éviter les postes généralistes (DG, Président) sauf demande explicite
- Chercher dans organigrammes, équipes métier, LinkedIn profiles
- Accroche personnalisée mentionnant le rôle spécifique et l'entreprise
- Sources récentes et vérifiables uniquement
- Email OU LinkedIn OU téléphone obligatoire

EXCLUSIONS:
- Postes non pertinents au rôle demandé
- Contacts sans moyens de contact vérifiés
- Informations obsolètes ou douteuses`;
  }

  private buildContactSearchPrompt(request: ContactSearchRequest): string {
    const { nomEntreprise, posteRecherche, secteurActivite, contactRoles, siteWebEntreprise } = request;
    
    // Construction des rôles à rechercher avec précision maximale
    let rolesSection = '';
    let searchStrategies = '';
    
    if (contactRoles && contactRoles.length > 0) {
      rolesSection = `
🎯 RÔLES SPÉCIFIQUES RECHERCHÉS (PRIORITÉ ABSOLUE):
${contactRoles.map(role => `- ${role} (chercher ce titre exact ou équivalent direct)`).join('\n')}

🔍 MOTS-CLÉS OBLIGATOIRES par rôle :`;

      // Génération des mots-clés spécifiques
      const roleKeywordMap: Record<string, string> = {
        "acheteur projet": "acheteur projet, project buyer, procurement specialist projet, sourcing projet",
        "responsable achat": "responsable achat, procurement manager, sourcing manager, purchasing manager, head of procurement",
        "directeur achat": "directeur achat, procurement director, chief procurement officer, CPO",
        "acheteur": "acheteur, buyer, purchasing specialist, procurement specialist",
        "directeur technique": "directeur technique, CTO, chief technical officer, R&D director, innovation director",
        "directeur production": "directeur production, plant manager, manufacturing director, operations director",
        "directeur qualité": "directeur qualité, quality director, QHSE director, quality manager",
        "directeur général": "directeur général, CEO, managing director, chief executive officer",
        "responsable supply chain": "responsable supply chain, supply chain manager, logistics manager, SCM manager"
      };

      contactRoles.forEach(role => {
        const keywords = roleKeywordMap[role.toLowerCase()] || role;
        rolesSection += `\n- ${role}: ${keywords}`;
      });

      // Stratégies de recherche spécifiques
      searchStrategies = `
🔍 STRATÉGIES DE RECHERCHE PRIORITAIRES:
${contactRoles.map(role => `1. "${nomEntreprise} ${role} contact LinkedIn"`).join('\n')}
${contactRoles.map(role => `2. "${nomEntreprise} équipe ${role.split(' ')[0]} organigramme"`).join('\n')}
3. "${nomEntreprise} directory staff procurement purchasing"
4. Site carrières et pages équipes ${nomEntreprise}
${siteWebEntreprise ? `5. ${siteWebEntreprise}/equipe ${siteWebEntreprise}/about-us` : ''}`;
    }
    
    const fallbackRoles = [
      'Directeur Achats/Procurement',
      'Responsable Technique/R&D', 
      'Directeur Production/Opérations'
    ];

    return `Recherche contacts décisionnaires ULTRA-CIBLÉS pour "${nomEntreprise}".

🏢 ENTREPRISE: ${nomEntreprise}
${secteurActivite ? `🏭 SECTEUR: ${secteurActivite}` : ''}
${siteWebEntreprise ? `🌐 SITE WEB: ${siteWebEntreprise}` : ''}

${rolesSection || `
🎯 RÔLES GÉNÉRIQUES (par défaut):
${fallbackRoles.map(role => `- ${role}`).join('\n')}
${posteRecherche ? `- ${posteRecherche}` : ''}`}

${searchStrategies || `
🔍 SOURCES À CONSULTER:
- "${nomEntreprise} organigramme équipe dirigeante"
- "${nomEntreprise} LinkedIn company page employees"
- Annuaires professionnels (Kompass, Societe.com)
- Site web officiel pages équipe/direction`}

⚡ INSTRUCTIONS CRITIQUES:
1. **PRIORITÉ MAXIMALE** aux rôles exactement demandés
2. Chercher dans les organigrammes officiels et pages équipes
3. Vérifier LinkedIn avec titres de poste correspondants
4. **EXCLURE** les postes non pertinents (Finance, RH, Marketing) sauf demande
5. Créer accroches mentionnant le rôle spécifique et l'entreprise
6. Privilégier contacts avec email professionnel vérifié

📊 CRITÈRES DE SÉLECTION:
- Correspondance ≥ 80% avec les rôles demandés  
- Contact vérifiable (email/LinkedIn/téléphone)
- Poste actuel confirmé chez ${nomEntreprise}
- Sources fiables et récentes

🎯 OBJECTIF: ${request.nombreResultats || 5} contacts PARFAITEMENT alignés avec les rôles demandés.

RÉPONSE: JSON uniquement avec contacts ciblés et pertinents.`;
  }

  private parseContactResponse(response: any, request: ContactSearchRequest): ContactSearchResult {
    try {
      const content = response.choices[0]?.message?.content || '';
      console.log('🔍 Réponse brute Perplexity:', content.substring(0, 500));
      
      // Nettoyage du contenu pour extraire le JSON
      let cleanContent = content.trim();
      cleanContent = cleanContent.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
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

      // Nettoyage et validation des contacts avec scoring amélioré
      const cleanedContacts: ContactInfo[] = parsed.contacts
        .filter((contact: any) => contact && typeof contact === 'object')
        .map((contact: any) => {
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
          const isValid = contact.nom && 
                         contact.prenom && 
                         contact.poste;
          
          if (!isValid) {
            console.log('❌ Contact rejeté (données manquantes):', contact);
          }
          return isValid;
        });

      // Application du filtrage par rôles si spécifié
      let filteredContacts = cleanedContacts;
      
      if (request.contactRoles && request.contactRoles.length > 0) {
        console.log('🎯 Application du filtrage par rôles...');
        
        const contactsWithScoring = cleanedContacts.map(contact => {
          const roleMatch = improveRoleMatching(contact.poste, request.contactRoles!);
          return {
            ...contact,
            roleScore: roleMatch.score,
            matchedRoles: roleMatch.matchedRoles,
            isRoleRelevant: roleMatch.isRelevant
          };
        });
        
        // Filtrer les contacts pertinents
        filteredContacts = contactsWithScoring
          .filter(contact => contact.isRoleRelevant)
          .sort((a, b) => {
            // Trier par score de correspondance décroissant
            if (b.roleScore !== a.roleScore) {
              return b.roleScore - a.roleScore;
            }
            return (b.matchedRoles?.length || 0) - (a.matchedRoles?.length || 0);
          });
        
        console.log(`🎯 Filtrage terminé: ${cleanedContacts.length} → ${filteredContacts.length} contacts pertinents`);
        console.log('📊 Scores de correspondance:', filteredContacts.map(c => ({
          nom: `${c.prenom} ${c.nom}`,
          poste: c.poste,
          score: (c as any).roleScore,
          matchedRoles: (c as any).matchedRoles
        })));
      }

      const sources = Array.isArray(parsed.sources) ? parsed.sources.filter(this.isValidUrl) : [];

      console.log(`✅ ${filteredContacts.length} contacts validés et filtrés`);
      
      return {
        contacts: filteredContacts,
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
}