import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ClassificationService } from '../src/classification/classification.service';

async function testApp() {
  try {
    // Crear la aplicación
    const app = await NestFactory.create(AppModule);
    
    // Obtener el servicio de clasificación
    const classificationService = app.get(ClassificationService);
    
    console.log('🚀 Iniciando prueba de clasificación...');
    
    // Probar clasificación básica
    const result = await classificationService.classifyTransaction({
      description: 'Pago supermercado Jumbo Las Condes',
      amount: 85000,
    });
    
    console.log('✅ Resultado de clasificación:', result);
    
    // Cerrar la aplicación
    await app.close();
    
  } catch (error) {
    console.error('❌ Error en prueba:', error.message);
    process.exit(1);
  }
}

testApp();
