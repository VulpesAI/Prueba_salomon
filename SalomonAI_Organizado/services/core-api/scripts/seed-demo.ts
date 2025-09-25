import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
import * as bcrypt from 'bcryptjs';
import { User } from '../src/users/entities/user.entity';
import { BankConnection } from '../src/belvo/entities/bank-connection.entity';
import { FinancialMovement } from '../src/financial-movements/entities/financial-movement.entity';

const envFiles = [
  resolve(__dirname, '../../../.env'),
  resolve(__dirname, '../.env'),
].filter(Boolean);

envFiles.forEach(path => loadEnv({ path, override: false }));

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: Number(process.env.POSTGRES_PORT || 5432),
  username: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'salomon',
  entities: [User, BankConnection, FinancialMovement],
  synchronize: false,
  logging: false,
});

async function seed() {
  console.log('🌱 Inicializando datos de demostración para SalomónAI...');
  await dataSource.initialize();

  const userRepository = dataSource.getRepository(User);
  const connectionRepository = dataSource.getRepository(BankConnection);
  const movementRepository = dataSource.getRepository(FinancialMovement);

  const demoEmail = process.env.DEMO_USER_EMAIL || 'demo@salomon.ai';
  const demoPassword = process.env.DEMO_USER_PASSWORD || 'Demo1234!';
  const demoFullName = 'Demostración SalomónAI';

  let demoUser = await userRepository.findOne({ where: { email: demoEmail } });

  const passwordHash = await bcrypt.hash(demoPassword, 10);

  if (!demoUser) {
    demoUser = userRepository.create({
      email: demoEmail,
      fullName: demoFullName,
      displayName: 'Demo Salomón',
      passwordHash,
      roles: ['user'],
      preferences: {
        currency: 'CLP',
        language: 'es',
        timezone: 'America/Santiago',
      },
    });
    demoUser = await userRepository.save(demoUser);
    console.log(`✅ Usuario demo creado (${demoEmail})`);
  } else {
    demoUser.passwordHash = passwordHash;
    demoUser.fullName = demoFullName;
    demoUser.displayName = 'Demo Salomón';
    demoUser.preferences = {
      ...(demoUser.preferences ?? {}),
      currency: 'CLP',
      language: 'es',
      timezone: 'America/Santiago',
    };
    demoUser = await userRepository.save(demoUser);
    console.log(`ℹ️ Usuario demo actualizado (${demoEmail})`);
  }

  await connectionRepository.delete({ userId: demoUser.id });

  const connection = connectionRepository.create({
    userId: demoUser.id,
    belvoLinkId: 'mock-link-salomon',
    institutionName: 'Banco Salomón Digital',
    institutionId: 'mock_banco_salomondigital',
    institutionType: 'bank',
    accessMode: 'single',
    status: 'active',
    lastAccessedAt: new Date(),
    accountsCount: 2,
    lastSyncAt: new Date(),
    syncFrequencyHours: 24,
    autoSyncEnabled: true,
    metadata: {
      institutionLogo: 'https://placehold.co/64x64?text=SD',
      institutionWebsite: 'https://demo.salomon.ai',
      institutionPrimaryColor: '#38bdf8',
      lastSyncResults: {
        accountsSynced: 2,
        transactionsSynced: 16,
        errors: [],
      },
    },
    connectedAccounts: [
      'mock-link-salomon-account-1',
      'mock-link-salomon-account-2',
    ],
    isActive: true,
    errorCount: 0,
    lastError: null,
  });

  await connectionRepository.save(connection);
  console.log('✅ Conexión bancaria mock creada.');

  await movementRepository
    .createQueryBuilder()
    .delete()
    .where('"user_id" = :userId', { userId: demoUser.id })
    .execute();

  const now = new Date();
  const demoMovements = [
    { description: 'Depósito sueldo DemoCorp', amount: 1850000, category: 'Ingresos', daysAgo: 5 },
    { description: 'Pago arriendo departamento', amount: -650000, category: 'Vivienda', daysAgo: 4 },
    { description: 'Supermercado Jumbo', amount: -92500, category: 'Alimentación', daysAgo: 3 },
    { description: 'Servicio de streaming', amount: -8990, category: 'Entretenimiento', daysAgo: 2 },
    { description: 'Transferencia a ahorro', amount: -150000, category: 'Ahorro', daysAgo: 2 },
    { description: 'Farmacia Salcobrand', amount: -18690, category: 'Salud', daysAgo: 7 },
    { description: 'Taxi aeropuerto', amount: -21500, category: 'Transporte', daysAgo: 10 },
    { description: 'Bonificación trimestral', amount: 320000, category: 'Ingresos', daysAgo: 12 },
    { description: 'Restaurante Peumayen', amount: -45990, category: 'Gastronomía', daysAgo: 9 },
    { description: 'Pago gimnasio', amount: -29990, category: 'Salud', daysAgo: 15 },
    { description: 'Cuota crédito consumo', amount: -120000, category: 'Deudas', daysAgo: 18 },
    { description: 'Interés cuenta corriente', amount: 1290, category: 'Intereses', daysAgo: 1 },
  ];

  const movementEntities = demoMovements.map((movement, index) => {
    const transactionDate = new Date(now.getTime() - movement.daysAgo * 24 * 60 * 60 * 1000);

    return movementRepository.create({
      description: movement.description,
      amount: movement.amount,
      currency: 'CLP',
      transactionDate,
      category: movement.category,
      user: demoUser,
      embedding: null,
    });
  });

  await movementRepository.save(movementEntities);
  console.log(`✅ ${movementEntities.length} movimientos financieros cargados.`);

  await dataSource.destroy();
  console.log('🌱 Seed de demostración finalizado. Usuario demo listo para usar.');
}

seed().catch(async error => {
  console.error('❌ Error generando datos de demostración:', error);
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
  process.exit(1);
});
