import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import {
  LucideAngularModule,
  House,
  FileText,
  CheckCircle2,
  Calendar,
  Bell,
  Star,
  Settings,
  Moon,
  Sun,
  Download,
  Upload,
  Volume2,
  VolumeX,
  Tag,
  X,
  LogOut
} from 'lucide-angular';
import { WorkspaceService } from '../../core/services/workspace.service';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { UiFeedbackService } from '../../core/services/ui-feedback.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './sidebar.component.html'
})
export class SidebarComponent {
  readonly workspace = inject(WorkspaceService);
  readonly authSession = inject(AuthSessionService);
  readonly feedback = inject(UiFeedbackService);
  private readonly router = inject(Router);

  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  // Icons
  readonly HouseIcon = House;
  readonly FileTextIcon = FileText;
  readonly CheckCircle2Icon = CheckCircle2;
  readonly CalendarIcon = Calendar;
  readonly BellIcon = Bell;
  readonly StarIcon = Star;
  readonly SettingsIcon = Settings;
  readonly MoonIcon = Moon;
  readonly SunIcon = Sun;
  readonly DownloadIcon = Download;
  readonly UploadIcon = Upload;
  readonly Volume2Icon = Volume2;
  readonly VolumeXIcon = VolumeX;
  readonly TagIcon = Tag;
  readonly XIcon = X;
  readonly LogOutIcon = LogOut;

  async logout(): Promise<void> {
    const confirmed = await this.feedback.confirm({
      title: 'Cerrar sesión',
      message: '¿Deseas cerrar tu sesión? Tus notas permanecerán seguras y podrás volver a ingresar en cualquier momento.',
      confirmLabel: 'Cerrar sesión',
      tone: 'primary'
    });
    if (confirmed) {
      this.closeMobileDrawer();
      await this.workspace.logout();
      this.feedback.info('Has cerrado sesión correctamente');
    }
  }

  closeMobileDrawer(): void {
    this.workspace.isMobileMenuOpen.set(false);
  }

  importStatus: string | null = null;

  triggerFileInput(): void {
    this.fileInput?.nativeElement.click();
  }

  async handleFileImport(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    try {
      const text = await file.text();
      const success = await this.workspace.importBackup(text);
      if (success) {
        this.importStatus = '¡Respaldo importado con éxito!';
      } else {
        this.importStatus = 'Error al importar archivo. Verifica el formato.';
      }
    } catch {
      this.importStatus = 'Error al leer el archivo.';
    }

    setTimeout(() => {
      this.importStatus = null;
      if (input) input.value = '';
    }, 3500);
  }

  exportData(): void {
    this.workspace.exportBackup();
  }
}
