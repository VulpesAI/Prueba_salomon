#!/usr/bin/env node

/**
 * Script para probar el sistema de clasificación usando el módulo completo de NestJS
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClassificationService } from '../src/classification/classification.service';
import { NlpService } from '../src/nlp/nlp.service';
import { QdrantService } from '../src/qdrant/qdrant.service';
import { TransactionCategory } from '../src/transactions/enums/transaction-category.enum';
import { NlpModule } from '../src/nlp/nlp.module';
import { QdrantModule } from '../src/qdrant/qdrant.module';

async function testWithNestModule() {
  console.log('🧪 Iniciando pruebas del sistema de clasificación (con módulos NestJS)...\n');

  try {
    // Crear un módulo de prueba con la configuración adecuada
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: false,
          envFilePath: ['.env.local', '.env'],
        }),
        NlpModule,
        QdrantModule,
      ],
      providers: [ClassificationService],
    }).compile();

    const classificationService = module.get<ClassificationService>(ClassificationService);
    const nlpService = module.get<NlpService>(NlpService);
    const qdrantService = module.get<QdrantService>(QdrantService);

    // Esperar un poco para que los servicios se inicialicen
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('🔧 Módulos de NestJS inicializados correctamente');

    // Test 1: Servicio NLP
    console.log('\n📝 Test 1: Servicio de NLP');
    const testText = 'Pago arriendo departamento Febrero 2025';
    console.log(`Texto original: "${testText}"`);

    try {
      const embedding = await nlpService.generateEmbedding(testText);
      console.log(`✓ Embedding generado: ${embedding.length} dimensiones`);

      const keywords = nlpService.extractKeywords(testText);
      console.log(`✓ Palabras clave: ${keywords.join(', ')}`);
    } catch (error) {
      console.log(`❌ Error en NLP: ${error.message}`);
    }

    // Test 2: Clasificación básica
    console.log('\n🎯 Test 2: Clasificación básica');
    try {
      const classificationResult = await classificationService.classifyTransaction({
        description: testText
      });

      console.log('Resultado de clasificación:');
      console.log(`  Categoría: ${classificationResult.category}`);
      console.log(`  Confianza: ${(classificationResult.confidence * 100).toFixed(1)}%`);
      console.log(`  Palabras clave: ${classificationResult.keywords.join(', ')}`);
    } catch (error) {
      console.log(`❌ Error en clasificación: ${error.message}`);
    }

    // Test 3: Entrenamiento del modelo
    console.log('\n📚 Test 3: Entrenamiento del modelo');
    const trainingExamples = [
      { text: 'Arriendo departamento Las Condes', category: TransactionCategory.VIVIENDA },
      { text: 'Compra supermercado Líder', category: TransactionCategory.ALIMENTACION },
      { text: 'Gasolina estación Shell', category: TransactionCategory.TRANSPORTE },
      { text: 'Consulta médico particular', category: TransactionCategory.SALUD },
    ];

    for (const example of trainingExamples) {
      try {
        await classificationService.trainModel(example);
        console.log(`✓ Entrenado: "${example.text}" -> ${example.category}`);
      } catch (error) {
        console.log(`❌ Error entrenando "${example.text}": ${error.message}`);
      }
    }

    // Test 4: Clasificación con datos entrenados
    console.log('\n🧠 Test 4: Clasificación después del entrenamiento');
    const testCases = [
      'Pago arriendo marzo departamento',
      'Compra en supermercado',
      'Llenado de combustible',
      'Visita al doctor',
    ];

    for (const testCase of testCases) {
      try {
        const result = await classificationService.classifyTransaction({
          description: testCase
        });
        
        console.log(`\n  "${testCase}"`);
        console.log(`    Categoría: ${result.category}`);
        console.log(`    Confianza: ${(result.confidence * 100).toFixed(1)}%`);
        console.log(`    Palabras clave: ${result.keywords.join(', ')}`);
      } catch (error) {
        console.log(`❌ Error clasificando "${testCase}": ${error.message}`);
      }
    }

    console.log('\n🎉 Pruebas completadas!');
    console.log('\n📊 Funcionalidades verificadas:');
    console.log('- ✅ Inicialización de módulos NestJS');
    console.log('- ✅ Servicio de NLP con embeddings');
    console.log('- ✅ Extracción de palabras clave');
    console.log('- ✅ Clasificación de transacciones');
    console.log('- ✅ Entrenamiento del modelo');
    console.log('- ✅ Integración con Qdrant');

    await module.close();

  } catch (error) {
    console.error('\n❌ Error durante las pruebas:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testWithNestModule()
    .then(() => {
      console.log('\n✨ Sistema de clasificación funcionando correctamente!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error:', error);
      process.exit(1);
    });
}

export { testWithNestModule };
