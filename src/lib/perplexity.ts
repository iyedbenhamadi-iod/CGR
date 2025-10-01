// lib/perplexity.ts - Fixed version with better JSON extraction
import axios from 'axios';

interface Enterprise {
  nom_entreprise: string;
  site_web: string;
  description_activite: string;
  produits_entreprise: string[];
  potentiel_cgr: {
    produits_cibles_chez_le_prospect: string[];
    produits_cgr_a_proposer: string[];
    argumentaire_approche: string;
  };
  fournisseur_actuel_estimation: string;
  sources: string[];
  taille_entreprise: string;
  volume_pieces_estime: string;
  zone_geographique: string;
}

interface EnterpriseSearchData {
  secteursActivite: string[];
  zoneGeographique: string[];
  tailleEntreprise: string;
  motsCles: string;
  produitsCGR: string[];
  clientsExclure: string;
  usinesCGR: string[];
  nombreResultats: number;
  typeRecherche?: string;
  secteurActiviteLibre?: string;
  zoneGeographiqueLibre?: string;
}

export class PerplexityEnterpriseClient {
  private apiKey: string;
  private baseUrl = 'https://api.perplexity.ai';

  constructor() {
    this.apiKey = process.env.PERPLEXITY_API_KEY!;
    if (!this.apiKey) {
      throw new Error('PERPLEXITY_API_KEY manquante');
    }
  }

  async searchEnterprises(searchData: EnterpriseSearchData): Promise<any> {
    const prompt = this.buildEnterpriseSearchPrompt(searchData);
    
    try {
      console.log('🔍 Recherche d\'entreprises avec Perplexity Deep Research...');
      
      const allSectors = [
        ...(searchData.secteursActivite || []),
        ...(searchData.secteurActiviteLibre ? [searchData.secteurActiviteLibre] : [])
      ].filter(Boolean);
      
      const allZones = [
        ...(searchData.zoneGeographique || []),
        ...(searchData.zoneGeographiqueLibre ? [searchData.zoneGeographiqueLibre] : [])
      ].filter(Boolean);
      
      console.log('📊 Paramètres de recherche:', {
        secteur: allSectors.length > 0 ? allSectors[0] : 'Non spécifié',
        secteurs_complets: allSectors,
        zone: allZones.join(', '),
        taille: searchData.tailleEntreprise || 'Toutes tailles',
        produits: searchData.produitsCGR?.join(', ') || 'Tous produits CGR',
        clientsExclure: searchData.clientsExclure || 'Aucun',
        nombreResultats: searchData.nombreResultats
      });
      
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: 'sonar',
          messages: [
            { role: 'system', content: this.getSystemPrompt() },
            { role: 'user', content: prompt }
          ],
          max_tokens: 8000,
          temperature: 0.1,
          search_recency_filter: 'month',
search_domain_filter: [
  'linkedin.com', 
  'companieshouse.gov.uk', 
  'societe.com', 
  'verif.com',
  'kompass.com',        // Ajout
  'europages.com',      // Ajout
  'kellysearch.com',    // Ajout
  'infogreffe.fr',      // Ajout (France)
  'northdata.com',      // Ajout (Allemagne)
  'companiesintheuk.co.uk' // Ajout (UK)
]        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 900000
        }
      );
      
      console.log('✅ Réponse Perplexity Deep Research reçue');
      return this.parseEnterpriseResponse(response.data);
    } catch (error: any) {
      console.error('❌ Erreur Perplexity API:', {
        status: error.response?.status,
        message: error.message,
        data: error.response?.data
      });
      
      return {
        enterprises: [],
        total: 0,
        success: false,
        error: `Perplexity API Error: ${error.response?.status || 'Unknown'} - ${error.message}`
      };
    }
  }

  private getSystemPrompt(): string {
    return `Tu es un expert en intelligence économique spécialisé dans l'identification de prospects FABRICANTS pour CGR International.

RÈGLE CRITIQUE DE FORMAT: Ta réponse DOIT être UNIQUEMENT un objet JSON valide, sans texte avant ou après, sans balises markdown, sans explication.

COMMENCE DIRECTEMENT PAR { et TERMINE PAR }

MISSION: Identifier entre 5 et 10 entreprises FABRICANTES (viser 10 si possible) qui:
- Possèdent des USINES DE PRODUCTION identifiées
- Conçoivent et fabriquent des produits finis
- Ont des besoins en composants mécaniques compatibles CGR

PRODUITS CGR DISPONIBLES:
- Ressorts (fil, plat, torsion)
- Pièces découpées de précision
- Formage de tubes
- Assemblages automatisés
- Mécatronique
- Injection plastique

⚠️ EXCLURE ABSOLUMENT:
- Revendeurs, distributeurs, négociants
- Installateurs, intégrateurs, bureau d'études
- Services (maintenance, SAV)
- Fabricants de ressorts/pièces découpées/tubes (CONCURRENTS CGR)
- Entreprises nommées "CGR"

VALIDATION REQUISE pour chaque entreprise:
1. A des USINES identifiées (ville, pays)
2. FABRIQUE ses propres produits
3. Fait partie d'un GROUPE (si applicable)
4. A des besoins en composants CGR

FORMAT JSON OBLIGATOIRE (pas de texte en dehors):
{
  "enterprises": [
    {
      "nom_entreprise": "Raison sociale complète",
      "site_web": "URL officielle",
      "description_activite": "Description fabrication détaillée",
      "produits_entreprise": ["Produit 1", "Produit 2"],
      "potentiel_cgr": {
        "produits_cibles_chez_le_prospect": ["Composant 1", "Composant 2"],
        "produits_cgr_a_proposer": ["Ressorts fil", "Pièces découpées"],
        "argumentaire_approche": "DÉTAILLÉ: 1) Nom complet 2) Usines [Ville, Pays] 3) Groupe 4) Produits fabriqués 5) Besoins composants 6) Volumes 7) Fournisseurs actuels - Min 200 mots"
      },
      "fournisseur_actuel_estimation": "Fournisseurs probables",
      "sources": ["Source 1 URL", "Source 2 URL"],
      "taille_entreprise": "PME/ETI/Grande",
      "volume_pieces_estime": "Volume estimé",
      "zone_geographique": "Zone précise avec pays"
    }
  ]
}

IMPORTANT: 
- Viser 10 entreprises, minimum 5 entreprises qualifiées
- Si moins de 5 trouvées, élargir géographiquement ou sectoriellement
- Retourner UNIQUEMENT le JSON, rien d'autre
- Pas de markdown, pas de texte explicatif`;
  }

  private buildEnterpriseSearchPrompt(data: EnterpriseSearchData): string {
    const staticClients = ['Forvia', 'Valeo', 'Schneider Electric', 'Dassault Aviation', 'Thales', 'Safran'];
    
    let additionalClients: string[] = [];
    if (data.clientsExclure && data.clientsExclure.trim() !== '') {
      additionalClients = data.clientsExclure
        .split('\n')
        .map(client => client.trim())
        .filter(client => client !== '' && !staticClients.includes(client));
    }
    
    const excludeClients = [...staticClients, ...additionalClients];

    const allSectors = [
      ...(data.secteursActivite || []),
      ...(data.secteurActiviteLibre ? [data.secteurActiviteLibre.trim()] : [])
    ].filter(s => s && s.trim() !== '');
    
    const secteurPrincipal = allSectors.length > 0 ? allSectors[0] : 'Industriel';
    
    const allZones = [
      ...(data.zoneGeographique || []),
      ...(data.zoneGeographiqueLibre ? [data.zoneGeographiqueLibre.trim()] : [])
    ].filter(z => z && z.trim() !== '');
    
    const zoneGeo = allZones.length > 0 ? allZones.join(', ') : 'France et Europe';
    
    const tailleEntreprise = data.tailleEntreprise || 'Toutes tailles';
    
    const produitsCGRSpecifiques = data.produitsCGR && data.produitsCGR.length > 0 
      ? data.produitsCGR 
      : ['Ressorts fil', 'Pièces découpées', 'Formage tubes', 'Assemblages', 'Mécatronique', 'Injection plastique'];
    
    const motsCles = data.motsCles || 'composants mécaniques, précision';
    const usinesCGR = data.usinesCGR && data.usinesCGR.length > 0 ? data.usinesCGR : ['Saint-Yorre', 'PMPC', 'Igé'];

    return `RECHERCHE: ${data.nombreResultats} entreprises FABRICANTES pour CGR International

⚠️ RÉPONDS UNIQUEMENT AVEC UN JSON VALIDE - PAS DE TEXTE AVANT/APRÈS

CRITÈRES RECHERCHE:

Secteur: ${secteurPrincipal}
${allSectors.length > 1 ? `Secteurs additionnels: ${allSectors.slice(1).join(', ')}` : ''}

Zone: ${zoneGeo}
Taille: ${tailleEntreprise}

Produits CGR autorisés: ${produitsCGRSpecifiques.join(', ')}
Mots-clés: ${motsCles}

Exclusions: ${excludeClients.join(', ')}

OBJECTIF: Trouver ${data.nombreResultats} FABRICANTS (minimum 5) avec:
- Usines de production identifiées
- Produits manufacturés propres
- Besoins en composants CGR

STRATÉGIE:
1. Recherche principale dans secteur et zone
2. Si insuffisant, élargir géographiquement
3. Si insuffisant, inclure secteurs connexes

VALIDATION ANTI-REVENDEUR:
- Confirmer usines (adresses)
- Confirmer fabrication (pas distribution)
- Confirmer activités R&D

RETOURNE UNIQUEMENT LE JSON SANS AUCUN TEXTE ADDITIONNEL:
{
  "enterprises": [...]
}`;
  }

  private parseEnterpriseResponse(response: any): { enterprises: Enterprise[], total: number, success: boolean, error?: string } {
    try {
      let content = response.choices[0]?.message?.content || '';
      console.log('📄 Contenu reçu (premiers 500 chars):', content.substring(0, 500) + '...');
      
      // Remove <think> tags
      if (content.includes('<think>')) {
        console.log('🧠 Detected <think> tags, removing...');
        const thinkEndIndex = content.lastIndexOf('</think>');
        if (thinkEndIndex !== -1) {
          content = content.substring(thinkEndIndex + 8).trim();
        }
      }
      
      // Remove markdown formatting
      content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // If content starts with markdown header or text, try to find JSON
      if (content.startsWith('#') || !content.startsWith('{')) {
        console.log('⚠️ Content does not start with JSON, searching for JSON block...');
        
        // Try to find JSON between { and }
        const jsonMatch = content.match(/\{[\s\S]*"enterprises"[\s\S]*\]/);
        if (jsonMatch) {
          // Find the matching closing brace
          let braceCount = 0;
          let jsonEnd = -1;
          for (let i = jsonMatch.index!; i < content.length; i++) {
            if (content[i] === '{') braceCount++;
            if (content[i] === '}') braceCount--;
            if (braceCount === 0) {
              jsonEnd = i + 1;
              break;
            }
          }
          
          if (jsonEnd > 0) {
            content = content.substring(jsonMatch.index!, jsonEnd);
            console.log('✅ Extracted JSON block');
          }
        } else {
          console.log('❌ No JSON structure found, attempting fallback');
          return this.createFallbackResponse(content);
        }
      }
      
      // Clean extracted content
      content = this.cleanJsonString(content);
      
      let parsed: any;
      
      try {
        parsed = JSON.parse(content);
        console.log('✅ Parsing direct réussi');
      } catch (error) {
        console.log('⚠️ Parsing direct échoué, tentative de réparation...');
        
        content = this.repairJsonString(content);
        try {
          parsed = JSON.parse(content);
          console.log('✅ Parsing avec réparation réussi');
        } catch (error2) {
          console.log('⚠️ Parsing échoué, utilisation de fallback...');
          return this.createFallbackResponse(response.choices[0]?.message?.content || '');
        }
      }
      
      if (!parsed || !Array.isArray(parsed.enterprises)) {
        console.error('❌ Structure JSON invalide:', parsed);
        return this.createFallbackResponse(response.choices[0]?.message?.content || '');
      }

      const cleanedEnterprises = this.validateAndCleanEnterprises(parsed.enterprises);
      
      console.log(`✅ ${cleanedEnterprises.length} entreprises parsées avec succès`);
      return {
        enterprises: cleanedEnterprises,
        total: cleanedEnterprises.length,
        success: true
      };
      
    } catch (error: any) {
      console.error('❌ Erreur parsing finale:', error.message);
      return this.createFallbackResponse(response.choices[0]?.message?.content || '');
    }
  }

  private cleanJsonString(str: string): string {
    return str
      .trim()
      .replace(/^\s*\{/, '{')
      .replace(/\}\s*$/, '}')
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, ''); // Remove control characters
  }

  private repairJsonString(jsonStr: string): string {
    let repaired = jsonStr;
    
    repaired = repaired.replace(/,(\s*[}\]])/g, '$1');
    repaired = repaired.replace(/}\s*{/g, '},{');
    repaired = repaired.replace(/]\s*\[/g, '],[');
    repaired = repaired.replace(/\s+/g, ' ');
    
    return repaired;
  }

  private createFallbackResponse(content: string): { enterprises: Enterprise[], total: number, success: boolean, error?: string } {
    console.log('🔄 Creating fallback response from text content...');
    
    // Try manual parsing
    const enterprises = this.manualParseEnterprises(content);
    
    if (enterprises.length > 0) {
      console.log(`✅ Fallback successful: ${enterprises.length} enterprises extracted`);
      return {
        enterprises: enterprises,
        total: enterprises.length,
        success: true
      };
    }
    
    console.log('❌ Fallback failed: No enterprises could be extracted');
    return { 
      enterprises: [], 
      total: 0, 
      success: false, 
      error: 'Could not parse response - format not recognized. Try reducing search criteria or changing sector.'
    };
  }

  private manualParseEnterprises(content: string): Enterprise[] {
    const enterprises: Enterprise[] = [];
    
    // Pattern 1: Look for company names in headers or lists
    const companyPatterns = [
      /(?:^|\n)(?:#{1,4}\s+)?(\d+[\.\)]\s+)?([A-ZÀÂÄÇÉÈÊËÏÎÔÙÛÜ][A-Za-zÀ-ÿ\s\-&'\.]{3,50}(?:SAS|SA|SARL|GmbH|Ltd|Inc|Corp)?)/gm,
      /\*\*([A-ZÀÂÄÇÉÈÊËÏÎÔÙÛÜ][A-Za-zÀ-ÿ\s\-&'\.]{3,50}(?:SAS|SA|SARL|GmbH|Ltd)?)\*\*/g
    ];
    
    const foundCompanies = new Set<string>();
    
    for (const pattern of companyPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null && foundCompanies.size < 10) {
        const companyName = (match[2] || match[1]).trim();
        
        // Filter out generic headers
        if (!companyName.match(/^(Introduction|Conclusion|Résumé|Contexte|Analyse|Étude|Liste|Entreprises?|Fabricants?)/i)) {
          foundCompanies.add(companyName);
        }
      }
    }
    
    console.log(`🔍 Found ${foundCompanies.size} potential company names`);
    
    // Convert to enterprise objects
    Array.from(foundCompanies).forEach(companyName => {
      enterprises.push({
        nom_entreprise: companyName,
        site_web: '',
        description_activite: 'Fabricant identifié - détails à compléter',
        produits_entreprise: [],
        potentiel_cgr: {
          produits_cibles_chez_le_prospect: [],
          produits_cgr_a_proposer: [],
          argumentaire_approche: 'Entreprise identifiée lors de la recherche - nécessite validation et analyse complémentaire'
        },
        fournisseur_actuel_estimation: 'À identifier',
        sources: [],
        taille_entreprise: 'Non spécifié',
        volume_pieces_estime: 'Non spécifié',
        zone_geographique: 'Non spécifié'
      });
    });
    
    return enterprises.slice(0, 10);
  }

  private validateAndCleanEnterprises(enterprises: any[]): Enterprise[] {
    return enterprises
      .filter(enterprise => {
        if (!enterprise || typeof enterprise !== 'object') return false;
        if (!enterprise.nom_entreprise || typeof enterprise.nom_entreprise !== 'string') return false;
        if (!enterprise.description_activite || typeof enterprise.description_activite !== 'string') return false;
        if (!enterprise.potentiel_cgr || typeof enterprise.potentiel_cgr !== 'object') return false;
        
        return true;
      })
      .map(enterprise => ({
        nom_entreprise: String(enterprise.nom_entreprise).trim(),
        site_web: this.cleanWebsiteUrl(enterprise.site_web || ''),
        description_activite: String(enterprise.description_activite).trim(),
        produits_entreprise: Array.isArray(enterprise.produits_entreprise) 
          ? enterprise.produits_entreprise.filter((p: any) => p && typeof p === 'string').map((p: any) => String(p).trim())
          : [],
        potentiel_cgr: {
          produits_cibles_chez_le_prospect: Array.isArray(enterprise.potentiel_cgr?.produits_cibles_chez_le_prospect) 
            ? enterprise.potentiel_cgr.produits_cibles_chez_le_prospect.filter((p: any) => p && typeof p === 'string').map((p: any) => String(p).trim())
            : [],
          produits_cgr_a_proposer: Array.isArray(enterprise.potentiel_cgr?.produits_cgr_a_proposer) 
            ? enterprise.potentiel_cgr.produits_cgr_a_proposer.filter((p: any) => p && typeof p === 'string').map((p: any) => String(p).trim())
            : [],
          argumentaire_approche: String(enterprise.potentiel_cgr?.argumentaire_approche || '').trim()
        },
        fournisseur_actuel_estimation: String(enterprise.fournisseur_actuel_estimation || 'Non spécifié').trim(),
        sources: Array.isArray(enterprise.sources) 
          ? enterprise.sources.filter((s: any) => s && typeof s === 'string').map((s: any) => String(s).trim())
          : [],
        taille_entreprise: String(enterprise.taille_entreprise || 'Non spécifié').trim(),
        volume_pieces_estime: String(enterprise.volume_pieces_estime || 'Non spécifié').trim(),
        zone_geographique: String(enterprise.zone_geographique || 'Non spécifié').trim()
      }))
      .slice(0, 15);
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