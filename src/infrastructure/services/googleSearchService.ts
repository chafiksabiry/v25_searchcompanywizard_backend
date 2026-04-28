import axios from 'axios';

export interface GoogleSearchResult {
  title: string;
  link: string;
  snippet: string;
  pagemap?: {
    metatags?: Array<{
      "og:description"?: string;
      "og:image"?: string;
    }>;
  };
}

interface GoogleSearchResponse {
  items?: GoogleSearchResult[];
}

export class GoogleSearchService {
  private readonly apiKey = process.env.GOOGLE_API_KEY;
  private readonly searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

  async search(query: string): Promise<GoogleSearchResult[]> {
    if (!this.apiKey || !this.searchEngineId) {
      console.warn('⚠️ Google Search API key or Search Engine ID is not configured');
      // On continue quand même pour ne pas bloquer le démarrage, 
      // mais les appels échoueront
    }

    try {
      const response = await axios.get<GoogleSearchResponse>(
        'https://www.googleapis.com/customsearch/v1',
        {
          params: {
            key: this.apiKey,
            cx: this.searchEngineId,
            q: query,
            num: 10,
          },
        }
      );

      return response.data.items || [];
    } catch (error: any) {
      console.error('❌ Google Search Error:', error.response?.data || error.message);
      throw new Error('Failed to fetch search results from Google');
    }
  }
}

export const googleSearchService = new GoogleSearchService();
