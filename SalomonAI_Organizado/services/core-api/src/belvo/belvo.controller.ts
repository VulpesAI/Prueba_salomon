import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BelvoService } from './belvo.service';
import { BankConnectionService, CreateBankConnectionDto } from './bank-connection.service';

@Controller('belvo')
@UseGuards(JwtAuthGuard)
export class BelvoController {
  constructor(
    private readonly belvoService: BelvoService,
    private readonly bankConnectionService: BankConnectionService,
  ) {}

  /**
   * Obtener instituciones bancarias disponibles
   */
  @Get('institutions')
  async getInstitutions(@Query('country') country: string = 'CL') {
    const institutions = await this.belvoService.getInstitutions(country);
    
    return {
      institutions: institutions.map(inst => ({
        id: inst.id,
        name: inst.display_name,
        type: inst.type,
        logo: inst.logo,
        website: inst.website,
        primaryColor: inst.primary_color,
        countryCodes: inst.country_codes,
      })),
    };
  }

  /**
   * Crear una nueva conexión bancaria
   */
  @Post('connections')
  async createConnection(
    @Request() req,
    @Body() body: { institution: string; username: string; password: string },
  ) {
    const dto: CreateBankConnectionDto = {
      userId: req.user.id,
      institution: body.institution,
      username: body.username,
      password: body.password,
    };

    const connection = await this.bankConnectionService.createConnection(dto);

    return {
      connection: {
        id: connection.id,
        institutionName: connection.institutionName,
        institutionType: connection.institutionType,
        status: connection.status,
        accountsCount: connection.accountsCount,
        createdAt: connection.createdAt,
        lastAccessedAt: connection.lastAccessedAt,
        isHealthy: connection.isHealthy,
      },
    };
  }

  /**
   * Obtener un token temporal para el widget de conexión
   */
  @Post('widget/token')
  async createWidgetToken(@Request() req) {
    const session = await this.belvoService.createWidgetSession(req.user.id);

    return {
      token: session.access,
      refreshToken: session.refresh ?? null,
      expiresIn: session.expires_in ?? null,
    };
  }

  /**
   * Registrar una conexión creada mediante el widget
   */
  @Post('widget/connections')
  async createConnectionFromWidget(
    @Request() req,
    @Body() body: { linkId?: string },
  ) {
    if (!body?.linkId) {
      throw new BadRequestException('linkId es requerido');
    }

    const connection = await this.bankConnectionService.createConnectionFromLink(
      req.user.id,
      body.linkId,
    );

    return {
      connection: {
        id: connection.id,
        institutionName: connection.institutionName,
        institutionType: connection.institutionType,
        status: connection.status,
        accountsCount: connection.accountsCount,
        createdAt: connection.createdAt,
        lastAccessedAt: connection.lastAccessedAt,
        isHealthy: connection.isHealthy,
      },
    };
  }

  /**
   * Obtener conexiones bancarias del usuario
   */
  @Get('connections')
  async getUserConnections(@Request() req) {
    const connections = await this.bankConnectionService.getUserConnections(req.user.id);

    return {
      connections: connections.map(conn => ({
        id: conn.id,
        institutionName: conn.institutionName,
        institutionType: conn.institutionType,
        status: conn.status,
        accountsCount: conn.accountsCount,
        lastSyncAt: conn.lastSyncAt,
        createdAt: conn.createdAt,
        isHealthy: conn.isHealthy,
        needsSync: conn.needsSync,
        metadata: {
          logo: conn.metadata?.institutionLogo,
          website: conn.metadata?.institutionWebsite,
          primaryColor: conn.metadata?.institutionPrimaryColor,
        },
      })),
    };
  }

  /**
   * Obtener detalles de una conexión específica
   */
  @Get('connections/:id')
  async getConnection(@Request() req, @Param('id') connectionId: string) {
    const connection = await this.bankConnectionService.getConnection(
      connectionId,
      req.user.id,
    );

    return {
      connection: {
        id: connection.id,
        institutionName: connection.institutionName,
        institutionType: connection.institutionType,
        status: connection.status,
        accountsCount: connection.accountsCount,
        connectedAccounts: connection.connectedAccounts,
        lastSyncAt: connection.lastSyncAt,
        syncFrequencyHours: connection.syncFrequencyHours,
        autoSyncEnabled: connection.autoSyncEnabled,
        errorCount: connection.errorCount,
        lastError: connection.lastError,
        createdAt: connection.createdAt,
        lastAccessedAt: connection.lastAccessedAt,
        isHealthy: connection.isHealthy,
        needsSync: connection.needsSync,
        metadata: connection.metadata,
      },
    };
  }

  /**
   * Sincronizar transacciones de una conexión
   */
  @Post('connections/:id/sync')
  async syncConnection(
    @Request() req,
    @Param('id') connectionId: string,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    // Verificar que la conexión pertenece al usuario
    await this.bankConnectionService.getConnection(connectionId, req.user.id);

    const result = await this.bankConnectionService.syncTransactions(connectionId, days);

    return {
      sync: result,
    };
  }

  /**
   * Verificar estado de una conexión
   */
  @Post('connections/:id/status')
  async checkConnectionStatus(@Request() req, @Param('id') connectionId: string) {
    // Verificar que la conexión pertenece al usuario
    await this.bankConnectionService.getConnection(connectionId, req.user.id);

    const connection = await this.bankConnectionService.checkConnectionStatus(connectionId);

    return {
      status: {
        id: connection.id,
        status: connection.status,
        isHealthy: connection.isHealthy,
        lastAccessedAt: connection.lastAccessedAt,
        errorCount: connection.errorCount,
        lastError: connection.lastError,
      },
    };
  }

  /**
   * Eliminar una conexión bancaria
   */
  @Delete('connections/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteConnection(@Request() req, @Param('id') connectionId: string) {
    await this.bankConnectionService.deleteConnection(connectionId, req.user.id);
  }

  /**
   * Sincronizar todas las conexiones del usuario
   */
  @Post('sync-all')
  async syncAllConnections(@Request() req) {
    const results = await this.bankConnectionService.syncUserConnections(req.user.id);

    return {
      syncResults: results,
      summary: {
        totalConnections: results.length,
        successfulSyncs: results.filter(r => r.success).length,
        totalTransactionsSynced: results.reduce((sum, r) => sum + r.transactionsSynced, 0),
        totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
      },
    };
  }

  /**
   * Obtener estadísticas de conexiones bancarias del usuario
   */
  @Get('stats')
  async getConnectionStats(@Request() req) {
    const stats = await this.bankConnectionService.getUserConnectionStats(req.user.id);

    return {
      stats,
    };
  }

  /**
   * Obtener cuentas bancarias de una conexión específica
   */
  @Get('connections/:id/accounts')
  async getConnectionAccounts(@Request() req, @Param('id') connectionId: string) {
    const connection = await this.bankConnectionService.getConnection(
      connectionId,
      req.user.id,
    );

    const accounts = await this.belvoService.getAccounts(connection.belvoLinkId);

    return {
      accounts: accounts.map(account => ({
        id: account.id,
        name: account.name,
        number: account.number,
        type: account.type,
        category: account.category,
        currency: account.currency,
        balance: account.balance,
        lastAccessedAt: account.last_accessed_at,
        bankProductId: account.bank_product_id,
        publicIdentification: {
          name: account.public_identification_name,
          value: account.public_identification_value,
        },
      })),
    };
  }

  /**
   * Obtener balances de cuentas de una conexión
   */
  @Get('connections/:id/balances')
  async getConnectionBalances(@Request() req, @Param('id') connectionId: string) {
    const connection = await this.bankConnectionService.getConnection(
      connectionId,
      req.user.id,
    );

    const balances = await this.belvoService.getBalances(connection.belvoLinkId);

    return {
      balances: balances.map(balance => ({
        account: balance.account,
        current: balance.current_balance,
        available: balance.available_balance,
        currency: balance.currency,
        collectedAt: balance.collected_at,
      })),
    };
  }
}
