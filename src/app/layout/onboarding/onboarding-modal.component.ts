import { Component, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  Sun,
  Moon,
  Monitor,
  Check,
  X,
  Sparkles,
  ArrowRight,
  Database,
  Layers,
  Palette
} from 'lucide-angular';
import { WorkspaceService, ACCENT_PALETTES } from '../../core/services/workspace.service';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { AccentColor, AppTheme } from '../../core/models/workspace.models';

export interface AccentChoice {
  id: AccentColor;
  label: string;
  isDefault?: boolean;
  color: string;
  hover: string;
  light: string;
  dark: string;
}

@Component({
  selector: 'app-onboarding-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './onboarding-modal.component.html'
})
export class OnboardingModalComponent {
  readonly workspace = inject(WorkspaceService);
  readonly authSession = inject(AuthSessionService);

  // Initial state for Escape / cancel restoration
  private readonly initialTheme: AppTheme = this.workspace.themePreference();
  private readonly initialAccent: AccentColor = this.workspace.accentColor();

  // Local selection state (reactive for real-time live preview)
  readonly selectedTheme = signal<AppTheme>(this.initialTheme);
  readonly selectedAccent = signal<AccentColor>(this.initialAccent);
  readonly loadSampleData = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);

  // Lucide Icons
  readonly SunIcon = Sun;
  readonly MoonIcon = Moon;
  readonly MonitorIcon = Monitor;
  readonly CheckIcon = Check;
  readonly XIcon = X;
  readonly SparklesIcon = Sparkles;
  readonly ArrowRightIcon = ArrowRight;
  readonly DatabaseIcon = Database;
  readonly LayersIcon = Layers;
  readonly PaletteIcon = Palette;

  // Theme options
  readonly themeOptions: { id: AppTheme; label: string; icon: any; description: string }[] = [
    { id: 'light', label: 'Claro', icon: Sun, description: 'Fondos cálidos y suaves' },
    { id: 'dark', label: 'Oscuro', icon: Moon, description: 'Menor fatiga visual' },
    { id: 'system', label: 'Sistema', icon: Monitor, description: 'Sincronizado con tu SO' }
  ];

  // Accent color swatches based on tokens
  readonly accentChoices: AccentChoice[] = [
    {
      id: 'warm-purple',
      label: 'Ciruela',
      isDefault: true,
      color: ACCENT_PALETTES['warm-purple'].primary,
      hover: ACCENT_PALETTES['warm-purple'].hover,
      light: ACCENT_PALETTES['warm-purple'].light,
      dark: ACCENT_PALETTES['warm-purple'].dark
    },
    {
      id: 'ocean',
      label: 'Océano',
      color: ACCENT_PALETTES['ocean'].primary,
      hover: ACCENT_PALETTES['ocean'].hover,
      light: ACCENT_PALETTES['ocean'].light,
      dark: ACCENT_PALETTES['ocean'].dark
    },
    {
      id: 'emerald',
      label: 'Esmeralda',
      color: ACCENT_PALETTES['emerald'].primary,
      hover: ACCENT_PALETTES['emerald'].hover,
      light: ACCENT_PALETTES['emerald'].light,
      dark: ACCENT_PALETTES['emerald'].dark
    },
    {
      id: 'amber',
      label: 'Ámbar',
      color: ACCENT_PALETTES['amber'].primary,
      hover: ACCENT_PALETTES['amber'].hover,
      light: ACCENT_PALETTES['amber'].light,
      dark: ACCENT_PALETTES['amber'].dark
    },
    {
      id: 'rose',
      label: 'Rosa',
      color: ACCENT_PALETTES['rose'].primary,
      hover: ACCENT_PALETTES['rose'].hover,
      light: ACCENT_PALETTES['rose'].light,
      dark: ACCENT_PALETTES['rose'].dark
    }
  ];

  get userFirstName(): string {
    const raw = this.authSession.currentUser()?.name || '';
    const clean = raw.trim();
    if (!clean) return 'Creador';
    return clean.split(' ')[0];
  }

  onSelectTheme(theme: AppTheme): void {
    this.selectedTheme.set(theme);
    // Live preview: applies instantly to the DOM in the background
    this.workspace.previewTheme(theme);
  }

  onSelectAccent(accent: AccentColor): void {
    this.selectedAccent.set(accent);
    // Live preview: applies instantly to the DOM in the background
    this.workspace.previewAccentColor(accent);
  }

  /**
   * Backdrop click does NOT dismiss the modal to prevent accidental closures.
   */
  handleBackdropClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  /**
   * Escape closes/cancels WITHOUT marking onboardingCompleted: true,
   * restoring the previous theme and accent state.
   */
  @HostListener('document:keydown.escape', ['$event'])
  handleEscape(event: KeyboardEvent): void {
    if (this.isSubmitting()) return;
    this.workspace.cancelOnboarding(this.initialTheme, this.initialAccent);
  }

  dismissWithoutCompleting(): void {
    if (this.isSubmitting()) return;
    this.workspace.cancelOnboarding(this.initialTheme, this.initialAccent);
  }

  async useDefaultConfig(): Promise<void> {
    if (this.isSubmitting()) return;
    this.isSubmitting.set(true);
    try {
      await this.workspace.skipOnboardingDefault();
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async confirmAndStart(): Promise<void> {
    if (this.isSubmitting()) return;
    this.isSubmitting.set(true);
    try {
      await this.workspace.completeOnboarding({
        theme: this.selectedTheme(),
        accentColor: this.selectedAccent(),
        loadSampleData: this.loadSampleData()
      });
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
