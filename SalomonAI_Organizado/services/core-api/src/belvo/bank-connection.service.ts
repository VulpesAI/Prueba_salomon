import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankConnection } from './entities/bank-connection.entity';
import { BelvoService, BelvoLink, BelvoAccount, BelvoTransaction } from './belvo.service';
import { FinancialMovementsService } from '../financial-movements/financial-movements.service';

export interface CreateBankConnectionDto {
  userId: string;
  institution: string;
  username: string;
  password: string;
}

export interface SyncResult {
  success: boolean;
  accountsSynced: number;
  transactionsSynced: number;
  errors: string[];
}

@Injectable()
export class BankConnectionService {
  constructor(
    @InjectRepository(BankConnection)
    private readonly bankConnectionRepository: Repository<BankConnection>,
    private readonly belvoService: BelvoService,
    private readonly financialMovementsService: FinancialMovementsService,
  ) {}

  /**
   * Crear una nueva conexión bancaria
   */
  async createConnection(dto: CreateBankConnectionDto): Promise<BankConnection> {
    try {
      // Crear link en Belvo
      const belvoLink = await this.belvoService.createLink(
        dto.institution,
        dto.username,
        dto.password,
        dto.userId,
      );

      // Obtener información de la institución
      const institutions = await this.belvoService.getInstitutions('CL');
      const institution = institutions.find(inst => inst.id === dto.institution);

      // Crear registro en nuestra base de datos
      const bankConnection = this.bankConnectionRepository.create({
        userId: dto.userId,
        belvoLinkId: belvoLink.id,
        institutionName: institution?.display_name || 'Institución desconocida',
        institutionId: dto.institution,
        institutionType: institution?.type || 'bank',
        accessMode: belvoLink.access_mode,
        status: belvoLink.status,
        lastAccessedAt: new Date(belvoLink.last_accessed_at),
        metadata: {
          institutionLogo: institution?.logo,
          institutionWebsite: institution?.website,
          institutionPrimaryColor: institution?.primary_color,
          belvoInstitutionData: institution,
        },
      });

      const savedConnection = await this.bankConnectionRepository.save(bankConnection);

      // Sincronizar cuentas inicialmente
      await this.syncAccounts(savedConnection.id);

      return savedConnection;
    } catch (error) {
      throw new BadRequestException(
        `Error creando conexión bancaria: ${error.message}`,
      );
    }
  }

  /**
   * Obtener conexiones bancarias de un usuario
   */
  async getUserConnections(userId: string): Promise<BankConnection[]> {
    return this.bankConnectionRepository.find({
      where: { userId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Obtener una conexión específica
   */
  async getConnection(connectionId: string, userId: string): Promise<BankConnection> {
    const connection = await this.bankConnectionRepository.findOne({
      where: { id: connectionId, userId },
    });

    if (!connection) {
      throw new NotFoundException('Conexión bancaria no encontrada');
    }

    return connection;
  }

  /**
   * Sincronizar cuentas de una conexión
   */
  async syncAccounts(connectionId: string): Promise<void> {
    const connection = await this.bankConnectionRepository.findOne({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new NotFoundException('Conexión no encontrada');
    }

    try {
      const accounts = await this.belvoService.getAccounts(connection.belvoLinkId);
      
      connection.accountsCount = accounts.length;
      connection.connectedAccounts = accounts.map(account => account.id);
      connection.lastAccessedAt = new Date();
      
      await this.bankConnectionRepository.save(connection);
    } catch (error) {
      connection.incrementErrorCount(`Error sincronizando cuentas: ${error.message}`);
      await this.bankConnectionRepository.save(connection);
      throw error;
    }
  }

  /**
   * Sincronizar transacciones de una conexión
   */
  async syncTransactions(connectionId: string, days: number = 30): Promise<SyncResult> {
    const connection = await this.bankConnectionRepository.findOne({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new NotFoundException('Conexión no encontrada');
    }

    const result: SyncResult = {
      success: false,
      accountsSynced: 0,
      transactionsSynced: 0,
      errors: [],
    };

    try {
      // Obtener transacciones de Belvo
      const transactions = await this.belvoService.syncRecentTransactions(
        connection.belvoLinkId,
        days,
      );

      // Convertir y guardar transacciones
      for (const belvoTransaction of transactions) {
        try {
          const internalTransaction = this.belvoService.convertBelvoTransaction(
            belvoTransaction,
            connection.userId,
          );

          // Verificar si la transacción ya existe (por ahora omitimos esta verificación)
          // const existing = await this.financialMovementsService.findByExternalId(
          //   belvoTransaction.id,
          // );

          // Para el MVP, creamos todas las transacciones (sin verificación de duplicados)
          // if (!existing) {
            await this.financialMovementsService.create(internalTransaction);
            result.transactionsSynced++;
          // }
        } catch (error) {
          result.errors.push(`Error procesando transacción ${belvoTransaction.id}: ${error.message}`);
        }
      }

      result.success = true;
      connection.updateSyncResults(result.accountsSynced, result.transactionsSynced, result.errors);
      await this.bankConnectionRepository.save(connection);

    } catch (error) {
      result.errors.push(`Error sincronizando transacciones: ${error.message}`);
      connection.incrementErrorCount(error.message);
      await this.bankConnectionRepository.save(connection);
    }

    return result;
  }

  /**
   * Eliminar una conexión bancaria
   */
  async deleteConnection(connectionId: string, userId: string): Promise<void> {
    const connection = await this.getConnection(connectionId, userId);

    try {
      // Eliminar link de Belvo
      await this.belvoService.deleteLink(connection.belvoLinkId);
    } catch (error) {
      console.warn(`Error eliminando link de Belvo: ${error.message}`);
    }

    // Marcar como inactivo en lugar de eliminar
    connection.isActive = false;
    await this.bankConnectionRepository.save(connection);
  }

  /**
   * Verificar estado de una conexión
   */
  async checkConnectionStatus(connectionId: string): Promise<BankConnection> {
    const connection = await this.bankConnectionRepository.findOne({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new NotFoundException('Conexión no encontrada');
    }

    try {
      const belvoLink = await this.belvoService.getLinkStatus(connection.belvoLinkId);
      
      connection.status = belvoLink.status;
      connection.lastAccessedAt = new Date(belvoLink.last_accessed_at);
      
      await this.bankConnectionRepository.save(connection);
    } catch (error) {
      connection.incrementErrorCount(`Error verificando estado: ${error.message}`);
      await this.bankConnectionRepository.save(connection);
    }

    return connection;
  }

  /**
   * Obtener conexiones que necesitan sincronización
   */
  async getConnectionsNeedingSync(): Promise<BankConnection[]> {
    const connections = await this.bankConnectionRepository.find({
      where: { isActive: true, autoSyncEnabled: true },
    });

    return connections.filter(connection => connection.needsSync);
  }

  /**
   * Sincronizar todas las conexiones de un usuario
   */
  async syncUserConnections(userId: string): Promise<SyncResult[]> {
    const connections = await this.getUserConnections(userId);
    const results: SyncResult[] = [];

    for (const connection of connections) {
      if (connection.isHealthy) {
        try {
          const result = await this.syncTransactions(connection.id);
          results.push(result);
        } catch (error) {
          results.push({
            success: false,
            accountsSynced: 0,
            transactionsSynced: 0,
            errors: [error.message],
          });
        }
      }
    }

    return results;
  }

  /**
   * Obtener estadísticas de conexiones de un usuario
   */
  async getUserConnectionStats(userId: string): Promise<{
    totalConnections: number;
    activeConnections: number;
    totalAccounts: number;
    lastSyncDate: Date | null;
    healthyConnections: number;
  }> {
    const connections = await this.bankConnectionRepository.find({
      where: { userId },
    });

    const activeConnections = connections.filter(c => c.isActive);
    const healthyConnections = activeConnections.filter(c => c.isHealthy);
    const totalAccounts = activeConnections.reduce((sum, c) => sum + c.accountsCount, 0);
    
    const lastSyncDates = activeConnections
      .map(c => c.lastSyncAt)
      .filter(date => date !== null)
      .sort((a, b) => b.getTime() - a.getTime());

    return {
      totalConnections: connections.length,
      activeConnections: activeConnections.length,
      totalAccounts,
      lastSyncDate: lastSyncDates[0] || null,
      healthyConnections: healthyConnections.length,
    };
  }
}
