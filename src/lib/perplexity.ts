// lib/perplexity.ts - VERSION ULTRA-ROBUSTE - Gestion multi-langue complète
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
  autresProduits?: string;
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

  /**
   * 🎯 Point d'entrée principal - Recherche d'entreprises avec retry logic
   */
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
             reasoning_effort: 'high',
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
        const result = this.parseEnterpriseResponse(response.data, searchData);
        
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

  /**
   * 🔧 PARSING JSON ULTRA-ROBUSTE avec gestion multi-langue
   */
  private parseEnterpriseResponse(
    response: any, 
    searchData: EnterpriseSearchData
  ): { 
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
      
      console.log(`📄 Contenu reçu: ${content.length} caractères`);
      
      // Étape 1: Nettoyage du markdown et tags
      content = this.cleanMarkdownAndTags(content);
      
      // Étape 2: Extraction du JSON
      content = this.extractJSONContent(content);
      
      if (!content) {
        console.error('✗ Impossible d\'extraire le JSON');
        return this.extractPartialEnterprises(response.choices?.[0]?.message?.content || '', searchData);
      }
      
      console.log(`📊 JSON extrait: ${content.length} caractères`);
      
      // Étape 3: Validation et réparation de la structure
      const validation = this.validateJSONStructure(content);
      if (!validation.valid) {
        console.warn('⚠️ Structure JSON invalide:', validation.error);
        content = this.repairJSONStructure(content);
        console.log('🔧 JSON réparé');
      } else {
        console.log('✓ Structure JSON valide');
      }
      
      // Étape 4: Nettoyage des caractères problématiques
      content = this.cleanJSONString(content);
      
      // Étape 5: Parsing avec gestion d'erreur avancée
      let parsed: any;
      try {
        parsed = JSON.parse(content);
        console.log('✓ Parsing JSON réussi');
      } catch (error: any) {
        console.error('✗ Parsing échoué:', error.message);
        
        // Tentative de réparation avancée
        content = this.advancedJSONRepair(content);
        
        try {
          parsed = JSON.parse(content);
          console.log('✓ Parsing réussi après réparation avancée');
        } catch (error2: any) {
          console.error('✗ Parsing échoué définitivement:', error2.message);
          return this.extractPartialEnterprises(response.choices?.[0]?.message?.content || '', searchData);
        }
      }
      
      // 🎯 NORMALISATION AUTOMATIQUE DES CLÉS RACINE
      parsed = this.normalizeRootKeys(parsed);
      
      // Étape 6: Validation et nettoyage des entreprises
      if (!parsed || typeof parsed !== 'object') {
        console.error('✗ Résultat parsé n\'est pas un objet');
        return this.extractPartialEnterprises(content, searchData);
      }
      
      if (!Array.isArray(parsed.enterprises)) {
        console.error('✗ enterprises n\'est pas un tableau');
        console.log('📋 Clés disponibles:', Object.keys(parsed));
        return this.extractPartialEnterprises(content, searchData);
      }
      
      const cleanedEnterprises = this.validateAndCleanEnterprises(parsed.enterprises, searchData);
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

  /**
   * 🔄 Normalisation automatique de TOUTES les variations de clés racine
   */
  private normalizeRootKeys(parsed: any): any {
    // Liste exhaustive des variations possibles
    const enterpriseKeys = [
      'enterprises',      // Anglais (attendu)
      'entreprises',      // Français pluriel
      'entreprise',       // Français singulier
      'companies',        // Anglais alternatif
      'company',          // Anglais singulier
      'results',          // Résultats
      'data'             // Données
    ];
    
    // Chercher la clé qui contient les données
    for (const key of enterpriseKeys) {
      if (parsed[key]) {
        console.log(`🔄 Normalisation: "${key}" → "enterprises"`);
        
        // Convertir en tableau si nécessaire
        let data = parsed[key];
        if (!Array.isArray(data)) {
          data = [data];
          console.log('🔄 Conversion en tableau');
        }
        
        parsed.enterprises = data;
        
        // Supprimer l'ancienne clé si différente
        if (key !== 'enterprises') {
          delete parsed[key];
        }
        
        break;
      }
    }
    
    return parsed;
  }

  /**
   * Nettoyage du markdown et des balises
   */
  private cleanMarkdownAndTags(content: string): string {
    return content
      .replace(/<think>[\s\S]*?<\/think>/g, '')
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();
  }

  /**
   * Extraction du contenu JSON valide entre { et }
   */
  private extractJSONContent(content: string): string {
    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');
    
    if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
      console.error('✗ Pas de JSON valide trouvé');
      return '';
    }
    
    return content.substring(firstBrace, lastBrace + 1);
  }

  /**
   * Validation de la structure JSON (accolades et crochets appariés)
   */
  private validateJSONStructure(str: string): { valid: boolean; error?: string } {
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
    
    return { valid: true };
  }

  /**
   * Réparation automatique de la structure JSON
   */
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

  /**
   * Nettoyage des caractères problématiques
   */
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

  /**
   * Réparation JSON avancée - VERSION AMÉLIORÉE
   */
  private advancedJSONRepair(str: string): string {
    let repaired = str;
    
    // 1. Virgules avant fermetures
    repaired = repaired.replace(/,(\s*[}\]])/g, '$1');
    
    // 2. Objets consécutifs
    repaired = repaired.replace(/}(\s*){/g, '},{');
    
    // 3. Tableaux consécutifs
    repaired = repaired.replace(/](\s*)\[/g, '],[');
    
    // 4. Propriétés sans guillemets
    repaired = repaired.replace(/(\{|,)(\s*)(\w+)(\s*):/g, '$1$2"$3"$4:');
    
    // 5. Virgules manquantes entre propriétés
    repaired = repaired.replace(/"(\s*)"(\w+)"(\s*):/g, '",$1"$2"$3:');
    
    // 6. Guillemets doubles échappés
    repaired = repaired.replace(/\\"/g, '"');
    
    return repaired;
  }

  /**
   * Extraction partielle en cas d'échec du parsing complet
   */
  private extractPartialEnterprises(
    content: string,
    searchData: EnterpriseSearchData
  ): {
    enterprises: Enterprise[];
    total: number;
    success: boolean;
    error?: string;
  } {
    console.log('🔍 Tentative d\'extraction partielle...');
    
    const enterprises: Enterprise[] = [];
    
    // Pattern élargi pour capturer différentes variations
    const patterns = [
      /"nom_entreprise"\s*:\s*"([^"]+)"/g,
      /"nom"\s*:\s*"([^"]+)"/g,
      /"name"\s*:\s*"([^"]+)"/g,
      /"company_name"\s*:\s*"([^"]+)"/g
    ];
    
    const foundNames = new Set<string>();
    
    for (const pattern of patterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        foundNames.add(match[1].trim());
      }
    }
    
    console.log(`🔍 ${foundNames.size} noms d'entreprises détectés`);
    
    for (const nom of Array.from(foundNames).slice(0, searchData.nombreResultats)) {
      enterprises.push(this.createMinimalEnterprise(nom, searchData));
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

  /**
   * Création d'une entreprise minimale avec données par défaut
   */
  private createMinimalEnterprise(nom: string, searchData: EnterpriseSearchData): Enterprise {
    const zone = searchData.zoneGeographique?.[0] || 
                 searchData.zoneGeographiqueLibre || 
                 'France';
    
    const secteur = searchData.secteursActivite?.[0] || 
                    searchData.secteurActiviteLibre || 
                    'Industriel';
    
    return {
      nom_entreprise: nom,
      site_web: '',
      description_activite: `Entreprise du secteur ${secteur} basée en ${zone}. Données complètes à valider manuellement.`,
      produits_entreprise: [],
      potentiel_cgr: {
        produits_cibles_chez_le_prospect: [],
        produits_cgr_a_proposer: ['Ressorts fil', 'Pièces découpées', 'Assemblages'],
        argumentaire_approche: `Entreprise identifiée dans le secteur ${secteur}. CGR International peut proposer ses solutions de ressorts fil, pièces découpées et assemblages mécaniques. Notre expertise et notre proximité géographique permettent un accompagnement réactif. Validation et analyse approfondie recommandées pour identifier les besoins précis de ${nom}.`
      },
      fournisseur_actuel_estimation: 'À identifier',
      sources: [],
      taille_entreprise: 'À déterminer',
      volume_pieces_estime: 'À estimer',
      zone_geographique: zone
    };
  }

  /**
   * Création d'une réponse vide avec erreur
   */
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

  /**
   * 🎯 VALIDATION ET NETTOYAGE ULTRA-ROBUSTE avec normalisation multi-langue
   */
  private validateAndCleanEnterprises(
    enterprises: any[], 
    searchData: EnterpriseSearchData
  ): Enterprise[] {
    return enterprises
      .filter(e => e && typeof e === 'object')
      .map((enterprise, index) => {
        try {
          // 🔄 Normaliser TOUTES les clés possibles
          const normalized = this.normalizeEnterpriseKeys(enterprise);
          
          const nom = String(normalized.nom_entreprise || '').trim();
          
          if (!nom) {
            console.warn(`⚠️ Entreprise ${index + 1}: nom manquant, ignorée`);
            return null;
          }
          
          // Construction de l'entreprise validée
          const validated: Enterprise = {
            nom_entreprise: nom,
            site_web: this.cleanWebsiteUrl(normalized.site_web),
            description_activite: this.ensureMinimumLength(
              normalized.description_activite,
              50,
              `Entreprise ${nom} dans le secteur ${searchData.secteursActivite?.[0] || 'industriel'}.`
            ),
            produits_entreprise: this.ensureArray(normalized.produits_entreprise),
            potentiel_cgr: this.cleanPotentielCGR(normalized.potentiel_cgr, nom, searchData),
            fournisseur_actuel_estimation: normalized.fournisseur_actuel_estimation || 'À identifier',
            sources: this.ensureArray(normalized.sources),
            taille_entreprise: normalized.taille_entreprise || 'À déterminer',
            volume_pieces_estime: normalized.volume_pieces_estime || 'À estimer',
            zone_geographique: normalized.zone_geographique || 
                               searchData.zoneGeographique?.[0] || 
                               searchData.zoneGeographiqueLibre || 
                               'Non spécifiée'
          };
          
          console.log(`✓ Entreprise validée: ${nom}`);
          return validated;
          
        } catch (err) {
          console.error(`✗ Erreur validation entreprise ${index + 1}:`, err);
          return null;
        }
      })
      .filter((e): e is Enterprise => e !== null);
  }

  /**
   * 🔄 Normalisation exhaustive de TOUTES les variations de clés
   */
  private normalizeEnterpriseKeys(enterprise: any): any {
    return {
      // Nom entreprise
      nom_entreprise: this.getFirstValidValue(enterprise, [
        'nom_entreprise', 'nom', 'name', 'company_name', 'companyName', 
        'entreprise', 'company', 'societe', 'société'
      ]),
      
      // Site web
      site_web: this.getFirstValidValue(enterprise, [
        'site_web', 'siteWeb', 'site', 'website', 'url', 'web', 'site_internet'
      ]),
      
      // Description
      description_activite: this.getFirstValidValue(enterprise, [
        'description_activite', 'descriptionActivite', 'description', 
        'activity', 'activite', 'activité', 'desc', 'about'
      ]),
      
      // Produits
      produits_entreprise: this.getFirstValidValue(enterprise, [
        'produits_entreprise', 'produitsEntreprise', 'produits', 
        'products', 'product', 'production'
      ]),
      
      // Potentiel CGR
      potentiel_cgr: this.getFirstValidValue(enterprise, [
        'potentiel_cgr', 'potentielCgr', 'potentiel', 
        'cgr_potential', 'cgrPotential', 'potential'
      ]),
      
      // Fournisseur
      fournisseur_actuel_estimation: this.getFirstValidValue(enterprise, [
        'fournisseur_actuel_estimation', 'fournisseurActuelEstimation', 
        'fournisseur_actuel', 'fournisseur', 'current_supplier', 
        'currentSupplier', 'supplier'
      ]),
      
      // Sources
      sources: this.getFirstValidValue(enterprise, [
        'sources', 'source', 'references', 'refs', 'liens', 'links'
      ]),
      
      // Taille
      taille_entreprise: this.getFirstValidValue(enterprise, [
        'taille_entreprise', 'tailleEntreprise', 'taille', 
        'size', 'company_size', 'companySize'
      ]),
      
      // Volume
      volume_pieces_estime: this.getFirstValidValue(enterprise, [
        'volume_pieces_estime', 'volumePiecesEstime', 'volume_pieces',
        'volume', 'estimated_volume', 'estimatedVolume'
      ]),
      
      // Zone
      zone_geographique: this.getFirstValidValue(enterprise, [
        'zone_geographique', 'zoneGeographique', 'zone', 
        'location', 'localisation', 'lieu', 'place', 'region', 'région'
      ])
    };
  }

  /**
   * Récupère la première valeur valide parmi une liste de clés
   */
  private getFirstValidValue(obj: any, keys: string[]): any {
    for (const key of keys) {
      const value = obj[key];
      if (value !== undefined && value !== null && value !== '') {
        return value;
      }
    }
    return '';
  }

  /**
   * Garantit qu'une valeur est un tableau
   */
  private ensureArray(value: any): string[] {
    if (Array.isArray(value)) {
      return value
        .map(v => String(v || '').trim())
        .filter(v => v !== '' && v !== 'Non spécifié' && v !== 'null' && v !== 'undefined');
    }
    if (typeof value === 'string' && value.trim() !== '') {
      return [value.trim()];
    }
    return [];
  }

  /**
   * Garantit une longueur minimale de texte
   */
  private ensureMinimumLength(text: any, minLength: number, fallback: string): string {
    const str = String(text || '').trim();
    if (str.length >= minLength && 
        str !== 'Non spécifié' && 
        str !== 'À définir' &&
        str !== 'null' &&
        str !== 'undefined') {
      return str;
    }
    return fallback;
  }

  /**
   * Nettoyage de l'URL du site web
   */
  private cleanWebsiteUrl(url: any): string {
    if (!url) return '';
    let cleanUrl = String(url).trim();
    
    // Ignorer les valeurs par défaut
    if (cleanUrl === 'Non spécifié' || cleanUrl === 'À définir') {
      return '';
    }
    
    // Ajouter le protocole si manquant
    if (cleanUrl && !cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }
    
    return cleanUrl;
  }

  /**
   * 🎯 Nettoyage du potentiel CGR avec garantie d'argumentaire
   */
  private cleanPotentielCGR(
    potentiel: any, 
    nomEntreprise: string,
    searchData: EnterpriseSearchData
  ): Enterprise['potentiel_cgr'] {
    if (!potentiel || typeof potentiel !== 'object') {
      potentiel = {};
    }
    
    // Normaliser les clés du potentiel CGR
    const normalized = {
      produits_cibles: this.getFirstValidValue(potentiel, [
        'produits_cibles_chez_le_prospect', 'produitsCiblesChezLeProspect',
        'produits_cibles', 'produitsCibles', 'target_products', 
        'targetProducts', 'cibles'
      ]),
      produits_cgr: this.getFirstValidValue(potentiel, [
        'produits_cgr_a_proposer', 'produitsCgrAProposer',
        'produits_cgr', 'produitsCgr', 'cgr_products', 
        'cgrProducts', 'solutions'
      ]),
      argumentaire: this.getFirstValidValue(potentiel, [
        'argumentaire_approche', 'argumentaireApproche',
        'argumentaire', 'approach', 'approche', 'pitch'
      ])
    };
    
    // Produits CGR par défaut
    const defaultCGRProducts = searchData.produitsCGR?.length > 0 
      ? searchData.produitsCGR 
      : ['Ressorts fil', 'Pièces découpées', 'Assemblages'];
    
    // 🎯 GARANTIR UN ARGUMENTAIRE MINIMUM
    let argumentaire = String(normalized.argumentaire || '').trim();
    
    if (!argumentaire || 
        argumentaire.length < 100 || 
        argumentaire === 'À définir' ||
        argumentaire === 'Non spécifié') {
      
      const secteur = searchData.secteursActivite?.[0] || 
                      searchData.secteurActiviteLibre || 
                      'industriel';
      
      const zone = searchData.zoneGeographique?.[0] || 
                   searchData.zoneGeographiqueLibre || 
                   'France';
      
      argumentaire = `CGR International peut accompagner ${nomEntreprise} grâce à son expertise dans le secteur ${secteur}. ` +
        `Notre gamme de produits (${defaultCGRProducts.join(', ')}) répond aux besoins de précision et de fiabilité. ` +
        `Notre proximité géographique en ${zone} garantit une réactivité optimale avec des délais courts. ` +
        `Nos certifications ISO 9001 et IATF 16949 assurent la qualité de nos processus. ` +
        `Notre R&D dédiée permet de co-développer des solutions sur-mesure adaptées à vos contraintes spécifiques. ` +
        `L'analyse approfondie des besoins spécifiques de ${nomEntreprise} permettrait d'affiner cette proposition de valeur.`;
      
      console.log(`ℹ️ Argumentaire généré pour ${nomEntreprise} (${argumentaire.length} caractères)`);
    }
    
    return {
      produits_cibles_chez_le_prospect: this.ensureArray(normalized.produits_cibles),
      produits_cgr_a_proposer: this.ensureArray(normalized.produits_cgr).length > 0
        ? this.ensureArray(normalized.produits_cgr)
        : defaultCGRProducts,
      argumentaire_approche: argumentaire
    };
  }

  /**
   * Prompt système pour Perplexity - VERSION OPTIMISÉE
   */
  private getSystemPrompt(): string {
    return `Tu es un expert en intelligence économique spécialisé dans l'identification de prospects FABRICANTS pour CGR International.

🎯 MISSION: Identifier des FABRICANTS (pas des distributeurs) ayant des besoins potentiels en composants CGR.

📋 FORMAT JSON OBLIGATOIRE:

{
  "enterprises": [
    {
      "nom_entreprise": "Nom officiel complet",
      "site_web": "https://www.example.com",
      "description_activite": "Description détaillée des activités de fabrication",
      "produits_entreprise": ["Produit 1", "Produit 2", "Produit 3"],
      "potentiel_cgr": {
        "produits_cibles_chez_le_prospect": ["Composant 1", "Composant 2"],
        "produits_cgr_a_proposer": ["Ressort de compression", "Pièce découpée"],
        "argumentaire_approche": "MINIMUM 200 MOTS: Analyse détaillée du potentiel CGR pour ce prospect. Pourquoi CGR est pertinent ? Quels composants CGR peut fournir ? Quels avantages concrets (qualité, innovation, proximité, certifications) ? Quelle valeur ajoutée spécifique pour ce client ?"
      },
      "fournisseur_actuel_estimation": "Nom du fournisseur probable ou 'À identifier'",
      "sources": ["https://source1.com", "https://source2.com"],
      "taille_entreprise": "PME (< 250 salariés) | ETI (250-5000) | Grande entreprise (> 5000)",
      "volume_pieces_estime": "Très élevé (>100k/an) | Élevé (10-100k) | Moyen (1-10k) | Faible (<1k)",
      "zone_geographique": "Ville, Région, Pays"
    }
  ]
}

⚠️ RÈGLES CRITIQUES:

1. **Champ OBLIGATOIRE**: argumentaire_approche doit faire MINIMUM 200 mots
2. **Qualité**: Remplir tous les champs avec des données réelles
3. **Pas de texte avant/après le JSON** - Commence par { et termine par }
4. **Guillemets doubles uniquement**
5. **Pas de virgule finale** dans les tableaux/objets

🏭 PRODUITS CGR DISPONIBLES:
- Ressorts fil (compression, traction, torsion)
- Ressorts plats
- Pièces découpées (découpe laser, poinçonnage)
- Formage de tubes
- Assemblages automatisés
- Solutions mécatroniques
- Injection plastique

🚫 EXCLUSIONS:
- Distributeurs, revendeurs, négociants
- Installateurs sans usine
- Fabricants de ressorts (concurrents directs CGR)

✅ EXEMPLE d'argumentaire de qualité (200+ mots):

"CGR International représente un partenaire stratégique pour [Nom Entreprise] dans l'optimisation de ses composants mécaniques. Notre expertise de plus de 50 ans dans la fabrication de ressorts fil nous permet de proposer des solutions parfaitement adaptées aux contraintes de [secteur spécifique]. Pour leurs [produit identifié], nos ressorts de compression offrent une durabilité exceptionnelle avec plus de 500 000 cycles garantis grâce à notre traitement thermique propriétaire et notre sélection rigoureuse des matières premières.

Notre proximité géographique constitue un avantage majeur : avec notre usine située en [région], nous garantissons des délais de livraison de 48h pour les urgences et permettons une collaboration technique rapprochée. Cette réactivité est cruciale pour accompagner les évolutions de production et les besoins de dernière minute.

Notre département R&D, composé de 15 ingénieurs spécialisés, peut co-développer des solutions sur-mesure pour [application spécifique]. Nous avons déjà accompagné des acteurs majeurs de [secteur] dans des projets similaires. Nos certifications ISO 9001, IATF 16949 et notre qualification aéronautique EN 9100 garantissent le respect des standards les plus exigeants.

Pour les volumes élevés anticipés (estimation >100 000 pièces/an), notre capacité d'assemblage automatisé permet de réduire les coûts unitaires de 15-20% tout en assurant une qualité constante. Notre système de traçabilité complet répond aux exigences de [secteur] en matière de qualité et de compliance."

RETOURNE UNIQUEMENT LE JSON - RIEN D'AUTRE.`;
  }

  /**
   * Construction du prompt utilisateur - VERSION OPTIMISÉE
   */
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
      : ['Ressorts fil', 'Pièces découpées', 'Formage tubes', 'Assemblages', 'Mécatronique'];

    return `🎯 RECHERCHE APPROFONDIE: ${data.nombreResultats} entreprises FABRICANTES dans "${secteurPrincipal}"

📍 CRITÈRES:
- Secteur: ${secteurPrincipal}
- Zone: ${zoneGeo}
- Taille: ${data.tailleEntreprise || 'Toutes tailles'}
- Produits CGR: ${produitsCGRSpecifiques.join(', ')}
- Clients à EXCLURE: ${excludeClients.join(', ')}

⚠️ INSTRUCTIONS OBLIGATOIRES:

1. **Identifier ${data.nombreResultats} FABRICANTS** (entreprises avec usines)
   - PAS de distributeurs, revendeurs, négociants
   - PAS d'installateurs sans production
   - PAS de concurrents CGR (fabricants de ressorts/pièces découpées)

2. **Pour CHAQUE entreprise:**
   - Nom officiel + site web vérifié
   - Description activité: 80+ mots (procédés, technologies)
   - 2+ produits finaux fabriqués
   - Composants mécaniques identifiés
   - Solutions CGR pertinentes
   - **ARGUMENTAIRE: MINIMUM 200 MOTS** détaillant:
     * Pourquoi CGR est pertinent
     * Quels composants CGR peut fournir
     * Quels avantages concrets (qualité, proximité, certifications)
     * Quelle valeur ajoutée spécifique
   - Estimation fournisseur actuel
   - Taille (choisir: PME/ETI/Grande entreprise)
   - Volume estimé (choisir: Très élevé/Élevé/Moyen/Faible)
   - Localisation précise
   - 2+ sources URL

3. **VALIDATION:**
   - L'argumentaire fait-il vraiment 200+ mots ?
   - Tous les champs sont-ils remplis ?
   - Les tailles et volumes ont-ils une valeur choisie ?

4. **FORMAT:**
   - UNIQUEMENT le JSON
   - Commence par { et termine par }
   - Pas de markdown, pas de commentaires
   - Guillemets doubles uniquement

🚀 ACTION: Génère le JSON complet avec ${data.nombreResultats} entreprises de qualité.`;
  }
}