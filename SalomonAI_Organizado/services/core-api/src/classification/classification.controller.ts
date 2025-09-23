import { 
  Controller, 
  Post, 
  Body, 
  Get,
  UseGuards, 
  HttpStatus, 
  Logger,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
  HttpException,
  HttpCode,
} from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth,
  ApiProduces,
  ApiConsumes,
} from '@nestjs/swagger';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Throttle } from '@nestjs/throttler';
import { ClassificationService } from './classification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { 
  ClassifyTransactionDto, 
  TrainTransactionDto, 
  CorrectClassificationDto,
  ClassificationResultDto 
} from './dto/transaction.dto';

/**
 * Controlador avanzado para clasificación de transacciones con IA
 * Implementa las mejores prácticas de API design y performance
 * @version 3.0
 */
@ApiTags('🎯 Clasificación AI')
@ApiBearerAuth()
@Controller('classification')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: {
    enableImplicitConversion: true,
  },
}))
export class ClassificationController {
  private readonly logger = new Logger(ClassificationController.name);

  constructor(
    private readonly classificationService: ClassificationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Clasifica una transacción utilizando IA avanzada
   */
  @Post('classify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 100, ttl: 60000 } }) // 100 requests por minuto
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // 5 minutos de cache
  @ApiOperation({ 
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
  })
  @ApiConsumes('application/json')
  @ApiProduces('application/json')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transacción clasificada exitosamente',
    type: ClassificationResultDto,
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
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datos de entrada inválidos',
    schema: {
      example: {
        statusCode: 400,
        message: ['La descripción debe tener entre 3 y 500 caracteres'],
        error: 'Bad Request'
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Límite de requests excedido',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Error interno del servidor',
  })
  async classifyTransaction(
    @Body() dto: ClassifyTransactionDto
  ): Promise<ClassificationResultDto> {
    const startTime = Date.now();
    
    try {
      this.logger.debug(`🔍 Clasificando: "${dto.description}"`);
      
      const result = await this.classificationService.classifyTransaction(dto);
      
      const processingTime = Date.now() - startTime;
      this.logger.debug(
        `✅ Clasificado como ${result.category} (${(result.confidence * 100).toFixed(1)}%) en ${processingTime}ms`
      );

      // Emitir evento para analytics
      this.eventEmitter.emit('api.classification.success', {
        description: dto.description,
        result: result.category,
        confidence: result.confidence,
        processingTime,
        timestamp: new Date(),
      });

      return result;

    } catch (error) {
      this.logger.error(`❌ Error clasificando "${dto.description}":`, error);
      
      // Emitir evento de error
      this.eventEmitter.emit('api.classification.error', {
        description: dto.description,
        error: error.message,
        timestamp: new Date(),
      });

      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Error procesando la clasificación',
          error: 'Internal Server Error',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Entrena el modelo con datos supervisados
   */
  @Post('train')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 50, ttl: 60000 } }) // 50 requests por minuto
  @ApiOperation({ 
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
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
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
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datos de entrenamiento inválidos',
  })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'Error en el proceso de entrenamiento',
  })
  async trainModel(
    @Body() dto: TrainTransactionDto
  ): Promise<{
    success: boolean;
    message: string;
    training: {
      text: string;
      category: string;
      modelVersion: string;
      confidence?: number;
    };
  }> {
    try {
      this.logger.debug(`📚 Entrenando: "${dto.text}" -> ${dto.category}`);
      
      await this.classificationService.trainModel(dto);
      
      this.logger.debug(`✅ Entrenamiento completado para categoría ${dto.category}`);

      // Emitir evento para MLOps
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

    } catch (error) {
      this.logger.error(`❌ Error entrenando modelo:`, error);
      
      this.eventEmitter.emit('api.training.error', {
        text: dto.text,
        category: dto.category,
        error: error.message,
        timestamp: new Date(),
      });

      throw new HttpException(
        {
          statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          message: 'Error entrenando el modelo',
          error: 'Unprocessable Entity',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
        HttpStatus.UNPROCESSABLE_ENTITY
      );
    }
  }

  /**
   * Corrige una clasificación incorrecta
   */
  @Post('correct')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 correcciones por minuto
  @ApiOperation({ 
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
  })
  @ApiResponse({
    status: HttpStatus.OK,
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
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datos de corrección inválidos',
  })
  async correctClassification(
    @Body() dto: CorrectClassificationDto
  ): Promise<{
    success: boolean;
    message: string;
    correction: {
      description: string;
      correctCategory: string;
      previousCategory?: string;
      modelVersion: string;
      notes?: string;
    };
  }> {
    try {
      this.logger.debug(
        `🔧 Corrigiendo: "${dto.description}" -> ${dto.correctCategory}`
      );
      
      await this.classificationService.correctClassification(dto);
      
      this.logger.debug(`✅ Corrección aplicada exitosamente`);

      // Emitir evento para analytics y MLOps
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

    } catch (error) {
      this.logger.error(`❌ Error corrigiendo clasificación:`, error);
      
      this.eventEmitter.emit('api.correction.error', {
        description: dto.description,
        correctCategory: dto.correctCategory,
        error: error.message,
        timestamp: new Date(),
      });

      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Error aplicando la corrección',
          error: 'Internal Server Error',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Obtiene métricas y estadísticas del modelo
   */
  @Get('metrics')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60) // 1 minuto de cache
  @ApiOperation({ 
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
  })
  @ApiResponse({
    status: HttpStatus.OK,
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
  })
  async getModelMetrics(): Promise<{
    model: {
      version: string;
      totalClassifications: number;
      accuracy: number;
      recentClassifications: number;
    };
    performance: {
      cacheSize: number;
      maxCacheSize: number;
      cacheHitRate?: number;
    };
    infrastructure: {
      collectionName: string;
      documentsInCorpus?: number;
      lastUpdate: string;
    };
  }> {
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
          maxCacheSize: 500, // TODO: obtener del servicio
          // cacheHitRate se puede calcular con más métricas
        },
        infrastructure: {
          collectionName: metrics.collectionName,
          lastUpdate: new Date().toISOString(),
        }
      };

    } catch (error) {
      this.logger.error('Error obteniendo métricas:', error);
      
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Error obteniendo métricas del modelo',
          error: 'Internal Server Error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Health check específico del servicio de clasificación
   */
  @Get('health')
  @ApiOperation({ 
    summary: 'Health check del servicio de clasificación',
    description: 'Verifica el estado de salud del servicio de clasificación y sus dependencias.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
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
  })
  async healthCheck(): Promise<{
    status: string;
    timestamp: string;
    service: string;
    version: string;
    dependencies: Record<string, string>;
  }> {
    try {
      // Verificar dependencias críticas
      const dependencies = {
        nlp: 'healthy', // TODO: implementar health check del NLP service
        qdrant: 'healthy', // TODO: implementar health check del Qdrant service
        cache: 'healthy',
      };

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'classification',
        version: '3.0',
        dependencies,
      };

    } catch (error) {
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
}