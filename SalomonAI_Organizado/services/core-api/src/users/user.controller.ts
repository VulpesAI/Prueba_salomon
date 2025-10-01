import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  ParseUUIDPipe,
  ParseIntPipe,
  ParseFilePipe,
  MaxFileSizeValidator,
  HttpCode,
  Logger,
  HttpStatus,
  UseInterceptors,
  InternalServerErrorException,
  UploadedFile,
  UseGuards,
  FileTypeValidator,
  Inject,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FileInterceptor } from '@nestjs/platform-express';
import { firstValueFrom } from 'rxjs';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { KAFKA_SERVICE, KafkaProducerService } from '../kafka/kafka.tokens';
import { QueryDto } from './dto/query.dto';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from './entities/user.entity';

@Controller('users')
@UseGuards(JwtAuthGuard) // Protegemos todos los endpoints de este controlador
export class UserController {
  private readonly logger = new Logger(UserController.name);
  constructor(
    private readonly userService: UserService,
    @Inject(KAFKA_SERVICE)
    private readonly kafkaService: KafkaProducerService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  // El registro de usuarios ahora se maneja a través de `POST /auth/register`
  // El `findAll` es una función de administrador y se elimina por seguridad.

  @Get('me')
  getProfile(@GetUser() user: User) {
    // El decorador @GetUser nos da el usuario completo gracias a JwtStrategy
    // Devolvemos el usuario sin la contraseña hasheada
    const { passwordHash, ...result } = user;
    return result;
  }

  @Patch('me')
  updateProfile(@GetUser() user: User, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(user.id, updateUserDto);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAccount(@GetUser() user: User) {
    return this.userService.remove(user.id);
  }

  @Post('me/documents')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.ACCEPTED)
  async uploadDocument(
    @GetUser() user: User,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({
            fileType:
              /(text\/csv|application\/pdf|application\/vnd.ms-excel|application\/vnd.openxmlformats-officedocument.spreadsheetml.sheet)/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    // 1. Guardar el archivo en un volumen compartido para que el parser lo pueda leer
    const uploadPath = this.configService.get<string>('UPLOADS_PATH');
    if (!uploadPath) {
      throw new InternalServerErrorException(
        'La ruta de carga de archivos no está configurada.',
      );
    }

    const fileExtension = path.extname(file.originalname);
    const uniqueFileName = `${uuidv4()}${fileExtension}`;
    const fullFilePath = path.join(uploadPath, uniqueFileName);

    await fs.mkdir(uploadPath, { recursive: true });
    await fs.writeFile(fullFilePath, file.buffer);

    // 2. Enviar la ruta del archivo y metadata a Kafka
    const messagePayload = {
      type: 'file_document',
      userId: user.id, // Usamos el ID del usuario autenticado
      originalFileName: file.originalname,
      filePath: fullFilePath,
      mimeType: file.mimetype,
    };

    // 3. Producir el evento
    await this.kafkaService.produce({
      topic: this.configService.get<string>('KAFKA_TOPIC'),
      messages: [{ value: JSON.stringify(messagePayload) }],
    });

    return { message: 'Documento recibido y en cola para procesamiento.' };
  }

  @Post('me/query')
  async handleQuery(@GetUser() user: User, @Body() queryDto: QueryDto) {
    const nlpEngineUrl = this.configService.get<string>('NLP_ENGINE_URL');
    if (!nlpEngineUrl) {
      throw new InternalServerErrorException(
        'La URL del servicio de NLP no está configurada.',
      );
    }

    const payload = {
      userId: user.id,
      query: queryDto.query,
    };

    // Usamos el HttpService para llamar al microservicio de NLP
    const response = await firstValueFrom(
      this.httpService.post(`${nlpEngineUrl}/query`, payload),
    );

    return response.data;
  }

  @Post('me/sync')
  @HttpCode(HttpStatus.ACCEPTED)
  async syncAccounts(@GetUser() user: User) {
    const connectorUrl =
      this.configService.get<string>('FINANCIAL_CONNECTOR_URL');
    if (!connectorUrl) {
      throw new InternalServerErrorException(
        'La URL del servicio de conexión financiera no está configurada.',
      );
    }

    // No esperamos la respuesta completa, solo iniciamos el proceso.
    // El conector trabajará de forma asíncrona.
    firstValueFrom(
      this.httpService.post(`${connectorUrl}/sync/${user.id}`),
    ).catch((err) => {
      this.logger.error(
        `Error al iniciar la sincronización para el usuario ${user.id}`,
        err.stack,
      );
    });

    return {
      message:
        'Solicitud de sincronización recibida. Las transacciones se procesarán en segundo plano.',
    };
  }

  @Get('me/tax-analysis/:year')
  async getTaxAnalysis(
    @GetUser() user: User,
    @Param('year', ParseIntPipe) year: number,
  ) {
    const taxEngineUrl = this.configService.get<string>('TAX_ENGINE_URL');
    if (!taxEngineUrl) {
      throw new InternalServerErrorException(
        'La URL del servicio de impuestos no está configurada.',
      );
    }

    const response = await firstValueFrom(
      this.httpService.get(`${taxEngineUrl}/analysis/${user.id}/${year}`),
    );
    return response.data;
  }

  @Get('me/recommendations')
  async getRecommendations(@GetUser() user: User) {
    const riskEngineUrl = this.configService.get<string>('RISK_ENGINE_URL');
    const recommendationEngineUrl = this.configService.get<string>(
      'RECOMMENDATION_ENGINE_URL',
    );

    if (!riskEngineUrl || !recommendationEngineUrl) {
      throw new InternalServerErrorException(
        'Las URLs de los servicios de riesgo o recomendación no están configuradas.',
      );
    }

    // La lógica para llamar a los motores de riesgo y recomendación iría aquí...
    // Por ahora, devolvemos un placeholder.
    return { message: 'Funcionalidad de recomendaciones en desarrollo.' };
  }
}
