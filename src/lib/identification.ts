import axios from 'axios';

// --- INTERFACES (INCHANGÉES) ---
interface CompetitorIdentification {
  nom_entreprise: string;
  presence_geographique: string[];
  marches_cibles: string[];
  taille_entreprise: string;
  ca_estime?: string;
  effectifs_estime?: string;
  specialites_produits: string[];
  type_production: string[]; // petite série, moyenne série, grande série
  publications_recentes: PublicationRecente[];
  actualites_recentes: ActualiteRecente[];
  forces_concurrentielles: string[];
  positionnement_marche: string;
  site_web?: string;
  contact_info?: ContactInfo;
  sources: string[];
}

interface PublicationRecente {
  titre: string;
  date: string;
  source: string;
  lien?: string;
  type: 'communique' | 'article' | 'rapport' | 'innovation';
}

interface ActualiteRecente {
  titre: string;
  date: string;
  source: string;
  lien?: string;
  type: 'croissance' | 'partenariat' | 'innovation' | 'acquisition' | 'recrutement';
  impact_strategique: string;
}

interface ContactInfo {
  adresse?: string;
  telephone?: string;
  email?: string;
  dirigeants?: string[];
}

interface CompetitorSearchRequest {
  region_geographique: string[];
  produits: string[];
  type_serie: string[];
  secteurs_cibles?: string[];
  taille_min?: string;
  nombre_resultats?: number;
}

interface CompetitorIdentificationResult {
  competitors: CompetitorIdentification[];
  total_found: number;
  search_criteria: CompetitorSearchRequest;
  sources: string[];
  success: boolean;
  error?: string;
}


export class CompetitorIdentificationClient {
  private apiKey: string;
  private baseUrl = 'https://api.perplexity.ai';

  constructor() {
    this.apiKey = process.env.PERPLEXITY_API_KEY!;
    if (!this.apiKey) {
      throw new Error('PERPLEXITY_API_KEY manquante');
    }
  }

  async identifyCompetitors(searchRequest: CompetitorSearchRequest): Promise<CompetitorIdentificationResult> {
    const prompt = this.buildCompetitorIdentificationPrompt(searchRequest);
    
    try {
      console.log('🔍 Envoi de la requête à Perplexity API...');
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: 'sonar',
          messages: [
            { role: 'system', content: this.getSystemPrompt() },
            { role: 'user', content: prompt }
          ],
          max_tokens: 7000, // AMÉLIORÉ: Augmentation légère pour des réponses complètes
          temperature: 0.2 // AMÉLIORÉ: Température plus basse pour plus de précision factuelle
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ Réponse reçue de Perplexity API');
      return this.parseCompetitorIdentificationResponse(response.data, searchRequest);
    } catch (error: any) {
      console.error('❌ Erreur Perplexity API - Identification Concurrents:', error.response?.status, error.response?.data);
      return {
        competitors: [],
        total_found: 0,
        search_criteria: searchRequest,
        sources: [],
        success: false,
        error: error.message
      };
    }
  }

// AMÉLIORATION MAJEURE: Le prompt système est beaucoup plus directif et strict
private getSystemPrompt(): string {
  return `Vous êtes un analyste industriel expert, spécialisé dans l'identification de fabricants de composants mécaniques. Votre mission est de trouver des concurrents directs pour CGR International.

**RÈGLE D'OR ABSOLUE :**
VOUS DEVEZ IDENTIFIER UNIQUEMENT DES **FABRICANTS** (ENTREPRISES POSSÉDANT LEURS PROPRES USINES).
- **EXCLURE SYSTÉMATIQUEMENT** : Distributeurs, revendeurs, fournisseurs de matières premières, intégrateurs sans usine, bureaux d'études purs.
- **VÉRIFICATION OBLIGATOIRE** : Pour chaque entreprise, validez son statut de fabricant en cherchant des preuves sur son site web (ex: "nos usines", "sites de production", "manufacturing facilities", "notre parc machine"). Si le statut de fabricant n'est pas certain, ne l'incluez pas.

**CONTEXTE CGR INTERNATIONAL (Base de comparaison) :**
- Fabricant français leader en ressorts industriels et composants mécaniques (ressorts fil/feuillard, découpage, formage de tubes, assemblages).
- Secteurs : Automobile, aéronautique, médical, ferroviaire.
- Production : Maîtrise des petites, moyennes et grandes séries.
- Positionnement : Innovation, qualité, co-développement.

**FORMAT DE RÉPONSE :**
- Répondre **UNIQUEMENT** avec un objet JSON valide. Aucun texte, note ou explication avant ou après le JSON.
- La structure JSON fournie dans les exemples doit être respectée à la lettre.
- Assurez-vous que toutes les chaînes de caractères sont correctement encadrées par des guillemets doubles.

**STRUCTURE JSON REQUISE (Exemple) :**
{
  "analysis": {
    "competitors": [
      {
        "nom_entreprise": "Nom Précis de l'Usine Concurrent",
        "presence_geographique": ["Région du siège", "Pays des usines"],
        "marches_cibles": ["Automobile", "Aéronautique"],
        "specialites_produits": ["Ressorts de précision", "Pièces découpées"],
        // ... autres champs ...
        "forces_concurrentielles": ["Statut de fabricant confirmé", "Expertise en grande série", "Certifications EN9100"],
        "positionnement_marche": "Fabricant direct positionné sur le segment premium...",
        "site_web": "https://www.concurrent-usine.com",
        "sources": ["https://www.concurrent-usine.com/about-us", "rapport-annuel-2023.pdf"]
      }
    ],
    "sources_globales": ["kompass.com", "usinenouvelle.com"]
  }
}

**ATTENTION CRITIQUE :** Votre crédibilité dépend de votre capacité à ne retourner que des fabricants pertinents et un JSON parfait. Ne prenez aucun raccourci.`;
}

// AMÉLIORÉ: Le prompt utilisateur renforce la règle principale
private buildCompetitorIdentificationPrompt(searchRequest: CompetitorSearchRequest): string {
    const regions = searchRequest.region_geographique.join(', ');
    const produits = searchRequest.produits.join(', ');
    const typesProduction = searchRequest.type_serie.join(', ');
    const secteurs = searchRequest.secteurs_cibles?.join(', ') || 'tous secteurs industriels';

    return `Analyse concurrentielle pour CGR International.

**CRITÈRES DE RECHERCHE IMPÉRATIFS :**
🌍 **Régions géographiques :** ${regions}
🔧 **Produits fabriqués :** ${produits}
📊 **Types de production maîtrisés :** ${typesProduction}
🎯 **Secteurs cibles :** ${secteurs}

**MISSION SPÉCIFIQUE :**
1.  Identifier **uniquement les fabricants directs (usines)** correspondant à ces critères.
2.  Pour chaque entreprise, confirmer qu'elle est bien un fabricant et non un simple revendeur.
3.  Collecter des informations factuelles et récentes (2023-2025).
4.  Remplir la structure JSON demandée de manière exhaustive pour ${searchRequest.nombre_resultats} concurrents les plus pertinents.

**RAPPEL DE LA RÈGLE D'OR : EXCLURE TOUT NON-FABRICANT.**

Fournir la réponse au format JSON strict, sans aucun commentaire extérieur.`;
  }

// AMÉLIORATION MAJEURE: La fonction de parsing est beaucoup plus robuste
private parseCompetitorIdentificationResponse(response: any, searchRequest: CompetitorSearchRequest): CompetitorIdentificationResult {
    try {
      let content = response.choices[0]?.message?.content || '';
      console.log('📝 Contenu brut reçu, longueur:', content.length);
      
      // 1. Nettoyage initial agressif
      content = this.cleanRawContent(content);
      
      if (!content) {
        console.error('❌ Contenu vide après nettoyage.');
        return this.createFallbackResult(searchRequest, 'Réponse vide ou invalide de l\'API.');
      }

      let jsonData;
      try {
        // 2. Tentative de parsing direct
        jsonData = JSON.parse(content);
      } catch (parseError: any) {
        console.warn('⚠️ Erreur de parsing JSON initial. Tentative de réparation...');
        console.log('Erreur initiale:', parseError.message);
        
        // 3. Tentative de réparation
        const repairedJsonString = this.repairJsonString(content);
        try {
          jsonData = JSON.parse(repairedJsonString);
          console.log('✅ JSON réparé et parsé avec succès !');
        } catch (secondParseError: any) {
          console.error('❌ Échec final du parsing JSON après réparation.');
          console.error('Erreur finale:', secondParseError.message);
          console.log('JSON problématique (extrait):', content.substring(0, 1000));
          return this.createFallbackResult(searchRequest, `Erreur de format JSON non réparable: ${secondParseError.message}`);
        }
      }
      
      // 4. Validation de la structure des données
      if (!jsonData?.analysis?.competitors || !Array.isArray(jsonData.analysis.competitors)) {
        console.error('❌ Structure JSON invalide : `analysis.competitors` manquant ou n\'est pas un tableau.');
        return this.createFallbackResult(searchRequest, 'Structure JSON de la réponse invalide.');
      }

      const competitors = jsonData.analysis.competitors;
      console.log(`🎯 Concurrents identifiés dans le JSON: ${competitors.length}`);

      return {
        competitors: competitors, // Le modèle de données est déjà défini, pas besoin de remapper si la réponse est correcte
        total_found: competitors.length,
        search_criteria: searchRequest,
        sources: jsonData.analysis.sources_globales || [],
        success: true
      };
    } catch (error: any) {
      console.error('❌ Erreur critique dans `parseCompetitorIdentificationResponse`:', error);
      return this.createFallbackResult(searchRequest, `Erreur interne du parseur: ${error.message}`);
    }
  }

  private cleanRawContent(content: string): string {
    if (!content) return '';

    // Retirer les blocs de code markdown et les "json" qui peuvent être ajoutés par l'IA
    let cleaned = content.replace(/^```json\s*/, '').replace(/```\s*$/, '');
    
    // Trouver la première accolade et la dernière pour extraire l'objet JSON principal
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    
    if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
      return ''; // Pas de JSON valide trouvé
    }
    
    return cleaned.substring(firstBrace, lastBrace + 1).trim();
  }

  private repairJsonString(jsonString: string): string {
    let repaired = jsonString;

    // Règle 1: Supprimer les commentaires (non standard en JSON)
    repaired = repaired.replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, '$1');

    // Règle 2: Corriger les virgules en fin de tableau ou d'objet
    repaired = repaired.replace(/,\s*([\]}])/g, '$1');
    
    // Règle 3 (expérimentale) : Tenter de corriger des guillemets non échappés simples dans les valeurs
    // Attention: peut être risqué, mais utile pour des erreurs communes
    repaired = repaired.replace(/:\s*"(.*?)"(.*?)"/g, (match, p1, p2) => {
      if (p2.trim().startsWith(',')) {
        return `: "${p1}\\${p2}"`;
      }
      return match; // Ne rien changer si ce n'est pas un cas évident
    });
    
    return repaired;
  }
  
  private createFallbackResult(searchRequest: CompetitorSearchRequest, error: string): CompetitorIdentificationResult {
    return {
      competitors: [],
      total_found: 0,
      search_criteria: searchRequest,
      sources: [],
      success: false,
      error: error
    };
  }
}