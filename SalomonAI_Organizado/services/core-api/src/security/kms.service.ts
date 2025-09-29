import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class KmsService {
  private readonly logger = new Logger(KmsService.name);

  constructor(private readonly configService: ConfigService) {}

  private async decrypt(ciphertext: string): Promise<string> {
    const endpoint = this.configService.get<string>('KMS_ENDPOINT');
    if (!endpoint) {
      return Buffer.from(ciphertext, 'base64').toString('utf8');
    }

    try {
      const response = await axios.post(
        `${endpoint.replace(/\/$/, '')}/decrypt`,
        { ciphertext },
        {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.configService.get<string>('KMS_API_KEY') ?? '',
          },
        },
      );
      if (response.data?.plaintext) {
        return response.data.plaintext as string;
      }
    } catch (error) {
      this.logger.warn(`Fallo al llamar al KMS remoto: ${error}`);
    }

    return Buffer.from(ciphertext, 'base64').toString('utf8');
  }

  async getSecret(secretName: string): Promise<string | undefined> {
    const directValue = this.configService.get<string>(secretName);
    if (directValue) {
      return directValue;
    }

    const ciphertext = this.configService.get<string>(`${secretName}_CIPHERTEXT`);
    if (!ciphertext) {
      return undefined;
    }

    return this.decrypt(ciphertext);
  }
}

