import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import { QdrantVectorService } from './qdrant.tokens';

interface CollectionConfig {
  size: number;
  distance: 'Cosine' | 'Euclid' | 'Dot';
}

interface SearchConfig {
  vector: number[];
  limit: number;
  filter?: any;
}

@Injectable()
export class QdrantService implements OnModuleInit, QdrantVectorService {
  private readonly logger = new Logger(QdrantService.name);
  private client: QdrantClient;

  constructor(private readonly configService: ConfigService) {
    this.client = new QdrantClient({
      url: this.configService.get('app.qdrant.url'),
      apiKey: this.configService.get<string>('app.qdrant.apiKey') || undefined,
      checkCompatibility: false, // Omitir verificación de compatibilidad de versión
    });
  }

  async onModuleInit() {
    await this.healthCheck();
  }

  /**
   * Verifica la conexión con Qdrant
   */
  async healthCheck(): Promise<boolean> {
    try {
      const collections = await this.client.getCollections();
      this.logger.log('Conexión exitosa con Qdrant');
      return Array.isArray(collections.collections);
    } catch (error) {
      this.logger.error('Error conectando con Qdrant', error);
      return false;
    }
  }

  /**
   * Crea una nueva colección si no existe
   */
  async createCollection(name: string, config: CollectionConfig): Promise<void> {
    this.logger.debug(`Creando colección: ${name}`);
    
    try {
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(c => c.name === name);

      if (!exists) {
        await this.client.createCollection(name, {
          vectors: {
            size: config.size,
            distance: config.distance
          },
          optimizers_config: {
            default_segment_number: 2
          },
          on_disk_payload: true
        });

      }
      this.logger.log(`Colección ${name} creada exitosamente`);
    } catch (error) {
      this.logger.error(`Error al crear la colección ${name}:`, error);
      throw error;
    }
  }

  /**
   * Busca vectores similares en una colección
   */
  async search(
    collectionName: string, 
    embedding: number[], 
    limit: number = 5, 
    threshold: number = 0.7
  ): Promise<Array<{ payload: any; score: number }>> {
    this.logger.debug(`Buscando en colección ${collectionName} con threshold ${threshold}`);
    
    try {
      const response = await this.client.search(collectionName, {
        vector: embedding,
        limit,
        score_threshold: threshold
      });

      return response.map(hit => ({
        id: hit.id,
        score: hit.score,
        payload: hit.payload
      }));
    } catch (error) {
      this.logger.error(`Error en búsqueda de colección ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Inserta o actualiza un punto individual en la colección
   */
  async upsertPoint(
    collectionName: string, 
    payload: any, 
    embedding: number[]
  ): Promise<void> {
    this.logger.debug(`Insertando punto en colección ${collectionName}`);
    
    try {
      // Generar un ID único basado en timestamp y contenido
      const pointId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await this.client.upsert(collectionName, {
        wait: true,
        points: [{
          id: pointId,
          vector: embedding,
          payload
        }]
      });
      
      this.logger.debug(`Punto insertado exitosamente en ${collectionName}`);
    } catch (error) {
      this.logger.error(`Error al insertar punto en ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Inserta o actualiza múltiples puntos en la colección
   */
  async upsert(collectionName: string, points: Array<{
    vector: number[];
    payload?: any;
  }>): Promise<void> {
    this.logger.debug(`Insertando ${points.length} puntos en colección ${collectionName}`);
    
    try {
      await this.client.upsert(collectionName, {
        wait: true,
        points: points.map((point, index) => ({
          id: `${Date.now()}_${index}`,
          vector: point.vector,
          payload: point.payload
        }))
      });
      
      this.logger.debug(`Puntos insertados exitosamente en ${collectionName}`);
    } catch (error) {
      this.logger.error(`Error al insertar puntos en ${collectionName}:`, error);
      throw error;
    }
  }
}