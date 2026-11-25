import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  CalendarEvent,
  KanbanColumn,
  Note,
  NoteFolder,
  Reminder,
  TaskItem,
  TaskPriority,
  TaskStatus,
  UserProfile,
  WorkspaceExportData,
  WorkspaceSnapshot
} from '../models/workspace.models';
import { IndexedStorageService } from './indexed-storage.service';
import { FirebaseSyncService } from './firebase-sync.service';
import { AuthSessionService } from './auth-session.service';
import { generateSeedData } from './seed-data';

export const DEFAULT_COLUMNS: KanbanColumn[] = [
  { id: 'todo', label: 'Por hacer', color: '#635B5E', icon: 'circle', order: 0, isDoneColumn: false },
  { id: 'in_progress', label: 'En progreso', color: '#8C4A19', icon: 'play', order: 1, isDoneColumn: false },
  { id: 'review', label: 'En revisión', color: '#5B447A', icon: 'eye', order: 2, isDoneColumn: false },
  { id: 'done', label: 'Hecho', color: '#246A49', icon: 'check', order: 3, isDoneColumn: true }
];

@Injectable({
  providedIn: 'root'
})
export class WorkspaceService {
  private readonly storage = inject(IndexedStorageService);
  readonly firebaseSync = inject(FirebaseSyncService);
  readonly authSession = inject(AuthSessionService);
  private readonly router = inject(Router);

  // Core State Signals
  readonly folders = signal<NoteFolder[]>([]);
  readonly notes = signal<Note[]>([]);
  readonly tasks = signal<TaskItem[]>([]);
  readonly columns = signal<KanbanColumn[]>(DEFAULT_COLUMNS);
  readonly calendarEvents = signal<CalendarEvent[]>([]);
  readonly reminders = signal<Reminder[]>([]);

  // UI State Signals
  readonly searchQuery = signal<string>('');
  readonly theme = signal<'light' | 'dark'>('light');
  readonly soundEnabled = signal<boolean>(true);
  readonly isInitialized = signal<boolean>(false);
  readonly isSearchOpen = signal<boolean>(false);
  readonly isMobileMenuOpen = signal<boolean>(false);

  // Real IndexedDB Save Status Signals
  readonly saveStatus = signal<'Guardado en IndexedDB' | 'Guardando...' | 'Error al guardar' | 'Google Cloud Activo'>('Guardado en IndexedDB');
  readonly lastSavedAt = signal<Date | null>(null);

  // Identificador único de sesión / dispositivo para sincronización en tiempo real determinista
  readonly deviceId: string = this.initDeviceId();

  // Debounce save timer
  private saveDebounceTimer: any = null;

  // Computed columns sorted by order
  readonly sortedColumns = computed(() =>
    [...this.columns()].sort((a, b) => a.order - b.order)
  );

  // Helper to determine if a status corresponds to a completed task
  isTaskStatusDone(status: string): boolean {
    const col = this.columns().find(c => c.id === status);
    return col ? !!col.isDoneColumn : status === 'done';
  }

  // Computed Values
  readonly pendingTasksCount = computed(() =>
    this.tasks().filter(t => !this.isTaskStatusDone(t.status)).length
  );

  readonly completedTasksCount = computed(() =>
    this.tasks().filter(t => this.isTaskStatusDone(t.status)).length
  );

  readonly overdueTasksCount = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this.tasks().filter(t => !this.isTaskStatusDone(t.status) && t.dueDate && t.dueDate < today).length;
  });

  readonly activeNotesCount = computed(() => this.notes().length);

  readonly todayRemindersCount = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this.reminders().filter(r => r.active && !r.completed && r.date === today).length;
  });

  readonly todayTasks = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this.tasks().filter(t => t.dueDate === today);
  });

  readonly recentNotes = computed(() => {
    return [...this.notes()].sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    ).slice(0, 5);
  });

  readonly upcomingReminders = computed(() => {
    return [...this.reminders()]
      .filter(r => r.active && !r.completed)
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
      .slice(0, 5);
  });

  readonly searchResults = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) {
      return { notes: [], tasks: [], reminders: [] };
    }

    const matchedNotes = this.notes().filter(n =>
      n.title.toLowerCase().includes(q) ||
      n.plainText.toLowerCase().includes(q) ||
      n.tags.some(t => t.toLowerCase().includes(q))
    );

    const matchedTasks = this.tasks().filter(t =>
      t.title.toLowerCase().includes(q) ||
      (t.issueKey && t.issueKey.toLowerCase().includes(q)) ||
      (t.issueType && t.issueType.toLowerCase().includes(q)) ||
      (t.description && t.description.toLowerCase().includes(q)) ||
      t.projectTag.toLowerCase().includes(q)
    );

    const matchedReminders = this.reminders().filter(r =>
      r.title.toLowerCase().includes(q) ||
      (r.description && r.description.toLowerCase().includes(q)) ||
      r.category.toLowerCase().includes(q)
    );

    return {
      notes: matchedNotes,
      tasks: matchedTasks,
      reminders: matchedReminders
    };
  });

  private initDeviceId(): string {
    const key = 'mi_espacio_device_id';
    try {
      let id = sessionStorage.getItem(key);
      if (!id) {
        id = typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : 'dev-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
        sessionStorage.setItem(key, id);
      }
      return id;
    } catch {
      return 'dev-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
    }
  }

  private getStorageKey(userId?: string): string {
    const id = userId || this.authSession.currentUser()?.id;
    return id ? `mi_espacio_snapshot_${id}` : 'mi_espacio_workspace_snapshot_v1';
  }

  constructor() {
    this.initTheme();
    this.initSound();
    this.initBeforeUnload();

    const activeUser = this.authSession.currentUser();
    if (activeUser) {
      this.prehydrateSynchronously(activeUser.id);
      this.loadUserData(activeUser);
    } else {
      this.clearInMemoryWorkspace();
    }
    this.initCloudSyncListener();
  }

  private initCloudSyncListener(): void {
    // Escucha reactivamente cambios en el usuario autenticado de Firebase
    effect(() => {
      const user = this.firebaseSync.currentUser();
      if (user) {
        const activeUser = this.authSession.currentUser();
        const userId = activeUser?.id || user.uid;
        this.reconcileWithCloud(userId);
      }
    });
  }

  /**
   * Reconciliación bidireccional inteligente con Cloud Firestore.
   * Resuelve conflictos basándose en timestamps exactos (ISO 8601).
   * La versión más reciente siempre gana, garantizando que borrados y adiciones
   * hechos en el dispositivo A se reflejen de inmediato en el dispositivo B.
   */
  async reconcileWithCloud(uid: string, localSnapshot?: WorkspaceSnapshot | null): Promise<void> {
    try {
      this.saveStatus.set('Guardando...');
      const cloudSnapshot = await this.firebaseSync.loadFromCloud(uid);

      if (cloudSnapshot && this.isValidSnapshot(cloudSnapshot)) {
        // La nube es la fuente de verdad multi-dispositivo (contiene borrados y adiciones de otros dispositivos)
        this.applySnapshot(cloudSnapshot);
        this.saveToLocalStorage(cloudSnapshot, uid);
        await this.storage.saveSnapshot(cloudSnapshot, uid).catch(console.error);
        this.saveStatus.set('Google Cloud Activo');
        this.lastSavedAt.set(new Date());
      } else if (localSnapshot && this.isValidSnapshot(localSnapshot)) {
        // Primera sincronización del usuario: la nube estaba vacía pero este equipo ya tenía datos locales
        await this.firebaseSync.syncToCloud(localSnapshot, uid);
        this.saveStatus.set('Google Cloud Activo');
      } else {
        // Ni la nube ni local tenían datos previos: crear espacio limpio inicial
        const cleanSnapshot: WorkspaceSnapshot = {
          version: '1.0.0',
          exportedAt: new Date().toISOString(),
          isSeeded: true,
          folders: [
            { id: 'f-' + Date.now(), name: 'General', color: '#74566E', icon: 'folder' }
          ],
          notes: [],
          tasks: [],
          columns: DEFAULT_COLUMNS,
          calendarEvents: [],
          reminders: []
        };
        this.applySnapshot(cleanSnapshot);
        this.saveToLocalStorage(cleanSnapshot, uid);
        await this.storage.saveSnapshot(cleanSnapshot, uid).catch(console.error);
        await this.firebaseSync.syncToCloud(cleanSnapshot, uid);
        this.saveStatus.set('Google Cloud Activo');
        this.lastSavedAt.set(new Date());
      }

      this.isInitialized.set(true);

      // Conectar listener en tiempo real para recibir cambios automáticos desde otros dispositivos
      this.firebaseSync.listenToCloud((remote) => {
        if (remote && this.isValidSnapshot(remote)) {
          this.applySnapshot(remote);
          this.saveToLocalStorage(remote, uid);
          this.storage.saveSnapshot(remote, uid).catch(console.error);
          this.saveStatus.set('Google Cloud Activo');
          this.lastSavedAt.set(new Date());
        }
      }, uid);
    } catch (err) {
      console.error('Error al sincronizar con Firebase:', err);
      this.saveStatus.set('Google Cloud Activo');
      this.isInitialized.set(true);
    }
  }

  async loginWithGoogle(): Promise<void> {
    const user = await this.firebaseSync.loginWithGoogle();
    if (user) {
      const profile = this.authSession.loginWithGoogleUser(user);
      await this.loadUserData(profile);
      await this.reconcileWithCloud(user.uid);
    }
  }

  async logout(): Promise<void> {
    // 1. Asegurar persistencia del snapshot en IndexedDB y localStorage antes de cerrar
    const user = this.authSession.currentUser();
    if (user && this.isInitialized()) {
      const snapshot = this.getSnapshot();
      await this.storage.saveSnapshot(snapshot, user.id).catch(console.error);
      this.saveToLocalStorage(snapshot, user.id);
    }

    // 2. Limpiar memoria activa en señales
    this.clearInMemoryWorkspace();

    // 3. Desconectar token de Firebase Auth
    await this.firebaseSync.logout();

    // 4. Limpiar sesión en AuthSessionService (conserva perfiles guardados y snapshot en IndexedDB)
    this.authSession.logout();

    // 5. Redirigir a bienvenida
    this.router.navigate(['/bienvenida']);
  }

  /**
   * Purgado de seguridad: elimina completamente los datos locales (IndexedDB, localStorage y perfiles)
   * del navegador actual para uso en computadoras compartidas o cibercafés.
   * Los datos sincronizados en Google Cloud permanecen intactos en la cuenta del usuario.
   */
  async purgeLocalData(): Promise<void> {
    // 1. Limpiar estado en memoria
    this.clearInMemoryWorkspace();

    // 2. Desconectar y revocar sesión de Firebase Auth
    await this.firebaseSync.logout();

    // 3. Purgar base de datos local IndexedDB
    await this.storage.purgeAllLocalData();

    // 4. Limpiar todas las claves de localStorage de la aplicación
    if (typeof window !== 'undefined') {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('mi_espacio') || key.startsWith('snapshot_'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    }

    // 5. Limpiar perfiles y sesión activa
    this.authSession.logout();
    this.authSession.savedProfiles.set([]);

    // 6. Redirigir a bienvenida
    this.router.navigate(['/bienvenida']);
  }

  clearInMemoryWorkspace(): void {
    this.folders.set([]);
    this.notes.set([]);
    this.tasks.set([]);
    this.columns.set(DEFAULT_COLUMNS);
    this.calendarEvents.set([]);
    this.reminders.set([]);
    this.isInitialized.set(false);
    this.saveStatus.set('Guardado en IndexedDB');
  }

  async loadUserData(user: UserProfile): Promise<void> {
    try {
      // 1. Cargar caché local de inmediato (IndexedDB o localStorage) para render instantáneo en 0ms
      let saved = await this.storage.loadSnapshot(user.id);
      if (!saved && user.googleUid && user.googleUid !== user.id) {
        saved = await this.storage.loadSnapshot(user.googleUid);
      }

      let localSnapshot: WorkspaceSnapshot | null = saved;
      if (!localSnapshot) {
        localSnapshot = this.loadFromLocalStorage(user.id);
      }

      if (localSnapshot && this.isValidSnapshot(localSnapshot)) {
        this.applySnapshot(localSnapshot);
        this.isInitialized.set(true);
        this.saveStatus.set('Guardado en IndexedDB');
        this.lastSavedAt.set(new Date());
      }

      // 2. Si el usuario está conectado a Google/Firebase o tiene cloudLinked activo:
      // Reconciliar de inmediato con Cloud Firestore para descargar la última versión
      const googleUser = this.firebaseSync.currentUser();
      const isGoogleAccount = !!googleUser || !!user.cloudLinked || (user.id && !user.id.startsWith('u-'));
      if (isGoogleAccount) {
        const uid = googleUser?.uid || user.googleUid || user.id;
        await this.reconcileWithCloud(uid, localSnapshot);
        return;
      }

      // 3. Si no es cuenta de Google pero tenía datos locales válidos, ya están aplicados
      if (localSnapshot && this.isValidSnapshot(localSnapshot)) {
        return;
      }

      // 4. Usuario local nuevo sin datos: iniciar COMPLETAMENTE LIMPIO (0 notas, 0 tareas, 0 eventos, 0 recordatorios)
      const cleanEmptySnapshot: WorkspaceSnapshot = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        isSeeded: true, // marcado para no sembrar datos ficticios
        folders: [
          { id: 'f-' + Date.now(), name: 'General', color: '#74566E', icon: 'folder' }
        ],
        notes: [],
        tasks: [],
        columns: DEFAULT_COLUMNS,
        calendarEvents: [],
        reminders: []
      };

      this.applySnapshot(cleanEmptySnapshot);
      this.isInitialized.set(true);
      this.saveToLocalStorage(cleanEmptySnapshot, user.id);
      await this.storage.saveSnapshot(cleanEmptySnapshot, user.id).catch(console.error);
      this.saveStatus.set('Guardado en IndexedDB');
      this.lastSavedAt.set(new Date());
    } catch (err) {
      console.error('Error al cargar datos del usuario:', err);
      this.isInitialized.set(true);
    }
  }

  private loadFromLocalStorage(userId?: string): WorkspaceSnapshot | null {
    if (typeof window === 'undefined') return null;
    try {
      const key = this.getStorageKey(userId);
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error al leer snapshot de respaldo desde localStorage:', e);
    }
    return null;
  }

  private saveToLocalStorage(snapshot: WorkspaceSnapshot, userId?: string): void {
    if (typeof window === 'undefined') return;
    try {
      const key = this.getStorageKey(userId);
      localStorage.setItem(key, JSON.stringify(snapshot));
    } catch (e) {
      console.warn('Error al escribir snapshot en localStorage:', e);
    }
  }

  isValidSnapshot(snapshot: WorkspaceSnapshot | null | undefined): boolean {
    if (!snapshot || typeof snapshot !== 'object') return false;
    return (
      Array.isArray(snapshot.notes) &&
      Array.isArray(snapshot.tasks) &&
      Array.isArray(snapshot.folders)
    );
  }

  getSnapshotTimestamp(snapshot: WorkspaceSnapshot | null | undefined): number {
    if (!snapshot) return 0;
    const raw = (snapshot as any).updatedAt || snapshot.exportedAt;
    if (!raw) return 0;
    const time = new Date(raw).getTime();
    return isNaN(time) ? 0 : time;
  }

  /**
   * Pre-hidratación síncrona instantánea en 0ms.
   * Evita cualquier pantalla en blanco o desfase de señales antes de que los componentes se rendericen.
   */
  private prehydrateSynchronously(userId?: string): void {
    const cached = this.loadFromLocalStorage(userId);
    if (cached && this.isValidSnapshot(cached)) {
      this.applySnapshot(cached);
      this.isInitialized.set(true);
    }
  }

  private initTheme(): void {
    if (typeof window === 'undefined') return;
    const savedTheme = localStorage.getItem('mi_espacio_theme') as 'light' | 'dark' | null;
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    this.setTheme(initialTheme);
  }

  private initSound(): void {
    if (typeof window === 'undefined') return;
    const savedSound = localStorage.getItem('mi_espacio_sound');
    if (savedSound !== null) {
      this.soundEnabled.set(savedSound === 'true');
    }
  }

  /**
   * Listener que garantiza que cualquier guardado pendiente en debounce
   * se ejecute inmediatamente antes de que el usuario cierre o recargue (F5).
   */
  private initBeforeUnload(): void {
    if (typeof window === 'undefined') return;
    window.addEventListener('beforeunload', () => {
      if (this.saveDebounceTimer) {
        clearTimeout(this.saveDebounceTimer);
        this.saveDebounceTimer = null;
        this.saveImmediately();
      }
    });
  }

  setTheme(newTheme: 'light' | 'dark'): void {
    this.theme.set(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mi_espacio_theme', newTheme);
      const root = document.documentElement;
      if (newTheme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }

  toggleTheme(): void {
    this.setTheme(this.theme() === 'light' ? 'dark' : 'light');
  }

  toggleSound(): void {
    const updated = !this.soundEnabled();
    this.soundEnabled.set(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mi_espacio_sound', String(updated));
    }
  }

  // =========================================================================
  // PERSISTENCIA Y CARGA ROBUSTA EN INDEXEDDB
  // =========================================================================

  getSnapshot(): WorkspaceSnapshot {
    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      isSeeded: true,
      folders: this.folders(),
      notes: this.notes(),
      tasks: this.tasks(),
      columns: this.columns(),
      calendarEvents: this.calendarEvents(),
      reminders: this.reminders()
    };
  }

  /**
   * Guarda de forma asíncrona el snapshot completo y actualiza el badge de estado real.
   */
  async saveSnapshot(): Promise<void> {
    const user = this.authSession.currentUser();
    if (!user) return;

    const snapshot = this.getSnapshot();
    snapshot.isSeeded = true;

    // 1. Respaldo síncrono instantáneo en localStorage aislado por usuario
    this.saveToLocalStorage(snapshot, user.id);

    if (!this.isInitialized()) return;
    this.saveStatus.set('Guardando...');
    try {
      // 2. Persistencia en IndexedDB aislada por usuario
      await this.storage.saveSnapshot(snapshot, user.id);
      this.saveStatus.set('Guardado en IndexedDB');
      this.lastSavedAt.set(new Date());

      // 3. Sincronización en segundo plano con Cloud Firestore si hay usuario autenticado
      if (this.firebaseSync.currentUser()) {
        await this.firebaseSync.syncToCloud(snapshot, user.id);
        this.saveStatus.set('Google Cloud Activo');
      }
    } catch (err) {
      console.error('Error al guardar snapshot en IndexedDB:', err);
      this.saveStatus.set('Error al guardar');
    }
  }

  /**
   * Guardado inmediato para todas las acciones críticas (crear, editar metadatos, mover o eliminar).
   */
  saveImmediately(): void {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
      this.saveDebounceTimer = null;
    }
    this.saveSnapshot();
  }

  /**
   * Guardado con debounce corto (250ms) reservado únicamente para el tipeo continuo en Tiptap.
   */
  scheduleDebouncedSave(delayMs: number = 250): void {
    if (!this.isInitialized()) return;
    this.saveStatus.set('Guardando...');
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }
    this.saveDebounceTimer = setTimeout(() => {
      this.saveDebounceTimer = null;
      this.saveSnapshot();
    }, delayMs);
  }

  private applySnapshot(saved: WorkspaceSnapshot): void {
    this.folders.set(saved.folders || []);

    const currentNotes = this.notes();
    if (!currentNotes || currentNotes.length === 0) {
      this.notes.set(saved.notes || []);
    } else {
      const incomingNotes = saved.notes || [];
      const incomingMap = new Map<string, Note>(incomingNotes.map(n => [n.id, n]));
      const currentMap = new Map<string, Note>(currentNotes.map(n => [n.id, n]));
      const mergedNotes: Note[] = [];

      // 1. Reconciliar notas que vienen de la nube
      for (const remoteNote of incomingNotes) {
        const localNote = currentMap.get(remoteNote.id);
        if (!localNote) {
          mergedNotes.push(remoteNote);
        } else {
          const localTime = new Date(localNote.updatedAt).getTime() || 0;
          const remoteTime = new Date(remoteNote.updatedAt).getTime() || 0;

          // Si la versión local es más reciente que la remota, proteger la edición local del usuario
          if (localTime > remoteTime) {
            mergedNotes.push(localNote);
          } else {
            mergedNotes.push(remoteNote);
          }
        }
      }

      // 2. Conservar notas locales recién creadas que aún no están en el snapshot remoto
      for (const localNote of currentNotes) {
        if (!incomingMap.has(localNote.id)) {
          const localTime = new Date(localNote.updatedAt).getTime() || 0;
          const exportTime = saved.exportedAt ? new Date(saved.exportedAt).getTime() : 0;
          if (localTime > exportTime) {
            mergedNotes.push(localNote);
          }
        }
      }

      this.notes.set(mergedNotes);
    }

    const normalizedTasks: TaskItem[] = (saved.tasks || []).map((t, idx) => ({
      ...t,
      issueKey: t.issueKey || `ESP-${idx + 1}`,
      issueType: t.issueType || 'Tarea',
      status: t.status || 'todo',
      order: t.order !== undefined ? t.order : idx
    }));
    this.tasks.set(normalizedTasks);

    const initialCols = saved.columns && saved.columns.length ? saved.columns : DEFAULT_COLUMNS;
    this.columns.set(initialCols);

    this.calendarEvents.set(saved.calendarEvents || []);
    this.reminders.set(saved.reminders || []);
  }

  // Restablece las tareas de ejemplo (manual)
  resetSeedTasks(): void {
    const seed = generateSeedData();
    const tasksWithOrder = seed.tasks.map((t, idx) => ({
      ...t,
      order: t.order !== undefined ? t.order : idx
    }));
    this.tasks.set(tasksWithOrder);
    this.saveImmediately();
  }

  // =========================================================================
  // CARPETAS Y NOTAS (APUNTES)
  // =========================================================================

  addFolder(name: string, color: string = '#74566E', icon: string = 'folder'): NoteFolder {
    const newFolder: NoteFolder = {
      id: 'f-' + Date.now(),
      name,
      color,
      icon
    };
    this.folders.update(current => [...current, newFolder]);
    this.saveImmediately();
    return newFolder;
  }

  updateFolder(id: string, updates: Partial<NoteFolder>): void {
    this.folders.update(current =>
      current.map(f => (f.id === id ? { ...f, ...updates } : f))
    );
    this.saveImmediately();
  }

  deleteFolder(id: string): void {
    const remainingFolders = this.folders().filter(f => f.id !== id);
    const fallbackFolderId = remainingFolders[0]?.id || 'f-general';
    this.folders.set(remainingFolders);

    // Reasignar notas de la carpeta eliminada
    this.notes.update(notes =>
      notes.map(n => (n.folderId === id ? { ...n, folderId: fallbackFolderId } : n))
    );
    this.saveImmediately();
  }

  addNote(title: string = 'Nota sin título', folderId?: string): Note {
    const defaultFolderId = folderId || (this.folders()[0]?.id ?? 'f-general');
    const now = new Date().toISOString();
    const newNote: Note = {
      id: 'n-' + Date.now(),
      title,
      folderId: defaultFolderId,
      contentJson: { type: 'doc', content: [{ type: 'paragraph' }] },
      html: '<p></p>',
      plainText: '',
      tags: ['General'],
      favorite: false,
      status: 'Borrador',
      comments: [],
      attachments: [],
      createdAt: now,
      updatedAt: now,
      updatedByDevice: this.deviceId
    };

    this.notes.update(current => [newNote, ...current]);
    this.saveImmediately();
    return newNote;
  }

  updateNote(id: string, updates: Partial<Note>): void {
    const now = new Date().toISOString();
    const updatedByDevice = updates.updatedByDevice || this.deviceId;
    this.notes.update(current =>
      current.map(n => (n.id === id ? { ...n, ...updates, updatedAt: updates.updatedAt || now, updatedByDevice } : n))
    );

    // Si solo es tipeo de contenido en Tiptap (contentJson, html, plainText), usar debounce corto de 800ms
    const isOnlyTyping =
      (updates.contentJson !== undefined || updates.plainText !== undefined || updates.html !== undefined) &&
      updates.title === undefined &&
      updates.folderId === undefined &&
      updates.status === undefined &&
      updates.favorite === undefined &&
      updates.tags === undefined;

    if (isOnlyTyping) {
      this.scheduleDebouncedSave(800);
    } else {
      this.saveImmediately();
    }
  }

  deleteNote(id: string): void {
    this.notes.update(current => current.filter(n => n.id !== id));
    this.saveImmediately();
  }

  toggleNoteFavorite(id: string): void {
    this.notes.update(current =>
      current.map(n => (n.id === id ? { ...n, favorite: !n.favorite } : n))
    );
    this.saveImmediately();
  }

  // =========================================================================
  // TAREAS (KANBAN & JIRA)
  // =========================================================================

  getNextIssueKey(): string {
    const tasks = this.tasks();
    let maxNum = 0;
    for (const t of tasks) {
      if (t.issueKey && t.issueKey.startsWith('ESP-')) {
        const num = parseInt(t.issueKey.replace('ESP-', ''), 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
    return `ESP-${maxNum + 1}`;
  }

  addTask(task: Partial<TaskItem> & { title: string }): TaskItem {
    const now = new Date().toISOString();
    const nextKey = this.getNextIssueKey();
    const status = task.status || 'todo';
    const tasksInCol = this.tasks().filter(t => t.status === status);
    const nextOrder =
      task.order !== undefined
        ? task.order
        : tasksInCol.length > 0
          ? Math.max(...tasksInCol.map(t => t.order ?? 0)) + 1
          : 0;

    const newTask: TaskItem = {
      id: 't-' + Date.now(),
      issueKey: task.issueKey || nextKey,
      issueType: task.issueType || 'Tarea',
      title: task.title,
      description: task.description,
      projectTag: task.projectTag || 'Trabajo',
      priority: task.priority || 'Media',
      status,
      order: nextOrder,
      dueDate: task.dueDate,
      dueTime: task.dueTime,
      subtasks: task.subtasks || [],
      linkedNoteId: task.linkedNoteId,
      createdAt: now,
      updatedAt: now
    };
    this.tasks.update(current => [newTask, ...current]);
    this.saveImmediately();
    return newTask;
  }

  updateTask(id: string, updates: Partial<TaskItem>): void {
    const now = new Date().toISOString();
    this.tasks.update(current =>
      current.map(t => (t.id === id ? { ...t, ...updates, updatedAt: now } : t))
    );
    this.saveImmediately();
  }

  updateTaskStatus(id: string, status: TaskStatus): void {
    const tasksInCol = this.tasks().filter(t => t.status === status && t.id !== id);
    const nextOrder =
      tasksInCol.length > 0 ? Math.max(...tasksInCol.map(t => t.order ?? 0)) + 1 : 0;
    this.updateTask(id, { status, order: nextOrder });
  }

  reorderTasksInColumn(columnId: string, orderedTaskIds: string[]): void {
    const idSet = new Set(orderedTaskIds);
    this.tasks.update(taskList => {
      const colTasks = taskList.filter(t => t.status === columnId);
      const sortedColTasks: TaskItem[] = [];
      for (const id of orderedTaskIds) {
        const found = colTasks.find(t => t.id === id);
        if (found) sortedColTasks.push(found);
      }
      for (const t of colTasks) {
        if (!idSet.has(t.id)) {
          sortedColTasks.push(t);
        }
      }

      const orderMap = new Map<string, number>();
      sortedColTasks.forEach((t, idx) => orderMap.set(t.id, idx));

      const now = new Date().toISOString();
      return taskList.map(t => {
        if (orderMap.has(t.id)) {
          return { ...t, order: orderMap.get(t.id)!, updatedAt: now };
        }
        return t;
      });
    });
    this.saveImmediately();
  }

  moveTaskToColumn(
    taskId: string,
    targetColumnId: string,
    orderedTargetTaskIds: string[],
    sourceColumnId?: string
  ): void {
    const targetIdSet = new Set(orderedTargetTaskIds);
    this.tasks.update(taskList => {
      const now = new Date().toISOString();
      // 1. Actualizar estado de la tarea trasladada
      const withUpdatedStatus = taskList.map(t =>
        t.id === taskId ? { ...t, status: targetColumnId, updatedAt: now } : t
      );

      // 2. Ordenar columna de destino según el drop exacto
      const targetTasks = withUpdatedStatus.filter(t => t.status === targetColumnId);
      const sortedTargetTasks: TaskItem[] = [];
      for (const id of orderedTargetTaskIds) {
        const found = targetTasks.find(t => t.id === id);
        if (found) sortedTargetTasks.push(found);
      }
      for (const t of targetTasks) {
        if (!targetIdSet.has(t.id)) {
          sortedTargetTasks.push(t);
        }
      }

      const orderMap = new Map<string, number>();
      sortedTargetTasks.forEach((t, idx) => orderMap.set(t.id, idx));

      // 3. Re-indexar columna de origen si es distinta
      if (sourceColumnId && sourceColumnId !== targetColumnId) {
        const sourceTasks = withUpdatedStatus
          .filter(t => t.status === sourceColumnId)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        sourceTasks.forEach((t, idx) => orderMap.set(t.id, idx));
      }

      return withUpdatedStatus.map(t => {
        if (orderMap.has(t.id)) {
          return { ...t, order: orderMap.get(t.id)!, updatedAt: now };
        }
        return t;
      });
    });
    this.saveImmediately();
  }

  deleteTask(id: string): void {
    this.tasks.update(current => current.filter(t => t.id !== id));
    this.saveImmediately();
  }

  toggleTaskCompleted(id: string): void {
    const task = this.tasks().find(t => t.id === id);
    if (!task) return;
    const isDone = this.isTaskStatusDone(task.status);
    let nextStatus: string;
    if (isDone) {
      const nonDone = this.sortedColumns().find(c => !c.isDoneColumn);
      nextStatus = nonDone ? nonDone.id : 'todo';
    } else {
      const doneCol = this.sortedColumns().find(c => c.isDoneColumn);
      nextStatus = doneCol ? doneCol.id : 'done';
    }
    this.updateTaskStatus(id, nextStatus);
  }

  toggleSubTask(taskId: string, subTaskId: string): void {
    this.tasks.update(current =>
      current.map(t => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          subtasks: t.subtasks.map(st =>
            st.id === subTaskId ? { ...st, completed: !st.completed } : st
          )
        };
      })
    );
    this.saveImmediately();
  }

  // =========================================================================
  // COLUMNAS DINÁMICAS KANBAN
  // =========================================================================

  addColumn(
    label: string,
    color: string,
    icon: KanbanColumn['icon'],
    isDoneColumn: boolean = false
  ): KanbanColumn {
    const nextOrder = this.columns().length;
    const newCol: KanbanColumn = {
      id: 'col-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
      label: label.trim(),
      color,
      icon,
      isDoneColumn,
      order: nextOrder
    };
    this.columns.update(cols => [...cols, newCol]);
    this.saveImmediately();
    return newCol;
  }

  updateColumn(id: string, patch: Partial<KanbanColumn>): void {
    this.columns.update(cols =>
      cols.map(c => (c.id === id ? { ...c, ...patch } : c))
    );
    this.saveImmediately();
  }

  deleteColumn(id: string, fallbackColumnId: string): void {
    // Reasignar tareas de la columna eliminada a la columna destino
    this.tasks.update(taskList =>
      taskList.map(t =>
        t.status === id
          ? { ...t, status: fallbackColumnId, updatedAt: new Date().toISOString() }
          : t
      )
    );

    // Eliminar columna y re-indexar órdenes
    this.columns.update(cols => {
      const remaining = cols.filter(c => c.id !== id);
      return remaining
        .sort((a, b) => a.order - b.order)
        .map((col, idx) => ({ ...col, order: idx }));
    });

    this.saveImmediately();
  }

  reorderColumns(previousIndex: number, currentIndex: number): void {
    const sorted = [...this.sortedColumns()];
    if (
      previousIndex < 0 ||
      previousIndex >= sorted.length ||
      currentIndex < 0 ||
      currentIndex >= sorted.length
    ) {
      return;
    }
    const [moved] = sorted.splice(previousIndex, 1);
    sorted.splice(currentIndex, 0, moved);

    const reindexed = sorted.map((col, idx) => ({ ...col, order: idx }));
    this.columns.set(reindexed);
    this.saveImmediately();
  }

  // =========================================================================
  // RECORDATORIOS
  // =========================================================================

  addReminder(reminder: Omit<Reminder, 'id'>): Reminder {
    const newReminder: Reminder = {
      ...reminder,
      id: 'r-' + Date.now()
    };
    this.reminders.update(current => [...current, newReminder]);
    this.saveImmediately();
    return newReminder;
  }

  updateReminder(id: string, updates: Partial<Reminder>): void {
    this.reminders.update(current =>
      current.map(r => (r.id === id ? { ...r, ...updates } : r))
    );
    this.saveImmediately();
  }

  toggleReminderActive(id: string): void {
    this.reminders.update(current =>
      current.map(r => (r.id === id ? { ...r, active: !r.active } : r))
    );
    this.saveImmediately();
  }

  toggleReminderCompleted(id: string): void {
    this.reminders.update(current =>
      current.map(r => (r.id === id ? { ...r, completed: !r.completed } : r))
    );
    this.saveImmediately();
  }

  snoozeReminder(id: string, minutes: number = 10): void {
    const snoozeDate = new Date(Date.now() + minutes * 60000);
    const timeStr = snoozeDate.toTimeString().slice(0, 5);
    const dateStr = snoozeDate.toISOString().split('T')[0];
    this.updateReminder(id, {
      date: dateStr,
      time: timeStr,
      snoozedUntil: snoozeDate.toISOString()
    });
  }

  deleteReminder(id: string): void {
    this.reminders.update(current => current.filter(r => r.id !== id));
    this.saveImmediately();
  }

  // =========================================================================
  // EVENTOS DE CALENDARIO
  // =========================================================================

  addCalendarEvent(event: Omit<CalendarEvent, 'id'>): CalendarEvent {
    const newEvent: CalendarEvent = {
      ...event,
      id: 'ce-' + Date.now()
    };
    this.calendarEvents.update(current => [...current, newEvent]);
    this.saveImmediately();
    return newEvent;
  }

  updateCalendarEvent(id: string, updates: Partial<CalendarEvent>): void {
    this.calendarEvents.update(current =>
      current.map(e => (e.id === id ? { ...e, ...updates } : e))
    );
    this.saveImmediately();
  }

  deleteCalendarEvent(id: string): void {
    this.calendarEvents.update(current => current.filter(e => e.id !== id));
    this.saveImmediately();
  }

  // =========================================================================
  // RESPALDO Y RESTAURACIÓN (EXPORT / IMPORT)
  // =========================================================================

  exportBackup(): void {
    const data: WorkspaceExportData = this.getSnapshot();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mi-espacio-respaldo-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async importBackup(jsonString: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonString) as WorkspaceExportData;
      if (!data.folders || !data.notes || !data.tasks) {
        throw new Error('Formato de respaldo inválido');
      }

      this.applySnapshot(data);
      await this.saveSnapshot();
      return true;
    } catch (err) {
      console.error('Error al importar respaldo:', err);
      return false;
    }
  }
}
