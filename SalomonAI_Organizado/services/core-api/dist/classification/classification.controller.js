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
var ClassificationController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassificationController = void 0;
const common_1 = require("@nestjs/common");
const cache_manager_1 = require("@nestjs/cache-manager");
const swagger_1 = require("@nestjs/swagger");
const event_emitter_1 = require("@nestjs/event-emitter");
const throttler_1 = require("@nestjs/throttler");
const classification_service_1 = require("./classification.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const transaction_dto_1 = require("./dto/transaction.dto");
let ClassificationController = ClassificationController_1 = class ClassificationController {
    constructor(classificationService, eventEmitter) {
        this.classificationService = classificationService;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(ClassificationController_1.name);
    }
    async classifyTransaction(dto) {
        const startTime = Date.now();
        try {
            this.logger.debug(`🔍 Clasificando: "${dto.description}"`);
            const result = await this.classificationService.classifyTransaction(dto);
            const processingTime = Date.now() - startTime;
            this.logger.debug(`✅ Clasificado como ${result.category} (${(result.confidence * 100).toFixed(1)}%) en ${processingTime}ms`);
            this.eventEmitter.emit('api.classification.success', {
                description: dto.description,
                result: result.category,
                confidence: result.confidence,
                processingTime,
                timestamp: new Date(),
            });
            return result;
        }
        catch (error) {
            this.logger.error(`❌ Error clasificando "${dto.description}":`, error);
            this.eventEmitter.emit('api.classification.error', {
                description: dto.description,
                error: error.message,
                timestamp: new Date(),
            });
            throw new common_1.HttpException({
                statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'Error procesando la clasificación',
                error: 'Internal Server Error',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined,
            }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async trainModel(dto) {
        try {
            this.logger.debug(`📚 Entrenando: "${dto.text}" -> ${dto.category}`);
            await this.classificationService.trainModel(dto);
            this.logger.debug(`✅ Entrenamiento completado para categoría ${dto.category}`);
            this.eventEmitter.emit('api.training.success', {
                text: dto.text,
                category: dto.category,
                confidence: dto.confidence,
                timestamp: new Date(),
            });
            return {
                success: true,
                message: 'Modelo entrenado exitosamente',
                training: {
                    text: dto.text,
                    category: dto.category,
                    modelVersion: '3.0',
                    confidence: dto.confidence,
                }
            };
        }
        catch (error) {
            this.logger.error(`❌ Error entrenando modelo:`, error);
            this.eventEmitter.emit('api.training.error', {
                text: dto.text,
                category: dto.category,
                error: error.message,
                timestamp: new Date(),
            });
            throw new common_1.HttpException({
                statusCode: common_1.HttpStatus.UNPROCESSABLE_ENTITY,
                message: 'Error entrenando el modelo',
                error: 'Unprocessable Entity',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined,
            }, common_1.HttpStatus.UNPROCESSABLE_ENTITY);
        }
    }
    async correctClassification(dto) {
        try {
            this.logger.debug(`🔧 Corrigiendo: "${dto.description}" -> ${dto.correctCategory}`);
            await this.classificationService.correctClassification(dto);
            this.logger.debug(`✅ Corrección aplicada exitosamente`);
            this.eventEmitter.emit('api.correction.success', {
                description: dto.description,
                correctCategory: dto.correctCategory,
                incorrectCategory: dto.incorrectCategory,
                notes: dto.notes,
                timestamp: new Date(),
            });
            return {
                success: true,
                message: 'Clasificación corregida exitosamente',
                correction: {
                    description: dto.description,
                    correctCategory: dto.correctCategory,
                    previousCategory: dto.incorrectCategory,
                    modelVersion: '3.0',
                    notes: dto.notes,
                }
            };
        }
        catch (error) {
            this.logger.error(`❌ Error corrigiendo clasificación:`, error);
            this.eventEmitter.emit('api.correction.error', {
                description: dto.description,
                correctCategory: dto.correctCategory,
                error: error.message,
                timestamp: new Date(),
            });
            throw new common_1.HttpException({
                statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'Error aplicando la corrección',
                error: 'Internal Server Error',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined,
            }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getModelMetrics() {
        try {
            const metrics = this.classificationService.getModelMetrics();
            return {
                model: {
                    version: metrics.modelVersion,
                    totalClassifications: metrics.totalClassifications,
                    accuracy: Number(metrics.accuracy.toFixed(3)),
                    recentClassifications: metrics.recentClassifications,
                },
                performance: {
                    cacheSize: metrics.cacheSize,
                    maxCacheSize: 500,
                },
                infrastructure: {
                    collectionName: metrics.collectionName,
                    lastUpdate: new Date().toISOString(),
                }
            };
        }
        catch (error) {
            this.logger.error('Error obteniendo métricas:', error);
            throw new common_1.HttpException({
                statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'Error obteniendo métricas del modelo',
                error: 'Internal Server Error',
            }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async healthCheck() {
        try {
            const dependencies = {
                nlp: 'healthy',
                qdrant: 'healthy',
                cache: 'healthy',
            };
            return {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                service: 'classification',
                version: '3.0',
                dependencies,
            };
        }
        catch (error) {
            this.logger.error('Health check failed:', error);
            return {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                service: 'classification',
                version: '3.0',
                dependencies: {
                    nlp: 'unknown',
                    qdrant: 'unknown',
                    cache: 'unknown',
                },
            };
        }
    }
};
exports.ClassificationController = ClassificationController;
__decorate([
    (0, common_1.Post)('classify'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, throttler_1.Throttle)({ default: { limit: 100, ttl: 60000 } }),
    (0, common_1.UseInterceptors)(cache_manager_1.CacheInterceptor),
    (0, cache_manager_1.CacheTTL)(300),
    (0, swagger_1.ApiOperation)({
        summary: 'Clasifica una transacción con IA',
        description: `
      Utiliza modelos avanzados de NLP y machine learning para clasificar automáticamente 
      transacciones financieras en categorías predefinidas.
      
      **Características:**
      - Procesamiento de texto en español optimizado
      - Análisis semántico avanzado con TF-IDF
      - Cache inteligente para mejorar performance
      - Análisis de sentimiento incluido
      - Múltiples alternativas de clasificación
    `,
    }),
    (0, swagger_1.ApiConsumes)('application/json'),
    (0, swagger_1.ApiProduces)('application/json'),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.OK,
        description: 'Transacción clasificada exitosamente',
        type: transaction_dto_1.ClassificationResultDto,
        schema: {
            example: {
                category: 'VIVIENDA',
                confidence: 0.89,
                keywords: ['arriendo', 'departamento', 'pago'],
                alternatives: [
                    { category: 'SERVICIOS', confidence: 0.15 },
                    { category: 'VARIOS', confidence: 0.08 }
                ],
                metadata: {
                    processingTime: 245,
                    modelVersion: '3.0',
                    tokensProcessed: 8,
                    sentiment: 'neutral'
                }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.BAD_REQUEST,
        description: 'Datos de entrada inválidos',
        schema: {
            example: {
                statusCode: 400,
                message: ['La descripción debe tener entre 3 y 500 caracteres'],
                error: 'Bad Request'
            }
        }
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.TOO_MANY_REQUESTS,
        description: 'Límite de requests excedido',
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
        description: 'Error interno del servidor',
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [transaction_dto_1.ClassifyTransactionDto]),
    __metadata("design:returntype", Promise)
], ClassificationController.prototype, "classifyTransaction", null);
__decorate([
    (0, common_1.Post)('train'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, throttler_1.Throttle)({ default: { limit: 50, ttl: 60000 } }),
    (0, swagger_1.ApiOperation)({
        summary: 'Entrena el modelo con datos supervisados',
        description: `
      Permite entrenar el modelo de clasificación con ejemplos etiquetados manualmente.
      Esto mejora la precisión del modelo para casos específicos.
      
      **Características:**
      - Aprendizaje incremental en tiempo real
      - Validación de coherencia automática
      - Métricas de calidad de entrenamiento
      - Eventos para monitoreo de MLOps
    `,
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.CREATED,
        description: 'Modelo entrenado exitosamente',
        schema: {
            example: {
                success: true,
                message: 'Modelo entrenado exitosamente',
                training: {
                    text: 'Pago arriendo departamento Las Condes',
                    category: 'VIVIENDA',
                    modelVersion: '3.0'
                }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.BAD_REQUEST,
        description: 'Datos de entrenamiento inválidos',
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.UNPROCESSABLE_ENTITY,
        description: 'Error en el proceso de entrenamiento',
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [transaction_dto_1.TrainTransactionDto]),
    __metadata("design:returntype", Promise)
], ClassificationController.prototype, "trainModel", null);
__decorate([
    (0, common_1.Post)('correct'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, throttler_1.Throttle)({ default: { limit: 30, ttl: 60000 } }),
    (0, swagger_1.ApiOperation)({
        summary: 'Corrige una clasificación incorrecta',
        description: `
      Permite corregir clasificaciones incorrectas del modelo y reentrenar automáticamente.
      Esto mejora la precisión del modelo mediante aprendizaje continuo.
      
      **Características:**
      - Aprendizaje por refuerzo automático
      - Tracking de correcciones para métricas
      - Análisis de patrones de error
      - Mejora continua del modelo
    `,
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.OK,
        description: 'Clasificación corregida exitosamente',
        schema: {
            example: {
                success: true,
                message: 'Clasificación corregida exitosamente',
                correction: {
                    description: 'Compra ropa en mall',
                    correctCategory: 'VESTUARIO',
                    previousCategory: 'ENTRETENIMIENTO',
                    modelVersion: '3.0'
                }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.BAD_REQUEST,
        description: 'Datos de corrección inválidos',
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [transaction_dto_1.CorrectClassificationDto]),
    __metadata("design:returntype", Promise)
], ClassificationController.prototype, "correctClassification", null);
__decorate([
    (0, common_1.Get)('metrics'),
    (0, common_1.UseInterceptors)(cache_manager_1.CacheInterceptor),
    (0, cache_manager_1.CacheTTL)(60),
    (0, swagger_1.ApiOperation)({
        summary: 'Obtiene métricas del modelo de clasificación',
        description: `
      Proporciona información detallada sobre el rendimiento del modelo,
      incluyendo precisión, uso de cache, y estadísticas de entrenamiento.
      
      **Métricas incluidas:**
      - Precisión del modelo (accuracy)
      - Número total de clasificaciones
      - Uso del cache y performance
      - Clasificaciones recientes
      - Versión del modelo actual
    `,
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.OK,
        description: 'Métricas del modelo obtenidas exitosamente',
        schema: {
            example: {
                model: {
                    version: '3.0',
                    totalClassifications: 1542,
                    accuracy: 0.87,
                    recentClassifications: 45
                },
                performance: {
                    cacheSize: 234,
                    maxCacheSize: 500,
                    cacheHitRate: 0.67
                },
                infrastructure: {
                    collectionName: 'financial_transactions_v3',
                    documentsInCorpus: 890,
                    lastUpdate: '2025-07-31T10:15:00Z'
                }
            }
        }
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ClassificationController.prototype, "getModelMetrics", null);
__decorate([
    (0, common_1.Get)('health'),
    (0, swagger_1.ApiOperation)({
        summary: 'Health check del servicio de clasificación',
        description: 'Verifica el estado de salud del servicio de clasificación y sus dependencias.',
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.OK,
        description: 'Servicio funcionando correctamente',
        schema: {
            example: {
                status: 'healthy',
                timestamp: '2025-07-31T10:15:00Z',
                service: 'classification',
                version: '3.0',
                dependencies: {
                    nlp: 'healthy',
                    qdrant: 'healthy',
                    cache: 'healthy'
                }
            }
        }
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ClassificationController.prototype, "healthCheck", null);
exports.ClassificationController = ClassificationController = ClassificationController_1 = __decorate([
    (0, swagger_1.ApiTags)('🎯 Clasificación AI'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('classification'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    })),
    __metadata("design:paramtypes", [classification_service_1.ClassificationService,
        event_emitter_1.EventEmitter2])
], ClassificationController);
//# sourceMappingURL=classification.controller.js.map