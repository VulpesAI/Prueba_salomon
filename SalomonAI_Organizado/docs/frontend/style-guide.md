# Guía rápida de estilo de interfaz

Resumen práctico de la paleta oficial, gradientes y criterios de contraste para facilitar revisiones de diseño y componentes.

## Paleta base (tokens principales)

| Tipo                    | Token / uso                                     | Valores hex                         | Texto recomendado                     |
| ----------------------- | ----------------------------------------------- | ----------------------------------- | ------------------------------------- |
| Primario                | `gradient-primary` CTA, héroes                  | `#743DFF → #007CF0`                 | `#F5F7FF`                             |
| Primario (oscuro)       | Fondos profundos, hover CTA                     | `#5C2AD6 → #0062D1`                 | `#F5F7FF`                             |
| Secundario              | Navegación, barras                              | `#081134`                           | `#F5F7FF`                             |
| Neutro claro fondo      | Fondo general                                   | `#F5F7FF`                           | `#081134`                             |
| Neutro claro superficie | Superficies / tarjetas claras                   | `#FFFFFF`                           | `#081134`                             |
| Neutro claro sutil      | Divisiones, hover                               | `#F1F5F9`                           | `#081134`                             |
| Neutro claro muted      | Bordes suaves                                   | `#E2E8F0`                           | `#475569`                             |
| Neutro claro texto muted| Texto secundario                                | `#475569`                           | `#F5F7FF` sobre fondos oscuros        |
| Estados                 | Éxito / warning / error                         | `#22C55E`, `#F59E0B`, `#EF4444`     | Texto `#052E16`, `#451A03`, `#450A0A` |
| Neutros oscuros         | Preparado para modo oscuro                      | Fondo `#0B1943`, superficie `#1F2937`, borde `#374151`, texto `#F9FAFB` |

Los valores se definen en `frontend/tailwind.config.ts`. Cuando ajustes la paleta, sincroniza estos tokens para evitar divergencias entre documentación y código.

## Uso recomendado de gradientes

- **`gradient-primary`**: CTA, botones principales, fondos hero. Añade un color sólido (`#5C2AD6`) para estados hover/foco y para bordes accesibles.
- **`gradient-hero`**: `linear-gradient(135deg, rgba(8, 17, 52, 0.08) 0%, rgba(116, 61, 255, 0.08) 100%)` sobre superficies claras para aportar profundidad.
- **`gradient-card`**: `linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)` encima de fondos oscuros. Para legibilidad, coloca texto sobre un overlay sólido o usa el color `foreground` del tema.

## Contraste y accesibilidad

- Objetivo mínimo WCAG 2.1 **AA**: 4.5:1 para texto normal, 3:1 para texto grande (≥24 px o ≥19 px en negritas).
- Objetivo recomendado WCAG 2.1 **AAA** para contenido crítico: 7:1.
- Documenta la relación de contraste cuando introduzcas combinaciones nuevas, sobre todo en superficies gradientes.

### Referencias rápidas

- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) – calcula ratios AA/AAA.
- [Chrome DevTools > Accessibility > Contrast](https://developer.chrome.com/docs/devtools/accessibility/reference/#contrast) – valida en ejecución.
- [Stark plugin](https://www.getstark.co/) – plugins Figma/Sketch/XD con reglas WCAG.

## Estrategia hacia un modo claro/oscuro

- Tailwind está configurado con `darkMode: "class"`; la clase `dark` en `<html>` activa los tokens oscuros existentes.
- Define primero el token claro (`bg-background`, `text-foreground`, etc.) y documenta su par oscuro en el mismo componente o módulo de tokens.
- Evita colores inlined en JSX/CSS. Usa utilidades de Tailwind o variables CSS para permitir overrides temáticos.
- Nuevos componentes deben incluir un fallback sólido cuando usen gradientes, facilitando la adaptación a modo claro u oscuro.

## Lista de verificación rápida

- [ ] ¿El color proviene de un token registrado en Tailwind?
- [ ] ¿La combinación cumple AA/AAA usando las herramientas anteriores?
- [ ] ¿Los gradientes tienen equivalentes sólidos para hover/foco?
- [ ] ¿El componente define variantes claras y deja preparado el token oscuro?
