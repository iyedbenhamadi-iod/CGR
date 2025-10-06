// lib/perplexity.ts - Corrected version with robust JSON parsing
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
  private maxRetries = 3;

  constructor() {
    this.apiKey = process.env.PERPLEXITY_API_KEY!;
    if (!this.apiKey) {
      throw new Error('PERPLEXITY_API_KEY manquante');
    }
  }

  async searchEnterprises(searchData: EnterpriseSearchData): Promise<any> {
    const prompt = this.buildEnterpriseSearchPrompt(searchData);
    
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`Tentative ${attempt}/${this.maxRetries} - Recherche Perplexity...`);
        
        const allSectors = [
          ...(searchData.secteursActivite || []),
          ...(searchData.secteurActiviteLibre ? [searchData.secteurActiviteLibre] : [])
        ].filter(Boolean);
        
        const allZones = [
          ...(searchData.zoneGeographique || []),
          ...(searchData.zoneGeographiqueLibre ? [searchData.zoneGeographiqueLibre] : [])
        ].filter(Boolean);
        
        console.log('Paramètres:', {
          secteur: allSectors[0] || 'Non spécifié',
          zone: allZones.join(', '),
          résultats: searchData.nombreResultats
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
              'kompass.com',
              'europages.com',
              'kellysearch.com',
              'infogreffe.fr',
              'northdata.com',
              'companiesintheuk.co.uk'
            ]
          },
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 900000,
            validateStatus: (status) => status < 500
          }
        );
        
        if (response.status >= 400) {
          throw new Error(`API Error ${response.status}: ${JSON.stringify(response.data)}`);
        }
        
        console.log('Réponse Perplexity reçue');
        const result = this.parseEnterpriseResponse(response.data);
        
        if (result.success && result.enterprises.length > 0) {
          console.log(`✓ Succès: ${result.enterprises.length} entreprises`);
          return result;
        }
        
        if (result.success) {
          return result;
        }
        
        throw new Error(result.error || 'Parsing failed');
        
      } catch (error: any) {
        lastError = error;
        console.error(`✗ Tentative ${attempt} échouée:`, error.message);
        
        if (error.response?.status === 400 || error.response?.status === 401) {
          break;
        }
        
        if (attempt < this.maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          console.log(`⏳ Nouvelle tentative dans ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    console.error('✗ Toutes les tentatives ont échoué');
    return {
      enterprises: [],
      total: 0,
      success: false,
      error: lastError?.message || 'Échec après plusieurs tentatives'
    };
  }

  private getSystemPrompt(): string {
    return `Tu es un expert en intelligence économique spécialisé dans l'identification de prospects FABRICANTS pour CGR International.

RÈGLE CRITIQUE: Retourne UNIQUEMENT un objet JSON valide. 
- PAS de texte avant ou après le JSON
- PAS de commentaires dans le JSON
- PAS de virgules en fin de tableau ou objet
- Commence par { et termine par }
- Tous les guillemets doivent être échappés correctement

IMPÉRATIF: Chaque objet entreprise doit être COMPLET avec TOUTES les propriétés.

Format JSON OBLIGATOIRE:
{
  "enterprises": [
    {
      "nom_entreprise": "Nom complet de l'entreprise",
      "site_web": "https://example.com",
      "description_activite": "Description détaillée de l'activité de fabrication",
      "produits_entreprise": ["Produit 1", "Produit 2", "Produit 3"],
      "potentiel_cgr": {
        "produits_cibles_chez_le_prospect": ["Composant A", "Composant B"],
        "produits_cgr_a_proposer": ["Solution CGR 1", "Solution CGR 2"],
        "argumentaire_approche": "Argumentaire commercial détaillé minimum 200 mots expliquant pourquoi CGR est pertinent pour ce prospect"
      },
      "fournisseur_actuel_estimation": "Nom du fournisseur actuel probable",
      "sources": ["https://source1.com", "https://source2.com"],
      "taille_entreprise": "PME ou ETI ou Grande entreprise",
      "volume_pieces_estime": "Estimation du volume (Faible/Moyen/Élevé/Très élevé)",
      "zone_geographique": "Ville précise, Région, Pays"
    }
  ]
}

RÈGLES STRICTES POUR LA VALIDITÉ JSON:
1. N'utilise QUE des guillemets doubles (") - jamais de guillemets simples (')
2. Échappe tous les guillemets dans les valeurs avec un backslash
3. Pas de retours à la ligne dans les valeurs texte - remplace par des espaces
4. Remplace les apostrophes françaises par des apostrophes simples normales
5. Pas de virgule après le dernier élément d'un tableau ou objet
6. Tous les nombres sans guillemets, tous les textes avec guillemets

IMPORTANT:
- Chaque entreprise DOIT avoir TOUTES les propriétés remplies
- L'argumentaire_approche DOIT faire minimum 200 mots
- Les tableaux ne doivent JAMAIS être vides
- Si une info manque, mets "Non spécifié" mais GARDE la propriété

MISSION: Identifier 5-10 FABRICANTS avec usines de production.

PRODUITS CGR: Ressorts, pièces découpées, formage tubes, assemblages, mécatronique, injection plastique.

EXCLUSIONS: Revendeurs, distributeurs, installateurs, fabricants de ressorts/pièces découpées (concurrents directs).`;
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
    
    const produitsCGRSpecifiques = data.produitsCGR && data.produitsCGR.length > 0 
      ? data.produitsCGR 
      : ['Ressorts fil', 'Pièces découpées', 'Formage tubes', 'Assemblages', 'Mécatronique', 'Injection plastique'];

    return `RECHERCHE: ${data.nombreResultats} entreprises FABRICANTES pour CGR International

RÉPONDS UNIQUEMENT AVEC UN JSON VALIDE - PAS DE TEXTE AVANT/APRÈS - PAS DE MARKDOWN

Secteur cible: ${secteurPrincipal}
Zone géographique: ${zoneGeo}
Taille entreprise: ${data.tailleEntreprise || 'Toutes tailles'}
Produits CGR à proposer: ${produitsCGRSpecifiques.join(', ')}
Clients à exclure: ${excludeClients.join(', ')}

OBJECTIF: Trouver ${data.nombreResultats} FABRICANTS (minimum 5) avec:
- Usines de production identifiées
- Besoins potentiels en composants CGR
- Informations complètes sur chaque entreprise

ATTENTION: Chaque objet entreprise doit être COMPLET avec toutes les propriétés remplies.

RETOURNE UNIQUEMENT LE JSON COMPLET commençant par { et finissant par }`;
  }

  private parseEnterpriseResponse(response: any): { 
    enterprises: Enterprise[], 
    total: number, 
    success: boolean, 
    error?: string 
  } {
    try {
      let content = response.choices?.[0]?.message?.content || '';
      
      if (!content) {
        console.error('✗ Contenu vide reçu de Perplexity');
        return this.createEmptyResponse('Aucun contenu reçu');
      }
      
      const originalLength = content.length;
      console.log(`📄 Contenu reçu: ${originalLength} caractères`);
      
      // Step 1: Remove markdown and wrapper tags
      content = this.cleanMarkdownAndTags(content);
      
      // Step 2: Extract JSON boundaries
      content = this.extractJSONContent(content);
      
      if (!content) {
        console.error('✗ Impossible d\'extraire le JSON');
        return this.extractPartialEnterprises(response.choices?.[0]?.message?.content || '');
      }
      
      console.log(`📊 JSON extrait: ${content.length} caractères`);
      console.log('🔍 Début:', content.substring(0, 100));
      console.log('🔍 Fin:', content.slice(-100));
      
      // Step 3: Validate and repair structure
      const validation = this.validateJSONStructure(content);
      if (!validation.valid) {
        console.warn('⚠️ Structure JSON invalide:', validation.error);
        content = this.repairJSONStructure(content);
        console.log('🔧 JSON réparé');
      } else {
        console.log('✓ Structure JSON valide');
      }
      
      // Step 4: Clean problematic characters
      content = this.cleanJSONString(content);
      
      // Step 5: Parse
      let parsed: any;
      try {
  parsed = JSON.parse(content);
  
  // NEW: Handle French key name
  if (parsed.entreprises && !parsed.enterprises) {
    parsed.enterprises = parsed.entreprises;
    delete parsed.entreprises;
  }
  
  console.log('✓ Parsing JSON réussi');
      } catch (error: any) {
        console.error('✗ Parsing échoué:', error.message);
        const errorPos = this.extractErrorPosition(error.message);
        if (errorPos) {
          console.log(`📍 Erreur à la position ${errorPos}:`);
          console.log(content.substring(Math.max(0, errorPos - 50), errorPos + 50));
        }
        
        // Advanced repair attempt
        content = this.advancedJSONRepair(content);
        
        try {
          parsed = JSON.parse(content);
          console.log('✓ Parsing réussi après réparation avancée');
        } catch (error2: any) {
          console.error('✗ Parsing échoué définitivement:', error2.message);
          return this.extractPartialEnterprises(response.choices?.[0]?.message?.content || '');
        }
      }
      
      // Step 6: Validate and clean enterprises
      if (!parsed || typeof parsed !== 'object') {
        console.error('✗ Résultat parsé n\'est pas un objet');
        return this.extractPartialEnterprises(content);
      }
      
      if (!Array.isArray(parsed.enterprises)) {
        console.error('✗ enterprises n\'est pas un tableau');
        return this.extractPartialEnterprises(content);
      }
      
      const cleanedEnterprises = this.validateAndCleanEnterprises(parsed.enterprises);
      console.log(`✓ ${cleanedEnterprises.length} entreprises valides extraites`);
      
      return {
        enterprises: cleanedEnterprises,
        total: cleanedEnterprises.length,
        success: true
      };
      
    } catch (error: any) {
      console.error('✗ Erreur parsing finale:', error.message);
      return this.createEmptyResponse(error.message);
    }
  }

  private cleanMarkdownAndTags(content: string): string {
    return content
      .replace(/<think>[\s\S]*?<\/think>/g, '')
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();
  }

  private extractJSONContent(content: string): string {
    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');
    
    if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
      console.error('✗ Pas de JSON valide trouvé');
      return '';
    }
    
    if (firstBrace > 0) {
      console.log(`🔧 Suppression de ${firstBrace} caractères avant le JSON`);
    }
    
    if (lastBrace < content.length - 1) {
      console.log(`🔧 Suppression de ${content.length - lastBrace - 1} caractères après le JSON`);
    }
    
    return content.substring(firstBrace, lastBrace + 1);
  }

  private validateJSONStructure(str: string): {
    valid: boolean;
    error?: string;
  } {
    let openBraces = 0, closeBraces = 0;
    let openBrackets = 0, closeBrackets = 0;
    let inString = false;
    let escaped = false;
    
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      
      if (escaped) {
        escaped = false;
        continue;
      }
      
      if (char === '\\') {
        escaped = true;
        continue;
      }
      
      if (char === '"') {
        inString = !inString;
        continue;
      }
      
      if (inString) continue;
      
      if (char === '{') openBraces++;
      if (char === '}') closeBraces++;
      if (char === '[') openBrackets++;
      if (char === ']') closeBrackets++;
    }
    
    if (openBraces !== closeBraces) {
      return { 
        valid: false, 
        error: `Accolades non appariées: ${openBraces} ouvertes, ${closeBraces} fermées` 
      };
    }
    
    if (openBrackets !== closeBrackets) {
      return { 
        valid: false, 
        error: `Crochets non appariés: ${openBrackets} ouverts, ${closeBrackets} fermés` 
      };
    }
    
    if (inString) {
      return { 
        valid: false, 
        error: 'Chaîne non fermée détectée' 
      };
    }
    
    return { valid: true };
  }

  private repairJSONStructure(str: string): string {
    let repaired = str;
    
    const openBraces = (str.match(/{/g) || []).length;
    const closeBraces = (str.match(/}/g) || []).length;
    const openBrackets = (str.match(/\[/g) || []).length;
    const closeBrackets = (str.match(/\]/g) || []).length;
    
    if (openBrackets > closeBrackets) {
      const missing = openBrackets - closeBrackets;
      console.log(`🔧 Ajout de ${missing} crochets fermants`);
      repaired += ']'.repeat(missing);
    }
    
    if (openBraces > closeBraces) {
      const missing = openBraces - closeBraces;
      console.log(`🔧 Ajout de ${missing} accolades fermantes`);
      repaired += '}'.repeat(missing);
    }
    
    return repaired;
  }

  private cleanJSONString(str: string): string {
    return str
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
      .replace(/\r\n/g, ' ')
      .replace(/\n/g, ' ')
      .replace(/\t/g, ' ')
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  private advancedJSONRepair(str: string): string {
    return str
      .replace(/,(\s*[}\]])/g, '$1')
      .replace(/}\s*{/g, '},{')
      .replace(/]\s*\[/g, '],[')
      .replace(/"(\w+)":\s*"([^"]*)"([^,}\]])/g, '"$1":"$2",$3')
      .replace(/([}\]])(\s*)"(\w+)":/g, '$1,$2"$3":');
  }

  private extractErrorPosition(errorMsg: string): number | null {
    const match = errorMsg.match(/position (\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  private extractPartialEnterprises(content: string): {
    enterprises: Enterprise[];
    total: number;
    success: boolean;
    error?: string;
  } {
    console.log('🔍 Tentative d\'extraction partielle...');
    
    const enterprises: Enterprise[] = [];
    const pattern = /{[^{}]*"nom_entreprise"\s*:\s*"([^"]+)"[^{}]*}/g;
    const matches = content.matchAll(pattern);
    
    for (const match of matches) {
      try {
        const obj = match[0];
        const nom = match[1];
        
        const siteMatch = obj.match(/"site_web"\s*:\s*"([^"]*)"/);
        const descMatch = obj.match(/"description_activite"\s*:\s*"([^"]*)"/);
        
        enterprises.push({
          nom_entreprise: nom.trim(),
          site_web: siteMatch ? this.cleanWebsiteUrl(siteMatch[1]) : '',
          description_activite: descMatch ? descMatch[1].trim() : 'Données extraites partiellement',
          produits_entreprise: [],
          potentiel_cgr: {
            produits_cibles_chez_le_prospect: [],
            produits_cgr_a_proposer: [],
            argumentaire_approche: 'Données extraites partiellement - validation requise'
          },
          fournisseur_actuel_estimation: 'À identifier',
          sources: [],
          taille_entreprise: 'Non spécifié',
          volume_pieces_estime: 'Non spécifié',
          zone_geographique: 'Non spécifiée'
        });
        
        if (enterprises.length >= 10) break;
      } catch (err) {
        continue;
      }
    }
    
    if (enterprises.length > 0) {
      console.log(`✓ Extraction partielle: ${enterprises.length} entreprises`);
      return {
        enterprises,
        total: enterprises.length,
        success: true
      };
    }
    
    console.error('✗ Échec extraction partielle');
    return this.createEmptyResponse('Impossible d\'extraire les données');
  }

  private createEmptyResponse(error: string): {
    enterprises: Enterprise[];
    total: number;
    success: boolean;
    error: string;
  } {
    return {
      enterprises: [],
      total: 0,
      success: false,
      error
    };
  }

  private validateAndCleanEnterprises(enterprises: any[]): Enterprise[] {
    return enterprises
      .filter(e => e && typeof e === 'object')
      .map(enterprise => {
        try {
          const nom = String(enterprise.nom_entreprise || enterprise.name || '').trim();
          if (!nom) return null;
          
          return {
            nom_entreprise: nom,
            site_web: this.cleanWebsiteUrl(enterprise.site_web || enterprise.website || ''),
            description_activite: String(enterprise.description_activite || enterprise.description || 'Non spécifié').trim(),
            produits_entreprise: Array.isArray(enterprise.produits_entreprise) 
              ? enterprise.produits_entreprise.map((p: any) => String(p).trim()).filter(Boolean)
              : [],
            potentiel_cgr: {
              produits_cibles_chez_le_prospect: Array.isArray(enterprise.potentiel_cgr?.produits_cibles_chez_le_prospect)
                ? enterprise.potentiel_cgr.produits_cibles_chez_le_prospect.map((p: any) => String(p).trim()).filter(Boolean)
                : [],
              produits_cgr_a_proposer: Array.isArray(enterprise.potentiel_cgr?.produits_cgr_a_proposer)
                ? enterprise.potentiel_cgr.produits_cgr_a_proposer.map((p: any) => String(p).trim()).filter(Boolean)
                : [],
              argumentaire_approche: String(enterprise.potentiel_cgr?.argumentaire_approche || 'Non spécifié').trim()
            },
            fournisseur_actuel_estimation: String(enterprise.fournisseur_actuel_estimation || 'Non spécifié').trim(),
            sources: Array.isArray(enterprise.sources) 
              ? enterprise.sources.map((s: any) => String(s).trim()).filter(Boolean)
              : [],
            taille_entreprise: String(enterprise.taille_entreprise || 'Non spécifié').trim(),
            volume_pieces_estime: String(enterprise.volume_pieces_estime || 'Non spécifié').trim(),
            zone_geographique: String(enterprise.zone_geographique || enterprise.address || 'Non spécifiée').trim()
          };
        } catch (error) {
          console.error('✗ Erreur validation entreprise:', error);
          return null;
        }
      })
      .filter((e): e is Enterprise => e !== null)
      .slice(0, 15);
  }

  private cleanWebsiteUrl(url: string): string {
    if (!url || url.trim() === '') return '';
    
    let cleanedUrl = url.trim();
    cleanedUrl = cleanedUrl.replace(/^(https?:\/\/)?(www\.)?/, '');
    
    if (cleanedUrl.includes('.') && !cleanedUrl.includes(' ')) {
      cleanedUrl = `https://${cleanedUrl}`;
    } else {
      return '';
    }
    
    try {
      new URL(cleanedUrl);
      return cleanedUrl;
    } catch (error) {
      return '';
    }
  }
}