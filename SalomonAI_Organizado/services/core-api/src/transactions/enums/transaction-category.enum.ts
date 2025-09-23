export enum TransactionCategory {
  // Gastos básicos
  VIVIENDA = 'VIVIENDA',           // Arriendo, hipoteca, gastos comunes
  SERVICIOS = 'SERVICIOS',         // Luz, agua, gas, internet, teléfono
  TRANSPORTE = 'TRANSPORTE',       // Transporte público, gasolina, mantención vehículo
  ALIMENTACION = 'ALIMENTACION',   // Supermercado, restaurant, delivery

  // Gastos personales
  SALUD = 'SALUD',                // Médico, medicamentos, seguros de salud
  EDUCACION = 'EDUCACION',        // Colegios, universidades, cursos
  VESTUARIO = 'VESTUARIO',        // Ropa, calzado, accesorios
  ENTRETENIMIENTO = 'ENTRETENIMIENTO', // Cine, eventos, hobbies
  
  // Finanzas
  INGRESOS = 'INGRESOS',          // Sueldos, honorarios, ventas
  INVERSIONES = 'INVERSIONES',    // Depósitos, acciones, fondos mutuos
  DEUDAS = 'DEUDAS',             // Préstamos, tarjetas de crédito
  AHORRO = 'AHORRO',             // Cuentas de ahorro, APV
  
  // Otros
  DONACIONES = 'DONACIONES',      // Caridad, aportes
  IMPUESTOS = 'IMPUESTOS',        // IVA, renta, contribuciones
  VARIOS = 'VARIOS',              // Gastos misceláneos
  NO_CLASIFICADO = 'NO_CLASIFICADO' // Default para transacciones sin clasificar
}
