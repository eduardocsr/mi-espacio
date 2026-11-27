import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  LucideAngularModule,
  Search,
  Plus,
  Bell,
  Check,
  Menu,
  Cloud,
  CloudUpload,
  Download,
  Upload,
  LogIn,
  LogOut,
  User as UserIcon,
  RefreshCw,
  Trash2,
  Key,
  Eye,
  EyeOff,
  X,
  ShieldCheck,
  RotateCcw,
  Sun,
  Moon,
  Monitor,
  Palette,
  Sparkles
} from 'lucide-angular';
import { WorkspaceService, ACCENT_PALETTES } from '../../core/services/workspace.service';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { UiFeedbackService } from '../../core/services/ui-feedback.service';
import { AiConfigService } from '../../core/services/ai-config.service';
import { ResetWorkspaceModalComponent } from './reset-workspace-modal.component';
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component';
import { AccentColor, AppTheme } from '../../core/models/workspace.models';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ResetWorkspaceModalComponent, BrandLogoComponent],
  templateUrl: './topbar.component.html'
})
export class TopbarComponent {
  readonly workspace = inject(WorkspaceService);
  readonly authSession = inject(AuthSessionService);
  readonly feedback = inject(UiFeedbackService);
  readonly aiConfig = inject(AiConfigService);
  private readonly router = inject(Router);

  // User menu state
  readonly isUserMenuOpen = signal<boolean>(false);
  readonly isActionInProgress = signal<boolean>(false);

  // Puesta a cero modal state
  readonly showResetModal = signal<boolean>(false);

  // Gemini API Key modal state
  readonly showApiKeyModal = signal<boolean>(false);
  readonly apiKeyInput = signal<string>('');
  readonly showApiKeyPassword = signal<boolean>(false);

  // Icons
  readonly MenuIcon = Menu;
  readonly SearchIcon = Search;
  readonly PlusIcon = Plus;
  readonly BellIcon = Bell;
  readonly CheckIcon = Check;
  readonly CloudIcon = Cloud;
  readonly CloudUploadIcon = CloudUpload;
  readonly DownloadIcon = Download;
  readonly UploadIcon = Upload;
  readonly LogInIcon = LogIn;
  readonly LogOutIcon = LogOut;
  readonly UserIcon = UserIcon;
  readonly RefreshCwIcon = RefreshCw;
  readonly Trash2Icon = Trash2;
  readonly RotateCcwIcon = RotateCcw;
  readonly KeyIcon = Key;
  readonly EyeIcon = Eye;
  readonly EyeOffIcon = EyeOff;
  readonly XIcon = X;
  readonly ShieldCheckIcon = ShieldCheck;
  readonly SunIcon = Sun;
  readonly MoonIcon = Moon;
  readonly MonitorIcon = Monitor;
  readonly PaletteIcon = Palette;
  readonly SparklesIcon = Sparkles;

  readonly themeOptions: { id: AppTheme; label: string; icon: any }[] = [
    { id: 'light', label: 'Claro', icon: Sun },
    { id: 'dark', label: 'Oscuro', icon: Moon },
    { id: 'system', label: 'Sistema', icon: Monitor }
  ];

  readonly accentOptions: { id: AccentColor; label: string; color: string }[] = [
    { id: 'warm-purple', label: 'Ciruela', color: ACCENT_PALETTES['warm-purple'].primary },
    { id: 'ocean', label: 'Océano', color: ACCENT_PALETTES['ocean'].primary },
    { id: 'emerald', label: 'Esmeralda', color: ACCENT_PALETTES['emerald'].primary },
    { id: 'amber', label: 'Ámbar', color: ACCENT_PALETTES['amber'].primary },
    { id: 'rose', label: 'Rosa', color: ACCENT_PALETTES['rose'].primary }
  ];

  changeTheme(theme: AppTheme): void {
    this.workspace.setThemePreference(theme, true);
  }

  changeAccent(accent: AccentColor): void {
    this.workspace.setAccentColor(accent, true);
  }

  reopenOnboarding(): void {
    this.closeUserMenu();
    this.workspace.openOnboardingModal();
  }

  toggleMobileMenu(): void {
    this.workspace.isMobileMenuOpen.update(v => !v);
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen.update(v => !v);
  }

  closeUserMenu(): void {
    this.isUserMenuOpen.set(false);
  }

  openSearch(): void {
    this.workspace.isSearchOpen.set(true);
  }

  createNewNote(): void {
    const note = this.workspace.addNote('Nota sin título');
    this.router.navigate(['/apuntes'], { queryParams: { id: note.id } });
  }

  goToReminders(): void {
    this.router.navigate(['/recordatorios']);
  }

  async loginWithGoogle(): Promise<void> {
    this.isActionInProgress.set(true);
    try {
      await this.workspace.loginWithGoogle();
      this.closeUserMenu();
    } catch (err) {
      console.error('Error al iniciar sesión:', err);
    } finally {
      this.isActionInProgress.set(false);
    }
  }

  async logout(): Promise<void> {
    const confirmed = await this.feedback.confirm({
      title: 'Cerrar sesión',
      message: '¿Deseas cerrar tu sesión activa?',
      confirmLabel: 'Cerrar sesión',
      tone: 'primary'
    });
    if (!confirmed) return;

    this.isActionInProgress.set(true);
    try {
      await this.workspace.logout();
      this.closeUserMenu();
      this.feedback.info('Has cerrado sesión');
    } finally {
      this.isActionInProgress.set(false);
    }
  }

  exportBackup(): void {
    this.workspace.exportBackup();
    this.feedback.success('Archivo de respaldo descargado correctamente.');
    this.closeUserMenu();
  }

  triggerImportFile(fileInput: HTMLInputElement): void {
    fileInput.click();
  }

  async handleImportFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (text) {
        const success = await this.workspace.importBackup(text);
        if (success) {
          this.feedback.success('Tus notas y datos se han restaurado con éxito.', '¡Respaldo importado!');
        } else {
          this.feedback.error('El archivo de respaldo no tiene un formato JSON válido.', 'Error al importar');
        }
      }
      this.closeUserMenu();
      input.value = '';
    };
    reader.readAsText(file);
  }

  async syncNow(): Promise<void> {
    this.isActionInProgress.set(true);
    try {
      const user = this.workspace.firebaseSync.currentUser();
      if (user) {
        await this.workspace.reconcileWithCloud(user.uid);
        this.feedback.success('Datos reconciliados y sincronizados con Google Cloud.');
      } else {
        await this.workspace.saveSnapshot();
        this.feedback.success('Datos guardados en IndexedDB.');
      }
    } catch {
      this.feedback.error('No se pudo completar la sincronización.');
    } finally {
      this.isActionInProgress.set(false);
    }
  }

  async purgeLocalData(): Promise<void> {
    const confirmed = await this.feedback.confirm({
      title: 'Limpiar datos locales de este equipo',
      message: '¿Deseas eliminar todo el almacenamiento local (IndexedDB, perfiles y caché) de este navegador? Tus notas sincronizadas en Google Cloud permanecerán seguras en tu cuenta.',
      confirmLabel: 'Limpiar equipo',
      tone: 'danger'
    });
    if (!confirmed) return;

    this.isActionInProgress.set(true);
    try {
      this.closeUserMenu();
      await this.workspace.purgeLocalData();
      this.feedback.success('Todos los datos locales de este navegador han sido eliminados de forma segura.');
    } catch {
      this.feedback.error('Ocurrió un error al limpiar los datos locales.');
    } finally {
      this.isActionInProgress.set(false);
    }
  }

  openResetWorkspaceModal(): void {
    this.closeUserMenu();
    this.showResetModal.set(true);
  }

  closeResetWorkspaceModal(): void {
    this.showResetModal.set(false);
  }

  openApiKeyModal(): void {
    this.apiKeyInput.set(this.aiConfig.apiKey());
    this.showApiKeyPassword.set(false);
    this.showApiKeyModal.set(true);
    this.closeUserMenu();
  }

  closeApiKeyModal(): void {
    this.showApiKeyModal.set(false);
  }

  toggleApiKeyPasswordVisibility(): void {
    this.showApiKeyPassword.update(v => !v);
  }

  saveApiKey(): void {
    this.aiConfig.setApiKey(this.apiKeyInput());
    this.feedback.success('API Key de Gemini guardada de forma segura en este navegador (localStorage).');
    this.closeApiKeyModal();
  }

  removeApiKey(): void {
    this.aiConfig.removeApiKey();
    this.apiKeyInput.set('');
    this.feedback.info('API Key de Gemini eliminada de este navegador.');
    this.closeApiKeyModal();
  }
}
