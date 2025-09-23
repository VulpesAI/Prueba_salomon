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
var QdrantService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QdrantService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const js_client_rest_1 = require("@qdrant/js-client-rest");
let QdrantService = QdrantService_1 = class QdrantService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(QdrantService_1.name);
        this.client = new js_client_rest_1.QdrantClient({
            url: this.configService.get('app.qdrant.url'),
            checkCompatibility: false,
        });
    }
    async onModuleInit() {
        await this.healthCheck();
    }
    async healthCheck() {
        try {
            const collections = await this.client.getCollections();
            this.logger.log('Conexión exitosa con Qdrant');
            return Array.isArray(collections.collections);
        }
        catch (error) {
            this.logger.error('Error conectando con Qdrant', error);
            return false;
        }
    }
    async createCollection(name, config) {
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
        }
        catch (error) {
            this.logger.error(`Error al crear la colección ${name}:`, error);
            throw error;
        }
    }
    async search(collectionName, embedding, limit = 5, threshold = 0.7) {
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
        }
        catch (error) {
            this.logger.error(`Error en búsqueda de colección ${collectionName}:`, error);
            throw error;
        }
    }
    async upsertPoint(collectionName, payload, embedding) {
        this.logger.debug(`Insertando punto en colección ${collectionName}`);
        try {
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
        }
        catch (error) {
            this.logger.error(`Error al insertar punto en ${collectionName}:`, error);
            throw error;
        }
    }
    async upsert(collectionName, points) {
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
        }
        catch (error) {
            this.logger.error(`Error al insertar puntos en ${collectionName}:`, error);
            throw error;
        }
    }
};
exports.QdrantService = QdrantService;
exports.QdrantService = QdrantService = QdrantService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], QdrantService);
//# sourceMappingURL=qdrant.service.js.map