"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleSearchService = exports.GoogleSearchService = void 0;
const axios_1 = __importDefault(require("axios"));
function localeParams(language) {
    if (language === 'fr') {
        return {
            hl: 'fr',
            gl: 'fr',
            lr: 'lang_fr',
            cr: 'countryFR',
        };
    }
    return {
        hl: 'en',
        gl: 'us',
        lr: 'lang_en',
    };
}
function rankForLanguage(items, language) {
    const score = (link) => {
        try {
            const url = new URL(link);
            const host = url.hostname.toLowerCase();
            const path = url.pathname.toLowerCase();
            if (language === 'fr') {
                if (host.endsWith('.fr') || host.startsWith('fr.') || host.includes('fr.wikipedia'))
                    return 3;
                if (path.includes('/fr/') || path.endsWith('/fr') || path.includes('/fr-fr'))
                    return 2;
            }
            else {
                if (host.includes('en.wikipedia') || path.includes('/en/'))
                    return 2;
            }
        }
        catch {
            /* ignore */
        }
        return 0;
    };
    return [...items].sort((a, b) => score(b.link) - score(a.link));
}
class GoogleSearchService {
    constructor() {
        this.apiKey = process.env.GOOGLE_API_KEY;
        this.searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
    }
    async search(query, language = 'fr') {
        if (!this.apiKey || !this.searchEngineId) {
            console.warn('⚠️ Google Search API key or Search Engine ID is not configured');
        }
        try {
            const response = await axios_1.default.get('https://www.googleapis.com/customsearch/v1', {
                params: {
                    key: this.apiKey,
                    cx: this.searchEngineId,
                    q: query,
                    num: 10,
                    ...localeParams(language),
                },
            });
            return rankForLanguage(response.data.items || [], language);
        }
        catch (error) {
            console.error('❌ Google Search Error:', error.response?.data || error.message);
            // If language restrict returns empty / hard-fails, retry without lr/cr once.
            if (language === 'fr') {
                try {
                    const fallback = await axios_1.default.get('https://www.googleapis.com/customsearch/v1', {
                        params: {
                            key: this.apiKey,
                            cx: this.searchEngineId,
                            q: query,
                            num: 10,
                            hl: 'fr',
                            gl: 'fr',
                        },
                    });
                    return rankForLanguage(fallback.data.items || [], language);
                }
                catch (err2) {
                    console.error('❌ Google Search fallback Error:', err2.response?.data || err2.message);
                }
            }
            throw new Error('Failed to fetch search results from Google');
        }
    }
}
exports.GoogleSearchService = GoogleSearchService;
exports.googleSearchService = new GoogleSearchService();
