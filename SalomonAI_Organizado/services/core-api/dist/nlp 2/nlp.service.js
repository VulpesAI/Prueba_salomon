"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var NlpService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NlpService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const natural = require("natural");
const stopword = require("stopword");
let NlpService = NlpService_1 = class NlpService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(NlpService_1.name);
        this.embeddingCache = new Map();
        this.maxCacheSize = 1000;
        this.financialStopwords = new Set([
            'pago', 'cobro', 'transferencia', 'debito', 'credito', 'cargo', 'abono',
            'compra', 'venta', 'deposito', 'retiro', 'saldo', 'cuenta', 'banco'
        ]);
        this.synonymMap = new Map([
            ['arriendo', ['alquiler', 'renta', 'canon']],
            ['supermercado', ['super', 'market', 'almacen']],
            ['gasolina', ['combustible', 'bencina', 'petroleo']],
            ['medico', ['doctor', 'clinica', 'hospital', 'consulta']],
            ['restaurant', ['restoran', 'comida', 'almuerzo', 'cena']],
        ]);
        this.tokenizer = new natural.AggressiveTokenizerEs();
        this.stemmer = natural.PorterStemmerEs;
        this.tfidf = new natural.TfIdf();
        this.analyzer = new natural.SentimentAnalyzer('Spanish', natural.PorterStemmerEs, 'afinn');
    }
    async onModuleInit() {
        await this.initializeModels();
        this.logger.log('🧠 NLP Service initialized with advanced Spanish processing');
    }
    async initializeModels() {
        try {
            await this.loadPretrainedData();
            this.logger.debug('Modelos de NLP inicializados correctamente');
        }
        catch (error) {
            this.logger.warn('Error cargando datos preentrenados:', error.message);
        }
    }
    async loadPretrainedData() {
        const commonPhrases = [
            'pago arriendo departamento',
            'compra supermercado',
            'carga combustible',
            'consulta medica',
            'almuerzo restaurant'
        ];
        commonPhrases.forEach(phrase => {
            this.tfidf.addDocument(this.preprocessText(phrase));
        });
    }
    preprocessText(text) {
        if (!text?.trim()) {
            throw new Error('El texto no puede estar vacío');
        }
        this.logger.debug(`Preprocesando texto: "${text}"`);
        try {
            let cleanText = text
                .toLowerCase()
                .trim()
                .replace(/\s+/g, ' ')
                .replace(/[^\w\sáéíóúñü]/g, ' ')
                .replace(/\d+/g, ' ')
                .trim();
            cleanText = this.expandSynonyms(cleanText);
            const tokens = this.tokenizer.tokenize(cleanText) || [];
            const filteredTokens = tokens
                .filter(token => token.length > 2)
                .filter(token => !this.financialStopwords.has(token))
                .filter(token => !stopword.spa.includes(token));
            const stemmedTokens = filteredTokens.map(token => this.stemmer.stem(token));
            const uniqueTokens = [...new Set(stemmedTokens)];
            this.logger.debug(`Tokens procesados: ${uniqueTokens.join(', ')}`);
            return uniqueTokens;
        }
        catch (error) {
            this.logger.error('Error en preprocesamiento:', error);
            throw new Error(`Error procesando texto: ${error.message}`);
        }
    }
    expandSynonyms(text) {
        let expandedText = text;
        this.synonymMap.forEach((synonyms, mainTerm) => {
            synonyms.forEach(synonym => {
                const regex = new RegExp(`\\b${synonym}\\b`, 'gi');
                expandedText = expandedText.replace(regex, mainTerm);
            });
        });
        return expandedText;
    }
    async generateEmbedding(text) {
        const startTime = Date.now();
        try {
            const cacheKey = text.toLowerCase().trim();
            if (this.embeddingCache.has(cacheKey)) {
                this.logger.debug('Embedding recuperado del cache');
                return this.embeddingCache.get(cacheKey);
            }
            this.logger.debug(`Generando embedding para: "${text}"`);
            const processedTokens = this.preprocessText(text);
            if (processedTokens.length === 0) {
                this.logger.warn('No se encontraron tokens válidos para el embedding');
                return new Array(384).fill(0);
            }
            const embedding = this.generateTfIdfVector(processedTokens);
            const normalizedEmbedding = this.normalizeVector(embedding);
            if (this.embeddingCache.size < this.maxCacheSize) {
                this.embeddingCache.set(cacheKey, normalizedEmbedding);
            }
            const duration = Date.now() - startTime;
            this.logger.debug(`Embedding generado en ${duration}ms, dimensiones: ${normalizedEmbedding.length}`);
            return normalizedEmbedding;
        }
        catch (error) {
            this.logger.error('Error generando embedding:', error);
            throw new Error(`Error generando embedding: ${error.message}`);
        }
    }
    generateTfIdfVector(tokens) {
        const textToAnalyze = tokens.join(' ');
        this.tfidf.addDocument(textToAnalyze);
        const docIndex = this.tfidf.documents.length - 1;
        const vector = [];
        const terms = new Set();
        this.tfidf.documents.forEach(doc => {
            Object.keys(doc).forEach(term => terms.add(term));
        });
        Array.from(terms).forEach(term => {
            const tfidfValue = this.tfidf.tfidf(term, docIndex);
            vector.push(tfidfValue || 0);
        });
        const targetDimension = 384;
        if (vector.length < targetDimension) {
            vector.push(...new Array(targetDimension - vector.length).fill(0));
        }
        else if (vector.length > targetDimension) {
            return vector.slice(0, targetDimension);
        }
        return vector;
    }
    normalizeVector(vector) {
        const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
        if (magnitude === 0) {
            return vector;
        }
        return vector.map(val => val / magnitude);
    }
    extractKeywords(text, limit = 5) {
        try {
            const processedTokens = this.preprocessText(text);
            if (processedTokens.length === 0) {
                return [];
            }
            const frequencies = new Map();
            processedTokens.forEach(token => {
                frequencies.set(token, (frequencies.get(token) || 0) + 1);
            });
            const textForAnalysis = processedTokens.join(' ');
            this.tfidf.addDocument(textForAnalysis);
            const docIndex = this.tfidf.documents.length - 1;
            const keywordScores = [];
            frequencies.forEach((freq, token) => {
                const tfidfScore = this.tfidf.tfidf(token, docIndex);
                const finalScore = tfidfScore * Math.log(freq + 1);
                keywordScores.push({ word: token, score: finalScore });
            });
            const keywords = keywordScores
                .sort((a, b) => b.score - a.score)
                .slice(0, limit)
                .map(item => item.word);
            this.logger.debug(`Palabras clave extraídas: ${keywords.join(', ')}`);
            return keywords;
        }
        catch (error) {
            this.logger.error('Error extrayendo palabras clave:', error);
            return [];
        }
    }
    calculateSimilarity(vector1, vector2) {
        if (vector1.length !== vector2.length) {
            throw new Error('Los vectores deben tener la misma dimensión');
        }
        const dotProduct = vector1.reduce((sum, val, i) => sum + val * vector2[i], 0);
        const magnitude1 = Math.sqrt(vector1.reduce((sum, val) => sum + val * val, 0));
        const magnitude2 = Math.sqrt(vector2.reduce((sum, val) => sum + val * val, 0));
        if (magnitude1 === 0 || magnitude2 === 0) {
            return 0;
        }
        return dotProduct / (magnitude1 * magnitude2);
    }
    analyzeSentiment(text) {
        try {
            const tokens = this.preprocessText(text);
            const score = this.analyzer.getSentiment(tokens);
            let sentiment;
            if (score > 0.1)
                sentiment = 'positive';
            else if (score < -0.1)
                sentiment = 'negative';
            else
                sentiment = 'neutral';
            return { score, sentiment };
        }
        catch (error) {
            this.logger.error('Error analizando sentimiento:', error);
            return { score: 0, sentiment: 'neutral' };
        }
    }
    clearCache() {
        this.embeddingCache.clear();
        this.logger.debug('Cache de embeddings limpiado');
    }
    getStats() {
        return {
            cacheSize: this.embeddingCache.size,
            maxCacheSize: this.maxCacheSize,
            documentsInCorpus: this.tfidf.documents.length,
        };
    }
};
exports.NlpService = NlpService;
exports.NlpService = NlpService = NlpService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], NlpService);
//# sourceMappingURL=nlp.service.js.map