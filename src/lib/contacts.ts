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
  relevance_score?: number; // Nouveau: score de pertinence
  
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
  location?: string;
  nombreResultats?: number;
}

interface ContactSearchResult {
  contacts: ContactInfo[];
  sources: string[];
  success: boolean;
  error?: string;
}

export class ContactSearchClient {
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';

  // 🎯 MAPPING INTELLIGENT DES RÔLES CGR (ÉTENDU ET CORRIGÉ)
  private readonly roleMapping: Record<string, string[]> = {
    // Rôles achat/procurement - ÉTENDU
    "responsable achat": ["procurement manager", "purchasing manager", "sourcing manager", "head of procurement", "acheteur senior", "responsable approvisionnement", "chief procurement officer", "cpo", "procurement director"],
    "acheteur": ["buyer", "purchasing specialist", "procurement specialist", "sourcing specialist", "acheteur industriel", "senior buyer", "lead buyer", "strategic buyer", "category buyer"],
    "acheteur projet": ["project buyer", "project procurement", "acheteur programme", "sourcing projet", "lead buyer"],
    "directeur achat": ["procurement director", "chief procurement officer", "CPO", "head of purchasing", "head of procurement"],
    "acheteur commodité": ["commodity buyer", "category buyer", "acheteur famille", "sourcing commodité", "strategic buyer"],
    
    // Rôles techniques
    "directeur technique": ["technical director", "CTO", "chief technical officer", "R&D director", "innovation director", "directeur R&D", "responsable technique"],
    "responsable r&d": ["R&D manager", "research manager", "development manager", "innovation manager", "chef de projet R&D"],
    "ingénieur produit": ["product engineer", "design engineer", "mechanical engineer", "ingénieur conception", "ingénieur développement"],
    
    // Rôles production
    "directeur production": ["production director", "manufacturing director", "plant manager", "operations director", "directeur industriel"],
    "responsable production": ["production manager", "manufacturing manager", "operations manager", "chef de production"],
    "responsable qualité": ["quality manager", "QA manager", "QHSE manager", "responsable QSE"],
    
    // Métaux spécifiques
    "responsable achat métal": ["metal buyer", "steel buyer", "raw material buyer", "acheteur matières premières", "acheteur métallurgie"],
    "responsable découpe": ["cutting manager", "machining manager", "responsable usinage", "chef atelier découpe"]
  };

  // 🎯 MOTS-CLÉS HAUTE PERTINENCE (nouveaux)
  private readonly highRelevanceKeywords = [
    // Achat/Procurement
    "buyer", "procurement", "sourcing", "purchasing", "acheteur", "achat", "approvisionnement",
    // Technique/Ingénierie  
    "engineer", "technical", "R&D", "innovation", "ingénieur", "technique", "développement",
    // Production/Manufacturing
    "production", "manufacturing", "quality", "operations", "fabrication", "qualité",
    // Matériaux/Composants
    "material", "component", "metal", "steel", "matériau", "composant", "métal"
  ];

  // 🚫 RÔLES À EXCLURE SYSTÉMATIQUEMENT (affinés)
  private readonly excludedRoles = [
    // IT - mais pas "quality" qui peut contenir "IT"
    " IT ", "informatique", "système", "security", "sécurité", "network", "réseau", "software", "digital",
    // Marketing/Commercial - mais attention aux faux positifs
    "marketing", "communication", "commercial", "vente", "sales", " PR ",
    // RH/Finance/Legal
    "RH", "human resources", "ressources humaines", "recrutement",
    "finance", "comptabilité", "accounting", "controller", "audit", "financial",
    "legal", "juridique", "compliance", " risk ", "risque"
  ];

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY!;
    if (!this.apiKey) {
      throw new Error('openai_api_key manquante');
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
          model: 'gpt-4o-mini-search-preview-2025-03-11',
          messages: [
            { role: 'system', content: this.getSystemPrompt() },
            { role: 'user', content: prompt }
          ],
          max_tokens: 4000,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 300000
        }
      );
      
      console.log('✅ Réponse API reçue, status:', response.status);
      return this.parseContactResponse(response.data, request);
    } catch (error: any) {
      console.error('❌ Erreur API:', {
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
    return `Tu es un expert en recherche de contacts B2B industriels spécialisé dans l'identification ULTRA-PRÉCISE de décideurs techniques, achats et production. Tu dois répondre UNIQUEMENT en JSON valide.

🎯 EXPERTISE CGR INTERNATIONAL (à connaître absolument):
- Fabricant de ressorts sur mesure et composants mécaniques
- Technologies: formage à froid, surmoulage métal, co-ingénierie  
- Secteurs: automobile, aéronautique, industrie générale
- 50 ans d'expertise, présence sur 4 continents

RÉPONSE OBLIGATOIRE - FORMAT JSON STRICT:
{
  "contacts": [
    {
      "nom": "Nom",
      "prenom": "Prénom", 
      "poste": "Poste exact avec responsabilités",
      "email": "email@entreprise.com",
      "phone": "+33...",
      "linkedin_url": "https://linkedin.com/in/...",
      "verified": true,
      "relevance_score": 0.95,
      "sources": ["url1", "url2"]
    }
  ],
  "sources": ["url1", "url2"]
}

🚨 RÈGLES CRITIQUES DE FILTRAGE:
- PRIORITÉ ABSOLUE aux rôles ACHAT, TECHNIQUE, PRODUCTION uniquement
- EXCLURE SYSTÉMATIQUEMENT: IT/Informatique, Marketing, RH, Finance, Legal, Commercial/Ventes
- Correspondance intelligente: "Head of Procurement" = "Responsable Achat"  
- Chercher dans organigrammes industriels, pages équipes techniques
- Vérifier que le poste correspond réellement aux besoins de composants mécaniques
- Score de pertinence obligatoire (0.0 à 1.0)

🎯 RÔLES CIBLES PRIORITAIRES:
- Achat/Sourcing: responsable achat, acheteur, procurement manager, sourcing, SENIOR BUYER, LEAD BUYER, STRATEGIC BUYER, CPO
- Technique: directeur technique, R&D, ingénieur produit, innovation, CTO
- Production: directeur production, responsable qualité, manufacturing
- Spécialistes: achat métal, découpe, usinage, matières premières

❌ EXCLUSIONS ABSOLUES:
- Toute mention d'IT, Security, Network, Software, Digital
- Marketing, Sales, Commercial, Communication  
- RH, Finance, Legal, Audit, Risk
- Postes administratifs ou support

✅ VALIDATION OBLIGATOIRE:
- Le poste doit avoir un lien direct avec l'industrie mécanique
- Capacité de décision sur composants/matières premières
- Présence dans l'organigramme industriel de l'entreprise`;
  }

  // 🔍 CORRESPONDANCE INTELLIGENTE DES RÔLES (CORRIGÉE)
  private async validateRoleRelevance(poste: string, targetRoles: string[]): Promise<{isRelevant: boolean, score: number, reason: string}> {
    const posteLower = poste.toLowerCase();
    console.log(`🔍 Validation rôle: "${poste}" contre`, targetRoles);
    
    // 🚫 Exclusion immédiate des rôles non pertinents (avec vérification stricte)
    for (const excluded of this.excludedRoles) {
      const excludedLower = excluded.toLowerCase().trim();
      if (excludedLower.startsWith(' ') && excludedLower.endsWith(' ')) {
        // Recherche de mots entiers pour éviter les faux positifs
        if (posteLower.includes(excludedLower)) {
          console.log(`❌ Rejeté: mot entier "${excludedLower}" trouvé`);
          return {
            isRelevant: false, 
            score: 0.0, 
            reason: `Rôle exclu: ${excluded.trim()} détecté dans "${poste}"`
          };
        }
      } else {
        // Recherche normale pour les autres exclusions
        if (posteLower.includes(excludedLower)) {
          console.log(`❌ Rejeté: "${excludedLower}" trouvé`);
          return {
            isRelevant: false, 
            score: 0.0, 
            reason: `Rôle exclu: ${excluded} détecté dans "${poste}"`
          };
        }
      }
    }

    // 🎯 ÉVALUATION DE PERTINENCE MULTICRITÈRES
    let maxScore = 0.0;
    let bestMatch = '';
    let matchDetails: string[] = [];

    // 1. CORRESPONDANCE DIRECTE AVEC MOTS-CLÉS HAUTE PERTINENCE
    for (const keyword of this.highRelevanceKeywords) {
      if (posteLower.includes(keyword.toLowerCase())) {
        const score = this.calculateKeywordScore(keyword, poste);
        if (score > maxScore) {
          maxScore = score;
          bestMatch = `Mot-clé haute pertinence: ${keyword}`;
        }
        matchDetails.push(`${keyword}(${score.toFixed(2)})`);
      }
    }

    // 2. CORRESPONDANCE VIA MAPPING INTELLIGENT
    for (const targetRole of targetRoles) {
      const targetLower = targetRole.toLowerCase();
      
      // Correspondance directe avec le rôle cible
      const roleWords = targetLower.replace('responsable ', '').replace('directeur ', '').split(' ');
      let directMatch = false;
      
      for (const word of roleWords) {
        if (word.length > 3 && posteLower.includes(word)) {
          const score = 0.9;
          if (score > maxScore) {
            maxScore = score;
            bestMatch = `Correspondance directe: ${targetRole} via "${word}"`;
          }
          directMatch = true;
        }
      }

      // Correspondance via synonymes
      const synonyms = this.roleMapping[targetLower] || [];
      for (const synonym of synonyms) {
        const synonymLower = synonym.toLowerCase();
        if (posteLower.includes(synonymLower)) {
          const score = this.calculateSynonymScore(synonym, targetRole);
          if (score > maxScore) {
            maxScore = score;
            bestMatch = `${targetRole} via synonyme "${synonym}"`;
          }
          matchDetails.push(`${synonym}(${score.toFixed(2)})`);
        }
      }
    }

    // 3. CORRESPONDANCE GÉNÉRIQUE POUR RÔLES INDUSTRIELS ÉVIDENTS
    const industrialRoles = ['buyer', 'procurement', 'sourcing', 'technical', 'engineer', 'production', 'quality', 'manufacturing'];
    for (const role of industrialRoles) {
      if (posteLower.includes(role) && maxScore < 0.7) {
        maxScore = Math.max(maxScore, 0.75);
        bestMatch = `Rôle industriel générique: ${role}`;
      }
    }

    const isRelevant = maxScore >= 0.7;
    const reason = isRelevant ? 
      `✅ ${bestMatch} (détails: ${matchDetails.join(', ')})` : 
      `❌ Score insuffisant (${maxScore.toFixed(2)}) - Aucune correspondance pertinente`;

    console.log(`🎯 Résultat validation: ${poste} -> Pertinent: ${isRelevant}, Score: ${maxScore.toFixed(2)}, Raison: ${reason}`);

    return {
      isRelevant,
      score: maxScore,
      reason
    };
  }

  // 🎯 CALCUL DE SCORE POUR MOTS-CLÉS
  private calculateKeywordScore(keyword: string, poste: string): number {
    const keywordLower = keyword.toLowerCase();
    const posteLower = poste.toLowerCase();
    
    // Scores différenciés selon l'importance du mot-clé
    const highValueKeywords = ['procurement', 'buyer', 'sourcing', 'technical', 'engineer'];
    const mediumValueKeywords = ['purchasing', 'production', 'quality', 'manufacturing'];
    
    let baseScore = 0.75; // Score par défaut
    
    if (highValueKeywords.includes(keywordLower)) {
      baseScore = 0.9;
    } else if (mediumValueKeywords.includes(keywordLower)) {
      baseScore = 0.8;
    }
    
    // Bonus si le mot-clé est au début du titre (plus important)
    if (posteLower.startsWith(keywordLower) || posteLower.startsWith('chief ' + keywordLower) || posteLower.startsWith('head of ' + keywordLower)) {
      baseScore += 0.05;
    }
    
    return Math.min(baseScore, 1.0);
  }

  // 🎯 CALCUL DE SCORE POUR SYNONYMES
  private calculateSynonymScore(synonym: string, targetRole: string): number {
    const synonymLower = synonym.toLowerCase();
    
    // Scores différenciés selon la qualité du synonyme
    const exactSynonyms = ['chief procurement officer', 'cpo', 'head of procurement', 'senior buyer', 'lead buyer'];
    const goodSynonyms = ['procurement manager', 'category buyer', 'strategic buyer', 'technical director'];
    
    let baseScore = 0.75; // Score par défaut
    
    if (exactSynonyms.includes(synonymLower)) {
      baseScore = 0.95;
    } else if (goodSynonyms.includes(synonymLower)) {
      baseScore = 0.85;
    }
    
    return baseScore;
  }

  private buildContactSearchPrompt(request: ContactSearchRequest): string {
    const { nomEntreprise, posteRecherche, secteurActivite, contactRoles, siteWebEntreprise } = request;
    
    // 🎯 Construction des rôles avec mapping intelligent
    let rolesSection = '';
    let exclusionSection = '';
    
    if (contactRoles && contactRoles.length > 0) {
      rolesSection = `
🎯 RÔLES SPÉCIFIQUES RECHERCHÉS (MAPPING INTELLIGENT REQUIS):
${contactRoles.map(role => {
        const synonyms = this.roleMapping[role.toLowerCase()] || [];
        return `- ${role}\n  Synonymes acceptés: ${synonyms.join(', ')}`;
      }).join('\n')}

🔍 MOTS-CLÉS HAUTE PERTINENCE À DÉTECTER:
${this.highRelevanceKeywords.join(', ')}`;

      exclusionSection = `
🚫 RÔLES À EXCLURE ABSOLUMENT:
${this.excludedRoles.map(role => `- Tout poste contenant: "${role}"`).join('\n')}`;
    }

    return `Recherche contacts décisionnaires ULTRA-CIBLÉS pour "${nomEntreprise}" - Secteur industriel/mécanique uniquement.

🏢 ENTREPRISE: ${nomEntreprise}
${secteurActivite ? `🏭 SECTEUR: ${secteurActivite}` : ''}
${siteWebEntreprise ? `🌐 SITE WEB: ${siteWebEntreprise}` : ''}

${rolesSection}

${exclusionSection}

🔍 SOURCES À CONSULTER PRIORITAIREMENT:
1. "${nomEntreprise} organigramme équipe production technique"
2. "${nomEntreprise} équipe achat procurement sourcing"  
3. "${nomEntreprise} directeur technique R&D innovation"
4. "${nomEntreprise} manufacturing team production quality"
5. Annuaires industriels spécialisés (pas généralistes)

⚡ INSTRUCTIONS ULTRA-CRITIQUES:
1. **FILTRAGE MOINS STRICT**: Accepter Senior Buyer, Lead Buyer, Strategic Buyer, CPO
2. **MAPPING INTELLIGENT**: "Head of Procurement" = "Responsable Achat", "Senior Buyer" = "Acheteur"
3. **CONTEXTE CGR**: Chercher des personnes qui achètent/conçoivent des composants mécaniques
4. **PERTINENCE**: Score obligatoire basé sur l'adéquation rôle/besoins CGR
5. **VÉRIFICATION**: Le contact peut-il décider d'acheter des ressorts/composants mécaniques ?

🎯 QUESTIONS DE VALIDATION pour chaque contact:
- Ce poste a-t-il un lien avec l'achat de composants mécaniques ?
- Cette personne peut-elle décider de travailler avec un fournisseur comme CGR ?
- Le rôle est-il dans la chaîne de décision technique/achat/production ?

📊 CRITÈRES DE SCORING (0.0 à 1.0):
- 0.9-1.0: Correspondance parfaite (CPO, Senior Buyer, Lead Buyer)
- 0.7-0.8: Très pertinent (Directeur Technique, Category Buyer)  
- 0.5-0.6: Moyennement pertinent (Strategic Buyer, Ingénieur R&D)
- <0.5: Non pertinent (à exclure)

🎯 OBJECTIF: ${request.nombreResultats || 5} contacts ULTRA-QUALIFIÉS uniquement.

RÉPONSE: JSON avec contacts filtrés et scores de pertinence obligatoires.`;
  }

  // 🎨 GÉNÉRATION D'ACCROCHES VRAIMENT PERSONNALISÉES
  // 🎯 GÉNÉRATION D'ACCROCHES FIABLES BASÉES SUR CGR UNIQUEMENT
// 🎯 GÉNÉRATION D'ACCROCHES OPTIMISÉE AVEC LE PROMPT DU SENIOR
private async generateCustomAccroche(contact: ContactInfo, nomEntreprise: string, secteurActivite?: string): Promise<string> {
  
  // 🏭 EXPERTISE CGR COMPLÈTE - BASÉE SUR LE SITE WEB OFFICIEL
  const cgrCompleteProducts = {
    ressorts: [
      "ressorts de traction",
      "ressorts de torsion", 
      "ressorts de compression",
      "ressorts spiraux",
      "ressorts plats",
      "micro-ressorts",
      "ressorts enroulés",
      "ressorts push/pull"
    ],
    piecesFormees: [
      "pièces formées à froid à base de fil d'acier",
      "pièces en acier inoxydable et alliages (inconel, argent)",
      "composants spécialisés haute précision"
    ],
    composantsMecaniques: [
      "composants mécaniques et mécatroniques",
      "contacts estampés",
      "connecteurs à emmanchement press-fit (système breveté EloPIN)",
      "pièces métalliques embouties",
      "sous-ensembles métalloplastiques"
    ],
    autresComposants: [
      "câbles et bras d'essuyage automobile",
      "connecteurs industriels",
      "composants fabriqués à partir de fils, tubes, câbles, feuillards"
    ],
    applications: [
      "dispositifs de sécurité automobile",
      "moteurs et boîtes de vitesse", 
      "sièges et systèmes d'essuyage",
      "freins et colonnes de direction",
      "batteries et moteurs électriques",
      "équipements électrotechniques (micro-interrupteurs, relais)",
      "dispositifs médicaux"
    ]
  };

  // 🎯 DÉTECTION INTELLIGENTE DU RÔLE POUR ADAPTER LE MESSAGE
  const posteAnalyze = contact.poste.toLowerCase();
  let roleType = "acheteur";
  let mainChallenge = "sourcer des composants fiables";
  let cgrStrength = "formage à froid et ressorts sur mesure";

  // Mapping rôle -> challenge -> produit CGR le plus pertinent
  if (posteAnalyze.includes('achat') || posteAnalyze.includes('procurement') || posteAnalyze.includes('buyer') || posteAnalyze.includes('sourcing')) {
    roleType = "acheteur";
    mainChallenge = "sourcer des composants mécaniques de qualité";
    cgrStrength = "ressorts sur mesure et pièces formées à froid";
  } else if (posteAnalyze.includes('technique') || posteAnalyze.includes('r&d') || posteAnalyze.includes('engineer') || posteAnalyze.includes('innovation')) {
    roleType = "responsable technique";
    mainChallenge = "développer des solutions mécaniques innovantes";
    cgrStrength = "composants mécatroniques et système press-fit breveté EloPIN";
  } else if (posteAnalyze.includes('production') || posteAnalyze.includes('manufacturing') || posteAnalyze.includes('quality')) {
    roleType = "responsable production";
    mainChallenge = "optimiser vos process de fabrication";
    cgrStrength = "sous-ensembles métalloplastiques et pièces embouties";
  } else if (posteAnalyze.includes('directeur') || posteAnalyze.includes('chief') || posteAnalyze.includes('head')) {
    roleType = "décideur";
    mainChallenge = "développer des partenariats techniques stratégiques";
    cgrStrength = "solutions complètes du ressort au sous-ensemble mécatronique";
  }

  const prompt = `Met-toi à la place d'un commercial de chez CGR International,
sachant que CGR International fabrique les produits suivants :

* **Ressorts sur mesure :** ressorts de traction, ressorts de torsion, ressorts de compression, ressorts spiraux, ressorts plats, micro-ressorts, ressorts enroulés, ressorts push/pull.

* **Pièces formées à froid** à base de fil d'acier, acier inoxydable et alliages (dont inconel, argent pour applications spécifiques).

* **Composants mécaniques et mécatroniques**, tels que des contacts estampés, connecteurs à emmanchement selon le système press-fit breveté EloPIN, pièces métalliques embouties, sous-ensembles métalloplastiques.

* **Câbles, bras d'essuyage automobile**, connecteurs, ainsi que divers composants fabriqués à partir de fils, tubes, câbles, feuillards en acier ou alliages.

* **Produits destinés à des applications variées** : dispositifs de sécurité automobile, moteurs, boîtes de vitesse, sièges, systèmes d'essuyage, freins, colonnes de direction, batteries et moteurs électriques, équipements électrotechniques (micro-interrupteurs, interrupteurs-sectionneurs, relais thermiques, protecteurs de surtension), dispositifs médicaux.

🎯 **PROFIL DU CONTACT :**
- **Nom :** ${contact.prenom} ${contact.nom}
- **Poste :** ${contact.poste}
- **Entreprise :** ${nomEntreprise}
- **Type de rôle détecté :** ${roleType}
- **Challenge principal :** ${mainChallenge}

💡 **CONTEXTE SPÉCIFIQUE :**
Site web CGR : https://www.cgr-international.com/fr/
En tant que commercial CGR expert, tu t'adresses à un ${roleType} qui doit ${mainChallenge}.

🎯 **MISSION :**
Peux-tu préparer une accroche commerciale PARFAITE et ENGAGEANTE pour cet ${roleType}, en mettant en évidence notre expertise "${cgrStrength}" qui résout directement ses enjeux ?

✅ **STRUCTURE OPTIMALE (3 phrases fluides, 250-280 caractères) :**
1. **Ouverture personnalisée impactante** : "Bonjour ${contact.prenom}, en tant que ${contact.poste} chez ${nomEntreprise}..."
2. **Value proposition CGR claire** : Lien direct entre notre expertise et ses besoins spécifiques
3. **Call-to-action engageant** : Question ouverte qui donne envie de répondre

🚀 **EXEMPLES D'ACCROCHES PARFAITES :**
- "Bonjour ${contact.prenom}, en tant que ${contact.poste} chez ${nomEntreprise}, vous cherchez des composants fiables ? Chez CGR, nous maîtrisons les ressorts sur mesure et pièces formées à froid, parfaits pour vos projets. Quels sont vos défis actuels ?"

- "${contact.prenom}, votre expertise en ${roleType} vous amène sûrement à rechercher des solutions techniques innovantes ? CGR propose des composants mécatroniques et notre système press-fit breveté EloPIN. Curieux d'en savoir plus ?"

⚡ **RÈGLES D'EXCELLENCE :**
- Ton naturel et professionnel (pas robotique)
- Éviter les phrases génériques type "j'espère que vous allez bien"
- Créer une connexion immédiate entre CGR et ses besoins
- Finir par une question qui appelle une réponse concrète
- Utiliser les vrais noms de produits/technologies CGR
- Maximum 280 caractères pour un message LinkedIn parfait

**OBJECTIF :** Créer une accroche si engageante que le prospect a envie de répondre immédiatement.

**RÉPONSE :** Une seule accroche commerciale parfaite et prête à envoyer.`;

  try {
    const response = await axios.post(
      `${this.baseUrl}/chat/completions`,
      {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Tu es un commercial expert de CGR International avec une parfaite maîtrise de l'art de la prospection B2B.

**TON EXPERTISE CGR :**
- 50+ ans d'expérience en ressorts et formage à froid
- Gamme complète : du micro-ressort aux sous-ensembles mécatroniques
- Technologies brevetées : système press-fit EloPIN
- Applications : automobile, électrotechnique, médical, industrie générale

**TON STYLE DE VENTE GAGNANT :**
- Accroches personnalisées qui créent une connexion immédiate
- Focus sur la valeur concrète pour le prospect
- Questions engageantes qui appellent une réponse
- Ton naturel et professionnel (jamais robotique)

**TES RÈGLES D'OR POUR UNE ACCROCHE PARFAITE :**
- Commencer par "Bonjour [Prénom]" pour créer la proximité
- Faire le lien direct entre son poste et nos solutions CGR
- Mentionner UNE technologie/produit CGR spécifique et pertinent
- Finir par une question ouverte sur ses projets/défis actuels
- Maximum 280 caractères pour LinkedIn
- Éviter les phrases bateau type "j'espère que ça va"

**OBJECTIF :** 
Chaque accroche doit être si engageante que le prospect a envie de répondre immédiatement pour en savoir plus sur CGR.

**TU GÉNÈRES :** Une seule accroche parfaite, prête à envoyer.`
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 150,
        temperature: 0.4 // Équilibre créativité/fiabilité
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    let accroche = response.data.choices[0]?.message?.content?.trim() || '';
    
    // 🔧 VALIDATION ET NETTOYAGE DE SÉCURITÉ
    if (accroche.length > 300) {
      // Couper proprement si trop long
      accroche = accroche.substring(0, 280).trim();
      if (!accroche.endsWith('.') && !accroche.endsWith('?') && !accroche.endsWith('!')) {
        accroche += '...';
      }
    }

    // 🛡️ VALIDATION ANTI-HALLUCINATION
    const forbiddenTerms = [
      // Faux produits/services CGR
      'consulting', 'formation', 'audit', 'maintenance',
      // Secteurs non confirmés
      'pharmaceutique', 'cosmétique', 'alimentaire', 'textile',
      // Fausses certifications
      'iso 45001', 'reach compliant'
    ];
    
    const accrocheLC = accroche.toLowerCase();
    const containsForbidden = forbiddenTerms.some(term => accrocheLC.includes(term));
    
    if (containsForbidden) {
      // 🔧 FALLBACK sûr avec template éprouvé
      accroche = `Bonjour ${contact.prenom}, en tant que ${contact.poste} chez ${nomEntreprise}, vous devez ${mainChallenge}. CGR maîtrise ${cgrStrength} depuis 50+ ans. Parlons de vos projets actuels ?`;
    }

    console.log('✅ Accroche CGR optimisée générée:', accroche);
    return accroche;
      
  } catch (error) {
    console.error('❌ Erreur génération accroche optimisée:', error);
    
    // 🔧 FALLBACK DE SÉCURITÉ avec le meilleur template
    return this.generatePremiumFallbackAccroche(contact, nomEntreprise, roleType, mainChallenge, cgrStrength);
  }
}

// 🏆 FALLBACK PREMIUM AVEC TEMPLATES ÉPROUVÉS
private generatePremiumFallbackAccroche(
  contact: ContactInfo, 
  nomEntreprise: string,
  roleType: string,
  mainChallenge: string, 
  cgrStrength: string
): string {
  
  const premiumTemplates = [
    `Bonjour ${contact.prenom}, en tant que ${contact.poste} chez ${nomEntreprise}, vous devez ${mainChallenge}. CGR maîtrise ${cgrStrength} depuis 50+ ans. Quels sont vos défis actuels sur ces composants ?`,
    
    `${contact.prenom}, votre poste de ${contact.poste} vous amène à travailler sur des composants mécaniques ? CGR excelle en ${cgrStrength}. Curieux de découvrir nos capacités techniques ?`,
    
    `En tant que ${roleType}, vous recherchez des solutions fiables pour vos pièces techniques ? CGR, spécialiste ${cgrStrength}, accompagne ${nomEntreprise}. Échangeons 15min ?`,
    
    `${contact.prenom}, CGR accompagne les ${roleType} comme vous avec notre expertise en ${cgrStrength}. Quels sont vos enjeux actuels chez ${nomEntreprise} ?`
  ];

  const selectedTemplate = premiumTemplates[Math.floor(Math.random() * premiumTemplates.length)];
  
  // Vérification de longueur et ajustement si nécessaire
  if (selectedTemplate.length > 280) {
    return `${contact.prenom}, CGR maîtrise ${cgrStrength} depuis 50+ ans. Parlons de vos projets chez ${nomEntreprise} ?`;
  }
  
  return selectedTemplate;
}

  private async parseContactResponse(response: any, request: ContactSearchRequest): Promise<ContactSearchResult> {
    try {
      const content = response.choices[0]?.message?.content || '';
      console.log('🔍 Réponse brute API:', content.substring(0, 500));
      
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

      // 🎯 FILTRAGE INTELLIGENT DES CONTACTS
      const qualifiedContacts: ContactInfo[] = [];

      for (const contact of parsed.contacts.filter((c: any) => c && typeof c === 'object')) {
        // Validation basique
        if (!contact.nom || !contact.prenom || !contact.poste) {
          console.log('❌ Contact rejeté (données manquantes):', contact);
          continue;
        }

        // 🔍 VALIDATION DE PERTINENCE AVEC IA
        const relevanceCheck = await this.validateRoleRelevance(
          contact.poste, 
          request.contactRoles || []
        );

        if (!relevanceCheck.isRelevant) {
          console.log('❌ Contact rejeté (non pertinent):', contact.poste, '-', relevanceCheck.reason);
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
          sources: Array.isArray(contact.sources) ? contact.sources.filter(this.isValidUrl) : []
        };

        // ✨ GÉNÉRATION D'ACCROCHE ULTRA-PERSONNALISÉE
        try {
          console.log(`🎯 Génération accroche ultra-personnalisée pour ${qualifiedContact.prenom} ${qualifiedContact.nom} (${qualifiedContact.poste})`);
          
          const customAccroche = await this.generateCustomAccroche(
            qualifiedContact, 
            request.nomEntreprise, 
            request.secteurActivite
          );

          qualifiedContact.accroche_personnalisee = customAccroche;
          qualifiedContact.accroche = customAccroche;
          qualifiedContact.pitch = customAccroche;

          console.log('✅ Accroche générée (score:', relevanceCheck.score, '):', customAccroche.substring(0, 100) + '...');
        } catch (error) {
          console.error('❌ Erreur génération accroche:', error);
          qualifiedContact.accroche_personnalisee = `${qualifiedContact.prenom}, votre expertise en ${qualifiedContact.poste.toLowerCase()} chez ${request.nomEntreprise} m'intéresse. CGR, spécialiste ressorts 50 ans, aimerait échanger 15min sur vos enjeux.`;
        }

        qualifiedContacts.push(qualifiedContact);
        console.log('✅ Contact qualifié ajouté:', qualifiedContact);
      }

      // 🏆 TRI PAR SCORE DE PERTINENCE
      qualifiedContacts.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));

      console.log(`✅ ${qualifiedContacts.length} contacts qualifiés avec accroches ultra-personnalisées`);

      const sources = Array.isArray(parsed.sources) ? parsed.sources.filter(this.isValidUrl) : [];
      
      return {
        contacts: qualifiedContacts,
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