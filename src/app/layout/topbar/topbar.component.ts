import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  RefreshCw
} from 'lucide-angular';
import { WorkspaceService } from '../../core/services/workspace.service';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { UiFeedbackService } from '../../core/services/ui-feedback.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './topbar.component.html'
})
export class TopbarComponent {
  readonly workspace = inject(WorkspaceService);
  readonly authSession = inject(AuthSessionService);
  readonly feedback = inject(UiFeedbackService);
  private readonly router = inject(Router);

  // User menu state
  readonly isUserMenuOpen = signal<boolean>(false);
  readonly isActionInProgress = signal<boolean>(false);

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
      await this.workspace.saveSnapshot();
      this.feedback.success('Sincronización completada exitosamente.');
    } catch {
      this.feedback.error('No se pudo completar la sincronización.');
    } finally {
      this.isActionInProgress.set(false);
    }
  }
}
