export interface SearchRequest {
  product: string;
  location: string;
  referenceUrls?: string[];
  language?: string;
}

export interface Prospect {
  id: string;
  company: string;
  sector: string;
  size: string;
  contact?: {
    name: string;
    position: string;
    email?: string;
  };
  score: number;
  reason: string;
  sources: string[];
  createdAt: Date;
}

export interface SearchResponse {
  prospects: Prospect[];
  totalFound: number;
  searchId: string;
  cached: boolean;
  sources: string[];
}