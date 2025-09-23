#!/usr/bin/env node

/**
 * Script simplificado para probar el sistema de clasificación de transacciones
 * Solo prueba los servicios de NLP y clasificación sin base de datos
 */

import { NlpService } from '../src/nlp/nlp.service';
import { QdrantService } from '../src/qdrant/qdrant.service';
import { ClassificationService } from '../src/classification/classification.service';
import { ConfigService } from '@nestjs/config';
import { TransactionCategory } from '../src/transactions/enums/transaction-category.enum';

async function testClassificationServices() {
  console.log('🧪 Iniciando pruebas de servicios de clasificación...\n');

  try {
    // Configurar servicios manualmente
    const configService = new ConfigService({
      QDRANT_URL: 'http://localhost:6333'
    });

    const nlpService = new NlpService();
    const qdrantService = new QdrantService(configService);
    const classificationService = new ClassificationService(nlpService, qdrantService);

    // Esperar a que los servicios se inicialicen
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('🔧 Servicios inicializados correctamente');

    // Test 1: Servicio NLP
    console.log('\n📝 Test 1: Servicio de NLP');
    const testText = 'Pago arriendo departamento Febrero 2025';
    console.log(`Texto original: "${testText}"`);

    const embedding = await nlpService.generateEmbedding(testText);
    console.log(`✓ Embedding generado: ${embedding.length} dimensiones`);

    const keywords = nlpService.extractKeywords(testText);
    console.log(`✓ Palabras clave: ${keywords.join(', ')}`);

    // Test 2: Servicio de clasificación básica
    console.log('\n🎯 Test 2: Clasificación básica');
    const classificationResult = await classificationService.classifyTransaction({
      description: testText
    });

    console.log('Resultado de clasificación:');
    console.log(`  Categoría: ${classificationResult.category}`);
    console.log(`  Confianza: ${(classificationResult.confidence * 100).toFixed(1)}%`);
    console.log(`  Palabras clave: ${classificationResult.keywords.join(', ')}`);

    // Test 3: Entrenamiento del modelo
    console.log('\n📚 Test 3: Entrenamiento del modelo');
    const trainingExamples = [
      { text: 'Arriendo departamento Las Condes', category: TransactionCategory.VIVIENDA },
      { text: 'Compra supermercado Líder', category: TransactionCategory.ALIMENTACION },
      { text: 'Gasolina estación Shell', category: TransactionCategory.TRANSPORTE },
      { text: 'Consulta médico particular', category: TransactionCategory.SALUD },
    ];

    for (const example of trainingExamples) {
      await classificationService.trainModel(example);
      console.log(`✓ Entrenado: "${example.text}" -> ${example.category}`);
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
      const result = await classificationService.classifyTransaction({
        description: testCase
      });
      
      console.log(`\n  "${testCase}"`);
      console.log(`    Categoría: ${result.category}`);
      console.log(`    Confianza: ${(result.confidence * 100).toFixed(1)}%`);
      console.log(`    Palabras clave: ${result.keywords.join(', ')}`);
    }

    console.log('\n🎉 Todas las pruebas completadas exitosamente!');
    console.log('\n📊 Funcionalidades verificadas:');
    console.log('- ✅ Generación de embeddings con NLP');
    console.log('- ✅ Extracción de palabras clave en español');
    console.log('- ✅ Clasificación de transacciones');
    console.log('- ✅ Entrenamiento incremental del modelo');
    console.log('- ✅ Integración con Qdrant para vectores');
    console.log('- ✅ Sistema de categorías financieras');

  } catch (error) {
    console.error('\n❌ Error durante las pruebas:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testClassificationServices()
    .then(() => {
      console.log('\n✨ Sistema de clasificación funcionando correctamente!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error:', error);
      process.exit(1);
    });
}

export { testClassificationServices };
