# Guía rápida de estilo de interfaz

## Paleta base
- **Primario:** gradiente azul-violeta `#743DFF` → `#007CF0`, con texto en `#F5F7FF`.
- **Primario (oscuro):** gradiente reducido `#5C2AD6` → `#0062D1` para fondos profundos.
- **Secundario:** azul profundo `#081134` con texto en `#F5F7FF`.
- **Neutros claros:**
  - Fondo general `#F5F7FF`
  - Superficie `#FFFFFF`
  - Sutil `#F1F5F9`
  - Muted `#E2E8F0`
  - Texto muted `#475569`
  - Borde `#CBD5E1`
  - Texto principal `#081134`
- **Neutros oscuros (para modo oscuro/futuro):**
  - Fondo `#0B1943`
  - Superficie `#1F2937`
  - Sutil `#1F2937`
  - Muted `#374151`
  - Texto muted `#E2E8F0`
  - Borde `#374151`
  - Texto principal `#F9FAFB`
- **Estados:** éxito `#22C55E` (texto `#052E16`), advertencia `#F59E0B` (texto `#451A03`), error `#EF4444` (texto `#450A0A`).

Los tokens provienen de `frontend/tailwind.config.ts`, por lo que cualquier ajuste debe mantenerse sincronizado con ese archivo para evitar discrepancias.

## Uso de gradientes
- `gradient-primary`: `linear-gradient(135deg, #743DFF 0%, #007CF0 100%)` para CTA principales y fondos hero.
- `gradient-hero`: `linear-gradient(135deg, rgba(8, 17, 52, 0.08) 0%, rgba(116, 61, 255, 0.08) 100%)` para overlays ligeros.
- `gradient-card`: `linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)` para tarjetas translúcidas sobre fondos oscuros.

Preferir gradientes como fondos en contenedores amplios; el texto debe renderizarse sobre colores sólidos extraídos del gradiente o utilizar el color `foreground` asociado para mantener legibilidad.

## Contraste y accesibilidad
- Objetivo mínimo WCAG 2.1 **AA**: 4.5:1 para texto normal, 3:1 para texto grande (≥24 px o ≥19 px en negritas).
- Objetivo recomendado WCAG 2.1 **AAA** para contenido crítico: 7:1.
- Validar contrastes con:
  - [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/).
  - [Herramienta de accesibilidad en DevTools](https://developer.chrome.com/docs/devtools/accessibility/reference/#contrast).
  - Plugin Stark (Figma/Sketch/XD) con presets WCAG AA/AAA.

Documenta la relación de contraste (por ejemplo, en comentarios de PR) cuando introduzcas combinaciones nuevas, especialmente sobre fondos gradientes.

## Estrategia para modo claro/oscuro
- El proyecto ya usa `darkMode: "class"` en Tailwind, lo que facilita alternar temas a través de una clase `dark` en el `<html>`.
- Mantener variables de color en `palette.neutral.light` y `palette.neutral.dark` permite definir tokens compartidos.
- Para nuevas superficies, define primero los valores claros y documenta los equivalentes oscuros en el mismo componente o archivo de tokens.
- Cuando se introduzca un toggle de modo claro/oscuro, reutilizar los tokens existentes y evitar colores inlined en JSX/CSS; usa utilidades `bg-background`, `text-foreground`, `border-border`, etc.

## Lista de verificación rápida
- [ ] ¿El fondo usa un color o token existente?
- [ ] ¿El texto cumple AA/AAA usando alguna herramienta anterior?
- [ ] ¿Los gradientes tienen un color sólido alternativo para estados hover/foco?
- [ ] ¿Los tokens se actualizan tanto para modo claro como para oscuro (cuando aplique)?
