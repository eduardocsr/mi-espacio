import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  LucideAngularModule,
  FileText,
  CheckCircle2,
  Calendar,
  Bell,
  Sparkles,
  ArrowRight,
  User,
  Moon,
  Sun,
  ShieldCheck,
  Zap,
  Trash2
} from 'lucide-angular';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { WorkspaceService } from '../../core/services/workspace.service';
import { FirebaseSyncService } from '../../core/services/firebase-sync.service';
import { UiFeedbackService } from '../../core/services/ui-feedback.service';
import { UserProfile } from '../../core/models/workspace.models';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './welcome.component.html'
})
export class WelcomeComponent {
  readonly auth = inject(AuthSessionService);
  readonly workspace = inject(WorkspaceService);
  readonly firebaseSync = inject(FirebaseSyncService);
  readonly feedback = inject(UiFeedbackService);
  private readonly router = inject(Router);

  // Form inputs
  userName = signal<string>('');
  userEmail = signal<string>('');
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // Lucide Icons
  readonly FileTextIcon = FileText;
  readonly CheckCircle2Icon = CheckCircle2;
  readonly CalendarIcon = Calendar;
  readonly BellIcon = Bell;
  readonly SparklesIcon = Sparkles;
  readonly ArrowRightIcon = ArrowRight;
  readonly UserIcon = User;
  readonly MoonIcon = Moon;
  readonly SunIcon = Sun;
  readonly ShieldCheckIcon = ShieldCheck;
  readonly ZapIcon = Zap;
  readonly Trash2Icon = Trash2;

  // Acceso o creación de perfil local
  async submitNewProfile(): Promise<void> {
    const name = this.userName().trim();
    if (!name) {
      this.errorMessage.set('Por favor ingresa tu nombre para personalizar tu espacio.');
      return;
    }

    try {
      this.isLoading.set(true);
      this.errorMessage.set(null);

      const profile = this.auth.createProfile(name, this.userEmail().trim());
      await this.workspace.loadUserData(profile);
      this.router.navigate(['/inicio']);
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Error al iniciar sesión.');
    } finally {
      this.isLoading.set(false);
    }
  }

  // Acceso rápido con perfil existente
  async selectProfile(profile: UserProfile): Promise<void> {
    try {
      this.isLoading.set(true);
      this.auth.loginWithProfile(profile);
      await this.workspace.loadUserData(profile);
      this.router.navigate(['/inicio']);
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Error al cargar perfil.');
    } finally {
      this.isLoading.set(false);
    }
  }

  // Eliminar perfil guardado del selector
  async deleteProfile(event: Event, profileId: string): Promise<void> {
    event.stopPropagation();
    const confirmed = await this.feedback.confirm({
      title: 'Eliminar perfil guardado',
      message: '¿Deseas quitar este perfil del selector rápido de este navegador?',
      confirmLabel: 'Quitar perfil',
      tone: 'danger'
    });
    if (confirmed) {
      this.auth.removeProfile(profileId);
      this.feedback.info('Perfil eliminado del selector rápido');
    }
  }

  // Inicio de sesión con Google (Firebase) con sincronización multi-dispositivo
  async loginWithGoogle(): Promise<void> {
    try {
      this.isLoading.set(true);
      this.errorMessage.set(null);
      await this.workspace.loginWithGoogle();
      this.router.navigate(['/inicio']);
    } catch (err: any) {
      this.errorMessage.set('No se pudo completar el inicio de sesión con Google. Puedes usar el acceso rápido con tu nombre.');
    } finally {
      this.isLoading.set(false);
    }
  }

  toggleTheme(): void {
    this.workspace.toggleTheme();
  }
}
