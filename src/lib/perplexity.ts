import axios from 'axios';

interface Prospect {
  company: string;
  sector: string;
  size: string;
  address: string;
  website: string;
  score: number;
  reason: string;
  sources: string[];
}

interface ProspectResponse {
  prospects: Prospect[];
  total: number;
  success?: boolean;
  error?: string;
}

export class PerplexityClient {
  private apiKey: string;
  private baseUrl = 'https://api.perplexity.ai';

  constructor() {
    this.apiKey = process.env.PERPLEXITY_API_KEY!;
    if (!this.apiKey) {
      throw new Error('PERPLEXITY_API_KEY manquante');
    }
  }

  async searchProspects(query: string): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: 'sonar',
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt()
            },
            {
              role: 'user',
              content: query
            }
          ],
          max_tokens: 4000,
          temperature: 0.2
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur Perplexity API:', error.response?.status);
      throw error;
    }
  }

  private getSystemPrompt(): string {
  return `Expert prospection B2B pour CGR - Fabricant français de ressorts industriels.

MISSION: Identifier 8-10 entreprises CLIENTES potentielles qui UTILISENT des ressorts industriels.

⚠️ IMPORTANT: Chercher des UTILISATEURS de ressorts, PAS des fabricants de ressorts !

CIBLES PRIORITAIRES:
- Constructeurs machines industrielles (utilisant ressorts de compression, traction)
- Fabricants équipements automobiles (amortisseurs, sièges, pièces mécaniques)
- Industriels aéronautique/spatial (systèmes de suspension, mécanismes)
- Fabricants mobilier/literie (ressorts matelas, sièges, mécanismes)
- Constructeurs équipements agricoles (systèmes hydrauliques, suspensions)
- Fabricants électroménager (lave-linge, réfrigérateurs, mécanismes)
- Industriels ferroviaire (bogies, suspensions, attelages)
- Fabricants outillage industriel (presses, machines-outils)

EXCLURE ABSOLUMENT:
- Fabricants de ressorts (concurrents directs)
- Grossistes/distributeurs de ressorts
- Entreprises "CGR" ou similaires

RÉPONSE JSON STRICT:
{
  "prospects": [
    {
      "company": "Nom exact entreprise",
      "sector": "Secteur d'activité précis",
      "size": "PME/ETI/Grand groupe + effectifs estimés",
      "address": "Adresse complète avec ville",
      "website": "https://...",
      "score": 8.5,
      "reason": "Analyse détaillée minimum 150 mots: produits fabriqués nécessitant des ressorts, types de ressorts requis (compression/traction/torsion), contraintes techniques spécifiques, pourquoi CGR serait pertinent comme fournisseur, volume potentiel estimé",
      "sources": ["url1", "url2"]
    }
  ],
  "total": 8
}

FOCUS: Entreprises UTILISATRICES de ressorts, analyse technique détaillée du besoin.`;
}

buildSearchQuery(product: string, location: string, referenceUrls?: string[]): string {
  // Mapping des produits vers les secteurs utilisateurs
  const productToSectors: { [key: string]: string[] } = {
    'ressort à compression': [
      'constructeurs machines industrielles',
      'fabricants équipements automobiles',
      'industriels aéronautique',
      'fabricants mobilier bureau',
      'constructeurs équipements agricoles'
    ],
    'ressort de traction': [
      'fabricants équipements fitness',
      'constructeurs machines textiles',
      'industriels ferroviaire',
      'fabricants outillage industriel'
    ],
    'ressort de torsion': [
      'fabricants serrurerie',
      'constructeurs équipements électroniques',
      'industriels automobile',
      'fabricants mécanismes horlogerie'
    ],
    'ressort sur mesure': [
      'bureaux études mécaniques',
      'prototypistes industriels',
      'fabricants équipements spécialisés'
    ]
  };

  const targetSectors = productToSectors[product.toLowerCase()] || [
    'constructeurs machines industrielles',
    'fabricants équipements mécaniques',
    'industriels manufacturing'
  ];

  return `Recherche entreprises UTILISATRICES de ressorts industriels - Produit: "${product}" - Zone: "${location}"

🎯 CHERCHER DES CLIENTS POTENTIELS (qui achètent des ressorts), PAS des fabricants de ressorts !

SECTEURS CIBLES:
${targetSectors.map(sector => `- ${sector}`).join('\n')}

RECHERCHE SPÉCIFIQUE:
- Entreprises fabriquant des produits incorporant des ${product}
- Constructeurs nécessitant des ressorts dans leurs assemblages
- Industriels avec besoins de pièces mécaniques élastiques
- Bureaux d'études développant des mécanismes à ressorts

EXCLURE ABSOLUMENT:
- Fabricants de ressorts (concurrents)
- Grossistes/distributeurs de ressorts
- Entreprises nommées "CGR" ou similaires

${referenceUrls?.length ? `RÉFÉRENCES SECTORIELLES: ${referenceUrls.slice(0, 2).join(', ')}` : ''}

COLLECTE: nom + secteur + taille + adresse + site web + analyse détaillée du besoin en ressorts.

FOCUS: Entreprises qui ACHÈTENT des ressorts pour leurs produits, pas qui en vendent !`;
}

// Méthode pour valider qu'un prospect n'est pas un fabricant de ressorts
private isValidProspect(prospect: any): boolean {
  const company = prospect.company?.toLowerCase() || '';
  const sector = prospect.sector?.toLowerCase() || '';
  const reason = prospect.reason?.toLowerCase() || '';
  
  // Mots-clés à exclure (fabricants de ressorts)
  const excludeKeywords = [
    'ressort', 'spring', 'fabricant ressort', 'manufacturer spring',
    'cgr', 'producteur ressort', 'usine ressort', 'forge ressort'
  ];
  
  // Vérifier si c'est un fabricant de ressorts
  const isSpringManufacturer = excludeKeywords.some(keyword => 
    company.includes(keyword) || 
    sector.includes(keyword) || 
    reason.includes('fabricant de ressort') ||
    reason.includes('produit des ressorts')
  );
  
  // Mots-clés positifs (utilisateurs de ressorts)
  const positiveKeywords = [
    'machine', 'équipement', 'automobile', 'aéronautique',
    'mobilier', 'électroménager', 'outillage', 'mécanique',
    'industriel', 'constructeur', 'assemblage', 'manufacturing'
  ];
  
  const isGoodTarget = positiveKeywords.some(keyword =>
    sector.includes(keyword) || reason.includes(keyword)
  );
  
  return !isSpringManufacturer && isGoodTarget && prospect.reason?.length > 50;
}

  parseProspectsResponse(response: any): ProspectResponse {
  try {
    const content = response.choices[0]?.message?.content || '';
    console.log('📄 Contenu brut reçu:', content.substring(0, 500) + '...');
    
    // Méthode 1: Chercher un bloc JSON complet
    let jsonMatch = content.match(/\{[\s\S]*"prospects"[\s\S]*\[[\s\S]*?\][\s\S]*?\}/);
    
    if (!jsonMatch) {
      // Méthode 2: Chercher entre ```json et ```
      const codeBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        jsonMatch = [codeBlockMatch[1]];
      }
    }
    
    if (!jsonMatch) {
      // Méthode 3: Chercher un tableau prospects directement
      const arrayMatch = content.match(/"prospects"\s*:\s*\[[\s\S]*?\]/);
      if (arrayMatch) {
        jsonMatch = [`{${arrayMatch[0]}, "total": 0}`];
      }
    }
    
    if (!jsonMatch) {
      console.error('❌ Aucun JSON valide trouvé dans la réponse');
      return { prospects: [], total: 0, success: false, error: 'Format JSON non trouvé' };
    }
    
    let jsonString = jsonMatch[0];
    console.log('🔍 JSON extrait:', jsonString.substring(0, 300) + '...');
    
    // Nettoyage du JSON
    jsonString = this.cleanJsonString(jsonString);
    
    // Tentative de parsing avec gestion d'erreurs spécifiques
    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (parseError: any) {
      console.error('❌ Erreur JSON parsing:', parseError.message);
      console.error('🔍 Position erreur:', parseError.message.match(/position (\d+)/)?.[1]);
      
      // Tentative de réparation automatique
      const repairedJson = this.repairJsonString(jsonString);
      if (repairedJson) {
        try {
          parsed = JSON.parse(repairedJson);
          console.log('✅ JSON réparé avec succès');
        } catch (repairError) {
          console.error('❌ Impossible de réparer le JSON');
          return { prospects: [], total: 0, success: false, error: `Erreur JSON: ${parseError.message}` };
        }
      } else {
        return { prospects: [], total: 0, success: false, error: `Erreur JSON: ${parseError.message}` };
      }
    }
    
    // Validation de la structure
    if (!parsed || !Array.isArray(parsed.prospects)) {
      console.error('❌ Structure JSON invalide:', parsed);
      return { prospects: [], total: 0, success: false, error: 'Structure prospects invalide' };
    }
    
    // Nettoyage et validation des prospects
    const cleanedProspects = parsed.prospects
      .filter((p: any) => {
        const isValid = p && typeof p === 'object' && p.company && p.reason && p.reason.length > 50;
        if (!isValid) {
          console.log('⚠️ Prospect invalide ignoré:', p);
        }
        return isValid;
      })
      .map((prospect: any) => ({
        company: String(prospect.company).trim(),
        sector: String(prospect.sector || 'Non spécifié').trim(),
        size: String(prospect.size || 'Non spécifié').trim(),
        address: String(prospect.address || 'Non spécifiée').trim(),
        website: this.cleanWebsiteUrl(prospect.website || ''),
        score: Math.min(10, Math.max(1, Number(prospect.score) || 5)),
        reason: String(prospect.reason).trim(),
        sources: Array.isArray(prospect.sources) ? prospect.sources.filter(Boolean) : []
      }));
    
    console.log(`✅ ${cleanedProspects.length} prospects valides extraits`);
    
    return {
      prospects: cleanedProspects,
      total: cleanedProspects.length,
      success: true
    };
    
  } catch (error: any) {
    console.error('❌ Erreur parsing globale:', error);
    return { prospects: [], total: 0, success: false, error: `Erreur parsing: ${error.message}` };
  }
}

private cleanJsonString(jsonString: string): string {
  return jsonString
    // Supprimer les caractères de contrôle
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    // Réparer les guillemets échappés incorrectement
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    // Supprimer les virgules en fin de tableau/objet
    .replace(/,(\s*[}\]])/g, '$1')
    // Supprimer les espaces en trop
    .replace(/\s+/g, ' ')
    .trim();
}

private repairJsonString(jsonString: string): string | null {
  try {
    // Tentative 1: Supprimer le dernier élément potentiellement corrompu
    const lastCommaIndex = jsonString.lastIndexOf(',');
    if (lastCommaIndex > 0) {
      const withoutLast = jsonString.substring(0, lastCommaIndex) + ']}';
      try {
        JSON.parse(withoutLast);
        return withoutLast;
      } catch (e) {
        // Continue avec d'autres tentatives
      }
    }
    
    // Tentative 2: Fermer les structures ouvertes
    let balanced = jsonString;
    const openBraces = (balanced.match(/\{/g) || []).length;
    const closeBraces = (balanced.match(/\}/g) || []).length;
    const openBrackets = (balanced.match(/\[/g) || []).length;
    const closeBrackets = (balanced.match(/\]/g) || []).length;
    
    // Ajouter les fermetures manquantes
    for (let i = 0; i < openBrackets - closeBrackets; i++) {
      balanced += ']';
    }
    for (let i = 0; i < openBraces - closeBraces; i++) {
      balanced += '}';
    }
    
    try {
      JSON.parse(balanced);
      return balanced;
    } catch (e) {
      return null;
    }
    
  } catch (error) {
    return null;
  }
}

  private cleanWebsiteUrl(url: string): string {
    if (!url || url.trim() === '') return '';
    
    let cleanedUrl = url.trim();
    if (!cleanedUrl.startsWith('http://') && !cleanedUrl.startsWith('https://')) {
      if (cleanedUrl.includes('.') && !cleanedUrl.includes(' ')) {
        cleanedUrl = `https://${cleanedUrl}`;
      } else {
        return '';
      }
    }
    
    try {
      new URL(cleanedUrl);
      return cleanedUrl;
    } catch (error) {
      return '';
    }
  }
}