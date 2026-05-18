"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleSearchService = exports.GoogleSearchService = void 0;
const axios_1 = __importDefault(require("axios"));
class GoogleSearchService {
    constructor() {
        this.apiKey = process.env.GOOGLE_API_KEY;
        this.searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
    }
    async search(query) {
        if (!this.apiKey || !this.searchEngineId) {
            console.warn('⚠️ Google Search API key or Search Engine ID is not configured');
            // On continue quand même pour ne pas bloquer le démarrage, 
            // mais les appels échoueront
        }
        try {
            const response = await axios_1.default.get('https://www.googleapis.com/customsearch/v1', {
                params: {
                    key: this.apiKey,
                    cx: this.searchEngineId,
                    q: query,
                    num: 10,
                },
            });
            return response.data.items || [];
        }
        catch (error) {
            console.error('❌ Google Search Error:', error.response?.data || error.message);
            throw new Error('Failed to fetch search results from Google');
        }
    }
}
exports.GoogleSearchService = GoogleSearchService;
exports.googleSearchService = new GoogleSearchService();
