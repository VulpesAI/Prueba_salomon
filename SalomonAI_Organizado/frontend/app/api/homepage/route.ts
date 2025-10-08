import { NextResponse } from "next/server";

export async function GET() {
  const data = {
    hero: {
      title: "Tu asesor financiero personal",
      subtitle:
        "Analiza tus gastos, proyecta tu flujo y recibe recomendaciones útiles con voz integrada.",
      ctaLabel: "Comenzar",
      ctaHref: "/auth/login",
    },
    features: [
      {
        id: "ia",
        title: "IA personalizada",
        description: "Respuestas claras según tu realidad financiera.",
      },
      {
        id: "consulta",
        title: "Consultas naturales",
        description: "Pregunta en lenguaje simple: “¿Cuánto gasté en comida?”",
      },
      {
        id: "bancos",
        title: "Integración bancaria",
        description: "Conecta tus cuentas y carga cartolas de forma segura.",
      },
      {
        id: "predictivo",
        title: "Análisis predictivo",
        description: "Proyecciones de saldo y gastos por periodo.",
      },
      {
        id: "alertas",
        title: "Alertas inteligentes",
        description: "Recibe avisos cuando un gasto se dispara.",
      },
      {
        id: "metas",
        title: "Metas y planificador",
        description: "Define objetivos y sigue tu progreso.",
      },
    ],
    howItWorks: {
      enabled: true,
      steps: [
        {
          order: 1,
          title: "Conecta",
          description: "Sube tus cartolas o vincula tus cuentas.",
        },
        {
          order: 2,
          title: "Analiza",
          description: "Te mostramos gastos, categorías y proyecciones.",
        },
        {
          order: 3,
          title: "Actúa",
          description: "Recibe recomendaciones y toma decisiones informadas.",
        },
      ],
    },
  };

  return NextResponse.json(data, { status: 200 });
}
