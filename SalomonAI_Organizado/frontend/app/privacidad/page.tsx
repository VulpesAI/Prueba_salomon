import Footer from "@/components/Footer"
import Navigation from "@/components/Navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Metadata } from "next"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  ClipboardCheck,
  Database,
  Download,
  Eye,
  FileText,
  Fingerprint,
  Lock,
  Mail,
  RefreshCw,
  Server,
  Settings,
  Shield,
  ShieldCheck,
  Trash2,
  UploadCloud,
  UserCheck,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Privacidad | SalomonAI",
  description:
    "Conoce cómo SalomonAI protege los datos financieros y personales de los usuarios con procesos transparentes y medidas de seguridad de nivel bancario.",
}

const LAST_UPDATED = "Marzo 2024"
const PRIVACY_EMAIL = "privacy@salomonai.com"

interface DataType {
  icon: LucideIcon
  category: string
  description: string
  items: string[]
  retention: string
}

interface Right {
  title: string
  description: string
  action: string
  href?: string
}

interface CookieType {
  type: string
  description: string
  examples: string[]
  required: boolean
}

interface ProtectionMeasure {
  icon: LucideIcon
  title: string
  description: string
  details: string[]
}

interface ProcessingStep {
  icon: LucideIcon
  title: string
  description: string
  detail: string
}

const dataTypes: DataType[] = [
  {
    icon: UserCheck,
    category: "Datos Personales",
    description: "Información básica de identificación",
    items: ["Nombre completo", "Email", "Teléfono", "Dirección"],
    retention: "Mientras la cuenta esté activa",
  },
  {
    icon: Database,
    category: "Datos Financieros",
    description: "Información de cuentas y transacciones",
    items: ["Balances", "Transacciones", "Categorías", "Presupuestos"],
    retention: "2 años después del cierre de cuenta",
  },
  {
    icon: Settings,
    category: "Datos de Uso",
    description: "Información sobre el uso de la plataforma",
    items: ["Logs de actividad", "Preferencias", "Configuraciones", "Métricas"],
    retention: "1 año desde la última actividad",
  },
]

const rights: Right[] = [
  {
    title: "Derecho de Acceso",
    description:
      "Solicita una copia completa de todos tus datos personales que tenemos almacenados",
    action: "Descargar mis datos",
  },
  {
    title: "Derecho de Rectificación",
    description: "Corrige cualquier información personal inexacta o incompleta",
    action: "Actualizar información",
  },
  {
    title: "Derecho de Portabilidad",
    description:
      "Recibe tus datos en un formato estructurado y legible por máquina",
    action: "Exportar datos",
  },
  {
    title: "Derecho al Olvido",
    description: "Solicita la eliminación de tus datos personales de nuestros sistemas",
    action: "Eliminar cuenta",
  },
  {
    title: "Derecho de Oposición",
    description: "Oponte al procesamiento de tus datos para fines específicos",
    action: "Gestionar consentimientos",
  },
  {
    title: "Derecho de Limitación",
    description: "Solicita la restricción del procesamiento de tus datos",
    action: "Limitar procesamiento",
  },
]

const cookieTypes: CookieType[] = [
  {
    type: "Estrictamente Necesarias",
    description: "Esenciales para el funcionamiento del sitio web",
    examples: [
      "Sesión de usuario",
      "Preferencias de idioma",
      "Configuración de seguridad",
    ],
    required: true,
  },
  {
    type: "Funcionales",
    description: "Mejoran la funcionalidad y personalización",
    examples: [
      "Recordar configuraciones",
      "Historial de navegación",
      "Preferencias UI",
    ],
    required: false,
  },
  {
    type: "Analíticas",
    description: "Nos ayudan a entender cómo usas la plataforma",
    examples: ["Métricas de uso", "Rendimiento del sitio", "Eventos críticos"],
    required: false,
  },
  {
    type: "Marketing",
    description: "Utilizadas para publicidad y marketing dirigido",
    examples: [
      "Seguimiento de conversiones",
      "Retargeting",
      "Personalización de anuncios",
    ],
    required: false,
  },
]

const protectionMeasures: ProtectionMeasure[] = [
  {
    icon: ShieldCheck,
    title: "Cifrado Bancario",
    description: "Protegemos tus datos en tránsito y reposo con estándares globales",
    details: ["TLS 1.3", "AES-256", "Rotación automática de llaves"],
  },
  {
    icon: Fingerprint,
    title: "Autenticación Avanzada",
    description: "Controles estrictos para garantizar que solo tú accedas a tu cuenta",
    details: ["MFA obligatorio", "Detección de anomalías", "Bloqueos inteligentes"],
  },
  {
    icon: Server,
    title: "Infraestructura Segura",
    description: "Plataforma desplegada en entornos auditados y certificados",
    details: ["ISO 27001", "Backups diarios", "Monitoreo 24/7"],
  },
  {
    icon: ClipboardCheck,
    title: "Cumplimiento Regulatorio",
    description: "Procesos alineados con la Ley Fintech chilena y normativa internacional",
    details: ["Gobierno de datos", "Auditorías externas", "Reportes trimestrales"],
  },
]

const processingSteps: ProcessingStep[] = [
  {
    icon: UploadCloud,
    title: "Recopilación Segura",
    description: "Solo obtenemos la información necesaria para brindarte el servicio",
    detail: "Consentimientos explícitos y conectores certificados",
  },
  {
    icon: Eye,
    title: "Procesamiento Transparente",
    description: "Tus datos se utilizan para análisis financieros personalizados",
    detail: "Modelos auditables y trazabilidad completa",
  },
  {
    icon: Server,
    title: "Almacenamiento Cifrado",
    description: "Toda la información se guarda en repositorios con controles de acceso",
    detail: "Segmentación por ambientes y registros de auditoría",
  },
  {
    icon: Calendar,
    title: "Retención Limitada",
    description: "Conservamos tus datos solo durante el tiempo estrictamente necesario",
    detail: "Políticas automáticas de depuración y anonimización",
  },
  {
    icon: Trash2,
    title: "Eliminación Verificable",
    description: "Puedes solicitar la eliminación total de tu información en cualquier momento",
    detail: "Confirmación firmada por nuestro Oficial de Protección de Datos",
  },
]

const complianceHighlights = [
  "Cumplimiento GDPR y Ley 19.628", 
  "Reportes de vulnerabilidad y monitoreo continuo", 
  "Equipo dedicado de seguridad y privacidad"
]

export default function PrivacidadPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navigation />

      <section className="py-20 bg-gradient-hero">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <Badge
              variant="secondary"
              className="mb-4 bg-primary/20 text-primary"
            >
              <Shield className="w-4 h-4 mr-2" />
              Privacidad
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Tu Privacidad es
              <span
                style={{
                  background:
                    "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #06b6d4 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  color: "transparent",
                }}
              >
                {" "}Nuestra Prioridad
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-6">
              Comprometidos con la protección y el respeto de tu información personal
              y financiera. Operamos con transparencia, seguridad y control total para
              cada usuario de SalomonAI.
            </p>
            <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>Actualizado {LAST_UPDATED}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Nuestros Principios de Privacidad</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Fundamentos que guían nuestra política de protección de datos
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Lock,
                title: "Minimización de Datos",
                description:
                  "Solo recopilamos los datos estrictamente necesarios para proporcionar nuestros servicios",
              },
              {
                icon: Shield,
                title: "Propósito Limitado",
                description:
                  "Utilizamos tus datos únicamente para los fines declarados explícitamente",
              },
              {
                icon: Eye,
                title: "Transparencia Total",
                description:
                  "Siempre serás informado sobre qué datos recopilamos y por qué",
              },
              {
                icon: CheckCircle,
                title: "Consentimiento Informado",
                description:
                  "Obtenemos tu consentimiento explícito antes de procesar datos sensibles",
              },
            ].map((principle, index) => {
              const IconComponent = principle.icon
              return (
                <Card
                  key={index}
                  className="bg-gradient-card border-primary/20 text-center p-6"
                >
                  <IconComponent className="w-12 h-12 text-primary mx-auto mb-4" />
                  <CardTitle className="text-lg mb-2">{principle.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {principle.description}
                  </p>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      <section className="py-20 bg-secondary/20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">¿Qué Datos Recopilamos?</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Detalle completo de los tipos de información que manejamos
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {dataTypes.map((dataType) => {
              const IconComponent = dataType.icon
              return (
                <Card
                  key={dataType.category}
                  className="bg-gradient-card border-primary/20"
                >
                  <CardHeader>
                    <IconComponent className="w-12 h-12 text-primary mb-4" />
                    <CardTitle className="text-xl">{dataType.category}</CardTitle>
                    <p className="text-muted-foreground">{dataType.description}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Incluye:</h4>
                        <ul className="space-y-1">
                          {dataType.items.map((item) => (
                            <li
                              key={item}
                              className="text-sm text-muted-foreground flex items-center"
                            >
                              <CheckCircle className="w-3 h-3 text-primary mr-2" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="pt-2 border-t">
                        <Badge variant="outline" className="text-xs">
                          <Calendar className="w-3 h-3 mr-1" />
                          {dataType.retention}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Cómo protegemos tus datos</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Capas de seguridad diseñadas para resguardar cada interacción
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {protectionMeasures.map((measure) => {
              const IconComponent = measure.icon
              return (
                <Card
                  key={measure.title}
                  className="bg-gradient-card border-primary/20"
                >
                  <CardHeader className="space-y-3">
                    <IconComponent className="w-12 h-12 text-primary" />
                    <CardTitle className="text-xl">{measure.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {measure.description}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {measure.details.map((detail) => (
                        <li key={detail} className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-primary" />
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Tus Derechos</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Control total sobre tu información personal
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rights.map((right) => (
              <Card
                key={right.title}
                className="bg-gradient-card border-primary/20"
              >
                <CardHeader>
                  <CardTitle className="text-lg">{right.title}</CardTitle>
                  <p className="text-muted-foreground text-sm">
                    {right.description}
                  </p>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" size="sm" className="w-full">
                    {right.action}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-secondary/20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Uso de Cookies</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Transparencia completa sobre las cookies que utilizamos
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {cookieTypes.map((cookie) => (
              <Card
                key={cookie.type}
                className="bg-gradient-card border-primary/20"
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{cookie.type}</CardTitle>
                    <Badge variant={cookie.required ? "default" : "secondary"}>
                      {cookie.required ? "Requeridas" : "Opcionales"}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">{cookie.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Ejemplos:</h4>
                    {cookie.examples.map((example) => (
                      <div
                        key={example}
                        className="text-sm bg-secondary/30 px-2 py-1 rounded"
                      >
                        {example}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Ciclo de vida de tus datos</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Procesos auditables para garantizar control y trazabilidad
            </p>
          </div>

          <div className="max-w-4xl mx-auto relative">
            <div className="hidden sm:block absolute left-6 top-0 bottom-0 w-px bg-primary/20" />
            <div className="space-y-8">
              {processingSteps.map((step, index) => {
                const IconComponent = step.icon
                return (
                  <div
                    key={step.title}
                    className="relative flex flex-col sm:flex-row sm:items-start gap-4 bg-gradient-card border border-primary/10 rounded-xl p-6"
                  >
                    <div className="flex items-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <div className="hidden sm:flex w-10 justify-center">
                        <RefreshCw className="w-4 h-4 text-primary/40" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Badge variant="outline" className="w-fit">
                        Paso {index + 1}
                      </Badge>
                      <h3 className="text-xl font-semibold">{step.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {step.description}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-primary" />
                        {step.detail}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-secondary/20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-6">Compartir Información</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Cuándo y con quién compartimos tus datos
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <Card className="bg-gradient-card border-green-500/20 text-center p-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2 text-green-500">
                Lo que SÍ hacemos
              </h3>
              <ul className="text-sm text-left space-y-2">
                <li>✓ Compartir con tu consentimiento explícito</li>
                <li>✓ Proveedores de servicios certificados</li>
                <li>✓ Cumplimiento de órdenes legales</li>
                <li>✓ Agregación de datos anónimos</li>
              </ul>
            </Card>

            <Card className="bg-gradient-card border-red-500/20 text-center p-8">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2 text-red-500">
                Lo que NO hacemos
              </h3>
              <ul className="text-sm text-left space-y-2">
                <li>✗ Vender datos a terceros</li>
                <li>✗ Publicidad dirigida externa</li>
                <li>✗ Compartir sin consentimiento</li>
                <li>✗ Transferir a países sin protección</li>
              </ul>
            </Card>

            <Card className="bg-gradient-card border-primary/20 text-center p-8">
              <Shield className="w-16 h-16 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Siempre Protegido</h3>
              <ul className="text-sm text-left space-y-2">
                <li>• Contratos de confidencialidad</li>
                <li>• Cifrado en tránsito y reposo</li>
                <li>• Auditorías regulares</li>
                <li>• Monitoreo continuo</li>
              </ul>
            </Card>
          </div>

          <div className="max-w-4xl mx-auto">
            <Card className="bg-gradient-card border-primary/30">
              <CardHeader>
                <CardTitle className="text-2xl text-center">
                  Nuestros compromisos de cumplimiento
                </CardTitle>
                <p className="text-sm text-muted-foreground text-center">
                  Operamos con políticas alineadas a regulaciones nacionales e
                  internacionales para garantizar el resguardo de tu información.
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  {complianceHighlights.map((item) => (
                    <Badge
                      key={item}
                      variant="outline"
                      className="text-xs px-3 py-2 border-primary/30"
                    >
                      {item}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-20 bg-secondary/20">
        <div className="container mx-auto px-6">
          <Card className="bg-gradient-card border-primary/20 text-center p-12 max-w-3xl mx-auto">
            <Mail className="w-16 h-16 text-primary mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">Preguntas sobre Privacidad</h2>
            <p className="text-lg text-muted-foreground mb-6">
              Nuestro Oficial de Protección de Datos está disponible para resolver
              todas tus dudas y acompañarte en cada solicitud.
            </p>
            <div className="bg-secondary/30 p-4 rounded-lg mb-6">
              <Link
                href={`mailto:${PRIVACY_EMAIL}`}
                className="font-mono text-sm text-primary hover:underline"
              >
                {PRIVACY_EMAIL}
              </Link>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild>
                <Link
                  href={`mailto:${PRIVACY_EMAIL}?subject=Solicitud%20pol%C3%ADtica%20de%20privacidad`}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Política Completa
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link
                  href={`mailto:${PRIVACY_EMAIL}?subject=Solicitud%20de%20acceso%20a%20datos`}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Mis Datos
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      </section>

      <Footer />
    </main>
  )
}
