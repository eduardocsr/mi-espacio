# DESIGN SYSTEM: MI ESPACIO (Figma UI3 Specification)

> **Documento Maestro de Tokens, Estilos y Componentes**  
> **Versión:** 1.0.0 — Noviembre 2026  
> **Framework:** Angular 19 + Tailwind CSS 4  
> **Diseñado para:** Figma UI3 (Variables, Text Styles, Auto Layout y Componentes)  
> **Estética:** *Warm Editorial Minimalist* (Editorial Cálido, Enfoque Zen y Alto Contraste)

---

## 1. Tokens y Variables de Color (Figma Variables)

En Figma UI3, crea dos colecciones:
1. **`Primitives`:** Valores absolutos (HEX) independientes de modo.
2. **`Semantic`:** Tokens contextuales con dos modos configurados: **`Light`** y **`Dark`**.

---

### 1.1 Colección Semántica: Superficies (`color/bg/*`)

| Variable Figma | Modo Light | Modo Dark | Variable CSS / Token | Uso / Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `color/bg/canvas` | `#FAF7F5` | `#121115` | `--color-editorial-bg` | Fondo base de la aplicación y lienzos principales. |
| `color/bg/sidebar` | `#F4EFEA` | `#16151B` | `--color-editorial-sidebar` | Barra de navegación lateral fija (`w-64`). |
| `color/bg/surface` | `#FFFFFF` | `#19181E` | `--color-editorial-card` | Tarjetas Kanban, modales, menús y desplegables. |
| `color/bg/surface-subtle` | `#FAF7F5` | `#201E27` | *Tailwind utility* | Fondos de inputs, chips secundarios y subpaneles. |
| `color/bg/hover/item` | `#ECE5E0` | `#201E27` | *Tailwind utility* | Hover en enlaces de navegación del Sidebar. |
| `color/bg/active/pill` | `#EAE2DE` | `#25232D` | *Tailwind utility* | Enlace de navegación activo (`routerLinkActive`). |
| `color/bg/hover/canvas` | `#FAF7F5` | `#121115` | *Tailwind utility* | Hover en filas de listas de notas y tareas. |
| `color/bg/backdrop` | `rgba(35, 31, 32, 0.40)` | `rgba(0, 0, 0, 0.70)` | `bg-black/50` / `bg-black/70` | Fondos de bloqueo modal con desenfoque (`backdrop-blur-xs`). |

---

### 1.2 Colección Semántica: Bordes y Divisores (`color/border/*`)

| Variable Figma | Modo Light | Modo Dark | Variable CSS / Token | Uso / Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `color/border/subtle` | `#EAE2DE` | `#2A2832` | `--color-editorial-border` | Borde por defecto de tarjetas, modales e inputs. |
| `color/border/sidebar` | `#E6DFDA` | `#2A2832` | `--color-editorial-sidebar-border` | Divisor vertical del Sidebar principal. |
| `color/border/divider` | `rgba(234, 226, 222, 0.60)` | `rgba(42, 40, 50, 0.60)` | `border-[#EAE2DE]/60` | Líneas divisorias internas en tarjetas y modales. |
| `color/border/hover` | `color-mix(accent, 40%)` | `color-mix(accent-dark, 40%)` | `hover:border-[#74566E]/40` | Hover en tarjetas de onboarding, inputs y botones ghost. |
| `color/border/focus` | `var(--app-accent)` | `var(--app-accent-dark)` | `focus:border-[#74566E]` | Borde al enfocar inputs, textareas y selects. |

---

### 1.3 Colección Semántica: Tipografía (`color/text/*`)

| Variable Figma | Modo Light | Modo Dark | Variable CSS / Token | Uso / Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `color/text/primary` | `#231F20` | `#F3EFEA` | `--color-editorial-text` | Títulos, encabezados H1-H3 y texto de lectura principal. |
| `color/text/secondary` | `#635B5E` | `#A39E9B` | `--color-editorial-text-muted` | Subtítulos, metadatos, descripciones y placeholders. |
| `color/text/tertiary` | `rgba(99, 91, 94, 0.60)` | `rgba(243, 239, 234, 0.40)` | *Tailwind utility* | Placeholders sutiles, micro-copies y atajos `⌘K`. |
| `color/text/inverse` | `#FFFFFF` | `#121115` | `text-white` | Texto sobre botones primarios y badges oscuros. |

---

### 1.4 Temas y Acentos Dinámicos (`color/accent/*`)

La aplicación cuenta con 5 paletas de acento seleccionables en el Onboarding y en Ajustes:

| Nombre del Acento | ID Token | `primary` (Light) | `hover` | `light` (Tint) | `dark` (Dark Mode) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Ciruela Editorial (Predeterminado)** | `warm-purple` | `#74566E` | `#5E4359` | `#EFEAF6` | `#9D7B96` |
| **Azul Océano** | `ocean` | `#265B8A` | `#1E486D` | `#E8F1FA` | `#7EB3E0` |
| **Verde Esmeralda** | `emerald` | `#246A49` | `#1B5238` | `#E6F3EC` | `#52B788` |
| **Ámbar Cálido** | `amber` | `#8C4A19` | `#703A14` | `#FEF5EC` | `#E9B949` |
| **Rosa Terracota** | `rose` | `#9C3D54` | `#7E3043` | `#FCEEF2` | `#E58B9E` |

#### Identidad de Marca Complementaria
- **Coral Terracota (Logo Mi Espacio):** `#C97D60` (acompaña a Ciruela `#74566E`).

---

### 1.5 Colores Semánticos de Estado (`color/feedback/*`)

| Estado | Token Figma | Modo Light | Modo Dark | Aplicación |
| :--- | :--- | :--- | :--- | :--- |
| **Éxito (Success)** | `color/feedback/success-bg`<br>`color/feedback/success-text`<br>`color/feedback/success-border` | `#E6F3EC`<br>`#246A49`<br>`rgba(36, 106, 73, 0.20)` | `#192A21`<br>`#52B788`<br>`rgba(36, 106, 73, 0.30)` | Sincronización Google Cloud Activo, tareas completadas, toasts de éxito. |
| **Advertencia (Warning)** | `color/feedback/warning-bg`<br>`color/feedback/warning-text`<br>`color/feedback/warning-border` | `#FEF9E7`<br>`#975A16`<br>`rgba(151, 90, 22, 0.20)` | `#2B2313`<br>`#E9B949`<br>`rgba(233, 185, 73, 0.30)` | Sincronizando en progreso, guardado pendiente, avisos temporales. |
| **Peligro (Danger / Error)** | `color/feedback/danger-bg`<br>`color/feedback/danger-text`<br>`color/feedback/danger-border` | `#FDECEC`<br>`#9B2C2C`<br>`rgba(155, 44, 44, 0.20)` | `#2F1717`<br>`#E57373`<br>`rgba(229, 115, 115, 0.30)` | Error de sincronización, confirmación de eliminación, tareas vencidas. |
| **Informativo (Info)** | `color/feedback/info-bg`<br>`color/feedback/info-text` | `#FAF7F5`<br>`#74566E` | `#25202B`<br>`#9D7B96` | Toasts informativos, alertas de navegación. |

---

### 1.6 Badges de Categoría y Tipos de Incidencia (`color/badge/*`)

#### Calendario y Recordatorios
| Categoría | Modo Light (Bg / Text / Dot) | Modo Dark (Bg / Text) |
| :--- | :--- | :--- |
| **Reunión / Trabajo** | `#EFEAF6` / `#5B447A` / `#74566E` | `rgba(116, 86, 110, 0.20)` / `#9D7B96` |
| **Pago / Salud** | `#E6F3EC` / `#246A49` / `#246A49` | `rgba(36, 106, 73, 0.20)` / `#86EFAC` |
| **Estudio / Pagos** | `#E8F1FA` / `#265B8A` / `#265B8A` | `rgba(38, 91, 138, 0.20)` / `#93C5FD` |
| **Ejercicio / Personal** | `#FDF0E6` / `#8C4A19` / `#8C4A19` | `rgba(140, 74, 25, 0.20)` / `#FDBA74` |
| **Entrega** | `#FEF3C7` / `#92400E` / `#D97706` | `rgba(217, 119, 6, 0.20)` / `#FDE047` |

#### Tipos de Tarea (Jira Issue Types)
| Tipo | Modo Light (Bg / Text / Border) | Icono Lucide |
| :--- | :--- | :--- |
| **Historia** | `#E6F3EC` / `#246A49` / `#246A49` | `bookmark` |
| **Tarea** | `#E8F1FA` / `#265B8A` / `#265B8A` | `check-square` |
| **Mejora** | `#EFEAF6` / `#5B447A` / `#74566E` | `arrow-up-circle` |
| **Error (Bug)** | `#FDECEC` / `#9B2C2C` / `#9B2C2C` | `alert-circle` |

#### Prioridades Kanban
- **Alta:** Fondo `#FDECEC`, Texto `#9B2C2C`
- **Media:** Fondo `#FDF0E6`, Texto `#8C4A19`
- **Baja:** Fondo `#E6F3EC`, Texto `#246A49`

---

## 2. Escala Tipográfica (Figma Text Styles)

### 2.1 Familias Tipográficas
1. **Sans-Serif Principal:** `Plus Jakarta Sans` (`system-ui, -apple-system, sans-serif`)
2. **Monospace / Técnico:** `JetBrains Mono` (`monospace`)

### 2.2 Tabla de Estilos de Texto para Figma

| Nombre de Estilo Figma | Familia | Peso (Weight) | Tamaño (px / rem) | Line Height | Letter Spacing | Caso de Uso |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `Display/Hero` | Plus Jakarta Sans | 800 (ExtraBold) | 28px / 1.75rem | 36px (130%) | -0.02em | Títulos de notas principales en modo lectura. |
| `Heading/H1` | Plus Jakarta Sans | 700 (Bold) | 24px / 1.50rem | 32px (133%) | -0.015em | Título de modales (Onboarding, Bienvenida). |
| `Heading/H2` | Plus Jakarta Sans | 700 (Bold) | 20px / 1.25rem | 28px (140%) | -0.01em | Encabezados de vistas, Kanban y Calendario. |
| `Heading/H3` | Plus Jakarta Sans | 600 (SemiBold) | 16px / 1.00rem | 24px (150%) | -0.005em | Título de tarjetas, columnas y grupos. |
| `Body/Regular` | Plus Jakarta Sans | 400 (Regular) | 14px / 0.875rem | 22px (157%) | 0 | Texto de lectura en editor ProseMirror y notas. |
| `Body/Medium` | Plus Jakarta Sans | 500 (Medium) | 14px / 0.875rem | 20px (143%) | 0 | Elementos de navegación y nombres de archivos. |
| `Body/Bold` | Plus Jakarta Sans | 700 (Bold) | 14px / 0.875rem | 20px (143%) | 0 | Títulos de tareas en Kanban y eventos destacados. |
| `Caption/Regular` | Plus Jakarta Sans | 400 (Regular) | 12px / 0.75rem | 18px (150%) | +0.01em | Descripciones, ayudas contextuales y subtítulos. |
| `Caption/Medium` | Plus Jakarta Sans | 500 (Medium) | 12px / 0.75rem | 16px (133%) | +0.01em | Etiquetas de formulario y placeholders. |
| `Caption/Bold` | Plus Jakarta Sans | 700 (Bold) | 12px / 0.75rem | 16px (133%) | +0.02em | Badges de estado, prioridad y cabeceras de tabla. |
| `Micro/Label` | Plus Jakarta Sans | 600 (SemiBold) | 11px / 0.6875rem | 14px (127%) | +0.025em | Metadatos compactos y contadores secundarios. |
| `Mono/Code` | JetBrains Mono | 400 (Regular) | 13px / 0.8125rem | 20px (154%) | 0 | Bloques de código (`<pre><code>`). |
| `Mono/Tabular` | JetBrains Mono | 600 (SemiBold) | 12px / 0.75rem | 16px (133%) | 0 | Fechas, horas, contadores de tareas (`tabular-nums`). |
| `Mono/Kbd` | JetBrains Mono | 500 (Medium) | 11px / 0.6875rem | 14px (127%) | 0 | Atajos de teclado en Command Palette (`⌘ K`, `ESC`). |

> **Regla de Cifras Tabulares (`tabular-nums`):**  
> En Figma, activa en el panel tipográfico *OpenType Features* la opción **Number Spacing → Tabular Numbers** para contadores de navegación, horas en Recordatorios y fechas en Calendario.

---

## 3. Espaciado, Retícula (Auto Layout) y Radios de Borde

### 3.1 Escala Base de Espaciado (Grid de 4px / 8px)

| Token Figma / Tailwind | Valor (px) | Valor (rem) | Aplicación Común |
| :--- | :--- | :--- | :--- |
| `space-1` | 4px | 0.25rem | Separación entre micro-iconos y texto, gap de badges. |
| `space-1.5` | 6px | 0.375rem | Padding vertical de chips compactos y atajos Kbd. |
| `space-2` | 8px | 0.50rem | Gap interno de botones, padding de celdas compactas. |
| `space-2.5` | 10px | 0.625rem | Padding vertical de inputs estándar y enlaces de navegación. |
| `space-3` | 12px | 0.75rem | Padding lateral de inputs, gap entre columnas secundarias. |
| `space-3.5` | 14px | 0.875rem | Padding interno de tarjetas Kanban y listas de notas. |
| `space-4` | 16px | 1.00rem | Padding estándar de contenedores, columnas y paneles. |
| `space-5` | 20px | 1.25rem | Espaciado entre secciones de formularios. |
| `space-6` | 24px | 1.50rem | Padding de modales y cabeceras de vista principal. |
| `space-7` | 28px | 1.75rem | Padding generoso de modales editoriales (Onboarding). |
| `space-8` | 32px | 2.00rem | Separación entre bloques de lectura. |

---

### 3.2 Dimensiones Clave del Layout (Auto Layout en Figma)

| Estructura | Ancho (Width) | Alto (Height) | Auto Layout / Propiedades |
| :--- | :--- | :--- | :--- |
| **Sidebar Principal** | `256px` (`w-64`) | `100vh` (Fixed) | Vertical, Padding `16px`, Gap `24px`, Borde derecho `1px`. |
| **Sub-sidebar Apuntes** | `260px` - `288px` (`w-72`) | `calc(100vh - 64px)` | Vertical, Padding `14px`, Gap `16px`, Borde derecho `1px`. |
| **Topbar Superior** | `100%` (`w-full`) | `64px` (`h-16`) | Horizontal, Space-between, Padding `x: 24px`, Borde inferior `1px`. |
| **Lienzo Editor Central** | `flex-1` (Min `640px`) | `100%` | Vertical, Padding `x: 32px, y: 24px`, Max-width contenido `840px`. |
| **Panel Lateral Derecho (Detalles)** | `288px` - `320px` (`w-72 lg:w-80`) | `100%` | Vertical, Padding `16px`, Borde izquierdo `1px`. |
| **Columna Kanban** | `275px` | `100%` | Vertical, Padding `12px`, Fondo `#FAF7F5` / `#16151B`, Radio `16px`. |
| **Modal Pequeño / Confirmación** | `448px` (`max-w-md`) | Hug Contents | Vertical, Padding `24px`, Radio `16px`, Shadow-2xl. |
| **Modal Mediano / Onboarding** | `512px` (`max-w-lg`) | Hug Contents | Vertical, Padding `28px`, Radio `24px`, Shadow-2xl. |
| **Command Palette (`⌘K`)** | `672px` (`max-w-2xl`) | Max `80vh` | Vertical, Padding `0px`, Radio `16px`, Shadow-2xl. |

---

### 3.3 Radios de Borde (Corner Radii)

| Token Figma | Valor (px) | Clase Tailwind | Componentes Asociados |
| :--- | :--- | :--- | :--- |
| `radius/sm` | 4px | `rounded` | Checkboxes, tags pequeños, inline-code. |
| `radius/md` | 6px | `rounded-md` | Botones de icono compactos, menús contextuales. |
| `radius/lg` | 8px | `rounded-lg` | Kbd shortcuts, botones secundarios pequeños, sub-pills. |
| `radius/xl` | 12px | `rounded-xl` | **Estándar:** Botones, inputs, tarjetas Kanban, items de menú. |
| `radius/2xl` | 16px | `rounded-2xl` | Modales estándar, tarjetas de Onboarding, Toast stacks. |
| `radius/3xl` | 24px | `rounded-3xl` | Modal de Onboarding, tarjetas Hero y destacados. |
| `radius/full` | 9999px | `rounded-full` | Pills de sincronización, avatares, swatches de color. |

---

### 3.4 Elevaciones y Sombras (`box-shadow`)

| Nivel de Elevación | Modo Light | Modo Dark | Uso |
| :--- | :--- | :--- | :--- |
| **Sombra Mínima (`shadow-xs`)** | `0 1px 2px 0 rgba(0, 0, 0, 0.05)` | `none` | Botones primarios, inputs al hover. |
| **Sombra Sutil (`shadow-sm`)** | `0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.06)` | `0 2px 4px 0 rgba(0, 0, 0, 0.40)` | Tarjetas Kanban en reposo. |
| **Sombra Elevada (`shadow-lg`)** | `0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04)` | `0 10px 15px -3px rgba(0, 0, 0, 0.40)` | Desplegables y menús emergentes. |
| **Sombra Flotante (`shadow-xl`)** | `0 20px 25px -5px rgba(0, 0, 0, 0.10), 0 8px 10px -6px rgba(0, 0, 0, 0.04)` | `0 20px 25px -5px rgba(0, 0, 0, 0.50)` | Notificaciones Toast (`UiFeedbackService`). |
| **Sombra Modal (`shadow-2xl`)** | `0 25px 50px -12px rgba(0, 0, 0, 0.20)` | `0 25px 50px -12px rgba(0, 0, 0, 0.65)` | Modales (Onboarding, Confirmación, ⌘K). |

---

## 4. Iconografía y Componentes Base

### 4.1 Especificación de Iconografía (Lucide SVG)

- **Librería Exclusiva:** **Lucide Icons** (formato SVG).
- **Prohibición Estricta:** Cero emojis en la interfaz gráfica de usuario. Todos los indicadores de estado, carpetas, prioridades y categorías se expresan mediante Lucide SVG.
- **Grosor de Trazo Estándar (`stroke-width`):** `1.75` para navegación y lectura; `2.0` para micro-acciones y botones de control; `2.5` en badges de estado técnico.
- **Escala de Tamaños:**
  - `12px` (`size-3`): Indicadores micro en badges de sincronización y estado.
  - `14px` (`size-3.5`): Iconos en botones compactos, inputs y filtros.
  - `16px` (`size-4`): Iconos en botones estándar, buscador y tarjetas Kanban.
  - `18px` (`size-4.5`): Iconos principales en el Sidebar de navegación.
  - `20px` (`size-5`): Icono de búsqueda general y cabeceras de modal.

---

### 4.2 Matriz de Variantes de Componentes para Figma

#### Componente: Botón (`Button`)
- **Propiedades de Componente en Figma:**
  - `Variant`: `Primary` | `Secondary` | `Ghost` | `Danger`
  - `Size`: `SM (32px)` | `MD (40px)` | `LG (46px)`
  - `State`: `Default` | `Hover` | `Focus` | `Disabled`
  - `IconLeft`: `True` / `False`
  - `IconRight`: `True` / `False`

| Variante | Fondo (Light / Dark) | Borde (Light / Dark) | Texto / Icono |
| :--- | :--- | :--- | :--- |
| **Primary** | `#74566E` / `#9D7B96` | Transparente | `#FFFFFF` |
| **Primary (Hover)** | `#5E4359` / `#85637E` | Transparente | `#FFFFFF` |
| **Secondary** | `#FFFFFF` / `#201E27` | `#EAE2DE` / `#2A2832` | `#635B5E` / `#F3EFEA` |
| **Secondary (Hover)**| `#FAF7F5` / `#121115` | `#74566E`/40 / `#9D7B96`/40 | `#231F20` / `#FFFFFF` |
| **Ghost** | Transparente | Transparente | `#635B5E` / `#A39E9B` |
| **Ghost (Hover)** | `#EAE2DE`/60 / `#2A2832` | Transparente | `#231F20` / `#FFFFFF` |
| **Danger** | `#9B2C2C` / `#9B2C2C` | Transparente | `#FFFFFF` |
| **Danger (Hover)** | `#822424` / `#B91C1C` | Transparente | `#FFFFFF` |

---

#### Componente: Input & Buscador (`Search / Input`)
- **Anatomía:**
  - Altura: `40px` (Input estándar) | `44px` (Buscador `⌘K`)
  - Padding: `x: 12px, y: 10px`
  - Radio: `12px` (`rounded-xl`)
  - Fondo: `#FAF7F5` (Light) / `#121115` (Dark)
  - Borde: `1px solid #EAE2DE` (Light) / `1px solid #2A2832` (Dark)
- **Estados:**
  - `Default`: Borde `#EAE2DE`, Texto `#231F20`, Placeholder `#635B5E`/60.
  - `Hover`: Borde `#74566E`/40 (Light) / `#9D7B96`/40 (Dark).
  - `Focus`: Borde `#74566E` (Light) / `#9D7B96` (Dark), Outline `none`.
  - `Disabled`: Opacidad `50%`, cursor `not-allowed`.

---

#### Componente: Tarjeta Kanban (`KanbanCard`)
- **Anatomía:**
  - Ancho: `275px` (o `100%` en columna)
  - Radio: `12px` (`rounded-xl`)
  - Borde: `1px solid #EAE2DE` (Light) / `1px solid #2A2832` (Dark)
  - Fondo: `#FFFFFF` (Light) / `#19181E` (Dark)
  - Padding: `14px` (`p-3.5`)
  - Sombra: `shadow-xs` en reposo; `shadow-lg` al arrastrar (`cdk-drag-preview`).
- **Estados:**
  - `Default`: Borde sutil, fondo blanco o grafito.
  - `Hover`: Borde `#74566E` (Light) / `#9D7B96` (Dark), transición suave.
  - `Dragging`: Elevación `shadow-xl`, borde de acento sólido `1.5px solid #74566E`.

---

#### Componente: Toast de Notificación (`ToastItem`)
- **Anatomía:**
  - Ancho: `360px` (`max-w-sm`)
  - Padding: `14px` (`p-3.5`)
  - Radio: `16px` (`rounded-2xl`)
  - Fondo: `#FFFFFF`/95 con `backdrop-blur-md` (Light) / `#19181E`/95 (Dark)
  - Borde: `1px solid #EAE2DE` (Light) / `1px solid #2A2832` (Dark)
  - Sombra: `shadow-xl`
  - Icon Badge: `28px x 28px`, Radio `10px`, coloreado según tipo semántico (`success`, `error`, `warning`, `info`).

---

#### Componente: Modal Editorial (`Modal`)
- **Anatomía:**
  - Ancho: `448px` (Confirmación) / `512px` (Onboarding / Formulario)
  - Padding: `24px` a `28px`
  - Radio: `16px` a `24px`
  - Borde: `1px solid #EAE2DE` (Light) / `1px solid #2A2832` (Dark)
  - Fondo: `#FFFFFF` (Light) / `#19181E` (Dark)
  - Sombra: `shadow-2xl`
  - Backdrop: `rgba(0, 0, 0, 0.50)` (Light) / `rgba(0, 0, 0, 0.70)` (Dark) con `backdrop-blur-xs`.

---

## 5. Inconsistencias Detectadas y Notas de Implementación

Durante la extracción exhaustiva de estilos y componentes, se identificaron los siguientes puntos técnicos a considerar al crear el archivo en Figma:

1. **Variación en Sombras de Modo Oscuro:**
   En el código, los componentes en modo oscuro utilizan elevaciones con mayor opacidad (`rgba(0, 0, 0, 0.50)` a `0.65`) que el estándar de Tailwind por defecto, garantizando que modales y tarjetas se separen adecuadamente del fondo casi negro (`#121115`).
2. **Textos Secundarios en Dark Mode:**
   Algunos componentes antiguos utilizan clases auxiliares de Tailwind (`text-neutral-400` / `#A3A3A3`) en lugar del token oficial `--color-editorial-dark-text` atenuado (`#A39E9B` / `rgba(243, 239, 234, 0.70)`). En Figma se recomienda unificar todos bajo la variable `color/text/secondary` en modo `Dark`.
3. **Mapeo Dinámico de la Clase `.text-[#5B447A]`:**
   En CSS global, la clase `.text-[#5B447A]` está mapeada a `var(--app-accent) !important` en modo claro y `var(--app-accent-dark) !important` en modo oscuro. En Figma debe representarse directamente como `color/accent/primary` o `color/badge/meeting-text`.
4. **Colores de Syntax Highlighting (Bloques de Código):**
   Los bloques de código con resaltado sintáctico (`hljs-*`) emplean una paleta intencional de alto contraste (Azul `#2563EB`, Verde `#16A34A`, Carmesí `#DC2626`, Ámbar `#D97706`). Se recomienda agruparlos en una subcolección `Code/Syntax` si se van a maquetar pantallas con bloques de desarrollo.

---
*Fin del documento de especificación. Todo el contenido está alineado 1:1 con el código fuente en producción de «Mi Espacio».*
