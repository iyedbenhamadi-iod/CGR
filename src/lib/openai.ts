// lib/openai.ts - Enhanced with Perplexity Sonar for niche-focused brainstorming

import axios from 'axios';

interface MarketOpportunity {
  nom_marche: string;
  justification: string;
  produits_cgr_applicables: string[];
  exemples_entreprises: string[];
  taille_entreprises_cibles: string;
  volume_pieces_estime: string;
  sous_secteur_specifique?: string;
  niveau_pertinence?: 'haute' | 'moyenne' | 'exploratoire';
}

interface BrainstormingData {
  secteursActivite: string[];
  secteurActiviteLibre?: string;
  zoneGeographique: string[];
  produitsCGR: string[];
  clientsExclure: string;
  tailleEntreprise?: string;
  usinesCGR?: string[];
  motsCles?: string;
  nombreResultats?: number;
}

export class OpenAIBrainstormingClient {
  private apiKey: string;
  private baseUrl = 'https://api.perplexity.ai';

  constructor() {
    this.apiKey = process.env.PERPLEXITY_API_KEY!;
    if (!this.apiKey) {
      throw new Error('PERPLEXITY_API_KEY manquante');
    }
  }

  async generateMarketBrainstorming(data: BrainstormingData): Promise<any> {
    const prompt = this.buildBrainstormingPrompt(data);
    
    try {
      console.log('🔍 Envoi de la requête Perplexity Sonar...');
      console.log('📝 Secteur général:', data.secteursActivite);
      console.log('🎯 Niche spécifique:', data.secteurActiviteLibre || 'À découvrir');
      
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: 'sonar',  // Perplexity's Sonar model with real-time web search
          messages: [
            { role: 'system', content: this.getSystemPrompt() },
            { role: 'user', content: prompt }
          ],
          max_tokens: 4000,
          temperature: 0.4,
           reasoning_effort: 'high',
          return_citations: true, // Get sources from Perplexity
          search_recency_filter: 'month' // Focus on recent market trends
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 600000
        }
      );
      
      console.log('✅ Réponse Perplexity reçue');
      return this.parseBrainstormingResponse(response.data, data);
    } catch (error: any) {
      console.error('❌ Erreur Perplexity API:', {
        status: error.response?.status,
        message: error.message,
        data: error.response?.data
      });
      
      return {
        markets: [],
        total: 0,
        success: false,
        error: `Perplexity API Error: ${error.response?.status || 'Unknown'} - ${error.message}`
      };
    }
  }

  private getSystemPrompt(): string {
    return `Tu es un expert analyste stratégique pour CGR International, fabricant français de composants mécaniques de haute précision.

MISSION CRITIQUE: Identifier 5 opportunités de marché ULTRA-SPÉCIFIQUES et PERTINENTES basées sur:
1. Le secteur général fourni (ex: Automobile, Médical, Aéronautique)
2. La niche précise mentionnée (ex: "sièges automobiles", "dispositifs d'injection", "trains d'atterrissage")

⚠️ RÈGLE D'OR DE PERTINENCE:
- Si l'utilisateur a spécifié une NICHE (ex: "sièges automobiles"), concentre-toi EXCLUSIVEMENT sur cette niche
- Ne propose PAS d'opportunités dans d'autres sous-secteurs de l'industrie générale
- Exemple: Si "sièges automobiles" → propose des applications pour SIÈGES uniquement (mécanismes de réglage, systèmes de sécurité du siège, confort du siège)
- N'élargis PAS à d'autres parties automobiles (moteur, freins, portes, etc.)

Si AUCUNE niche n'est spécifiée, utilise tes recherches en temps réel pour:
- Identifier les SOUS-SECTEURS émergents et prometteurs
- Trouver des applications de niche avec forte croissance
- Proposer des marchés innovants et peu saturés

EXPERTISE CGR:
- Ressorts de précision (fil, plat, torsion)
- Pièces découpées haute précision
- Formage de tubes
- Assemblages automatisés
- Mécatronique
- Injection plastique

FORMAT JSON REQUIS:
{
  "markets": [
    {
      "nom_marche": "Nom très spécifique du marché de niche",
      "sous_secteur_specifique": "La niche exacte (ex: 'Mécanismes de réglage de sièges automobiles')",
      "justification": "Analyse détaillée 200+ mots: tendances marché récentes, besoins spécifiques, pourquoi CGR est pertinent, données chiffrées si disponibles",
      "produits_cgr_applicables": ["Liste des produits CGR applicables"],
      "exemples_entreprises": ["3-5 entreprises réelles dans cette niche exacte"],
      "taille_entreprises_cibles": "Taille appropriée",
      "volume_pieces_estime": "Estimation basée sur données récentes",
      "niveau_pertinence": "haute|moyenne|exploratoire"
    }
  ],
  "sources_perplexity": ["URLs des sources utilisées"],
  "analyse_tendances": "Résumé des tendances actuelles dans la niche"
}

VALIDATION DE PERTINENCE:
✅ Chaque marché doit rester dans la NICHE spécifiée
✅ Utilise des données et tendances RÉCENTES (2024-2025)
✅ Identifie des opportunités CONCRÈTES et ACTIONNABLES
✅ Privilégie les marchés en CROISSANCE avec MOINS de concurrence
✅ Cite des entreprises RÉELLES de la niche

❌ Ne propose PAS d'opportunités génériques
❌ N'élargis PAS au-delà de la niche spécifiée
❌ Évite les marchés saturés ou trop compétitifs`;
  }

  private buildBrainstormingPrompt(data: BrainstormingData): string {
    const excludeClients = [
      'Forvia', 'Valeo', 'Schneider Electric', 'Dassault Aviation', 'Thales', 'Safran',
      ...(data.clientsExclure ? data.clientsExclure.split('\n').filter(Boolean) : [])
    ];

    const secteurGeneral = data.secteursActivite[0] || 'Industriel';
    const nicheSpecifique = data.secteurActiviteLibre?.trim();
    const tailleEntreprise = data.tailleEntreprise || 'Toutes tailles';
    const produitsCGR = data.produitsCGR.length > 0 ? data.produitsCGR : ['Ressorts fil', 'Ressorts plats'];
    const zones = data.zoneGeographique.length > 0 ? data.zoneGeographique : ['France', 'Europe'];

    // Different prompt structure based on whether niche is specified
    if (nicheSpecifique) {
      return `🎯 RECHERCHE ULTRA-CIBLÉE - NICHE SPÉCIFIQUE

**CONTEXTE:**
- Secteur général: ${secteurGeneral}
- ⚠️ NICHE PRÉCISE À EXPLORER: "${nicheSpecifique}"
- Produits CGR disponibles: ${produitsCGR.join(', ')}
- Zones géographiques: ${zones.join(', ')}
- Taille d'entreprise cible: ${tailleEntreprise}

**MISSION CRITIQUE:**
Identifie des opportunités de marché EXCLUSIVEMENT dans la niche "${nicheSpecifique}".

⚠️ CONTRAINTE ABSOLUE: Reste dans la niche "${nicheSpecifique}" uniquement.
Ne propose PAS d'applications dans d'autres sous-secteurs de ${secteurGeneral}.

**ANALYSE REQUISE:**
1. Recherche les tendances RÉCENTES (2024-2025) dans "${nicheSpecifique}"
2. Identifie les besoins spécifiques non satisfaits
3. Trouve des entreprises RÉELLES actives dans "${nicheSpecifique}"
4. Évalue où les produits CGR (${produitsCGR.join(', ')}) peuvent apporter de la valeur
5. Propose des applications CONCRÈTES et INNOVANTES

**EXEMPLES DE PERTINENCE:**
✅ Bon: Pour "sièges automobiles" → Mécanismes de réglage lombaire, Systèmes anti-sous-marinage, Ressorts de confort d'assise
❌ Mauvais: Pour "sièges automobiles" → Systèmes de freinage, Injection plastique pour tableau de bord

**CLIENTS À ÉVITER:**
${excludeClients.join(', ')}

Utilise tes capacités de recherche en temps réel pour fournir des données actuelles et pertinentes.
Retourne uniquement le JSON demandé.`;
    } else {
      // Exploratory mode - let Perplexity suggest niches
      return `🔍 RECHERCHE EXPLORATOIRE - IDENTIFICATION DE NICHES

**CONTEXTE:**
- Secteur général: ${secteurGeneral}
- Produits CGR disponibles: ${produitsCGR.join(', ')}
- Zones géographiques: ${zones.join(', ')}
- Taille d'entreprise cible: ${tailleEntreprise}

**MISSION:**
L'utilisateur cherche des opportunités dans le secteur ${secteurGeneral} mais n'a pas spécifié de niche particulière.

Utilise tes capacités de recherche en temps réel pour:
1. Identifier des SOUS-SECTEURS/NICHES prometteuses dans ${secteurGeneral}
2. Privilégier les niches avec:
   - Forte croissance récente (2024-2025)
   - Innovations technologiques
   - Besoins en composants de précision
   - Moins de saturation concurrentielle
3. Proposer des applications spécifiques où les produits CGR (${produitsCGR.join(', ')}) sont pertinents

**CRITÈRES DE SÉLECTION:**
✅ Marchés émergents ou en transformation
✅ Besoins de composants haute précision
✅ Réglementations favorisant l'innovation
✅ Entreprises de taille ${tailleEntreprise}
✅ Présence dans ${zones.join(', ')}

**CLIENTS À ÉVITER:**
${excludeClients.join(', ')}

**OBJECTIF:**
Propose des niches PERTINENTES et ACTIONNABLES, pas des secteurs généraux.
Exemple: Plutôt que "Médical" → "Dispositifs d'injection automatique" ou "Pompes à perfusion portables"

Utilise des données récentes et cite tes sources.
Retourne uniquement le JSON demandé.`;
    }
  }

  private parseBrainstormingResponse(response: any, originalData: BrainstormingData): any {
    try {
      const content = response.choices[0]?.message?.content || '';
      const citations = response.citations || [];
      
      console.log('📄 Contenu reçu de Perplexity');
      
      let jsonStr = this.cleanJsonString(content);
      let parsed: any;
      
      try {
        parsed = JSON.parse(jsonStr);
        console.log('✅ Parsing JSON réussi');
      } catch (error) {
        console.log('⚠️ Tentative de réparation JSON...');
        jsonStr = this.repairJsonString(jsonStr);
        parsed = JSON.parse(jsonStr);
      }
      
      if (!parsed || !Array.isArray(parsed.markets)) {
        console.error('❌ Structure JSON invalide');
        return { markets: [], total: 0, success: false, error: 'Structure JSON invalide' };
      }

      const cleanedMarkets = this.validateAndCleanMarkets(parsed.markets, originalData);
      
      console.log(`✅ ${cleanedMarkets.length} marchés parsés avec succès`);
      
      return {
        markets: cleanedMarkets,
        total: cleanedMarkets.length,
        success: true,
        sources: citations,
        analyse_tendances: parsed.analyse_tendances || '',
        niche_specifiee: originalData.secteurActiviteLibre || null,
        mode_recherche: originalData.secteurActiviteLibre ? 'ciblé' : 'exploratoire'
      };
      
    } catch (error: any) {
      console.error('❌ Erreur parsing:', error.message);
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
    jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/\n?```$/g, '');
    jsonStr = jsonStr.replace(/```\n?/g, '');
    
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
    }
    
    return jsonStr;
  }

  private repairJsonString(jsonStr: string): string {
    let repaired = jsonStr;
    repaired = repaired.replace(/,(\s*[}\]])/g, '$1');
    repaired = repaired.replace(/}\s*{/g, '},{');
    repaired = repaired.replace(/]\s*\[/g, '],[');
    return repaired;
  }

  private normalizeForComparison(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD') // Decompose accented characters
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .trim();
  }

  private validateAndCleanMarkets(markets: any[], originalData: BrainstormingData): MarketOpportunity[] {
    return markets
      .filter(market => {
        // Only basic validation - market must exist and have required fields
        if (!market || typeof market !== 'object') return false;
        if (!market.nom_marche || !market.justification) return false;
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
        volume_pieces_estime: String(market.volume_pieces_estime || 'Non spécifié').trim(),
        sous_secteur_specifique: String(market.sous_secteur_specifique || market.nom_marche).trim(),
        niveau_pertinence: market.niveau_pertinence || 'moyenne'
      }))
      .slice(0, 10);
  }
}