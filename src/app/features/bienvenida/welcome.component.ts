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
  deleteProfile(event: Event, profileId: string): void {
    event.stopPropagation();
    if (confirm('¿Eliminar este perfil del selector rápido de este navegador?')) {
      this.auth.removeProfile(profileId);
    }
  }

  // Inicio de sesión con Google (Firebase)
  async loginWithGoogle(): Promise<void> {
    try {
      this.isLoading.set(true);
      this.errorMessage.set(null);
      const googleUser = await this.firebaseSync.loginWithGoogle();
      if (googleUser) {
        const profile = this.auth.loginWithGoogleUser(googleUser);
        await this.workspace.loadUserData(profile);
        this.router.navigate(['/inicio']);
      }
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
