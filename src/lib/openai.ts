import axios from 'axios';

interface MarketOpportunity {
  nom_marche: string;
  justification: string;
  produits_cgr_applicables: string[];
  exemples_entreprises: string[];
  taille_entreprises_cibles: string;
  volume_pieces_estime: string;
}

interface BrainstormingData {
  secteursActivite: string[];
  zoneGeographique: string[];
  produitsCGR: string[];
  clientsExclure: string;
  tailleEntreprise?: string;
  volumePieces?: number[];
  usinesCGR?: string[];
  motsCles?: string;
  nombreResultats?: number;
}

export class OpenAIBrainstormingClient {
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY!;
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY manquante');
    }
  }

  async generateMarketBrainstorming(data: BrainstormingData): Promise<any> {
    const prompt = this.buildBrainstormingPrompt(data);
    
    try {
      console.log('🤖 Envoi de la requête OpenAI...');
      console.log('📝 Prompt:', prompt.substring(0, 200) + '...');
      
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: this.getSystemPrompt() },
            { role: 'user', content: prompt }
          ],
          max_tokens: 4000,
          temperature: 0.2,
          response_format: { type: "json_object" }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 45000
        }
      );
      
      console.log('✅ Réponse OpenAI reçue');
      return this.parseBrainstormingResponse(response.data);
    } catch (error: any) {
      console.error('❌ Erreur OpenAI API:', {
        status: error.response?.status,
        message: error.message,
        data: error.response?.data
      });
      
      return {
        markets: [],
        total: 0,
        success: false,
        error: `OpenAI API Error: ${error.response?.status || 'Unknown'} - ${error.message}`
      };
    }
  }

  private getSystemPrompt(): string {
    return `Tu es un expert analyste stratégique pour CGR International, fabricant français de composants mécaniques industriels.

MISSION: Identifier exactement 5 nouveaux marchés ou applications de niche pour diversifier, EN RESPECTANT STRICTEMENT LES CONTRAINTES SPÉCIFIÉES.

EXPERTISE CGR DISPONIBLE:
- Ressorts (fil, plat, torsion) - haute précision
- Pièces découpées de précision
- Formage de tubes
- Assemblages automatisés
- Mécatronique
- Injection plastique

RÈGLES ABSOLUES:
1. PRODUITS CGR: Utilise UNIQUEMENT les produits CGR spécifiés par l'utilisateur
2. SECTEURS: Distribue les marchés entre TOUS les secteurs spécifiés (pas seulement un seul)
3. TAILLE ENTREPRISE: Cible les entreprises de la taille spécifiée
4. VOLUME: Respecte les volumes de production indiqués

CRITÈRES MARCHÉS:
- Synergie technologique avec les produits CGR spécifiés
- Marché en croissance dans les secteurs ciblés
- Entreprises de la taille appropriée
- Volume de production compatible
- Qualité/précision = avantage concurrentiel

IMPORTANT: Tu dois répondre UNIQUEMENT avec un JSON valide, sans texte avant ou après.

Format JSON requis:
{
  "markets": [
    {
      "nom_marche": "Nom du marché spécifique",
      "justification": "Analyse détaillée minimum 150 mots expliquant la pertinence pour CGR avec les produits spécifiés",
      "produits_cgr_applicables": ["Uniquement les produits spécifiés par l'utilisateur"],
      "exemples_entreprises": ["Entreprise 1", "Entreprise 2", "Entreprise 3"],
      "taille_entreprises_cibles": "Taille d'entreprise spécifiée par l'utilisateur",
      "volume_pieces_estime": "Volume compatible avec les spécifications",
      "secteur": "Secteur d'activité du marché"
    }
  ]
}

CONTRAINTES STRICTES:
- Exactement 5 marchés RÉPARTIS entre TOUS les secteurs spécifiés
- Produits CGR limités à ceux spécifiés par l'utilisateur
- Taille d'entreprise respectée
- Volume de pièces compatible
- Justification minimum 150 mots par marché
- JSON parfaitement formaté`;
  }

  private buildBrainstormingPrompt(data: BrainstormingData): string {
    const excludeClients = [
      'Forvia', 'Valeo', 'Schneider Electric', 'Dassault Aviation', 'Thales', 'Safran',
      ...(data.clientsExclure ? data.clientsExclure.split('\n').filter(Boolean) : [])
    ];

    // FIX: Use ALL sectors, not just the first one
    const secteursCibles = data.secteursActivite.length > 0 ? data.secteursActivite : ['Industriel'];
    const tailleEntreprise = data.tailleEntreprise || 'Toutes tailles';
    const volumePieces = data.volumePieces && data.volumePieces.length > 0 ? data.volumePieces[0] : 50000;
    const usinesCGR = data.usinesCGR || ['Saint-Yorre', 'PMPC', 'Igé'];
    const motsCles = data.motsCles || '';
    const nombreResultats = data.nombreResultats || 5;

    // Validation des produits CGR - utiliser uniquement ceux spécifiés
    const produitsCGRSpecifiques = data.produitsCGR.length > 0 ? data.produitsCGR : ['Ressorts fil'];

    return `CONSIGNE CRITIQUE: Tu dois identifier ${nombreResultats} marchés/applications en les RÉPARTISSANT entre les secteurs suivants : "${secteursCibles.join('", "')}" en utilisant EXCLUSIVEMENT les produits CGR spécifiés.

**CONTRAINTES STRICTES À RESPECTER:**

**Secteurs ciblés OBLIGATOIRES (RÉPARTIR les ${nombreResultats} marchés entre ces secteurs):** 
${secteursCibles.map((secteur, index) => `${index + 1}. ${secteur}`).join('\n')}

⚠️ IMPORTANT: Les ${nombreResultats} marchés doivent être RÉPARTIS entre TOUS ces secteurs. Ne te concentre pas sur un seul secteur !

**Produits CGR AUTORISÉS (AUCUN AUTRE):** ${produitsCGRSpecifiques.join(', ')}
⚠️ IMPORTANT: Ne propose QUE ces produits dans tes réponses. Ignore tous les autres produits CGR.

**Taille d'entreprise ciblée:** ${tailleEntreprise}
${tailleEntreprise === 'PME' ? '- Cibler des PME (50-250 salariés) avec des besoins spécifiques' : ''}
${tailleEntreprise === 'ETI' ? '- Cibler des ETI (250-5000 salariés) avec des volumes moyens' : ''}
${tailleEntreprise === 'Grande entreprise' ? '- Cibler des grandes entreprises (5000+ salariés) avec des volumes importants' : ''}

**Volume de pièces cible:** ${volumePieces.toLocaleString()} pièces/an
- Adapter les recommandations à ce volume de production

**Zones géographiques d'intérêt:** ${data.zoneGeographique.length > 0 ? data.zoneGeographique.join(', ') : 'France et Europe'}

**Usines CGR disponibles:** ${usinesCGR.join(', ')}

**Mots-clés spécifiques:** ${motsCles || 'Haute précision, qualité, innovation'}

**Clients actuels à éviter:** ${excludeClients.join(', ')}

**OBJECTIF PRÉCIS:**
Identifier exactement ${nombreResultats} marchés/applications en les DISTRIBUANT entre les secteurs "${secteursCibles.join('", "')}" où CGR pourrait apporter ses "${produitsCGRSpecifiques.join(', ')}" à des entreprises de taille "${tailleEntreprise}" avec un volume annuel d'environ ${volumePieces.toLocaleString()} pièces.

**RÉPARTITION SECTORIELLE OBLIGATOIRE:**
${this.getSectorDistributionGuidance(secteursCibles, nombreResultats, produitsCGRSpecifiques)}

**RÈGLES ABSOLUES:**
1. Utilise UNIQUEMENT les produits "${produitsCGRSpecifiques.join(', ')}" 
2. DISTRIBUE les ${nombreResultats} marchés entre TOUS les secteurs : "${secteursCibles.join('", "')}"
3. Cible des entreprises de taille "${tailleEntreprise}"
4. Volume compatible avec ${volumePieces.toLocaleString()} pièces/an
5. Évite les clients mentionnés dans la liste d'exclusion
6. Chaque marché doit spécifier son secteur d'appartenance

**VALIDATION:**
- Chaque marché doit utiliser au moins un des produits spécifiés
- Les marchés doivent couvrir TOUS les secteurs spécifiés
- La taille d'entreprise doit correspondre à "${tailleEntreprise}"
- Le volume doit être réaliste pour ${volumePieces.toLocaleString()} pièces/an

Retourne uniquement le JSON demandé, sans aucun texte supplémentaire.`;
  }

  private getSectorDistributionGuidance(secteurs: string[], nombreResultats: number, produitsCGR: string[]): string {
    const produitsStr = produitsCGR.join(', ');
    const marcheParSecteur = Math.ceil(nombreResultats / secteurs.length);
    
    let guidance = `Tu dois répartir les ${nombreResultats} marchés comme suit:\n`;
    
    secteurs.forEach((secteur, index) => {
      const nbMarches = index < nombreResultats % secteurs.length ? 
        Math.floor(nombreResultats / secteurs.length) + 1 : 
        Math.floor(nombreResultats / secteurs.length);
        
      if (nbMarches > 0) {
        guidance += `\n**${secteur.toUpperCase()} (${nbMarches} marché${nbMarches > 1 ? 's' : ''}):**\n`;
        guidance += this.getSectorSpecificGuidance(secteur, produitsCGR);
      }
    });
    
    return guidance;
  }

  private getSectorSpecificGuidance(secteur: string, produitsCGR: string[]): string {
    const produitsStr = produitsCGR.join(', ');
    
    switch (secteur.toLowerCase()) {
      case 'aéronautique':
        return `Applications aéronautiques pour ${produitsStr}:
- Systèmes de contrôle de vol avec ressorts de précision
- Mécanismes de cabine avec ressorts spécialisés
- Équipements de navigation avec composants ressort
- Systèmes de sécurité avion avec ressorts haute performance
- Trains d'atterrissage avec ressorts de suspension`;
        
      case 'industrie électrique':
        return `Applications industrie électrique pour ${produitsStr}:
- Disjoncteurs et interrupteurs avec ressorts de contact
- Relais électriques avec mécanismes ressort
- Transformateurs avec ressorts de serrage
- Armoires électriques avec ressorts de verrouillage
- Connecteurs électriques avec ressorts de contact`;
        
      case 'automobile':
        return `Applications automobiles pour ${produitsStr}:
- Systèmes de sécurité avec ressorts spéciaux
- Composants intérieur avec mécanismes ressort
- Équipements électriques avec ressorts de contact
- Systèmes de confort avec ressorts de précision
- Mécanismes de verrouillage avec ressorts`;
        
      case 'ferroviaire':
        return `Applications ferroviaires pour ${produitsStr}:
- Systèmes de freinage avec ressorts de sécurité
- Bogies avec ressorts de suspension
- Portes de train avec mécanismes ressort
- Systèmes de signalisation avec ressorts de contact
- Pantographes avec ressorts de pression`;
        
      case 'médical':
        return `Applications médicales pour ${produitsStr}:
- Dispositifs médicaux avec ressorts de précision
- Équipements hospitaliers avec mécanismes ressort
- Instruments chirurgicaux avec composants ressort
- Appareils de diagnostic avec systèmes de tension
- Prothèses et orthèses avec mécanismes ressort`;
        
      case 'énergie':
        return `Applications énergétiques pour ${produitsStr}:
- Équipements éoliens avec ressorts de sécurité
- Systèmes solaires avec mécanismes ressort
- Installations nucléaires avec ressorts spéciaux
- Stockage d'énergie avec composants ressort`;
        
      default:
        return `Applications industrielles pour ${produitsStr}:
- Machines spéciales avec ressorts de précision
- Équipements automatisés avec mécanismes ressort
- Systèmes de sécurité industriels
- Appareils de mesure avec composants ressort`;
    }
  }

  private parseBrainstormingResponse(response: any): { markets: MarketOpportunity[], total: number, success: boolean, error?: string } {
    try {
      const content = response.choices[0]?.message?.content || '';
      console.log('📄 Contenu reçu (premiers 500 chars):', content.substring(0, 500) + '...');
      
      let jsonStr = this.cleanJsonString(content);
      let parsed: any;
      
      try {
        parsed = JSON.parse(jsonStr);
        console.log('✅ Parsing direct réussi');
      } catch (error) {
        console.log('⚠️ Parsing direct échoué, tentative de réparation...');
        jsonStr = this.repairJsonString(jsonStr);
        try {
          parsed = JSON.parse(jsonStr);
          console.log('✅ Parsing avec réparation réussi');
        } catch (error2) {
          console.log('⚠️ Parsing avec réparation échoué, tentative de parsing manuel...');
          const manualResults = this.manualParseMarkets(content);
          if (manualResults.length > 0) {
            console.log('✅ Parsing manuel réussi');
            return {
              markets: manualResults,
              total: manualResults.length,
              success: true
            };
          }
          throw new Error(`Impossible de parser le JSON: ${error2}`);
        }
      }
      
      if (!parsed || !Array.isArray(parsed.markets)) {
        console.error('❌ Structure JSON invalide:', parsed);
        return { markets: [], total: 0, success: false, error: 'Structure JSON invalide' };
      }

      const cleanedMarkets = this.validateAndCleanMarkets(parsed.markets);
      
      console.log(`✅ ${cleanedMarkets.length} marchés parsés avec succès`);
      return {
        markets: cleanedMarkets,
        total: cleanedMarkets.length,
        success: true
      };
      
    } catch (error: any) {
      console.error('❌ Erreur parsing finale:', error.message);
      console.error('❌ Contenu brut:', response.choices[0]?.message?.content?.substring(0, 1000));
      
      return { 
        markets: [], 
        total: 0, 
        success: false, 
        error: `Erreur parsing: ${error.message}` 
      };
    }
  }

  private cleanJsonString(content: string): string {
    let jsonStr = content.trim();
    
    // Remove markdown code blocks
    jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/\n?```$/g, '');
    jsonStr = jsonStr.replace(/```\n?/g, '').replace(/\n?```$/g, '');
    
    // Remove any text before first { or after last }
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
    }
    
    return jsonStr;
  }

  private repairJsonString(jsonStr: string): string {
    let repaired = jsonStr;
    
    // Remove trailing commas
    repaired = repaired.replace(/,(\s*[}\]])/g, '$1');
    
    // Fix unescaped quotes in strings
    repaired = repaired.replace(/"([^"]*)"([^"]*)"([^"]*)":/g, '"$1\\"$2\\"$3":');
    
    // Normalize whitespace
    repaired = repaired.replace(/\s+/g, ' ');
    
    // Fix missing commas between objects
    repaired = repaired.replace(/}\s*{/g, '},{');
    
    // Fix missing commas between array elements
    repaired = repaired.replace(/]\s*\[/g, '],[');
    
    // Ensure proper string quotes
    repaired = repaired.replace(/:\s*([^",\[\]{}]+)(\s*[,}\]])/g, (match, value, suffix) => {
      if (value.trim() === 'true' || value.trim() === 'false' || value.trim() === 'null' || !isNaN(Number(value.trim()))) {
        return `: ${value.trim()}${suffix}`;
      }
      return `: "${value.trim()}"${suffix}`;
    });
    
    return repaired;
  }

  private manualParseMarkets(content: string): MarketOpportunity[] {
    const markets: MarketOpportunity[] = [];
    
    // Enhanced regex patterns for more flexible parsing
    const marketPatterns = [
      /\{\s*"nom_marche"\s*:\s*"([^"]+)"\s*,\s*"justification"\s*:\s*"([^"]+)"\s*,\s*"produits_cgr_applicables"\s*:\s*\[([^\]]*)\]\s*,\s*"exemples_entreprises"\s*:\s*\[([^\]]*)\]\s*(?:,\s*"taille_entreprises_cibles"\s*:\s*"([^"]*)")?(?:\s*,\s*"volume_pieces_estime"\s*:\s*"([^"]*)")?\s*\}/g,
      /\{\s*"nom_marche"\s*:\s*"([^"]+)"[\s\S]*?"justification"\s*:\s*"([^"]+)"[\s\S]*?"produits_cgr_applicables"\s*:\s*\[([^\]]*)\][\s\S]*?"exemples_entreprises"\s*:\s*\[([^\]]*)\][\s\S]*?\}/g
    ];
    
    for (const pattern of marketPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null && markets.length < 5) {
        try {
          const [, nom_marche, justification, produits_str, entreprises_str, taille_entreprises, volume_pieces] = match;
          
          const produits_cgr_applicables = this.parseArrayString(produits_str);
          const exemples_entreprises = this.parseArrayString(entreprises_str);
          
          if (nom_marche && justification && produits_cgr_applicables.length > 0) {
            markets.push({
              nom_marche: nom_marche.trim(),
              justification: justification.trim(),
              produits_cgr_applicables,
              exemples_entreprises,
              taille_entreprises_cibles: taille_entreprises || 'Non spécifié',
              volume_pieces_estime: volume_pieces || 'Non spécifié'
            });
          }
        } catch (error) {
          console.error('❌ Erreur parsing manuel pour un marché:', error);
        }
      }
    }
    
    return markets;
  }

  private parseArrayString(arrayStr: string): string[] {
    if (!arrayStr || arrayStr.trim() === '') return [];
    
    return arrayStr
      .split(',')
      .map(item => item.trim().replace(/^["']|["']$/g, ''))
      .filter(item => item.length > 0 && item !== 'null' && item !== 'undefined');
  }

  private validateAndCleanMarkets(markets: any[]): MarketOpportunity[] {
    return markets
      .filter(market => {
        if (!market || typeof market !== 'object') return false;
        if (!market.nom_marche || typeof market.nom_marche !== 'string') return false;
        if (!market.justification || typeof market.justification !== 'string') return false;
        if (market.justification.length < 50) return false;
        
        return true;
      })
      .map(market => ({
        nom_marche: String(market.nom_marche).trim(),
        justification: String(market.justification).trim(),
        produits_cgr_applicables: Array.isArray(market.produits_cgr_applicables) 
          ? market.produits_cgr_applicables.filter((p: any) => p && typeof p === 'string').map((p: any) => String(p).trim())
          : [],
        exemples_entreprises: Array.isArray(market.exemples_entreprises) 
          ? market.exemples_entreprises.filter((e: any) => e && typeof e === 'string').map((e: any) => String(e).trim())
          : [],
        taille_entreprises_cibles: String(market.taille_entreprises_cibles || 'Non spécifié').trim(),
        volume_pieces_estime: String(market.volume_pieces_estime || 'Non spécifié').trim()
      }))
      .slice(0, 5);
  }
}