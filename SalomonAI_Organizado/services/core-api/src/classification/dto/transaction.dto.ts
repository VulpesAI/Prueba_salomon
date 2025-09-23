import { IsString, IsEnum, IsOptional, IsNumber, Min, Max, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { TransactionCategory } from '../../transactions/enums/transaction-category.enum';

/**
 * DTO para clasificar una transacción usando IA/NLP
 * @version 2.0
 */
export class ClassifyTransactionDto {
  @ApiProperty({
    description: 'Descripción de la transacción a clasificar',
    example: 'Pago mensual arriendo departamento centro',
    minLength: 3,
    maxLength: 500,
  })
  @IsString()
  @Length(3, 500, { message: 'La descripción debe tener entre 3 y 500 caracteres' })
  @Transform(({ value }) => value?.trim())
  readonly description: string;

  @ApiPropertyOptional({
    description: 'Monto de la transacción para mejorar precisión de clasificación',
    example: 450000,
    minimum: 0,
    maximum: 999999999,
  })
  @IsOptional()
  @IsNumber({}, { message: 'El monto debe ser un número válido' })
  @Min(0, { message: 'El monto no puede ser negativo' })
  @Max(999999999, { message: 'El monto excede el límite máximo' })
  @Type(() => Number)
  readonly amount?: number;

  @ApiPropertyOptional({
    description: 'Contexto adicional para mejorar la clasificación',
    example: 'Transferencia bancaria automática',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @Length(0, 200, { message: 'El contexto no puede exceder 200 caracteres' })
  @Transform(({ value }) => value?.trim())
  readonly context?: string;
}

/**
 * DTO para entrenar el modelo de clasificación con datos supervisados
 * @version 2.0
 */
export class TrainTransactionDto {
  @ApiProperty({
    description: 'Texto de la transacción para entrenamiento',
    example: 'Pago mensual arriendo departamento Las Condes',
    minLength: 3,
    maxLength: 500,
  })
  @IsString()
  @Length(3, 500, { message: 'El texto debe tener entre 3 y 500 caracteres' })
  @Transform(({ value }) => value?.trim())
  readonly text: string;

  @ApiProperty({
    description: 'Categoría correcta de la transacción',
    enum: TransactionCategory,
    example: TransactionCategory.VIVIENDA,
    enumName: 'TransactionCategory',
  })
  @IsEnum(TransactionCategory, { 
    message: `La categoría debe ser una de: ${Object.values(TransactionCategory).join(', ')}` 
  })
  readonly category: TransactionCategory;

  @ApiPropertyOptional({
    description: 'Monto de la transacción para entrenamiento contextual',
    example: 450000,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'El monto debe ser un número válido' })
  @Min(0, { message: 'El monto no puede ser negativo' })
  @Type(() => Number)
  readonly amount?: number;

  @ApiPropertyOptional({
    description: 'Nivel de confianza en esta clasificación (0-1)',
    example: 0.95,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber({}, { message: 'La confianza debe ser un número válido' })
  @Min(0, { message: 'La confianza debe estar entre 0 y 1' })
  @Max(1, { message: 'La confianza debe estar entre 0 y 1' })
  @Type(() => Number)
  readonly confidence?: number;
}

/**
 * DTO para corregir clasificaciones incorrectas y mejorar el modelo
 * @version 2.0
 */
export class CorrectClassificationDto {
  @ApiProperty({
    description: 'Descripción original de la transacción mal clasificada',
    example: 'Compra ropa en mall Plaza Vespucio',
    minLength: 3,
    maxLength: 500,
  })
  @IsString()
  @Length(3, 500, { message: 'La descripción debe tener entre 3 y 500 caracteres' })
  @Transform(({ value }) => value?.trim())
  readonly description: string;

  @ApiProperty({
    description: 'Categoría correcta de la transacción',
    enum: TransactionCategory,
    example: TransactionCategory.VESTUARIO,
    enumName: 'TransactionCategory',
  })
  @IsEnum(TransactionCategory, { 
    message: `La categoría debe ser una de: ${Object.values(TransactionCategory).join(', ')}` 
  })
  readonly correctCategory: TransactionCategory;

  @ApiPropertyOptional({
    description: 'Categoría incorrecta que había sido asignada',
    enum: TransactionCategory,
    example: TransactionCategory.ENTRETENIMIENTO,
    enumName: 'TransactionCategory',
  })
  @IsOptional()
  @IsEnum(TransactionCategory, { 
    message: `La categoría debe ser una de: ${Object.values(TransactionCategory).join(', ')}` 
  })
  readonly incorrectCategory?: TransactionCategory;

  @ApiPropertyOptional({
    description: 'Notas adicionales sobre la corrección',
    example: 'Era ropa, no entretenimiento',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @Length(0, 200, { message: 'Las notas no pueden exceder 200 caracteres' })
  @Transform(({ value }) => value?.trim())
  readonly notes?: string;
}

/**
 * DTO para respuesta de clasificación
 * @version 2.0
 */
export class ClassificationResultDto {
  @ApiProperty({
    description: 'Categoría predicha por el modelo',
    enum: TransactionCategory,
    example: TransactionCategory.VIVIENDA,
  })
  readonly category: TransactionCategory;

  @ApiProperty({
    description: 'Nivel de confianza de la predicción (0-1)',
    example: 0.89,
    minimum: 0,
    maximum: 1,
  })
  readonly confidence: number;

  @ApiProperty({
    description: 'Palabras clave extraídas del texto',
    example: ['arriendo', 'departamento', 'pago'],
    type: [String],
  })
  readonly keywords: string[];

  @ApiPropertyOptional({
    description: 'Categorías alternativas con sus probabilidades',
    example: [
      { category: 'SERVICIOS', confidence: 0.15 },
      { category: 'VARIOS', confidence: 0.08 }
    ],
    type: 'array',
    items: {
      type: 'object',
      properties: {
        category: { type: 'string', enum: Object.values(TransactionCategory) },
        confidence: { type: 'number', minimum: 0, maximum: 1 }
      }
    }
  })
  readonly alternatives?: Array<{
    category: TransactionCategory;
    confidence: number;
  }>;

  @ApiPropertyOptional({
    description: 'Metadata adicional del procesamiento',
    example: {
      processingTime: 245,
      modelVersion: '2.1.0',
      tokensProcessed: 8
    }
  })
  readonly metadata?: {
    processingTime?: number;
    modelVersion?: string;
    tokensProcessed?: number;
    [key: string]: any;
  };
}
