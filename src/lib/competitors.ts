import axios from 'axios';

interface CompetitorAnalysis {
  synthese_entreprise: string;
  produits_services: string[];
  marches_cibles: string[];
  forces_apparentes: string[];
  faiblesses_potentielles: string[];
  strategie_communication: string;
  sources: string[];
}

export class CompetitorAnalysisClient {
  private apiKey: string;
  private baseUrl = 'https://api.perplexity.ai';

  constructor() {
    this.apiKey = process.env.PERPLEXITY_API_KEY!;
    if (!this.apiKey) {
      throw new Error('PERPLEXITY_API_KEY manquante');
    }
  }

  async analyzeCompetitor(competitorName: string): Promise<any> {
    const prompt = this.buildCompetitorAnalysisPrompt(competitorName);
    
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
          temperature: 0.3
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return this.parseCompetitorResponse(response.data);
    } catch (error: any) {
      console.error('❌ Erreur Perplexity API:', error.response?.status);
      throw error;
    }
  }

  private getSystemPrompt(): string {
    return `Expert analyste concurrentiel pour l'industrie mécanique et des composants industriels.

MISSION: Analyser en profondeur un concurrent de CGR International (fabricant de ressorts et composants mécaniques).

SOURCES À CONSULTER:
- Site web officiel
- Rapports annuels/financiers
- Actualités récentes
- Communiqués de presse
- Profils LinkedIn dirigeants
- Catalogues produits

ANALYSE OBLIGATOIRE:
- Positionnement concurrentiel
- Forces/faiblesses vs CGR
- Stratégie commerciale
- Opportunités de différenciation

RÉPONSE JSON OBLIGATOIRE:
{
  "analysis": {
    "synthese_entreprise": "Analyse détaillée 200+ mots",
    "produits_services": ["...", "..."],
    "marches_cibles": ["...", "..."],
    "forces_apparentes": ["...", "..."],
    "faiblesses_potentielles": ["...", "..."],
    "strategie_communication": "Analyse positionnement 150+ mots",
    "sources": ["url1", "url2", "..."]
  }
}`;
  }

  private buildCompetitorAnalysisPrompt(competitorName: string): string {
    return `Analyse concurrentielle approfondie de "${competitorName}", concurrent de CGR International.

**Contexte CGR International:**
- Fabricant français de ressorts industriels et composants mécaniques
- Spécialités: ressorts fil/plat, pièces découpées, formage tubes, assemblages
- Marchés: automobile, aéronautique, médical, industrie
- Positionnement: qualité, précision, innovation, co-développement

**Analyse requise pour ${competitorName}:**

1. **Profil entreprise**: Historique, taille, implantations, effectifs, CA
2. **Offre produits**: Gammes, spécialités, innovations récentes
3. **Positionnement marché**: Segments, clients types, géographie
4. **Stratégie commerciale**: Arguments de vente, différenciation
5. **Forces concurrentielles**: Atouts vs CGR
6. **Vulnérabilités**: Faiblesses exploitables par CGR
7. **Communication**: Messages clés, stratégie digitale

OBJECTIF: Identifier opportunités de positionnement concurrentiel pour CGR.

Sources à consulter obligatoirement: site web, actualités 2024, rapports si disponibles.`;
  }

  private parseCompetitorResponse(response: any): { analysis: CompetitorAnalysis | null, success: boolean, error?: string } {
    try {
      const content = response.choices[0]?.message?.content || '';
      
      const jsonMatch = content.match(/\{[\s\S]*"analysis"[\s\S]*\{[\s\S]*?\}[\s\S]*?\}/);
      if (!jsonMatch) {
        return { analysis: null, success: false, error: 'Format JSON non trouvé' };
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      if (!parsed || !parsed.analysis) {
        return { analysis: null, success: false, error: 'Structure invalide' };
      }

      const analysis = parsed.analysis;
      const cleanedAnalysis: CompetitorAnalysis = {
        synthese_entreprise: String(analysis.synthese_entreprise || '').trim(),
        produits_services: Array.isArray(analysis.produits_services) ? analysis.produits_services : [],
        marches_cibles: Array.isArray(analysis.marches_cibles) ? analysis.marches_cibles : [],
        forces_apparentes: Array.isArray(analysis.forces_apparentes) ? analysis.forces_apparentes : [],
        faiblesses_potentielles: Array.isArray(analysis.faiblesses_potentielles) ? analysis.faiblesses_potentielles : [],
        strategie_communication: String(analysis.strategie_communication || '').trim(),
        sources: Array.isArray(analysis.sources) ? analysis.sources.filter(Boolean) : []
      };

      return {
        analysis: cleanedAnalysis,
        success: true
      };
    } catch (error: any) {
      return { analysis: null, success: false, error: `Erreur parsing: ${error.message}` };
    }
  }
}