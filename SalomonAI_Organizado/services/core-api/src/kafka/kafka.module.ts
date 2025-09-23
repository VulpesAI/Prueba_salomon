import { Module } from '@nestjs/common';
import { KafkaService } from './kafka.service';

@Module({
  providers: [KafkaService],
  exports: [KafkaService], // Exportamos el servicio para que otros módulos puedan usarlo
})
export class KafkaModule {}