import { Pool } from 'pg';

export interface SearchHistory {
  id: string;
  product: string;
  location: string;
  reference_urls?: string[];
  results_count: number;
  search_query: string;
  created_at: Date;
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Assure-toi d’avoir cette variable dans ton .env
  ssl: {
    rejectUnauthorized: false, // utile sur Vercel ou Railway
  },
});

// Initialiser les tables
export async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS search_history (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        product VARCHAR(255) NOT NULL,
        location VARCHAR(255) NOT NULL,
        reference_urls TEXT[],
        results_count INTEGER DEFAULT 0,
        search_query TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS prospects (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        search_id UUID REFERENCES search_history(id),
        company VARCHAR(255) NOT NULL,
        sector VARCHAR(255),
        size_info VARCHAR(255),
        contact_name VARCHAR(255),
        contact_position VARCHAR(255),
        contact_email VARCHAR(255),
        score DECIMAL(3,1),
        reason TEXT,
        sources TEXT[],
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('Base de données initialisée avec succès');
  } catch (error) {
    console.error('Erreur initialisation DB:', error);
    throw error;
  }
}

// Sauvegarder une recherche
export async function saveSearchHistory(
  product: string,
  location: string,
  referenceUrls: string[],
  resultsCount: number,
  searchQuery: string
): Promise<string> {
  try {
    const result = await pool.query(
      `
      INSERT INTO search_history (
        product, location, reference_urls, results_count, search_query
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
      `,
      [product, location, referenceUrls, resultsCount, searchQuery]
    );
    return result.rows[0].id;
  } catch (error) {
    console.error('Erreur sauvegarde historique:', error);
    throw error;
  }
}

// Sauvegarder les prospects
export async function saveProspects(searchId: string, prospects: any[]) {
  try {
    for (const prospect of prospects) {
      await pool.query(
        `
        INSERT INTO prospects (
          search_id, company, sector, size_info, contact_name,
          contact_position, contact_email, score, reason, sources
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `,
        [
          searchId,
          prospect.company,
          prospect.sector,
          prospect.size,
          prospect.contact?.name || null,
          prospect.contact?.position || null,
          prospect.contact?.email || null,
          prospect.score,
          prospect.reason,
          prospect.sources || [],
        ]
      );
    }
  } catch (error) {
    console.error('Erreur sauvegarde prospects:', error);
    throw error;
  }
}

// Récupérer l'historique
export async function getSearchHistory(limit: number = 10): Promise<SearchHistory[]> {
  try {
    const result = await pool.query(
      `SELECT * FROM search_history ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    return result.rows as SearchHistory[];
  } catch (error) {
    console.error('Erreur récupération historique:', error);
    return [];
  }
}
