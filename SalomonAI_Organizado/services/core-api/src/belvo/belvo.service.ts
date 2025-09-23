import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface BelvoInstitution {
  id: string;
  name: string;
  type: string;
  website: string;
  display_name: string;
  country_codes: string[];
  primary_color: string;
  logo: string;
}

export interface BelvoLink {
  id: string;
  institution: string;
  access_mode: string;
  last_accessed_at: string;
  status: string;
  created_by: string;
  external_id: string;
}

export interface BelvoAccount {
  id: string;
  link: string;
  institution: {
    name: string;
    type: string;
  };
  collected_at: string;
  category: string;
  type: string;
  name: string;
  number: string;
  balance: {
    current: number;
    available: number;
  };
  currency: string;
  bank_product_id: string;
  internal_identification: string;
  public_identification_name: string;
  public_identification_value: string;
  last_accessed_at: string;
  credit_data: any;
  loan_data: any;
}

export interface BelvoTransaction {
  id: string;
  account: string;
  collected_at: string;
  value_date: string;
  accounting_date: string;
  amount: number;
  currency: string;
  description: string;
  observations: string;
  merchant: {
    name: string;
    website: string;
  };
  category: string;
  subcategory: string;
  reference: string;
  type: string;
  status: string;
  internal_identification: string;
  balance: number;
}

@Injectable()
export class BelvoService {
  private readonly baseUrl: string;
  private readonly secretId: string;
  private readonly secretPassword: string;
  private readonly environment: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.environment = this.configService.get<string>('BELVO_ENVIRONMENT', 'sandbox');
    this.baseUrl = this.environment === 'production' 
      ? 'https://api.belvo.com' 
      : 'https://sandbox.belvo.com';
    
    this.secretId = this.configService.get<string>('BELVO_SECRET_ID');
    this.secretPassword = this.configService.get<string>('BELVO_SECRET_PASSWORD');

    if (!this.secretId || !this.secretPassword) {
      throw new Error('Belvo credentials not configured. Please set BELVO_SECRET_ID and BELVO_SECRET_PASSWORD');
    }
  }

  /**
   * Configuración base para peticiones HTTP a Belvo
   */
  private getRequestConfig() {
    const auth = Buffer.from(`${this.secretId}:${this.secretPassword}`).toString('base64');
    
    return {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'User-Agent': 'SalomonAI/1.0',
      },
    };
  }

  /**
   * Obtener lista de instituciones bancarias disponibles
   */
  async getInstitutions(countryCode: string = 'CL'): Promise<BelvoInstitution[]> {
    try {
      const config = this.getRequestConfig();
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/api/institutions/?country_code=${countryCode}`,
          config
        )
      );

      return response.data.results;
    } catch (error) {
      throw new HttpException(
        `Error obteniendo instituciones: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Crear un link para conectar una cuenta bancaria
   */
  async createLink(
    institution: string,
    username: string,
    password: string,
    externalId?: string,
  ): Promise<BelvoLink> {
    try {
      const config = this.getRequestConfig();
      const payload = {
        institution,
        username,
        password,
        ...(externalId && { external_id: externalId }),
      };

      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/api/links/`, payload, config)
      );

      return response.data;
    } catch (error) {
      throw new HttpException(
        `Error creando link bancario: ${error.response?.data?.message || error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Obtener cuentas de un link específico
   */
  async getAccounts(linkId: string): Promise<BelvoAccount[]> {
    try {
      const config = this.getRequestConfig();
      const payload = { link: linkId };

      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/api/accounts/`, payload, config)
      );

      return response.data;
    } catch (error) {
      throw new HttpException(
        `Error obteniendo cuentas: ${error.response?.data?.message || error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Obtener transacciones de una cuenta específica
   */
  async getTransactions(
    linkId: string,
    dateFrom?: string,
    dateTo?: string,
    accountId?: string,
  ): Promise<BelvoTransaction[]> {
    try {
      const config = this.getRequestConfig();
      const payload: any = {
        link: linkId,
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo && { date_to: dateTo }),
        ...(accountId && { account: accountId }),
      };

      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/api/transactions/`, payload, config)
      );

      return response.data;
    } catch (error) {
      throw new HttpException(
        `Error obteniendo transacciones: ${error.response?.data?.message || error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Obtener balance actual de una cuenta
   */
  async getBalances(linkId: string, accountId?: string): Promise<any[]> {
    try {
      const config = this.getRequestConfig();
      const payload: any = {
        link: linkId,
        ...(accountId && { account: accountId }),
      };

      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/api/balances/`, payload, config)
      );

      return response.data;
    } catch (error) {
      throw new HttpException(
        `Error obteniendo balances: ${error.response?.data?.message || error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Eliminar un link bancario
   */
  async deleteLink(linkId: string): Promise<void> {
    try {
      const config = this.getRequestConfig();
      await firstValueFrom(
        this.httpService.delete(`${this.baseUrl}/api/links/${linkId}/`, config)
      );
    } catch (error) {
      throw new HttpException(
        `Error eliminando link: ${error.response?.data?.message || error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Verificar el estado de un link
   */
  async getLinkStatus(linkId: string): Promise<BelvoLink> {
    try {
      const config = this.getRequestConfig();
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/links/${linkId}/`, config)
      );

      return response.data;
    } catch (error) {
      throw new HttpException(
        `Error verificando link: ${error.response?.data?.message || error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Sincronizar transacciones más recientes
   */
  async syncRecentTransactions(linkId: string, days: number = 30): Promise<BelvoTransaction[]> {
    const dateTo = new Date().toISOString().split('T')[0];
    const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    return this.getTransactions(linkId, dateFrom, dateTo);
  }

  /**
   * Convertir transacción Belvo a formato interno
   */
  convertBelvoTransaction(belvoTransaction: BelvoTransaction, userId: string): any {
    return {
      userId,
      description: belvoTransaction.description || 'Transacción bancaria',
      amount: belvoTransaction.amount,
      currency: belvoTransaction.currency,
      transactionDate: new Date(belvoTransaction.value_date),
      category: this.mapBelvoCategory(belvoTransaction.category),
      externalId: belvoTransaction.id,
      source: 'belvo',
      metadata: {
        belvoId: belvoTransaction.id,
        accountId: belvoTransaction.account,
        merchant: belvoTransaction.merchant,
        subcategory: belvoTransaction.subcategory,
        reference: belvoTransaction.reference,
        status: belvoTransaction.status,
        balance: belvoTransaction.balance,
      },
    };
  }

  /**
   * Mapear categorías de Belvo a nuestras categorías internas
   */
  private mapBelvoCategory(belvoCategory: string): string {
    const categoryMap: { [key: string]: string } = {
      'Food & Groceries': 'Alimentación',
      'Transportation': 'Transporte',
      'Shopping': 'Compras',
      'Entertainment': 'Entretenimiento',
      'Bills & Utilities': 'Servicios',
      'Health & Medical': 'Salud',
      'Education': 'Educación',
      'Travel': 'Viajes',
      'Investment': 'Inversiones',
      'Income': 'Ingresos',
      'Transfer': 'Transferencias',
      'ATM': 'Cajero Automático',
      'Fee': 'Comisiones',
      'Interest': 'Intereses',
    };

    return categoryMap[belvoCategory] || 'Otros';
  }
}
