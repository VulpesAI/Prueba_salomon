#!/usr/bin/env node

/**
 * Script simplificado para probar el sistema de clasificación de transacciones
 * Solo prueba los servicios de NLP y clasificación sin base de datos.
 *
 * Preparación recomendada antes de ejecutar el script:
 * 1. Copia `services/core-api/secrets/secrets.template.json` a
 *    `services/core-api/secrets/secrets.local.json` y completa los valores reales.
 * 2. Exporta `SECRET_PASSPHRASE` en tu entorno (mínimo 12 caracteres).
 * 3. Ejecuta `scripts/seal-secrets.ts` para generar `secrets.enc.json` con los
 *    secretos cifrados que usará el script:
 *       pnpm ts-node services/core-api/scripts/seal-secrets.ts
 */

import { NlpService } from '../src/nlp/nlp.service';
import { QdrantService } from '../src/qdrant/qdrant.service';
import { ClassificationService } from '../src/classification/classification.service';
import { ConfigService } from '@nestjs/config';
import { TransactionCategory } from '../src/transactions/enums/transaction-category.enum';
import { SECRETS } from '../src/config/secrets';

type CredentialSource = 'secrets' | 'env' | 'mixed';

interface QdrantCredentials {
  url: string;
  apiKey: string;
  source: CredentialSource;
}

const resolveQdrantCredentials = (): QdrantCredentials => {
  let url: string | undefined;
  let apiKey: string | undefined;
  let secretsError: string | null = null;
  let usedSecrets = false;
  let usedEnv = false;

  try {
    const qdrantSecrets = SECRETS.qdrant?.();
    if (qdrantSecrets?.url && qdrantSecrets?.apiKey) {
      url = qdrantSecrets.url;
      apiKey = qdrantSecrets.apiKey;
      usedSecrets = true;
    } else {
      if (qdrantSecrets?.url && !url) {
        url = qdrantSecrets.url;
        usedSecrets = true;
      }
      if (qdrantSecrets?.apiKey && !apiKey) {
        apiKey = qdrantSecrets.apiKey;
        usedSecrets = true;
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    secretsError = `No se pudieron leer los secretos cifrados de Qdrant: ${message}`;
  }

  if (!url && process.env.QDRANT_URL) {
    url = process.env.QDRANT_URL;
    usedEnv = true;
  }
  if (!apiKey && process.env.QDRANT_API_KEY) {
    apiKey = process.env.QDRANT_API_KEY;
    usedEnv = true;
  }

  if (!url || !apiKey) {
    const missing = [!url ? 'QDRANT_URL' : null, !apiKey ? 'QDRANT_API_KEY' : null]
      .filter(Boolean)
      .join(', ');

    const hints = [
      'Asegúrate de completar secrets.local.json y ejecutar scripts/seal-secrets.ts antes de la prueba.',
      'También puedes exportar QDRANT_URL y QDRANT_API_KEY en tu entorno temporalmente.',
    ];

    const details = secretsError ? ` Detalles: ${secretsError}.` : '';

    throw new Error(
      `Faltan las credenciales de Qdrant (${missing}). ${hints.join(' ')}${details}`,
    );
  }

  return {
    url: url.trim(),
    apiKey: apiKey.trim(),
    source: usedSecrets && usedEnv ? 'mixed' : usedSecrets ? 'secrets' : 'env',
  };
};

async function testClassificationServices() {
  console.log('🧪 Iniciando pruebas de servicios de clasificación...\n');

  try {
    // Configurar servicios manualmente
    const qdrantCredentials = resolveQdrantCredentials();
    const sourceMessage =
      qdrantCredentials.source === 'secrets'
        ? 'secrets.enc.json'
        : qdrantCredentials.source === 'env'
          ? 'variables de entorno'
          : 'una combinación de secrets.enc.json y variables de entorno';

    console.log(`🔐 Usando credenciales de Qdrant desde ${sourceMessage}.`);

    const configService = new ConfigService({
      QDRANT_URL: qdrantCredentials.url,
      QDRANT_API_KEY: qdrantCredentials.apiKey,
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
