import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-brand-logo',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (variant === 'full') {
      <svg 
        viewBox="0 0 264 64" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        class="w-auto h-14 sm:h-16 max-w-full select-none overflow-visible">
        <!-- Contenedor / Ventana Bento -->
        <rect 
          x="4" y="8" width="48" height="48" rx="14" 
          class="brand-bg fill-[#FAF7F5] dark:fill-[#201E27] stroke-[#EAE2DE] dark:stroke-[#2A2832]" 
          stroke-width="1.5"/>
        <!-- Pilar Izquierdo (Enfoque Editorial / Acento) -->
        <rect 
          x="14" y="18" width="12" height="28" rx="4" 
          [style.fill]="pillarFill"/>
        <!-- Bloque Superior Derecho (Coral Terracota) -->
        <rect 
          x="29" y="18" width="13" height="12" rx="4" 
          class="brand-coral fill-[#C97D60] dark:fill-[#D98D70]"/>
        <!-- Bloque Inferior Derecho (Acento Suave / Carpeta Bento) -->
        <rect 
          x="29" y="33" width="13" height="13" rx="4" 
          [style.fill]="pillarFill" 
          fill-opacity="0.28"/>
        <!-- Tipografía: Título Principal -->
        <text 
          x="72" y="33" 
          class="brand-title fill-[#231F20] dark:fill-[#F3EFEA]" 
          font-family="'Plus Jakarta Sans', system-ui, sans-serif" 
          font-size="21" 
          font-weight="700" 
          letter-spacing="-0.025em">Mi Espacio</text>
        <!-- Tipografía: Subtítulo Editorial -->
        <text 
          x="72" y="48" 
          class="brand-subtitle fill-[#635B5E] dark:fill-[#A39E9B]" 
          font-family="'Plus Jakarta Sans', system-ui, sans-serif" 
          font-size="10.5" 
          font-weight="500" 
          letter-spacing="0.12em">NOTAS · TAREAS · AGENDA</text>
      </svg>
    } @else if (variant === 'compact') {
      <svg 
        viewBox="0 0 196 64" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        class="w-auto h-10 max-w-full select-none overflow-visible">
        <!-- Contenedor / Ventana Bento -->
        <rect 
          x="4" y="8" width="48" height="48" rx="14" 
          class="brand-bg fill-[#FAF7F5] dark:fill-[#201E27] stroke-[#EAE2DE] dark:stroke-[#2A2832]" 
          stroke-width="1.5"/>
        <!-- Pilar Izquierdo (Enfoque Editorial / Acento) -->
        <rect 
          x="14" y="18" width="12" height="28" rx="4" 
          [style.fill]="pillarFill"/>
        <!-- Bloque Superior Derecho (Coral Terracota) -->
        <rect 
          x="29" y="18" width="13" height="12" rx="4" 
          class="brand-coral fill-[#C97D60] dark:fill-[#D98D70]"/>
        <!-- Bloque Inferior Derecho (Acento Suave / Carpeta Bento) -->
        <rect 
          x="29" y="33" width="13" height="13" rx="4" 
          [style.fill]="pillarFill" 
          fill-opacity="0.28"/>
        <!-- Tipografía: Título Principal Centrado Verticalmente -->
        <text 
          x="72" y="39" 
          class="brand-title fill-[#231F20] dark:fill-[#F3EFEA]" 
          font-family="'Plus Jakarta Sans', system-ui, sans-serif" 
          font-size="21" 
          font-weight="700" 
          letter-spacing="-0.025em">Mi Espacio</text>
      </svg>
    } @else {
      <svg 
        viewBox="0 0 48 48" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        class="w-10 h-10 max-w-full select-none overflow-visible">
        <!-- Contenedor / Ventana Bento Cuadrado 1:1 -->
        <rect 
          x="1" y="1" width="46" height="46" rx="13" 
          class="brand-bg fill-[#FAF7F5] dark:fill-[#201E27] stroke-[#EAE2DE] dark:stroke-[#2A2832]" 
          stroke-width="1.5"/>
        <!-- Pilar Izquierdo (Enfoque Editorial / Acento) -->
        <rect 
          x="10" y="10" width="12" height="28" rx="4" 
          [style.fill]="pillarFill"/>
        <!-- Bloque Superior Derecho (Coral Terracota) -->
        <rect 
          x="25" y="10" width="13" height="12" rx="4" 
          class="brand-coral fill-[#C97D60] dark:fill-[#D98D70]"/>
        <!-- Bloque Inferior Derecho (Acento Suave / Carpeta Bento) -->
        <rect 
          x="25" y="25" width="13" height="13" rx="4" 
          [style.fill]="pillarFill" 
          fill-opacity="0.28"/>
      </svg>
    }
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      line-height: 0;
    }

    :host([hidden]),
    :host.hidden {
      display: none !important;
    }

    .brand-bg {
      fill: #FAF7F5;
      stroke: #EAE2DE;
      transition: fill 0.2s ease, stroke 0.2s ease;
    }
    :host-context(html.dark) .brand-bg,
    :host-context(.dark) .brand-bg,
    html.dark :host .brand-bg,
    .dark :host .brand-bg {
      fill: #201E27;
      stroke: #2A2832;
    }

    .brand-title {
      fill: #231F20;
      transition: fill 0.2s ease;
    }
    :host-context(html.dark) .brand-title,
    :host-context(.dark) .brand-title,
    html.dark :host .brand-title,
    .dark :host .brand-title {
      fill: #F3EFEA;
    }

    .brand-subtitle {
      fill: #635B5E;
      transition: fill 0.2s ease;
    }
    :host-context(html.dark) .brand-subtitle,
    :host-context(.dark) .brand-subtitle,
    html.dark :host .brand-subtitle,
    .dark :host .brand-subtitle {
      fill: #A39E9B;
    }

    .brand-coral {
      fill: #C97D60;
      transition: fill 0.2s ease;
    }
    :host-context(html.dark) .brand-coral,
    :host-context(.dark) .brand-coral,
    html.dark :host .brand-coral,
    .dark :host .brand-coral {
      fill: #D98D70;
    }
  `]
})
export class BrandLogoComponent {
  @Input() variant: 'full' | 'compact' | 'icon' = 'compact';
  @Input() dynamicAccent: boolean = true;

  get pillarFill(): string {
    return this.dynamicAccent ? 'var(--app-accent, #74566E)' : '#74566E';
  }
}
