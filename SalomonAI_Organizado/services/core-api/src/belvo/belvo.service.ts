import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { randomUUID } from 'crypto';

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

interface MockTransactionTemplate {
  description: string;
  amount: number;
  category: string;
  subcategory?: string;
  merchant: string;
  website?: string;
}

@Injectable()
export class BelvoService {
  private readonly logger = new Logger(BelvoService.name);
  private baseUrl: string;
  private secretId: string;
  private secretPassword: string;
  private readonly environment: string;
  private readonly useMocks: boolean;

  private readonly mockInstitutions: BelvoInstitution[] = [
    {
      id: 'mock_banco_salomondigital',
      name: 'Banco Salomón Digital',
      display_name: 'Banco Salomón Digital',
      type: 'bank',
      website: 'https://demo.salomon.ai',
      country_codes: ['CL'],
      primary_color: '#38bdf8',
      logo: 'https://placehold.co/64x64?text=SD',
    },
    {
      id: 'mock_finanzas_andinas',
      name: 'Finanzas Andinas',
      display_name: 'Finanzas Andinas',
      type: 'bank',
      website: 'https://demo.finanzasandinas.com',
      country_codes: ['CL', 'PE'],
      primary_color: '#6366f1',
      logo: 'https://placehold.co/64x64?text=FA',
    },
    {
      id: 'mock_ahorro_futuro',
      name: 'Ahorro Futuro',
      display_name: 'Ahorro Futuro',
      type: 'credit_union',
      website: 'https://demo.ahorrofuturo.com',
      country_codes: ['CL'],
      primary_color: '#f97316',
      logo: 'https://placehold.co/64x64?text=AF',
    },
  ];

  private readonly mockAccountTemplates = [
    {
      name: 'Cuenta Corriente Premium',
      type: 'checking',
      category: 'DEPOSIT_ACCOUNT',
    },
    {
      name: 'Tarjeta Crédito Travel',
      type: 'credit_card',
      category: 'CREDIT_CARD',
    },
  ];

  private readonly mockTransactions: MockTransactionTemplate[] = [
    { description: 'Pago supermercado Jumbo', amount: -54230, category: 'Food & Groceries', merchant: 'Jumbo' },
    { description: 'Suscripción Netflix', amount: -8990, category: 'Entertainment', merchant: 'Netflix' },
    { description: 'Pago Uber', amount: -3250, category: 'Transportation', merchant: 'Uber' },
    { description: 'Depósito sueldo empresa DemoCorp', amount: 1850000, category: 'Income', merchant: 'DemoCorp' },
    { description: 'Restaurant Peumayen', amount: -45990, category: 'Food & Groceries', merchant: 'Peumayen' },
    { description: 'Transferencia ahorro', amount: -150000, category: 'Transfer', merchant: 'Auto transferencia' },
    { description: 'Farmacia Salcobrand', amount: -18690, category: 'Health & Medical', merchant: 'Salcobrand' },
    { description: 'Intereses cuenta', amount: 1290, category: 'Interest', merchant: 'Banco Salomón Digital' },
  ];

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.environment = this.configService.get<string>('BELVO_ENVIRONMENT', 'sandbox');
    const configuredForMocks = this.configService.get<string>('BELVO_USE_MOCKS', 'true');
    const normalizedMockFlag = (configuredForMocks ?? '').toLowerCase();

    this.secretId = this.configService.get<string>('BELVO_SECRET_ID');
    this.secretPassword = this.configService.get<string>('BELVO_SECRET_PASSWORD');

    const missingCredentials = !this.secretId || !this.secretPassword;
    this.useMocks =
      normalizedMockFlag === 'true' ||
      normalizedMockFlag === '1' ||
      normalizedMockFlag === 'yes' ||
      missingCredentials;

    if (this.useMocks) {
      this.baseUrl = 'mock';
      this.secretId = '';
      this.secretPassword = '';
      this.logger.warn(
        'BelvoService ejecutándose en modo mock. Define BELVO_SECRET_ID, BELVO_SECRET_PASSWORD y BELVO_USE_MOCKS=false para activar la integración real.',
      );
    } else {
      this.baseUrl = this.environment === 'production' ? 'https://api.belvo.com' : 'https://sandbox.belvo.com';
    }
  }

  /**
   * Configuración base para peticiones HTTP a Belvo
   */
  private getRequestConfig() {
    if (this.useMocks) {
      throw new HttpException('La integración real de Belvo está deshabilitada en modo demo.', HttpStatus.NOT_IMPLEMENTED);
    }

    const auth = Buffer.from(`${this.secretId}:${this.secretPassword}`).toString('base64');

    return {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
        'User-Agent': 'SalomonAI/1.0',
      },
    };
  }

  /**
   * Obtener lista de instituciones bancarias disponibles
   */
  async getInstitutions(countryCode: string = 'CL'): Promise<BelvoInstitution[]> {
    if (this.useMocks) {
      return this.mockInstitutions.filter(inst => inst.country_codes.includes(countryCode));
    }

    try {
      const config = this.getRequestConfig();
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/api/institutions/?country_code=${countryCode}`,
          config,
        ),
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
    if (this.useMocks) {
      const now = new Date().toISOString();
      return {
        id: `mock-link-${randomUUID()}`,
        institution,
        access_mode: 'single',
        last_accessed_at: now,
        status: 'active',
        created_by: username,
        external_id: externalId ?? username,
      };
    }

    try {
      const config = this.getRequestConfig();
      const payload = {
        institution,
        username,
        password,
        ...(externalId && { external_id: externalId }),
      };

      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/api/links/`, payload, config),
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
    if (this.useMocks) {
      return this.mockAccountTemplates.map((template, index) => {
        const now = new Date();
        return {
          id: `${linkId}-account-${index + 1}`,
          link: linkId,
          institution: {
            name: 'Banco Salomón Digital',
            type: 'bank',
          },
          collected_at: now.toISOString(),
          category: template.category,
          type: template.type,
          name: template.name,
          number: `****${(1000 + index * 37).toString().slice(-4)}`,
          balance: {
            current: index === 0 ? 1289450 : -235000,
            available: index === 0 ? 1245000 : -220000,
          },
          currency: 'CLP',
          bank_product_id: `${linkId}-product-${index + 1}`,
          internal_identification: randomUUID(),
          public_identification_name: 'RUT',
          public_identification_value: '12.345.678-9',
          last_accessed_at: now.toISOString(),
          credit_data: null,
          loan_data: null,
        } satisfies BelvoAccount;
      });
    }

    try {
      const config = this.getRequestConfig();
      const payload = { link: linkId };

      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/api/accounts/`, payload, config),
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
    if (this.useMocks) {
      return this.generateMockTransactions(linkId, dateFrom, dateTo, accountId);
    }

    try {
      const config = this.getRequestConfig();
      const payload: any = {
        link: linkId,
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo && { date_to: dateTo }),
        ...(accountId && { account: accountId }),
      };

      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/api/transactions/`, payload, config),
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
    if (this.useMocks) {
      return this.generateMockBalances(linkId, accountId);
    }

    try {
      const config = this.getRequestConfig();
      const payload: any = {
        link: linkId,
        ...(accountId && { account: accountId }),
      };

      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/api/balances/`, payload, config),
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
    if (this.useMocks) {
      this.logger.log(`Eliminando link mock ${linkId}`);
      return;
    }

    try {
      const config = this.getRequestConfig();
      await firstValueFrom(
        this.httpService.delete(`${this.baseUrl}/api/links/${linkId}/`, config),
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
    if (this.useMocks) {
      const now = new Date().toISOString();
      return {
        id: linkId,
        institution: 'mock_banco_salomondigital',
        access_mode: 'single',
        last_accessed_at: now,
        status: 'active',
        created_by: 'salomon-demo',
        external_id: 'salomon-demo',
      };
    }

    try {
      const config = this.getRequestConfig();
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/links/${linkId}/`, config),
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
    if (this.useMocks) {
      const today = new Date();
      const dateTo = today.toISOString().split('T')[0];
      const dateFrom = new Date(today.getTime() - days * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];
      return this.getTransactions(linkId, dateFrom, dateTo);
    }

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
      Transportation: 'Transporte',
      Shopping: 'Compras',
      Entertainment: 'Entretenimiento',
      'Bills & Utilities': 'Servicios',
      'Health & Medical': 'Salud',
      Education: 'Educación',
      Travel: 'Viajes',
      Investment: 'Inversiones',
      Income: 'Ingresos',
      Transfer: 'Transferencias',
      ATM: 'Cajero Automático',
      Fee: 'Comisiones',
      Interest: 'Intereses',
    };

    return categoryMap[belvoCategory] || 'Otros';
  }

  private generateMockTransactions(
    linkId: string,
    dateFrom?: string,
    dateTo?: string,
    accountId?: string,
  ): BelvoTransaction[] {
    const fromDate = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = dateTo ? new Date(dateTo) : new Date();

    const totalDays = Math.max(1, Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)));

    return this.mockTransactions.map((template, index) => {
      const dayOffset = Math.floor((index / this.mockTransactions.length) * totalDays);
      const transactionDate = new Date(toDate.getTime() - dayOffset * 24 * 60 * 60 * 1000);
      const accountIdentifier = accountId ?? `${linkId}-account-${(index % this.mockAccountTemplates.length) + 1}`;

      return {
        id: `${linkId}-txn-${index}-${randomUUID()}`,
        account: accountIdentifier,
        collected_at: transactionDate.toISOString(),
        value_date: transactionDate.toISOString().split('T')[0],
        accounting_date: transactionDate.toISOString().split('T')[0],
        amount: template.amount,
        currency: 'CLP',
        description: template.description,
        observations: '',
        merchant: {
          name: template.merchant,
          website: template.website ?? '',
        },
        category: template.category,
        subcategory: template.subcategory ?? template.category,
        reference: `REF-${transactionDate.getTime()}`,
        type: template.amount >= 0 ? 'income' : 'expense',
        status: 'processed',
        internal_identification: randomUUID(),
        balance: template.amount,
      };
    });
  }

  private generateMockBalances(linkId: string, accountId?: string) {
    const accounts = this.mockAccountTemplates.map((template, index) => {
      const baseId = `${linkId}-account-${index + 1}`;
      return {
        account: baseId,
        current_balance: index === 0 ? 1289450 : -235000,
        available_balance: index === 0 ? 1245000 : -220000,
        currency: 'CLP',
        collected_at: new Date().toISOString(),
        type: template.type,
      };
    });

    if (accountId) {
      return accounts.filter(account => account.account === accountId);
    }

    return accounts;
  }
}
