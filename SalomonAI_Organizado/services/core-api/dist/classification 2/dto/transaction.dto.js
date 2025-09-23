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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassificationResultDto = exports.CorrectClassificationDto = exports.TrainTransactionDto = exports.ClassifyTransactionDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const transaction_category_enum_1 = require("../../transactions/enums/transaction-category.enum");
class ClassifyTransactionDto {
}
exports.ClassifyTransactionDto = ClassifyTransactionDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Descripción de la transacción a clasificar',
        example: 'Pago mensual arriendo departamento centro',
        minLength: 3,
        maxLength: 500,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(3, 500, { message: 'La descripción debe tener entre 3 y 500 caracteres' }),
    (0, class_transformer_1.Transform)(({ value }) => value?.trim()),
    __metadata("design:type", String)
], ClassifyTransactionDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Monto de la transacción para mejorar precisión de clasificación',
        example: 450000,
        minimum: 0,
        maximum: 999999999,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({}, { message: 'El monto debe ser un número válido' }),
    (0, class_validator_1.Min)(0, { message: 'El monto no puede ser negativo' }),
    (0, class_validator_1.Max)(999999999, { message: 'El monto excede el límite máximo' }),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], ClassifyTransactionDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Contexto adicional para mejorar la clasificación',
        example: 'Transferencia bancaria automática',
        maxLength: 200,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(0, 200, { message: 'El contexto no puede exceder 200 caracteres' }),
    (0, class_transformer_1.Transform)(({ value }) => value?.trim()),
    __metadata("design:type", String)
], ClassifyTransactionDto.prototype, "context", void 0);
class TrainTransactionDto {
}
exports.TrainTransactionDto = TrainTransactionDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Texto de la transacción para entrenamiento',
        example: 'Pago mensual arriendo departamento Las Condes',
        minLength: 3,
        maxLength: 500,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(3, 500, { message: 'El texto debe tener entre 3 y 500 caracteres' }),
    (0, class_transformer_1.Transform)(({ value }) => value?.trim()),
    __metadata("design:type", String)
], TrainTransactionDto.prototype, "text", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Categoría correcta de la transacción',
        enum: transaction_category_enum_1.TransactionCategory,
        example: transaction_category_enum_1.TransactionCategory.VIVIENDA,
        enumName: 'TransactionCategory',
    }),
    (0, class_validator_1.IsEnum)(transaction_category_enum_1.TransactionCategory, {
        message: `La categoría debe ser una de: ${Object.values(transaction_category_enum_1.TransactionCategory).join(', ')}`
    }),
    __metadata("design:type", String)
], TrainTransactionDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Monto de la transacción para entrenamiento contextual',
        example: 450000,
        minimum: 0,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({}, { message: 'El monto debe ser un número válido' }),
    (0, class_validator_1.Min)(0, { message: 'El monto no puede ser negativo' }),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], TrainTransactionDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Nivel de confianza en esta clasificación (0-1)',
        example: 0.95,
        minimum: 0,
        maximum: 1,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({}, { message: 'La confianza debe ser un número válido' }),
    (0, class_validator_1.Min)(0, { message: 'La confianza debe estar entre 0 y 1' }),
    (0, class_validator_1.Max)(1, { message: 'La confianza debe estar entre 0 y 1' }),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], TrainTransactionDto.prototype, "confidence", void 0);
class CorrectClassificationDto {
}
exports.CorrectClassificationDto = CorrectClassificationDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Descripción original de la transacción mal clasificada',
        example: 'Compra ropa en mall Plaza Vespucio',
        minLength: 3,
        maxLength: 500,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(3, 500, { message: 'La descripción debe tener entre 3 y 500 caracteres' }),
    (0, class_transformer_1.Transform)(({ value }) => value?.trim()),
    __metadata("design:type", String)
], CorrectClassificationDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Categoría correcta de la transacción',
        enum: transaction_category_enum_1.TransactionCategory,
        example: transaction_category_enum_1.TransactionCategory.VESTUARIO,
        enumName: 'TransactionCategory',
    }),
    (0, class_validator_1.IsEnum)(transaction_category_enum_1.TransactionCategory, {
        message: `La categoría debe ser una de: ${Object.values(transaction_category_enum_1.TransactionCategory).join(', ')}`
    }),
    __metadata("design:type", String)
], CorrectClassificationDto.prototype, "correctCategory", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Categoría incorrecta que había sido asignada',
        enum: transaction_category_enum_1.TransactionCategory,
        example: transaction_category_enum_1.TransactionCategory.ENTRETENIMIENTO,
        enumName: 'TransactionCategory',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(transaction_category_enum_1.TransactionCategory, {
        message: `La categoría debe ser una de: ${Object.values(transaction_category_enum_1.TransactionCategory).join(', ')}`
    }),
    __metadata("design:type", String)
], CorrectClassificationDto.prototype, "incorrectCategory", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Notas adicionales sobre la corrección',
        example: 'Era ropa, no entretenimiento',
        maxLength: 200,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(0, 200, { message: 'Las notas no pueden exceder 200 caracteres' }),
    (0, class_transformer_1.Transform)(({ value }) => value?.trim()),
    __metadata("design:type", String)
], CorrectClassificationDto.prototype, "notes", void 0);
class ClassificationResultDto {
}
exports.ClassificationResultDto = ClassificationResultDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Categoría predicha por el modelo',
        enum: transaction_category_enum_1.TransactionCategory,
        example: transaction_category_enum_1.TransactionCategory.VIVIENDA,
    }),
    __metadata("design:type", String)
], ClassificationResultDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Nivel de confianza de la predicción (0-1)',
        example: 0.89,
        minimum: 0,
        maximum: 1,
    }),
    __metadata("design:type", Number)
], ClassificationResultDto.prototype, "confidence", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Palabras clave extraídas del texto',
        example: ['arriendo', 'departamento', 'pago'],
        type: [String],
    }),
    __metadata("design:type", Array)
], ClassificationResultDto.prototype, "keywords", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Categorías alternativas con sus probabilidades',
        example: [
            { category: 'SERVICIOS', confidence: 0.15 },
            { category: 'VARIOS', confidence: 0.08 }
        ],
        type: 'array',
        items: {
            type: 'object',
            properties: {
                category: { type: 'string', enum: Object.values(transaction_category_enum_1.TransactionCategory) },
                confidence: { type: 'number', minimum: 0, maximum: 1 }
            }
        }
    }),
    __metadata("design:type", Array)
], ClassificationResultDto.prototype, "alternatives", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Metadata adicional del procesamiento',
        example: {
            processingTime: 245,
            modelVersion: '2.1.0',
            tokensProcessed: 8
        }
    }),
    __metadata("design:type", Object)
], ClassificationResultDto.prototype, "metadata", void 0);
//# sourceMappingURL=transaction.dto.js.map