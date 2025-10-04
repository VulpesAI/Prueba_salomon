export const esCL = {
  locale: "es-CL",
  currency: {
    code: "CLP",
    name: "Peso chileno",
  },
  transactions: {
    main: {
      title: "Tus movimientos",
      description:
        "Monitorea tus gastos e ingresos personales para mantener tu presupuesto bajo control.",
      navigation: {
        classification: "Ordenar categorías",
        summaries: "Ver resúmenes",
        advancedSearch: "Búsqueda avanzada",
        export: "Descargar movimientos",
      },
      stats: {
        income: {
          label: "Ingresos del mes",
          description: "Transferencias, sueldos y devoluciones recibidas recientemente.",
          badge: "+4% vs. mes anterior",
        },
        expenses: {
          label: "Gastos del mes",
          description: "Incluye arriendo, cuentas del hogar y gastos variables.",
          badge: "Cuida tu presupuesto diario",
        },
        reviews: {
          label: "Movimientos revisados hoy",
          helper:
            "Suma los ajustes automáticos y las revisiones que hiciste manualmente.",
        },
        pending: {
          label: "Pendientes por confirmar",
          helper: "Abre la bandeja para revisar tus últimos movimientos.",
          cta: "Revisar pendientes",
        },
      },
      filters: {
        categories: [
          "Todas",
          "Arriendo",
          "Supermercado",
          "Restaurantes",
          "Transporte",
          "Servicios",
          "Suscripciones",
          "Salud",
          "Ingresos",
        ],
        statuses: ["Todos", "Confirmada", "Pendiente", "Revisar"],
      },
      tableCard: {
        title: "Detalle de movimientos",
        description:
          "Filtra, clasifica y exporta tus transacciones personales en segundos.",
        refresh: "Actualizar movimientos",
        refreshAria: "Actualizar tus movimientos",
        add: "Registrar movimiento",
        searchPlaceholder: "Busca por descripción o nota",
        saveView: "Guardar vista",
        categoryPlaceholder: "Categoría",
        statusPlaceholder: "Estado",
        selectionLabel: {
          default: "Seleccionar página actual",
          selected: (count: number) => `${count} movimientos seleccionados`,
        },
        bulkActions: {
          tag: "Agregar etiqueta",
          markReviewed: "Marcar como revisado",
          export: "Exportar seleccionadas",
        },
        tableHeaders: {
          detail: "Detalle",
          category: "Categoría",
          channel: "Medio de pago",
          amount: "Monto",
          status: "Estado",
        },
        empty: "No encontramos movimientos con los filtros aplicados.",
        clearFilters: "Limpiar filtros",
        paginationLabel: ({
          page,
          total,
          count,
        }: {
          page: number
          total: number
          count: number
        }) => `Página ${page} de ${total} · ${count} movimientos`,
        downloadCard: {
          title: "Descarga y respaldo",
          description:
            "Exporta tus movimientos filtrados para guardar un respaldo o compartirlo con quien confíes.",
          helper:
            "Cuando conectes tus cuentas, aquí verás el estado de las últimas exportaciones.",
          download: "Descargar CSV",
          summary: "Ver resumen mensual",
        },
      },
    },
    advancedSearch: {
      title: "Búsqueda avanzada",
      description:
        "Crea consultas detalladas para entender tus gastos, detectar hábitos y tomar decisiones rápidas.",
      navigation: {
        backToTransactions: "Volver a movimientos",
        goToClassification: "Ver clasificación",
        goToSummaries: "Ver resúmenes",
        export: "Exportar resultados",
      },
      builder: {
        title: "Constructor visual",
        description:
          "Combina condiciones para encontrar patrones y guardar vistas que quieras revisar con frecuencia.",
        logicLabel: "Operador lógico",
        logicOptions: {
          and: "Cumplir todas",
          or: "Cumplir alguna",
        },
        addCondition: "Agregar condición",
        saveView: "Guardar vista",
        fieldPlaceholder: "Campo",
        operatorPlaceholder: "Operador",
        valuePlaceholder: "Valor",
        removeConditionAria: "Quitar condición",
        textareaLabel: "Resumen de condiciones",
      },
      conditions: {
        fields: ["Monto", "Descripción", "Categoría", "Canal", "Etiqueta", "Fecha"],
        operators: [">", "<", "=", "contiene", "no contiene", "entre"],
      },
      segments: {
        title: "Segmentos guardados",
        description: "Revisa las consultas que usas más seguido y duplícalas cuando necesites variaciones.",
        open: "Abrir",
        duplicate: "Duplicar",
        items: [
          {
            id: "seg-1",
            name: "Gastos fijos del hogar",
            note: "Ideal para revisar tu presupuesto mensual",
            updatedAt: "Actualizado hoy",
          },
          {
            id: "seg-2",
            name: "Compras de supermercado",
            note: "Te muestra las visitas más recientes",
            updatedAt: "Actualizado hace 2 días",
          },
          {
            id: "seg-3",
            name: "Suscripciones digitales",
            note: "Útil para detectar cargos duplicados",
            updatedAt: "Actualizado la semana pasada",
          },
        ],
      },
      results: {
        title: "Resultados",
        description:
          "Aplica etiquetas, organiza tus hallazgos y genera exportaciones para compartir un resumen.",
        bulkActions: {
          tag: "Agregar etiqueta",
          markReviewed: "Marcar como revisado",
          export: "Crear exportación",
        },
        selectionLabel: {
          default: "Seleccionar página actual",
          selected: (count: number) => `${count} movimientos seleccionados`,
        },
        tableHeaders: {
          description: "Descripción",
          date: "Fecha",
          category: "Categoría",
          amount: "Monto",
        },
        empty: "Ajusta el constructor para ver resultados.",
        paginationLabel: ({
          page,
          total,
          count,
        }: {
          page: number
          total: number
          count: number
        }) => `Página ${page} de ${total} · ${count} coincidencias`,
      },
    },
    classification: {
      title: "Clasificación inteligente",
      description:
        "Automatiza cómo organizas tus gastos y valida cada regla antes de aplicarla en tus cuentas.",
      navigation: {
        backToTransactions: "Volver a movimientos",
        goToAdvancedSearch: "Búsqueda avanzada",
        goToSummaries: "Ver resúmenes",
      },
      stats: {
        activeRules: {
          label: "Reglas activas",
          helper: "Incluye automatizaciones personales.",
        },
        automatedMovements: {
          label: "Movimientos automatizados",
          helper: "Se clasificaron sin tu intervención.",
        },
        accuracy: {
          label: "Precisión promedio",
          helper: "Revisa falsos positivos cuando lo necesites.",
          button: "Ver detalles",
        },
        lastExport: {
          label: "Última exportación",
          helper: "Te ayuda a respaldar tu configuración.",
          button: "Exportar reglas",
        },
      },
      builder: {
        title: "Constructor visual",
        description:
          "Diseña y prueba reglas nuevas antes de activarlas en tus movimientos reales.",
        newRule: "Nueva regla",
        import: "Importar JSON",
        conditionsTitle: "Condiciones",
        actionsTitle: "Acciones",
        conditionBadges: [
          "Descripción contiene",
          "Monto mayor a",
          "Medio de pago",
          "Etiqueta existente",
        ],
        actionBadges: ["Categorizar", "Etiquetar", "Notificar"],
        textareaValue: "Descripción contiene 'Netflix'\nMonto mayor a 10000",
        actionPlaceholder: "Ej. Asignar categoría Entretenimiento",
        testButton: "Probar con últimos 30 días",
        draftButton: "Guardar como borrador",
      },
      engine: {
        title: "Motor de reglas",
        description:
          "Prioriza reglas, monitorea su desempeño y decide cuándo aplicarlas.",
        searchPlaceholder: "Buscar por nombre de regla",
        statusPlaceholder: "Estado",
        selectionLabel: {
          default: "Seleccionar página actual",
          selected: (count: number) => `${count} reglas seleccionadas`,
        },
        bulkActions: {
          apply: "Aplicar ahora",
          duplicate: "Duplicar",
          run: "Ejecutar en lote",
        },
        tableHeaders: {
          name: "Nombre",
          conditions: "Condiciones",
          action: "Acción",
          accuracy: "Precisión",
          lastRun: "Última ejecución",
        },
        empty: "No hay reglas que coincidan con tus filtros.",
        paginationLabel: ({
          page,
          total,
          count,
        }: {
          page: number
          total: number
          count: number
        }) => `Página ${page} de ${total} · ${count} reglas`,
      },
    },
  },
  alerts: {
    title: "Alertas personales",
    description:
      "Revisa los avisos prioritarios para cuidar tu flujo de caja y evita sorpresas en tus pagos.",
    list: {
      title: "Alertas activas",
      description: "Se ordenan según la urgencia y la fecha estimada de impacto.",
      historyButton: "Ver historial de alertas",
    },
    items: [
      {
        id: "rent",
        title: "Vencimiento de arriendo",
        helper: "Tu arriendo se carga cada 5 del mes. Haz la transferencia a tiempo para evitar recargos.",
        primaryCta: "Registrar pago",
        secondaryCta: "Posponer un día",
      },
      {
        id: "overdraft",
        title: "Posible sobregiro",
        helper: "Los gastos proyectados superan tu saldo disponible. Considera mover fondos antes del fin de semana.",
        primaryCta: "Agregar recordatorio",
        secondaryCta: "Ver movimientos relacionados",
      },
      {
        id: "subscription",
        title: "Suscripción duplicada",
        helper: "Detectamos dos cargos de la misma app este mes. Revisa si necesitas ambos planes.",
        primaryCta: "Gestionar suscripción",
        secondaryCta: "Marcar como revisado",
      },
    ],
    response: {
      title: "Pasos sugeridos",
      description: "Sigue estas acciones para resolver tus alertas sin estrés.",
      steps: [
        {
          title: "Confirma el origen del cargo",
          description: "Abre el detalle del movimiento y verifica que corresponda a tu gasto.",
          status: "En curso",
        },
        {
          title: "Agenda un recordatorio",
          description: "Programa una notificación en tu calendario para no olvidarlo.",
          status: "Pendiente",
        },
        {
          title: "Deja una nota personal",
          description: "Escribe cómo lo resolviste para consultarlo en el futuro.",
          status: "Listo",
        },
      ],
    },
    support: {
      title: "Recursos rápidos",
      description: "Pequeñas acciones que ayudan a mantener tus finanzas en equilibrio.",
      items: [
        {
          title: "Revisa tus metas",
          description: "Asegúrate de que tus aportes semanales sigan el plan que definiste.",
        },
        {
          title: "Activa alertas de saldo",
          description: "Configura notificaciones cuando tu cuenta baje del monto mínimo que prefieras.",
        },
        {
          title: "Registra tus pagos fijos",
          description: "Anota fechas importantes como arriendo, servicios o créditos.",
        },
      ],
    },
    severities: {
      critical: "Crítica",
      high: "Alta",
      medium: "Media",
      low: "Baja",
    },
  },
  settings: {
    profile: {
      forms: {
        profile: {
          title: "Información básica",
          description: "Actualiza los datos que usamos en tus resúmenes y recordatorios.",
          labels: {
            fullName: "Nombre completo",
            email: "Correo electrónico",
            phone: "Teléfono de contacto",
          },
          placeholders: {
            fullName: "Como aparecerá en tus reportes",
            email: "nombre@ejemplo.cl",
            phone: "+56 9 0000 0000",
          },
          descriptions: {
            fullName: "Usa tu nombre legal para comprobantes.",
            email: "Lo usamos para confirmaciones y alertas importantes.",
            phone: "Sirve para enviarte códigos de verificación.",
          },
          submit: "Guardar cambios",
          saving: "Guardando...",
          success: "Perfil actualizado correctamente.",
          error: "No pudimos guardar los cambios. Intenta nuevamente.",
        },
        preferences: {
          title: "Preferencias personales",
          description: "Elige cómo mostramos tus saldos, fechas y novedades.",
          labels: {
            language: "Idioma",
            currency: "Moneda predeterminada",
            timezone: "Zona horaria",
          },
          placeholders: {
            language: "Ej. Español",
            currency: "Ej. CLP",
            timezone: "Ej. America/Santiago",
          },
          descriptions: {
            language: "Afecta reportes, correos y asistentes en pantalla.",
            currency: "Se usa para normalizar tus saldos.",
            timezone: "Define el corte diario de tus reportes.",
          },
          toggles: {
            weeklyDigest: {
              label: "Resumen semanal",
              description: "Recibe un correo los lunes con tus principales movimientos.",
            },
            goalReminders: {
              label: "Recordatorios de metas",
              description: "Te avisamos cuando estés cerca de cumplir o desviar una meta.",
            },
          },
          submit: "Actualizar preferencias",
          saving: "Guardando...",
          success: "Preferencias actualizadas correctamente.",
          error: "Ocurrió un error al guardar. Intenta nuevamente más tarde.",
        },
      },
      integrations: {
        title: "Integraciones personales",
        description: "Controla qué herramientas externas pueden acceder a tu información.",
        catalogue: [
          {
            id: "google-calendar",
            name: "Google Calendar",
            description: "Sincroniza recordatorios de pagos en tu calendario.",
          },
          {
            id: "notion",
            name: "Notion",
            description: "Guarda resúmenes automáticos en tu espacio personal.",
          },
          {
            id: "drive",
            name: "Google Drive",
            description: "Respalda tus exportaciones en una carpeta segura.",
          },
        ],
        states: {
          active: "Integración activa",
          inactive: "Integración desactivada",
          activeHelper: "Tus datos se sincronizan automáticamente.",
          inactiveHelper: "Actívala para comenzar a sincronizar.",
        },
      },
      validation: {
        fullName: {
          min: "Ingresa al menos 2 caracteres.",
          max: "Por favor usa menos de 120 caracteres.",
        },
        email: "Ingresa un correo válido.",
        phone: {
          min: "El teléfono debe tener al menos 9 dígitos.",
          max: "Verifica el número ingresado.",
        },
        language: "Selecciona un idioma.",
        currency: "Selecciona una moneda.",
        timezone: "Selecciona una zona horaria.",
      },
      defaults: {
        fullName: "María González",
        email: "maria.gonzalez@ejemplo.cl",
        phone: "+56 9 1234 5678",
        language: "Español (Chile)",
        currency: "CLP",
        timezone: "America/Santiago",
        weeklyDigest: true,
        goalReminders: true,
        integrations: {
          "google-calendar": true,
          notion: false,
          drive: false,
        },
      },
    },
    notifications: {
      digests: {
        title: "Resúmenes programados",
        description: "Define la cadencia y los destinatarios de tus reportes automáticos.",
        labels: {
          name: "Nombre del resumen",
          frequency: "Frecuencia",
          time: "Horario de envío",
          recipients: "Destinatarios",
        },
        placeholders: {
          name: "Ej. Seguimiento semanal",
          frequency: "Ej. Semanal, Diario",
          time: "09:00",
          recipients: "Correos separados por coma",
        },
        descriptions: {
          name: "Será el título en tus correos y notificaciones.",
          frequency: "Puedes indicar días específicos o periodos personalizados.",
          time: "Considera la zona horaria configurada en tu perfil.",
          recipients: "Incluye tus correos principales o de confianza.",
        },
        submit: "Configurar resumen",
        saving: "Guardando...",
        success: "Resumen programado actualizado correctamente.",
        error: "Ocurrió un problema al guardar la programación.",
        defaults: {
          name: "Seguimiento semanal",
          frequency: "Semanal (lunes)",
          time: "09:00",
          recipients: "maria.gonzalez@ejemplo.cl",
        },
      },
      channels: {
        title: "Canales de entrega",
        description: "Activa dónde quieres recibir alertas y resúmenes.",
        options: {
          email: {
            label: "Correo electrónico",
            description: "Ideal para reportes detallados y adjuntos.",
          },
          push: {
            label: "Notificaciones push",
            description: "Recibe avisos inmediatos en tu celular.",
          },
          sms: {
            label: "SMS",
            description: "Útil para alertas críticas cuando estés sin conexión.",
          },
          inApp: {
            label: "Centro de notificaciones",
            description: "Conserva un historial completo dentro de la app.",
          },
        },
        submit: "Guardar canales",
        saving: "Guardando...",
        success: "Preferencias de canales actualizadas.",
        error: "No pudimos guardar tus canales. Intenta nuevamente.",
        defaults: {
          email: true,
          push: true,
          sms: false,
          inApp: true,
        },
      },
      templates: {
        title: "Plantillas personalizadas",
        description: "Ajusta el asunto con el que llegan tus mensajes recurrentes.",
        items: [
          {
            id: "weekly-overview",
            name: "Resumen semanal",
            helper: "Llega cada lunes con tus principales cambios.",
            defaultSubject: "Resumen semanal de tus finanzas",
          },
          {
            id: "cash-alert",
            name: "Alerta de flujo de caja",
            helper: "Se envía cuando el saldo baja del umbral que definiste.",
            defaultSubject: "Alerta de flujo de caja",
          },
          {
            id: "closing-reminder",
            name: "Recordatorio de fin de mes",
            helper: "Te avisa tres días antes del cierre mensual.",
            defaultSubject: "Recordatorio de cierre mensual",
          },
        ],
        submit: "Guardar plantillas",
        success: "Plantillas actualizadas correctamente.",
        error: "No se pudo guardar tu personalización, intenta de nuevo.",
        linkText: "centro de notificaciones",
      },
    },
  },
} as const

export type EsCLDictionary = typeof esCL
