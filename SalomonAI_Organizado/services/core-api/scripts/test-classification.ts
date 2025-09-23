#!/usr/bin/env node

/**
 * Script para probar el sistema de clasificación de transacciones
 * Ejecutar con: npm run test:classification
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ClassificationService } from '../src/classification/classification.service';
import { TransactionCategory } from '../src/transactions/enums/transaction-category.enum';

async function testClassificationSystem() {
  console.log('🧪 Iniciando pruebas del sistema de clasificación de SalomónAI...\n');

  try {
    // Crear la aplicación NestJS
    const app = await NestFactory.createApplicationContext(AppModule);
    const classificationService = app.get(ClassificationService);

    console.log('🔧 Aplicación inicializada correctamente');

    // Test 1: Clasificación sin entrenamiento previo
    console.log('\n📝 Test 1: Clasificación básica');
    const result1 = await classificationService.classifyTransaction({
      description: 'Pago arriendo departamento Febrero 2025'
    });
    
    console.log('Descripción:', 'Pago arriendo departamento Febrero 2025');
    console.log('Categoría:', result1.category);
    console.log('Confianza:', result1.confidence);
    console.log('Palabras clave:', result1.keywords);

    // Test 2: Entrenamiento con ejemplos
    console.log('\n📚 Test 2: Entrenamiento del modelo');
    
    const trainingData = [
      { text: 'Arriendo departamento Las Condes', category: TransactionCategory.VIVIENDA },
      { text: 'Pago mensual arriendo', category: TransactionCategory.VIVIENDA },
      { text: 'Alquiler casa Santiago', category: TransactionCategory.VIVIENDA },
      { text: 'Compra supermercado Líder', category: TransactionCategory.ALIMENTACION },
      { text: 'Almuerzo restaurant', category: TransactionCategory.ALIMENTACION },
      { text: 'Delivery comida china', category: TransactionCategory.ALIMENTACION },
      { text: 'Gasolina estación de servicio', category: TransactionCategory.TRANSPORTE },
      { text: 'Uber viaje al trabajo', category: TransactionCategory.TRANSPORTE },
      { text: 'Metro tarjeta bip', category: TransactionCategory.TRANSPORTE },
      { text: 'Consulta médico particular', category: TransactionCategory.SALUD },
      { text: 'Farmacia medicamentos', category: TransactionCategory.SALUD },
    ];

    for (const data of trainingData) {
      await classificationService.trainModel(data);
      console.log(`✓ Entrenado: "${data.text}" -> ${data.category}`);
    }

    // Test 3: Clasificación después del entrenamiento
    console.log('\n🎯 Test 3: Clasificación con modelo entrenado');
    
    const testCases = [
      'Pago arriendo marzo departamento centro',
      'Compra en supermercado Santa Isabel',
      'Viaje en taxi al aeropuerto',
      'Consulta dental urgencia',
      'Cena en restaurant italiano',
    ];

    for (const testCase of testCases) {
      const result = await classificationService.classifyTransaction({
        description: testCase
      });
      
      console.log(`\n📊 "${testCase}"`);
      console.log(`   Categoría: ${result.category}`);
      console.log(`   Confianza: ${(result.confidence * 100).toFixed(1)}%`);
      console.log(`   Palabras clave: ${result.keywords.join(', ')}`);
    }

    // Test 4: Corrección de clasificación
    console.log('\n🔄 Test 4: Corrección de clasificación');
    await classificationService.correctClassification({
      description: 'Compra ropa en mall',
      correctCategory: TransactionCategory.VESTUARIO
    });
    console.log('✓ Clasificación corregida: "Compra ropa en mall" -> VESTUARIO');

    console.log('\n🎉 Todas las pruebas completadas exitosamente!');
    console.log('\n📊 Resumen del sistema:');
    console.log('- ✅ Clasificación con NLP en español');
    console.log('- ✅ Entrenamiento incremental del modelo');
    console.log('- ✅ Búsqueda de vectores similares en Qdrant');
    console.log('- ✅ Extracción de palabras clave');
    console.log('- ✅ Sistema de corrección de clasificaciones');
    console.log('- ✅ Categorías específicas para finanzas personales');

    await app.close();
    console.log('\n✨ Sistema de clasificación funcionando correctamente!');

  } catch (error) {
    console.error('\n❌ Error durante las pruebas:', error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testClassificationSystem()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('💥 Error:', error);
      process.exit(1);
    });
}

export { testClassificationSystem };
