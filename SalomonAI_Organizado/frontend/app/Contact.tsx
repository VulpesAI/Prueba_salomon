import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, 
  Phone, 
  MapPin, 
  MessageSquare,
  Send,
  Calendar,
  Clock,
  CheckCircle
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    setTimeout(() => {
      toast({
        title: "Mensaje enviado exitosamente",
        description: "Te contactaremos en las próximas 24 horas.",
      });
      setFormData({ name: "", email: "", company: "", message: "" });
      setIsSubmitting(false);
    }, 2000);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <section className="py-20 bg-secondary/20" id="contact">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 bg-primary/20 text-primary">
            <MessageSquare className="w-4 h-4 mr-2" />
            Contacto
          </Badge>
          <h2 className="text-4xl font-bold mb-6 text-foreground">
            ¿Listo para Revolucionar tus Finanzas?
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Contáctanos para una demo personalizada o resolver cualquier duda sobre SalomónAI
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Contact Form */}
          <Card className="bg-gradient-card border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                Envíanos un Mensaje
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Responderemos en menos de 24 horas
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Nombre *</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      placeholder="Tu nombre completo"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Email *</label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      placeholder="tu@email.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Empresa (opcional)</label>
                  <Input
                    value={formData.company}
                    onChange={(e) => handleInputChange("company", e.target.value)}
                    placeholder="Nombre de tu empresa"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Mensaje *</label>
                  <Textarea
                    value={formData.message}
                    onChange={(e) => handleInputChange("message", e.target.value)}
                    placeholder="Cuéntanos cómo podemos ayudarte..."
                    rows={5}
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Enviar Mensaje
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <div className="space-y-8">
            {/* Contact Details */}
            <Card className="bg-gradient-card border-primary/20">
              <CardHeader>
                <CardTitle>Información de Contacto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Email</h4>
                    <p className="text-sm text-muted-foreground">hola@salomonai.cl</p>
                    <p className="text-sm text-muted-foreground">soporte@salomonai.cl</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Teléfono</h4>
                    <p className="text-sm text-muted-foreground">+56 2 2XXX XXXX</p>
                    <p className="text-xs text-muted-foreground">Lun - Vie, 9:00 - 18:00</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Oficina</h4>
                    <p className="text-sm text-muted-foreground">Las Condes, Santiago</p>
                    <p className="text-sm text-muted-foreground">Chile</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Schedule Demo */}
            <Card className="bg-gradient-card border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Agenda una Demo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Reserva 30 minutos para ver SalomónAI en acción
                </p>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    <span>Demo personalizada en vivo</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    <span>Análisis de tu caso específico</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    <span>Respuestas a todas tus preguntas</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    <span>Configuración inicial gratuita</span>
                  </div>
                </div>

                <Button className="w-full bg-accent hover:bg-accent/90">
                  <Calendar className="w-4 h-4 mr-2" />
                  Agendar Demo Gratuita
                </Button>

                <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
                  <Clock className="w-3 h-3" />
                  <span>Disponibilidad inmediata</span>
                </div>
              </CardContent>
            </Card>

            {/* Support Options */}
            <Card className="bg-gradient-card border-primary/20">
              <CardHeader>
                <CardTitle>Soporte Técnico</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 bg-secondary/30 rounded-lg">
                    <MessageSquare className="w-6 h-6 text-primary mx-auto mb-2" />
                    <p className="text-xs font-medium">Chat en vivo</p>
                    <p className="text-xs text-muted-foreground">24/7</p>
                  </div>
                  <div className="p-3 bg-secondary/30 rounded-lg">
                    <Mail className="w-6 h-6 text-accent mx-auto mb-2" />
                    <p className="text-xs font-medium">Email</p>
                    <p className="text-xs text-muted-foreground">&lt; 2 horas</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full">
                  Centro de Ayuda
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;