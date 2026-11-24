import { Injectable, signal, computed } from '@angular/core';
import { UserProfile } from '../models/workspace.models';

const ACTIVE_USER_KEY = 'mi_espacio_active_user_id';
const PROFILES_KEY = 'mi_espacio_profiles';

const EDITORIAL_AVATAR_COLORS = [
  '#74566E', // Ciruela acento
  '#265B8A', // Azul zafiro
  '#246A49', // Verde salvia
  '#8C4A19', // Ámbar cálido
  '#9B2C2C', // Rojo teja
  '#C97D60', // Terracota
  '#5B447A'  // Púrpura suave
];

@Injectable({
  providedIn: 'root'
})
export class AuthSessionService {
  // Estado reactivo del usuario conectado
  readonly currentUser = signal<UserProfile | null>(null);

  // Lista de perfiles previamente creados en este navegador
  readonly savedProfiles = signal<UserProfile[]>([]);

  readonly isLoggedIn = computed<boolean>(() => !!this.currentUser());

  constructor() {
    this.loadInitialSession();
  }

  private loadInitialSession(): void {
    if (typeof window === 'undefined') return;

    try {
      // 1. Cargar perfiles guardados
      const storedProfiles = localStorage.getItem(PROFILES_KEY);
      const profiles: UserProfile[] = storedProfiles ? JSON.parse(storedProfiles) : [];
      this.savedProfiles.set(profiles);

      // 2. Verificar si hay un usuario activo
      const activeId = localStorage.getItem(ACTIVE_USER_KEY);
      if (activeId) {
        const found = profiles.find(p => p.id === activeId);
        if (found) {
          this.currentUser.set(found);
          return;
        }
      }

      // Si no hay sesión activa, currentUser permanece en null
      this.currentUser.set(null);
    } catch (err) {
      console.error('Error al cargar sesión de AuthSessionService:', err);
      this.currentUser.set(null);
    }
  }

  /**
   * Crea un perfil de usuario local y lo establece como usuario activo.
   */
  createProfile(name: string, email?: string): UserProfile {
    const trimmedName = name.trim();
    const initials = this.calculateInitials(trimmedName);
    const color = EDITORIAL_AVATAR_COLORS[Math.floor(Math.random() * EDITORIAL_AVATAR_COLORS.length)];
    const id = 'u-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);

    const profile: UserProfile = {
      id,
      name: trimmedName,
      email: email?.trim() || `${trimmedName.toLowerCase().replace(/\s+/g, '.')}@mispacio.local`,
      initials,
      color,
      createdAt: new Date().toISOString()
    };

    this.saveProfile(profile);
    this.setCurrentUser(profile);
    return profile;
  }

  /**
   * Conecta con la cuenta de Google (Firebase) sincronizando el perfil.
   * Guarda cloudLinked: true y googleUid para reconexión automática en futuros accesos.
   */
  loginWithGoogleUser(user: { uid: string; displayName?: string | null; email?: string | null; photoURL?: string | null }): UserProfile {
    const name = user.displayName || user.email?.split('@')[0] || 'Usuario';
    const email = user.email || `${user.uid}@gmail.com`;
    const initials = this.calculateInitials(name);
    const color = '#74566E';

    // Buscar si ya existe por uid o por correo (ej. usuario local previo con mismo correo)
    const existing = this.savedProfiles().find(p =>
      p.id === user.uid ||
      (p.email && email && p.email.toLowerCase() === email.toLowerCase())
    );

    const profile: UserProfile = {
      id: user.uid,
      name,
      email,
      initials,
      color: existing?.color || color,
      avatarUrl: user.photoURL || existing?.avatarUrl || undefined,
      createdAt: existing?.createdAt || new Date().toISOString(),
      cloudLinked: true,
      googleUid: user.uid
    };

    // Si existía un perfil previo registrado con un id local (ej. u-123...), removerlo para unificar
    if (existing && existing.id !== user.uid) {
      this.removeProfile(existing.id);
    }

    this.saveProfile(profile);
    this.setCurrentUser(profile);
    return profile;
  }

  /**
   * Cambia la sesión a un perfil existente en este navegador.
   */
  switchProfile(profileId: string): void {
    const profile = this.savedProfiles().find(p => p.id === profileId);
    if (profile) {
      this.setCurrentUser(profile);
    }
  }

  /**
   * Inicia sesión con un perfil dado.
   */
  loginWithProfile(profile: UserProfile): void {
    this.saveProfile(profile);
    this.setCurrentUser(profile);
  }

  /**
   * Cierra la sesión activa actual (sin borrar los datos del usuario en el almacenamiento).
   */
  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ACTIVE_USER_KEY);
    }
    this.currentUser.set(null);
  }

  /**
   * Elimina un perfil registrado en el selector local de este navegador.
   */
  removeProfile(profileId: string): void {
    const updated = this.savedProfiles().filter(p => p.id !== profileId);
    this.savedProfiles.set(updated);
    this.persistProfiles(updated);

    if (this.currentUser()?.id === profileId) {
      this.logout();
    }
  }

  private setCurrentUser(profile: UserProfile): void {
    this.currentUser.set(profile);
    if (typeof window !== 'undefined') {
      localStorage.setItem(ACTIVE_USER_KEY, profile.id);
    }
  }

  private saveProfile(profile: UserProfile): void {
    const current = this.savedProfiles();
    const index = current.findIndex(p => p.id === profile.id);
    let updated: UserProfile[];

    if (index >= 0) {
      updated = [...current];
      updated[index] = { ...current[index], ...profile };
    } else {
      updated = [profile, ...current];
    }

    this.savedProfiles.set(updated);
    this.persistProfiles(updated);
  }

  private persistProfiles(profiles: UserProfile[]): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
      } catch (err) {
        console.error('Error al persistir perfiles en localStorage:', err);
      }
    }
  }

  private calculateInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
}
