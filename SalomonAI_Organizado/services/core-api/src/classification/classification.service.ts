import { randomUUID } from 'crypto';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Repository } from 'typeorm';
import { 
  ClassifyTransactionDto, 
  TrainTransactionDto, 
  CorrectClassificationDto,
  ClassificationResultDto 
} from './dto/transaction.dto';
import { NlpService } from '../nlp/nlp.service';
import { QDRANT_SERVICE, QdrantVectorService } from '../qdrant/qdrant.tokens';
import { KAFKA_SERVICE, KafkaProducerService } from '../kafka/kafka.tokens';
import { TransactionCategory } from '../transactions/enums/transaction-category.enum';
import { TransactionClassification } from '../nlp/interfaces/transaction-classification.interface';
import { ClassificationLabel, ClassificationLabelSource, ClassificationLabelStatus } from './entities/classification-label.entity';
import { FinancialMovement } from '../financial-movements/entities/financial-movement.entity';

/**
 * Servicio avanzado de clasificación de transacciones con IA
 * Implementa mejores prácticas de MLOps y procesamiento en tiempo real
 * @version 3.0
 */
@Injectable()
export class ClassificationService implements OnModuleInit {
  private readonly logger = new Logger(ClassificationService.name);
  
  // Configuraciones del modelo
  private readonly COLLECTION_NAME = 'financial_transactions_v3';
  private readonly SIMILARITY_THRESHOLD = 0.75;
  private readonly MIN_CONFIDENCE_THRESHOLD = 0.3;
  private readonly BATCH_SIZE = 100;
  private readonly MODEL_VERSION = '3.0';
  private readonly targetAccuracy: number;
  private readonly minLabelsForRetraining: number;
  private readonly retrainingTopic: string;
  private readonly correctionTopic: string;

  // Métricas y monitoreo
  private totalClassifications = 0;
  private correctPredictions = 0;
  private readonly classificationHistory: Array<{
    timestamp: Date;
    input: string;
    predicted: TransactionCategory;
    confidence: number;
    actual?: TransactionCategory;
  }> = [];

  // Cache para clasificaciones frecuentes
  private readonly classificationCache = new Map<string, ClassificationResultDto>();
  private readonly maxCacheSize = 500;

  // Modelo de fallback para categorías comunes
  private readonly fallbackRules = new Map<RegExp, TransactionCategory>([
    [/arriendo|alquiler|rent/i, TransactionCategory.VIVIENDA],
    [/supermercado|market|almac[eé]n/i, TransactionCategory.ALIMENTACION],
    [/gasolina|combustible|bencina/i, TransactionCategory.TRANSPORTE],
    [/m[eé]dico|doctor|hospital|cl[ií]nica/i, TransactionCategory.SALUD],
    [/restaurant|comida|almuerzo|cena/i, TransactionCategory.ALIMENTACION],
    [/luz|agua|gas|internet|tel[eé]fono/i, TransactionCategory.SERVICIOS],
    [/ropa|vestuario|zapatos/i, TransactionCategory.VESTUARIO],
    [/cine|teatro|entretenimiento/i, TransactionCategory.ENTRETENIMIENTO],
  ]);

  constructor(
    private readonly nlpService: NlpService,
    @Inject(QDRANT_SERVICE)
    private readonly qdrantService: QdrantVectorService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(KAFKA_SERVICE)
    private readonly kafkaService: KafkaProducerService,
    private readonly configService: ConfigService,
    @InjectRepository(ClassificationLabel)
    private readonly labelRepository: Repository<ClassificationLabel>,
    @InjectRepository(FinancialMovement)
    private readonly movementRepository: Repository<FinancialMovement>,
  ) {
    this.retrainingTopic = this.configService.get<string>('KAFKA_CLASSIFICATION_RETRAIN_TOPIC', 'classification.retraining');
    this.correctionTopic = this.configService.get<string>('KAFKA_CLASSIFICATION_CORRECTIONS_TOPIC', 'classification.corrections');
    this.targetAccuracy = this.getNumberConfig('CLASSIFICATION_TARGET_ACCURACY', 0.9);
    this.minLabelsForRetraining = Math.max(1, Math.floor(this.getNumberConfig('CLASSIFICATION_RETRAIN_MIN_LABELS', 10)));
  }

  private getNumberConfig(key: string, fallback: number): number {
    const rawValue = this.configService.get<string>(key);
    const parsed = rawValue !== undefined ? Number(rawValue) : Number.NaN;
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  async onModuleInit(): Promise<void> {
    await this.initializeModel();
    this.logger.log('🎯 Classification Service initialized with advanced ML capabilities');
  }

  /**
   * Inicializa el modelo de clasificación
   */
  private async initializeModel(): Promise<void> {
    try {
      // Crear colección con configuración optimizada
      await this.qdrantService.createCollection(this.COLLECTION_NAME, {
        size: 384,
        distance: 'Cosine'
      });

      // Cargar datos de entrenamiento inicial si la colección está vacía
      await this.loadInitialTrainingData();
      
      this.logger.log('Modelo de clasificación inicializado correctamente');
    } catch (error) {
      this.logger.error('Error inicializando modelo:', error);
      throw error;
    }
  }

  /**
   * Carga datos de entrenamiento inicial
   */
  private async loadInitialTrainingData(): Promise<void> {
    const initialData: TrainTransactionDto[] = [
      // Vivienda
      { text: 'Pago arriendo departamento Las Condes', category: TransactionCategory.VIVIENDA },
      { text: 'Alquiler casa Providencia mes marzo', category: TransactionCategory.VIVIENDA },
      { text: 'Gastos comunes edificio condominio', category: TransactionCategory.VIVIENDA },
      
      // Alimentación
      { text: 'Compra supermercado Líder semanal', category: TransactionCategory.ALIMENTACION },
      { text: 'Almuerzo restaurant italiano centro', category: TransactionCategory.ALIMENTACION },
      { text: 'Delivery comida china pedidos ya', category: TransactionCategory.ALIMENTACION },
      
      // Transporte
      { text: 'Carga combustible estación Shell', category: TransactionCategory.TRANSPORTE },
      { text: 'Viaje Uber trabajo aeropuerto', category: TransactionCategory.TRANSPORTE },
      { text: 'Recarga tarjeta BIP metro', category: TransactionCategory.TRANSPORTE },
      
      // Salud
      { text: 'Consulta médico particular', category: TransactionCategory.SALUD },
      { text: 'Compra medicamentos farmacia', category: TransactionCategory.SALUD },
      { text: 'Examen laboratorio clínico', category: TransactionCategory.SALUD },
      
      // Servicios
      { text: 'Cuenta luz eléctrica mensual', category: TransactionCategory.SERVICIOS },
      { text: 'Plan internet fibra óptica', category: TransactionCategory.SERVICIOS },
      { text: 'Servicio agua potable', category: TransactionCategory.SERVICIOS },
    ];

    for (const data of initialData) {
      await this.trainModel(data);
    }

    this.logger.debug(`Cargados ${initialData.length} ejemplos de entrenamiento inicial`);
  }

  /**
   * Clasifica una transacción con IA avanzada
   */
  async classifyTransaction(dto: ClassifyTransactionDto): Promise<ClassificationResultDto> {
    const startTime = Date.now();
    
    try {
      // Verificar cache
      const cacheKey = this.generateCacheKey(dto);
      if (this.classificationCache.has(cacheKey)) {
        this.logger.debug('Clasificación recuperada del cache');
        return this.classificationCache.get(cacheKey)!;
      }

      this.logger.debug(`🔍 Clasificando: "${dto.description}"`);

      // 1. Generar embedding
      const embedding = await this.nlpService.generateEmbedding(dto.description);
      
      // 2. Buscar vectores similares
      const similarPoints = await this.qdrantService.search(
        this.COLLECTION_NAME,
        embedding,
        10, // Buscar más candidatos para mejor precisión
        this.SIMILARITY_THRESHOLD
      );

      // 3. Extraer palabras clave y metadata
      const keywords = this.nlpService.extractKeywords(dto.description, 8);
      const sentiment = this.nlpService.analyzeSentiment(dto.description);

      // 4. Determinar clasificación principal
      let classification: TransactionClassification;
      let alternatives: Array<{ category: TransactionCategory; confidence: number }> = [];

      if (similarPoints.length > 0) {
        // Clasificación basada en ML
        const mlResult = this.determineMLClassification(similarPoints, dto.amount);
        classification = mlResult.primary;
        alternatives = mlResult.alternatives;
      } else {
        // Fallback a reglas heurísticas
        classification = this.determineFallbackClassification(dto.description, keywords);
      }

      // 5. Validar confianza mínima
      if (classification.confidence < this.MIN_CONFIDENCE_THRESHOLD) {
        classification.category = TransactionCategory.NO_CLASIFICADO;
        classification.confidence = 0;
      }

      // 6. Construir respuesta completa
      const result: ClassificationResultDto = {
        category: classification.category,
        confidence: classification.confidence,
        keywords,
        alternatives: alternatives.slice(0, 3), // Top 3 alternativas
        metadata: {
          processingTime: Date.now() - startTime,
          modelVersion: this.MODEL_VERSION,
          tokensProcessed: keywords.length,
          similarDocuments: similarPoints.length,
          sentiment: sentiment.sentiment,
          sentimentScore: sentiment.score,
          usedFallback: similarPoints.length === 0,
          amount: dto.amount,
        }
      };

      // 7. Guardar en cache y métricas
      this.saveToCache(cacheKey, result);
      this.recordClassification(dto.description, classification.category, classification.confidence);
      
      // 8. Emitir evento para monitoreo
      this.eventEmitter.emit('classification.completed', {
        input: dto.description,
        result: classification,
        processingTime: Date.now() - startTime,
      });

      this.logger.debug(
        `✅ Clasificado como ${classification.category} (${(classification.confidence * 100).toFixed(1)}%) en ${Date.now() - startTime}ms`
      );

      return result;

    } catch (error) {
      this.logger.error('Error en clasificación:', error);
      
      // Clasificación de emergencia
      const fallback = this.determineFallbackClassification(dto.description, []);
      return {
        category: fallback.category,
        confidence: 0.1,
        keywords: [],
        metadata: {
          processingTime: Date.now() - startTime,
          modelVersion: this.MODEL_VERSION,
          error: error.message,
          usedEmergencyFallback: true,
        }
      };
    }
  }

  /**
   * Determina clasificación usando ML con vectores similares
   */
  private determineMLClassification(
    similarPoints: Array<{ payload: any; score: number }>,
    amount?: number
  ): {
    primary: TransactionClassification;
    alternatives: Array<{ category: TransactionCategory; confidence: number }>;
  } {
    // Agrupar por categoría y calcular scores
    const categoryScores = new Map<TransactionCategory, number[]>();
    
    similarPoints.forEach(point => {
      const category = point.payload.category as TransactionCategory;
      if (!categoryScores.has(category)) {
        categoryScores.set(category, []);
      }
      categoryScores.get(category)!.push(point.score);
    });

    // Calcular confianza ponderada por categoría
    const categoryConfidences: Array<{ category: TransactionCategory; confidence: number }> = [];
    
    categoryScores.forEach((scores, category) => {
      // Calcular media ponderada (más peso a scores altos)
      const weightedSum = scores.reduce((sum, score, index) => {
        const weight = Math.pow(0.8, index); // Peso decreciente
        return sum + (score * weight);
      }, 0);
      
      const totalWeight = scores.reduce((sum, _, index) => sum + Math.pow(0.8, index), 0);
      const avgConfidence = weightedSum / totalWeight;
      
      // Boost por frecuencia de aparición
      const frequencyBoost = Math.min(scores.length / similarPoints.length, 0.2);
      const finalConfidence = Math.min(avgConfidence + frequencyBoost, 1.0);
      
      categoryConfidences.push({ category, confidence: finalConfidence });
    });

    // Ordenar por confianza
    categoryConfidences.sort((a, b) => b.confidence - a.confidence);

    // Aplicar lógica adicional basada en monto si está disponible
    if (amount && categoryConfidences.length > 0) {
      this.applyAmountBasedAdjustments(categoryConfidences, amount);
    }

    const primary: TransactionClassification = {
      category: categoryConfidences[0].category,
      confidence: categoryConfidences[0].confidence,
      keywords: [], // Se llena en el método principal
    };

    const alternatives = categoryConfidences.slice(1, 4); // Top 3 alternativas

    return { primary, alternatives };
  }

  /**
   * Aplica ajustes basados en el monto de la transacción
   */
  private applyAmountBasedAdjustments(
    categoryConfidences: Array<{ category: TransactionCategory; confidence: number }>,
    amount: number
  ): void {
    // Lógica heurística basada en montos típicos
    const amountAdjustments = new Map<TransactionCategory, number>([
      [TransactionCategory.VIVIENDA, amount > 200000 ? 0.1 : -0.05],
      [TransactionCategory.TRANSPORTE, amount < 50000 ? 0.05 : -0.03],
      [TransactionCategory.ALIMENTACION, amount < 100000 ? 0.05 : -0.02],
      [TransactionCategory.SALUD, amount > 50000 ? 0.05 : 0],
      [TransactionCategory.ENTRETENIMIENTO, amount < 150000 ? 0.05 : 0],
    ]);

    categoryConfidences.forEach(item => {
      const adjustment = amountAdjustments.get(item.category) || 0;
      item.confidence = Math.min(Math.max(item.confidence + adjustment, 0), 1);
    });

    // Re-ordenar después de ajustes
    categoryConfidences.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Clasificación de fallback usando reglas heurísticas
   */
  private determineFallbackClassification(
    description: string,
    keywords: string[]
  ): TransactionClassification {
    // Intentar con reglas pre-definidas
    for (const [pattern, category] of this.fallbackRules) {
      if (pattern.test(description)) {
        return {
          category,
          confidence: 0.6, // Confianza media para reglas
          keywords,
        };
      }
    }

    // Último recurso: análisis por palabras clave
    const keywordCategories = new Map<TransactionCategory, number>([
      [TransactionCategory.ALIMENTACION, 0],
      [TransactionCategory.TRANSPORTE, 0],
      [TransactionCategory.VIVIENDA, 0],
      [TransactionCategory.SALUD, 0],
      [TransactionCategory.SERVICIOS, 0],
    ]);

    const categoryKeywords = {
      [TransactionCategory.ALIMENTACION]: ['comer', 'food', 'restaur', 'super'],
      [TransactionCategory.TRANSPORTE]: ['viaj', 'transport', 'combust', 'uber'],
      [TransactionCategory.VIVIENDA]: ['casa', 'depart', 'arrend', 'alquil'],
      [TransactionCategory.SALUD]: ['medic', 'doctor', 'farmac', 'hospital'],
      [TransactionCategory.SERVICIOS]: ['servic', 'cuenta', 'internet', 'telefon'],
    };

    Object.entries(categoryKeywords).forEach(([category, catKeywords]) => {
      const matches = keywords.filter(kw => 
        catKeywords.some(ck => kw.includes(ck) || ck.includes(kw))
      ).length;
      
      keywordCategories.set(category as TransactionCategory, matches);
    });

    const bestMatch = Array.from(keywordCategories.entries())
      .sort(([,a], [,b]) => b - a)[0];

    if (bestMatch[1] > 0) {
      return {
        category: bestMatch[0],
        confidence: Math.min(bestMatch[1] * 0.2, 0.5),
        keywords,
      };
    }

    // Completamente desconocido
    return {
      category: TransactionCategory.NO_CLASIFICADO,
      confidence: 0,
      keywords,
    };
  }

  /**
   * Entrena el modelo con nuevos datos
   */
  async trainModel(dto: TrainTransactionDto): Promise<void> {
    try {
      const embedding = await this.nlpService.generateEmbedding(dto.text);
      
      const pointData = {
        text: dto.text,
        category: dto.category,
        amount: dto.amount,
        confidence: dto.confidence || 1.0,
        timestamp: new Date().toISOString(),
        version: this.MODEL_VERSION,
      };

      await this.qdrantService.upsertPoint(
        this.COLLECTION_NAME,
        pointData,
        embedding
      );

      this.logger.debug(`✅ Entrenado: "${dto.text}" -> ${dto.category}`);
      
      // Emitir evento de entrenamiento
      this.eventEmitter.emit('model.trained', {
        text: dto.text,
        category: dto.category,
        timestamp: new Date(),
      });

    } catch (error) {
      this.logger.error('Error entrenando modelo:', error);
      throw error;
    }
  }

  /**
   * Corrige una clasificación, persiste la etiqueta y programa reentrenamiento.
   */
  async correctClassification(
    dto: CorrectClassificationDto,
    context: { userId?: string } = {},
  ): Promise<{ label: ClassificationLabel; retrainingQueued: boolean; kafkaTopic: string; modelVersion: string }> {
    try {
      const label = this.labelRepository.create({
        description: dto.description,
        finalCategory: dto.correctCategory,
        previousCategory: dto.incorrectCategory,
        notes: dto.notes,
        movementId: dto.movementId,
        source: ClassificationLabelSource.USER_CORRECTION,
        status: ClassificationLabelStatus.PENDING,
        submittedBy: context.userId,
        metadata: {
          incorrectCategory: dto.incorrectCategory,
          notes: dto.notes,
        },
        acceptedAt: new Date(),
      });

      const savedLabel = await this.labelRepository.save(label);

      await this.updateMovementFromCorrection(dto, context.userId);

      await this.trainModel({
        text: dto.description,
        category: dto.correctCategory,
        confidence: 1.0,
      });

      this.recordCorrection(dto.description, dto.correctCategory, dto.incorrectCategory);

      this.logger.log(`🔧 Corrección aplicada: "${dto.description}" -> ${dto.correctCategory}`);

      this.eventEmitter.emit('classification.corrected', {
        description: dto.description,
        correctCategory: dto.correctCategory,
        incorrectCategory: dto.incorrectCategory,
        notes: dto.notes,
        movementId: dto.movementId,
        timestamp: new Date(),
      });

      const queueResult = await this.enqueueCorrectionEvent(savedLabel);

      return {
        label: queueResult.label,
        retrainingQueued: queueResult.queued,
        kafkaTopic: this.correctionTopic,
        modelVersion: this.MODEL_VERSION,
      };

    } catch (error) {
      this.logger.error('Error aplicando corrección:', error);
      throw error;
    }
  }

  /**
   * Genera clave para cache
   */
  private generateCacheKey(dto: ClassifyTransactionDto): string {
    return `${dto.description.toLowerCase().trim()}_${dto.amount || 'no-amount'}`;
  }

  /**
   * Guarda resultado en cache
   */
  private saveToCache(key: string, result: ClassificationResultDto): void {
    if (this.classificationCache.size >= this.maxCacheSize) {
      // Remover entrada más antigua
      const firstKey = this.classificationCache.keys().next().value;
      this.classificationCache.delete(firstKey);
    }
    
    this.classificationCache.set(key, result);
  }

  /**
   * Registra clasificación para métricas
   */
  private recordClassification(
    description: string,
    category: TransactionCategory,
    confidence: number
  ): void {
    this.totalClassifications++;
    
    this.classificationHistory.push({
      timestamp: new Date(),
      input: description,
      predicted: category,
      confidence,
    });

    // Mantener solo las últimas 1000 clasificaciones
    if (this.classificationHistory.length > 1000) {
      this.classificationHistory.shift();
    }
  }

  /**
   * Registra corrección para métricas
   */
  private recordCorrection(
    description: string,
    correctCategory: TransactionCategory,
    incorrectCategory?: TransactionCategory
  ): void {
    // Encontrar la clasificación original si existe
    const originalClassification = this.classificationHistory
      .reverse()
      .find(item => item.input === description);

    if (originalClassification) {
      originalClassification.actual = correctCategory;
      
      if (originalClassification.predicted === correctCategory) {
        this.correctPredictions++;
      }
    }
  }

  private async updateMovementFromCorrection(dto: CorrectClassificationDto, userId?: string): Promise<void> {
    if (!dto.movementId) {
      return;
    }

    try {
      const movement = await this.movementRepository.findOne({ where: { id: dto.movementId } });

      if (!movement) {
        this.logger.warn(`No se encontró movimiento con ID ${dto.movementId} para aplicar la corrección.`);
        return;
      }

      movement.category = dto.correctCategory;
      movement.classificationConfidence = 1;
      movement.classificationModelVersion = this.MODEL_VERSION;
      movement.classificationReviewedAt = new Date();
      movement.classificationMetadata = {
        ...(movement.classificationMetadata || {}),
        incorrectCategory: dto.incorrectCategory,
        reviewer: userId,
        notes: dto.notes,
        updatedAt: new Date().toISOString(),
      };

      await this.movementRepository.save(movement);
    } catch (error) {
      this.logger.error(`Error actualizando movimiento ${dto.movementId} con la corrección`, error);
    }
  }

  private async enqueueCorrectionEvent(label: ClassificationLabel): Promise<{ queued: boolean; label: ClassificationLabel }> {
    const payload = {
      labelId: label.id,
      description: label.description,
      category: label.finalCategory,
      previousCategory: label.previousCategory,
      movementId: label.movementId,
      source: label.source,
      submittedBy: label.submittedBy,
      timestamp: new Date().toISOString(),
    };

    try {
      await this.kafkaService.produceWithRetry({
        topic: this.correctionTopic,
        messages: [
          {
            key: label.id,
            value: JSON.stringify(payload),
          }
        ],
      });

      const metadata = {
        ...(label.metadata || {}),
        correctionQueuedAt: new Date().toISOString(),
      };

      await this.labelRepository.update({ id: label.id }, { metadata: metadata as any });

      return { queued: true, label: { ...label, metadata } };
    } catch (error) {
      this.logger.error('Error encolando corrección para reentrenamiento', error);
      return { queued: false, label };
    }
  }

  private async enqueueRetrainingBatch(
    labels: ClassificationLabel[],
    metricsSnapshot: {
      totalClassifications: number;
      accuracy: number;
      cacheSize: number;
      modelVersion: string;
      collectionName: string;
      recentClassifications: number;
    },
  ): Promise<boolean> {
    if (!labels.length) {
      return false;
    }

    const batchId = randomUUID();
    const message = {
      batchId,
      requestedAt: new Date().toISOString(),
      modelVersion: this.MODEL_VERSION,
      labels: labels.map((item) => ({
        id: item.id,
        description: item.description,
        category: item.finalCategory,
        previousCategory: item.previousCategory,
        movementId: item.movementId,
      })),
      metrics: metricsSnapshot,
    };

    try {
      await this.kafkaService.produceWithRetry({
        topic: this.retrainingTopic,
        messages: [
          {
            key: batchId,
            value: JSON.stringify(message),
          }
        ],
      });

      const queuedAt = new Date().toISOString();

      await Promise.all(labels.map(label => {
        const metadata = {
          ...(label.metadata || {}),
          retrainingBatchId: batchId,
          retrainingQueuedAt: queuedAt,
        };

        return this.labelRepository.update({ id: label.id }, {
          status: ClassificationLabelStatus.QUEUED,
          metadata: metadata as any,
        });
      }));

      return true;
    } catch (error) {
      this.logger.error('Error encolando lote de reentrenamiento', error);
      return false;
    }
  }

  /**
   * Tarea programada para limpiar cache y optimizar modelo
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async performDailyMaintenance(): Promise<void> {
    this.logger.log('🧹 Ejecutando mantenimiento diario del modelo');
    
    try {
      // Limpiar cache
      this.classificationCache.clear();
      this.nlpService.clearCache();
      
      // Limpiar historial antiguo
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30); // Mantener 30 días
      
      const newHistory = this.classificationHistory.filter(
        item => item.timestamp > cutoffDate
      );
      
      this.classificationHistory.length = 0;
      this.classificationHistory.push(...newHistory);
      
      this.logger.log('✅ Mantenimiento diario completado');
      
    } catch (error) {
      this.logger.error('Error en mantenimiento diario:', error);
    }
  }

  @Cron(CronExpression.EVERY_6_HOURS)
  async orchestrateScheduledRetraining(): Promise<void> {
    try {
      const metrics = this.getModelMetrics();
      const pendingLabels = await this.labelRepository.find({
        where: { status: ClassificationLabelStatus.PENDING },
        order: { createdAt: 'ASC' },
        take: this.BATCH_SIZE,
      });

      if (!pendingLabels.length) {
        if (metrics.accuracy < this.targetAccuracy) {
          this.logger.warn(`Precisión actual ${(metrics.accuracy * 100).toFixed(2)}% por debajo del objetivo ${(this.targetAccuracy * 100).toFixed(2)}%, sin etiquetas disponibles para reentrenar.`);
        } else {
          this.logger.debug('Sin etiquetas pendientes para reentrenamiento programado.');
        }
        return;
      }

      if (pendingLabels.length < this.minLabelsForRetraining && metrics.accuracy >= this.targetAccuracy) {
        this.logger.debug(`Esperando más ejemplos etiquetados para reentrenar (actual=${pendingLabels.length}, requerido=${this.minLabelsForRetraining}).`);
        return;
      }

      const queued = await this.enqueueRetrainingBatch(pendingLabels, metrics);

      if (queued) {
        this.logger.log(`🚀 Lote de reentrenamiento encolado con ${pendingLabels.length} ejemplos.`);
      }

    } catch (error) {
      this.logger.error('Error orquestando reentrenamiento programado', error);
    }
  }

  /**
   * Obtiene métricas del modelo
   */
  getModelMetrics(): {
    totalClassifications: number;
    accuracy: number;
    cacheSize: number;
    modelVersion: string;
    collectionName: string;
    recentClassifications: number;
  } {
    const accuracy = this.totalClassifications > 0 
      ? this.correctPredictions / this.totalClassifications 
      : 0;

    const recentClassifications = this.classificationHistory.filter(
      item => item.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length;

    return {
      totalClassifications: this.totalClassifications,
      accuracy,
      cacheSize: this.classificationCache.size,
      modelVersion: this.MODEL_VERSION,
      collectionName: this.COLLECTION_NAME,
      recentClassifications,
    };
  }

  /**
   * Maneja eventos de corrección para aprendizaje continuo
   */
  @OnEvent('classification.corrected')
  async handleClassificationCorrected(payload: any): Promise<void> {
    // Aquí se puede implementar lógica adicional para aprendizaje continuo
    this.logger.debug(`Procesando corrección: ${payload.description} -> ${payload.correctCategory}`);
  }
}