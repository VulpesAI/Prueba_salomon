import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as natural from 'natural';
import * as stopword from 'stopword';

/**
 * Servicio avanzado de NLP para procesamiento de texto en español
 * Implementa las mejores prácticas de la industria para análisis de transacciones financieras
 * @version 3.0
 */
@Injectable()
export class NlpService implements OnModuleInit {
  private readonly logger = new Logger(NlpService.name);
  
  // Configuraciones optimizadas para español financiero
  private readonly tokenizer: natural.AggressiveTokenizerEs;
  private readonly stemmer: typeof natural.PorterStemmerEs;
  private readonly tfidf: natural.TfIdf;
  private readonly analyzer: natural.SentimentAnalyzer;
  
  // Cache para embeddings frecuentes
  private readonly embeddingCache = new Map<string, number[]>();
  private readonly maxCacheSize = 1000;
  
  // Palabras específicas del dominio financiero
  private readonly financialStopwords = new Set([
    'pago', 'cobro', 'transferencia', 'debito', 'credito', 'cargo', 'abono',
    'compra', 'venta', 'deposito', 'retiro', 'saldo', 'cuenta', 'banco'
  ]);

  // Sinónimos y variaciones comunes
  private readonly synonymMap = new Map([
    ['arriendo', ['alquiler', 'renta', 'canon']],
    ['supermercado', ['super', 'market', 'almacen']],
    ['gasolina', ['combustible', 'bencina', 'petroleo']],
    ['medico', ['doctor', 'clinica', 'hospital', 'consulta']],
    ['restaurant', ['restoran', 'comida', 'almuerzo', 'cena']],
  ]);

  constructor(private readonly configService: ConfigService) {
    this.tokenizer = new natural.AggressiveTokenizerEs();
    this.stemmer = natural.PorterStemmerEs;
    this.tfidf = new natural.TfIdf();
    this.analyzer = new natural.SentimentAnalyzer('Spanish', 
      natural.PorterStemmerEs, 'afinn');
  }

  async onModuleInit(): Promise<void> {
    await this.initializeModels();
    this.logger.log('🧠 NLP Service initialized with advanced Spanish processing');
  }

  /**
   * Inicializa los modelos de NLP y carga datos preentrenados
   */
  private async initializeModels(): Promise<void> {
    try {
      // Pre-cargar documentos de entrenamiento si existen
      await this.loadPretrainedData();
      this.logger.debug('Modelos de NLP inicializados correctamente');
    } catch (error) {
      this.logger.warn('Error cargando datos preentrenados:', error.message);
    }
  }

  /**
   * Carga datos de entrenamiento previos
   */
  private async loadPretrainedData(): Promise<void> {
    // Aquí se pueden cargar datos de entrenamiento desde una base de datos
    // o archivos de configuración
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

  /**
   * Preprocesamiento avanzado de texto financiero
   */
  private preprocessText(text: string): string[] {
    if (!text?.trim()) {
      throw new Error('El texto no puede estar vacío');
    }

    this.logger.debug(`Preprocesando texto: "${text}"`);

    try {
      // 1. Normalización básica
      let cleanText = text
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ') // Normalizar espacios
        .replace(/[^\w\sáéíóúñü]/g, ' ') // Remover puntuación, mantener acentos
        .replace(/\d+/g, ' ') // Remover números
        .trim();

      // 2. Expansión de sinónimos
      cleanText = this.expandSynonyms(cleanText);

      // 3. Tokenización
      const tokens = this.tokenizer.tokenize(cleanText) || [];

      // 4. Filtrado de tokens
      const filteredTokens = tokens
        .filter(token => token.length > 2) // Mínimo 3 caracteres
        .filter(token => !this.financialStopwords.has(token))
        .filter(token => !stopword.spa.includes(token));

      // 5. Stemming
      const stemmedTokens = filteredTokens.map(token => 
        this.stemmer.stem(token)
      );

      // 6. Deduplicación manteniendo orden
      const uniqueTokens = [...new Set(stemmedTokens)];

      this.logger.debug(`Tokens procesados: ${uniqueTokens.join(', ')}`);
      return uniqueTokens;

    } catch (error) {
      this.logger.error('Error en preprocesamiento:', error);
      throw new Error(`Error procesando texto: ${error.message}`);
    }
  }

  /**
   * Expande sinónimos para mejorar la cobertura
   */
  private expandSynonyms(text: string): string {
    let expandedText = text;
    
    this.synonymMap.forEach((synonyms, mainTerm) => {
      synonyms.forEach(synonym => {
        const regex = new RegExp(`\\b${synonym}\\b`, 'gi');
        expandedText = expandedText.replace(regex, mainTerm);
      });
    });

    return expandedText;
  }

  /**
   * Genera embeddings usando TF-IDF optimizado
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const startTime = Date.now();
    
    try {
      // Verificar cache
      const cacheKey = text.toLowerCase().trim();
      if (this.embeddingCache.has(cacheKey)) {
        this.logger.debug('Embedding recuperado del cache');
        return this.embeddingCache.get(cacheKey)!;
      }

      this.logger.debug(`Generando embedding para: "${text}"`);

      // Preprocesar el texto
      const processedTokens = this.preprocessText(text);
      
      if (processedTokens.length === 0) {
        this.logger.warn('No se encontraron tokens válidos para el embedding');
        return new Array(384).fill(0); // Vector vacío de dimensión estándar
      }

      // Generar embedding usando TF-IDF
      const embedding = this.generateTfIdfVector(processedTokens);
      
      // Normalizar el vector
      const normalizedEmbedding = this.normalizeVector(embedding);

      // Guardar en cache si no está lleno
      if (this.embeddingCache.size < this.maxCacheSize) {
        this.embeddingCache.set(cacheKey, normalizedEmbedding);
      }

      const duration = Date.now() - startTime;
      this.logger.debug(`Embedding generado en ${duration}ms, dimensiones: ${normalizedEmbedding.length}`);

      return normalizedEmbedding;

    } catch (error) {
      this.logger.error('Error generando embedding:', error);
      throw new Error(`Error generando embedding: ${error.message}`);
    }
  }

  /**
   * Genera vector TF-IDF para los tokens procesados
   */
  private generateTfIdfVector(tokens: string[]): number[] {
    const textToAnalyze = tokens.join(' ');
    this.tfidf.addDocument(textToAnalyze);
    
    const docIndex = this.tfidf.documents.length - 1;
    const vector: number[] = [];
    
    // Obtener términos únicos del corpus
    const terms = new Set<string>();
    this.tfidf.documents.forEach(doc => {
      Object.keys(doc).forEach(term => terms.add(term));
    });

    // Calcular TF-IDF para cada término
    Array.from(terms).forEach(term => {
      const tfidfValue = this.tfidf.tfidf(term, docIndex);
      vector.push(tfidfValue || 0);
    });

    // Asegurar dimensión fija (384 para compatibilidad)
    const targetDimension = 384;
    if (vector.length < targetDimension) {
      vector.push(...new Array(targetDimension - vector.length).fill(0));
    } else if (vector.length > targetDimension) {
      return vector.slice(0, targetDimension);
    }

    return vector;
  }

  /**
   * Normaliza un vector usando norma L2
   */
  private normalizeVector(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    
    if (magnitude === 0) {
      return vector; // Vector cero, no se puede normalizar
    }

    return vector.map(val => val / magnitude);
  }

  /**
   * Extrae palabras clave usando TF-IDF y análisis de frecuencia
   */
  extractKeywords(text: string, limit: number = 5): string[] {
    try {
      const processedTokens = this.preprocessText(text);
      
      if (processedTokens.length === 0) {
        return [];
      }

      // Calcular frecuencias
      const frequencies = new Map<string, number>();
      processedTokens.forEach(token => {
        frequencies.set(token, (frequencies.get(token) || 0) + 1);
      });

      // Calcular scores TF-IDF
      const textForAnalysis = processedTokens.join(' ');
      this.tfidf.addDocument(textForAnalysis);
      const docIndex = this.tfidf.documents.length - 1;

      const keywordScores: Array<{ word: string; score: number }> = [];
      
      frequencies.forEach((freq, token) => {
        const tfidfScore = this.tfidf.tfidf(token, docIndex);
        const finalScore = tfidfScore * Math.log(freq + 1); // Boost por frecuencia
        
        keywordScores.push({ word: token, score: finalScore });
      });

      // Ordenar por score y retornar top N
      const keywords = keywordScores
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(item => item.word);

      this.logger.debug(`Palabras clave extraídas: ${keywords.join(', ')}`);
      return keywords;

    } catch (error) {
      this.logger.error('Error extrayendo palabras clave:', error);
      return [];
    }
  }

  /**
   * Calcula similitud coseno entre dos vectores
   */
  calculateSimilarity(vector1: number[], vector2: number[]): number {
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

  /**
   * Analiza el sentimiento del texto (positivo/negativo/neutro)
   */
  analyzeSentiment(text: string): { score: number; sentiment: 'positive' | 'negative' | 'neutral' } {
    try {
      const tokens = this.preprocessText(text);
      const score = this.analyzer.getSentiment(tokens);
      
      let sentiment: 'positive' | 'negative' | 'neutral';
      if (score > 0.1) sentiment = 'positive';
      else if (score < -0.1) sentiment = 'negative';
      else sentiment = 'neutral';

      return { score, sentiment };

    } catch (error) {
      this.logger.error('Error analizando sentimiento:', error);
      return { score: 0, sentiment: 'neutral' };
    }
  }

  /**
   * Limpia el cache de embeddings
   */
  clearCache(): void {
    this.embeddingCache.clear();
    this.logger.debug('Cache de embeddings limpiado');
  }

  /**
   * Obtiene estadísticas del servicio
   */
  getStats(): {
    cacheSize: number;
    maxCacheSize: number;
    documentsInCorpus: number;
  } {
    return {
      cacheSize: this.embeddingCache.size,
      maxCacheSize: this.maxCacheSize,
      documentsInCorpus: this.tfidf.documents.length,
    };
  }
}