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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ClassificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassificationService = void 0;
const crypto_1 = require("crypto");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const event_emitter_1 = require("@nestjs/event-emitter");
const typeorm_1 = require("@nestjs/typeorm");
const schedule_1 = require("@nestjs/schedule");
const typeorm_2 = require("typeorm");
const nlp_service_1 = require("../nlp/nlp.service");
const qdrant_service_1 = require("../qdrant/qdrant.service");
const kafka_service_1 = require("../kafka/kafka.service");
const transaction_category_enum_1 = require("../transactions/enums/transaction-category.enum");
const classification_label_entity_1 = require("./entities/classification-label.entity");
const financial_movement_entity_1 = require("../financial-movements/entities/financial-movement.entity");
let ClassificationService = ClassificationService_1 = class ClassificationService {
    constructor(nlpService, qdrantService, eventEmitter, kafkaService, configService, labelRepository, movementRepository) {
        this.nlpService = nlpService;
        this.qdrantService = qdrantService;
        this.eventEmitter = eventEmitter;
        this.kafkaService = kafkaService;
        this.configService = configService;
        this.labelRepository = labelRepository;
        this.movementRepository = movementRepository;
        this.logger = new common_1.Logger(ClassificationService_1.name);
        this.COLLECTION_NAME = 'financial_transactions_v3';
        this.SIMILARITY_THRESHOLD = 0.75;
        this.MIN_CONFIDENCE_THRESHOLD = 0.3;
        this.BATCH_SIZE = 100;
        this.MODEL_VERSION = '3.0';
        this.totalClassifications = 0;
        this.correctPredictions = 0;
        this.classificationHistory = [];
        this.classificationCache = new Map();
        this.maxCacheSize = 500;
        this.fallbackRules = new Map([
            [/arriendo|alquiler|rent/i, transaction_category_enum_1.TransactionCategory.VIVIENDA],
            [/supermercado|market|almac[eé]n/i, transaction_category_enum_1.TransactionCategory.ALIMENTACION],
            [/gasolina|combustible|bencina/i, transaction_category_enum_1.TransactionCategory.TRANSPORTE],
            [/m[eé]dico|doctor|hospital|cl[ií]nica/i, transaction_category_enum_1.TransactionCategory.SALUD],
            [/restaurant|comida|almuerzo|cena/i, transaction_category_enum_1.TransactionCategory.ALIMENTACION],
            [/luz|agua|gas|internet|tel[eé]fono/i, transaction_category_enum_1.TransactionCategory.SERVICIOS],
            [/ropa|vestuario|zapatos/i, transaction_category_enum_1.TransactionCategory.VESTUARIO],
            [/cine|teatro|entretenimiento/i, transaction_category_enum_1.TransactionCategory.ENTRETENIMIENTO],
        ]);
        this.retrainingTopic = this.configService.get('KAFKA_CLASSIFICATION_RETRAIN_TOPIC', 'classification.retraining');
        this.correctionTopic = this.configService.get('KAFKA_CLASSIFICATION_CORRECTIONS_TOPIC', 'classification.corrections');
        this.targetAccuracy = this.getNumberConfig('CLASSIFICATION_TARGET_ACCURACY', 0.9);
        this.minLabelsForRetraining = Math.max(1, Math.floor(this.getNumberConfig('CLASSIFICATION_RETRAIN_MIN_LABELS', 10)));
    }
    getNumberConfig(key, fallback) {
        const rawValue = this.configService.get(key);
        const parsed = rawValue !== undefined ? Number(rawValue) : Number.NaN;
        return Number.isFinite(parsed) ? parsed : fallback;
    }
    async onModuleInit() {
        await this.initializeModel();
        this.logger.log('🎯 Classification Service initialized with advanced ML capabilities');
    }
    async initializeModel() {
        try {
            await this.qdrantService.createCollection(this.COLLECTION_NAME, {
                size: 384,
                distance: 'Cosine'
            });
            await this.loadInitialTrainingData();
            this.logger.log('Modelo de clasificación inicializado correctamente');
        }
        catch (error) {
            this.logger.error('Error inicializando modelo:', error);
            throw error;
        }
    }
    async loadInitialTrainingData() {
        const initialData = [
            { text: 'Pago arriendo departamento Las Condes', category: transaction_category_enum_1.TransactionCategory.VIVIENDA },
            { text: 'Alquiler casa Providencia mes marzo', category: transaction_category_enum_1.TransactionCategory.VIVIENDA },
            { text: 'Gastos comunes edificio condominio', category: transaction_category_enum_1.TransactionCategory.VIVIENDA },
            { text: 'Compra supermercado Líder semanal', category: transaction_category_enum_1.TransactionCategory.ALIMENTACION },
            { text: 'Almuerzo restaurant italiano centro', category: transaction_category_enum_1.TransactionCategory.ALIMENTACION },
            { text: 'Delivery comida china pedidos ya', category: transaction_category_enum_1.TransactionCategory.ALIMENTACION },
            { text: 'Carga combustible estación Shell', category: transaction_category_enum_1.TransactionCategory.TRANSPORTE },
            { text: 'Viaje Uber trabajo aeropuerto', category: transaction_category_enum_1.TransactionCategory.TRANSPORTE },
            { text: 'Recarga tarjeta BIP metro', category: transaction_category_enum_1.TransactionCategory.TRANSPORTE },
            { text: 'Consulta médico particular', category: transaction_category_enum_1.TransactionCategory.SALUD },
            { text: 'Compra medicamentos farmacia', category: transaction_category_enum_1.TransactionCategory.SALUD },
            { text: 'Examen laboratorio clínico', category: transaction_category_enum_1.TransactionCategory.SALUD },
            { text: 'Cuenta luz eléctrica mensual', category: transaction_category_enum_1.TransactionCategory.SERVICIOS },
            { text: 'Plan internet fibra óptica', category: transaction_category_enum_1.TransactionCategory.SERVICIOS },
            { text: 'Servicio agua potable', category: transaction_category_enum_1.TransactionCategory.SERVICIOS },
        ];
        for (const data of initialData) {
            await this.trainModel(data);
        }
        this.logger.debug(`Cargados ${initialData.length} ejemplos de entrenamiento inicial`);
    }
    async classifyTransaction(dto) {
        const startTime = Date.now();
        try {
            const cacheKey = this.generateCacheKey(dto);
            if (this.classificationCache.has(cacheKey)) {
                this.logger.debug('Clasificación recuperada del cache');
                return this.classificationCache.get(cacheKey);
            }
            this.logger.debug(`🔍 Clasificando: "${dto.description}"`);
            const embedding = await this.nlpService.generateEmbedding(dto.description);
            const similarPoints = await this.qdrantService.search(this.COLLECTION_NAME, embedding, 10, this.SIMILARITY_THRESHOLD);
            const keywords = this.nlpService.extractKeywords(dto.description, 8);
            const sentiment = this.nlpService.analyzeSentiment(dto.description);
            let classification;
            let alternatives = [];
            if (similarPoints.length > 0) {
                const mlResult = this.determineMLClassification(similarPoints, dto.amount);
                classification = mlResult.primary;
                alternatives = mlResult.alternatives;
            }
            else {
                classification = this.determineFallbackClassification(dto.description, keywords);
            }
            if (classification.confidence < this.MIN_CONFIDENCE_THRESHOLD) {
                classification.category = transaction_category_enum_1.TransactionCategory.NO_CLASIFICADO;
                classification.confidence = 0;
            }
            const result = {
                category: classification.category,
                confidence: classification.confidence,
                keywords,
                alternatives: alternatives.slice(0, 3),
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
            this.saveToCache(cacheKey, result);
            this.recordClassification(dto.description, classification.category, classification.confidence);
            this.eventEmitter.emit('classification.completed', {
                input: dto.description,
                result: classification,
                processingTime: Date.now() - startTime,
            });
            this.logger.debug(`✅ Clasificado como ${classification.category} (${(classification.confidence * 100).toFixed(1)}%) en ${Date.now() - startTime}ms`);
            return result;
        }
        catch (error) {
            this.logger.error('Error en clasificación:', error);
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
    determineMLClassification(similarPoints, amount) {
        const categoryScores = new Map();
        similarPoints.forEach(point => {
            const category = point.payload.category;
            if (!categoryScores.has(category)) {
                categoryScores.set(category, []);
            }
            categoryScores.get(category).push(point.score);
        });
        const categoryConfidences = [];
        categoryScores.forEach((scores, category) => {
            const weightedSum = scores.reduce((sum, score, index) => {
                const weight = Math.pow(0.8, index);
                return sum + (score * weight);
            }, 0);
            const totalWeight = scores.reduce((sum, _, index) => sum + Math.pow(0.8, index), 0);
            const avgConfidence = weightedSum / totalWeight;
            const frequencyBoost = Math.min(scores.length / similarPoints.length, 0.2);
            const finalConfidence = Math.min(avgConfidence + frequencyBoost, 1.0);
            categoryConfidences.push({ category, confidence: finalConfidence });
        });
        categoryConfidences.sort((a, b) => b.confidence - a.confidence);
        if (amount && categoryConfidences.length > 0) {
            this.applyAmountBasedAdjustments(categoryConfidences, amount);
        }
        const primary = {
            category: categoryConfidences[0].category,
            confidence: categoryConfidences[0].confidence,
            keywords: [],
        };
        const alternatives = categoryConfidences.slice(1, 4);
        return { primary, alternatives };
    }
    applyAmountBasedAdjustments(categoryConfidences, amount) {
        const amountAdjustments = new Map([
            [transaction_category_enum_1.TransactionCategory.VIVIENDA, amount > 200000 ? 0.1 : -0.05],
            [transaction_category_enum_1.TransactionCategory.TRANSPORTE, amount < 50000 ? 0.05 : -0.03],
            [transaction_category_enum_1.TransactionCategory.ALIMENTACION, amount < 100000 ? 0.05 : -0.02],
            [transaction_category_enum_1.TransactionCategory.SALUD, amount > 50000 ? 0.05 : 0],
            [transaction_category_enum_1.TransactionCategory.ENTRETENIMIENTO, amount < 150000 ? 0.05 : 0],
        ]);
        categoryConfidences.forEach(item => {
            const adjustment = amountAdjustments.get(item.category) || 0;
            item.confidence = Math.min(Math.max(item.confidence + adjustment, 0), 1);
        });
        categoryConfidences.sort((a, b) => b.confidence - a.confidence);
    }
    determineFallbackClassification(description, keywords) {
        for (const [pattern, category] of this.fallbackRules) {
            if (pattern.test(description)) {
                return {
                    category,
                    confidence: 0.6,
                    keywords,
                };
            }
        }
        const keywordCategories = new Map([
            [transaction_category_enum_1.TransactionCategory.ALIMENTACION, 0],
            [transaction_category_enum_1.TransactionCategory.TRANSPORTE, 0],
            [transaction_category_enum_1.TransactionCategory.VIVIENDA, 0],
            [transaction_category_enum_1.TransactionCategory.SALUD, 0],
            [transaction_category_enum_1.TransactionCategory.SERVICIOS, 0],
        ]);
        const categoryKeywords = {
            [transaction_category_enum_1.TransactionCategory.ALIMENTACION]: ['comer', 'food', 'restaur', 'super'],
            [transaction_category_enum_1.TransactionCategory.TRANSPORTE]: ['viaj', 'transport', 'combust', 'uber'],
            [transaction_category_enum_1.TransactionCategory.VIVIENDA]: ['casa', 'depart', 'arrend', 'alquil'],
            [transaction_category_enum_1.TransactionCategory.SALUD]: ['medic', 'doctor', 'farmac', 'hospital'],
            [transaction_category_enum_1.TransactionCategory.SERVICIOS]: ['servic', 'cuenta', 'internet', 'telefon'],
        };
        Object.entries(categoryKeywords).forEach(([category, catKeywords]) => {
            const matches = keywords.filter(kw => catKeywords.some(ck => kw.includes(ck) || ck.includes(kw))).length;
            keywordCategories.set(category, matches);
        });
        const bestMatch = Array.from(keywordCategories.entries())
            .sort(([, a], [, b]) => b - a)[0];
        if (bestMatch[1] > 0) {
            return {
                category: bestMatch[0],
                confidence: Math.min(bestMatch[1] * 0.2, 0.5),
                keywords,
            };
        }
        return {
            category: transaction_category_enum_1.TransactionCategory.NO_CLASIFICADO,
            confidence: 0,
            keywords,
        };
    }
    async trainModel(dto) {
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
            await this.qdrantService.upsertPoint(this.COLLECTION_NAME, pointData, embedding);
            this.logger.debug(`✅ Entrenado: "${dto.text}" -> ${dto.category}`);
            this.eventEmitter.emit('model.trained', {
                text: dto.text,
                category: dto.category,
                timestamp: new Date(),
            });
        }
        catch (error) {
            this.logger.error('Error entrenando modelo:', error);
            throw error;
        }
    }
    async correctClassification(dto, context = {}) {
        try {
            const label = this.labelRepository.create({
                description: dto.description,
                finalCategory: dto.correctCategory,
                previousCategory: dto.incorrectCategory,
                notes: dto.notes,
                movementId: dto.movementId,
                source: classification_label_entity_1.ClassificationLabelSource.USER_CORRECTION,
                status: classification_label_entity_1.ClassificationLabelStatus.PENDING,
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
        }
        catch (error) {
            this.logger.error('Error aplicando corrección:', error);
            throw error;
        }
    }
    generateCacheKey(dto) {
        return `${dto.description.toLowerCase().trim()}_${dto.amount || 'no-amount'}`;
    }
    saveToCache(key, result) {
        if (this.classificationCache.size >= this.maxCacheSize) {
            const firstKey = this.classificationCache.keys().next().value;
            this.classificationCache.delete(firstKey);
        }
        this.classificationCache.set(key, result);
    }
    recordClassification(description, category, confidence) {
        this.totalClassifications++;
        this.classificationHistory.push({
            timestamp: new Date(),
            input: description,
            predicted: category,
            confidence,
        });
        if (this.classificationHistory.length > 1000) {
            this.classificationHistory.shift();
        }
    }
    recordCorrection(description, correctCategory, incorrectCategory) {
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
    async updateMovementFromCorrection(dto, userId) {
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
        }
        catch (error) {
            this.logger.error(`Error actualizando movimiento ${dto.movementId} con la corrección`, error);
        }
    }
    async enqueueCorrectionEvent(label) {
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
            await this.labelRepository.update({ id: label.id }, { metadata: metadata });
            return { queued: true, label: { ...label, metadata } };
        }
        catch (error) {
            this.logger.error('Error encolando corrección para reentrenamiento', error);
            return { queued: false, label };
        }
    }
    async enqueueRetrainingBatch(labels, metricsSnapshot) {
        if (!labels.length) {
            return false;
        }
        const batchId = (0, crypto_1.randomUUID)();
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
                    status: classification_label_entity_1.ClassificationLabelStatus.QUEUED,
                    metadata: metadata,
                });
            }));
            return true;
        }
        catch (error) {
            this.logger.error('Error encolando lote de reentrenamiento', error);
            return false;
        }
    }
    async performDailyMaintenance() {
        this.logger.log('🧹 Ejecutando mantenimiento diario del modelo');
        try {
            this.classificationCache.clear();
            this.nlpService.clearCache();
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - 30);
            const newHistory = this.classificationHistory.filter(item => item.timestamp > cutoffDate);
            this.classificationHistory.length = 0;
            this.classificationHistory.push(...newHistory);
            this.logger.log('✅ Mantenimiento diario completado');
        }
        catch (error) {
            this.logger.error('Error en mantenimiento diario:', error);
        }
    }
    async orchestrateScheduledRetraining() {
        try {
            const metrics = this.getModelMetrics();
            const pendingLabels = await this.labelRepository.find({
                where: { status: classification_label_entity_1.ClassificationLabelStatus.PENDING },
                order: { createdAt: 'ASC' },
                take: this.BATCH_SIZE,
            });
            if (!pendingLabels.length) {
                if (metrics.accuracy < this.targetAccuracy) {
                    this.logger.warn(`Precisión actual ${(metrics.accuracy * 100).toFixed(2)}% por debajo del objetivo ${(this.targetAccuracy * 100).toFixed(2)}%, sin etiquetas disponibles para reentrenar.`);
                }
                else {
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
        }
        catch (error) {
            this.logger.error('Error orquestando reentrenamiento programado', error);
        }
    }
    getModelMetrics() {
        const accuracy = this.totalClassifications > 0
            ? this.correctPredictions / this.totalClassifications
            : 0;
        const recentClassifications = this.classificationHistory.filter(item => item.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000)).length;
        return {
            totalClassifications: this.totalClassifications,
            accuracy,
            cacheSize: this.classificationCache.size,
            modelVersion: this.MODEL_VERSION,
            collectionName: this.COLLECTION_NAME,
            recentClassifications,
        };
    }
    async handleClassificationCorrected(payload) {
        this.logger.debug(`Procesando corrección: ${payload.description} -> ${payload.correctCategory}`);
    }
};
exports.ClassificationService = ClassificationService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_2AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ClassificationService.prototype, "performDailyMaintenance", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_6_HOURS),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ClassificationService.prototype, "orchestrateScheduledRetraining", null);
__decorate([
    (0, event_emitter_1.OnEvent)('classification.corrected'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ClassificationService.prototype, "handleClassificationCorrected", null);
exports.ClassificationService = ClassificationService = ClassificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(5, (0, typeorm_1.InjectRepository)(classification_label_entity_1.ClassificationLabel)),
    __param(6, (0, typeorm_1.InjectRepository)(financial_movement_entity_1.FinancialMovement)),
    __metadata("design:paramtypes", [nlp_service_1.NlpService,
        qdrant_service_1.QdrantService,
        event_emitter_1.EventEmitter2,
        kafka_service_1.KafkaService,
        config_1.ConfigService,
        typeorm_2.Repository,
        typeorm_2.Repository])
], ClassificationService);
//# sourceMappingURL=classification.service.js.map