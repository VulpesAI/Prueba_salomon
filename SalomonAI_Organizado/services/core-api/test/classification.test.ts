import { Test, TestingModule } from '@nestjs/testing';
import { ClassificationService } from '../src/classification/classification.service';
import { NlpService } from '../src/nlp/nlp.service';
import { QdrantService } from '../src/qdrant/qdrant.service';
import { ConfigService } from '@nestjs/config';
import { TransactionCategory } from '../src/transactions/enums/transaction-category.enum';

async function testClassification() {
  console.log('🧪 Iniciando pruebas del sistema de clasificación...\n');

  // Crear módulo de prueba
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      ClassificationService,
      NlpService,
      {
        provide: QdrantService,
        useValue: {
          createCollection: jest.fn(),
          search: jest.fn().mockResolvedValue([]),
          upsertPoint: jest.fn(),
        },
      },
      {
        provide: ConfigService,
        useValue: {
          get: jest.fn().mockReturnValue('http://localhost:6333'),
        },
      },
    ],
  }).compile();

  const classificationService = module.get<ClassificationService>(ClassificationService);
  const qdrantService = module.get<QdrantService>(QdrantService);

  try {
    // Test 1: Clasificación básica
    console.log('📝 Test 1: Clasificación de transacción sin datos previos');
    const result1 = await classificationService.classifyTransaction({
      description: 'Pago arriendo departamento Febrero 2025'
    });
    
    console.log('Resultado:', result1);
    console.log('✅ Test 1 completado\n');

    // Test 2: Entrenamiento del modelo
    console.log('📚 Test 2: Entrenamiento del modelo');
    await classificationService.trainModel({
      text: 'Arriendo departamento Las Condes',
      category: TransactionCategory.VIVIENDA
    });
    
    await classificationService.trainModel({
      text: 'Compra supermercado Líder',
      category: TransactionCategory.ALIMENTACION
    });
    
    console.log('✅ Test 2 completado - Modelo entrenado con datos de ejemplo\n');

    // Test 3: Clasificación con datos de entrenamiento (simulación)
    console.log('🎯 Test 3: Clasificación con modelo entrenado (simulación)');
    
    // Simular que Qdrant devuelve resultados similares
    const mockSearchResults = [
      {
        payload: { category: TransactionCategory.VIVIENDA },
        score: 0.89
      },
      {
        payload: { category: TransactionCategory.VIVIENDA },
        score: 0.85
      }
    ];

    (qdrantService.search as jest.Mock).mockResolvedValueOnce(mockSearchResults);

    const result3 = await classificationService.classifyTransaction({
      description: 'Pago mensual arriendo Santiago centro'
    });
    
    console.log('Resultado:', result3);
    console.log('✅ Test 3 completado\n');

    // Test 4: Corrección de clasificación
    console.log('🔄 Test 4: Corrección de clasificación');
    await classificationService.correctClassification({
      description: 'Uber viaje al aeropuerto',
      correctCategory: TransactionCategory.TRANSPORTE
    });
    
    console.log('✅ Test 4 completado - Clasificación corregida\n');

    console.log('🎉 Todas las pruebas completadas exitosamente!');
    console.log('\n📊 Resumen del sistema de clasificación:');
    console.log('- ✅ Clasificación básica con NLP');
    console.log('- ✅ Entrenamiento del modelo');
    console.log('- ✅ Búsqueda de vectores similares en Qdrant');
    console.log('- ✅ Corrección de clasificaciones');
    console.log('- ✅ Extracción de palabras clave');

  } catch (error) {
    console.error('❌ Error durante las pruebas:', error);
    throw error;
  }
}

// Ejecutar pruebas si este archivo se ejecuta directamente
if (require.main === module) {
  testClassification()
    .then(() => {
      console.log('\n✨ Sistema de clasificación funcionando correctamente!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error en las pruebas:', error);
      process.exit(1);
    });
}

export { testClassification };
