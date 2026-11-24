import { Injectable, signal } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import {
  getStorage,
  FirebaseStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from 'firebase/storage';
import { firebaseConfig } from '../config/firebase.config';
import { WorkspaceSnapshot } from '../models/workspace.models';

export interface FileAttachment {
  name: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: string;
  source: 'firebase' | 'drive' | 'link';
}

@Injectable({
  providedIn: 'root'
})
export class FirebaseSyncService {
  private readonly app: FirebaseApp;
  private readonly auth: Auth;
  private readonly firestore: Firestore;
  private readonly storage: FirebaseStorage;

  // State Signals
  readonly currentUser = signal<User | null>(null);
  readonly isSyncing = signal<boolean>(false);
  readonly syncState = signal<'synced' | 'syncing' | 'offline' | 'error' | 'local_only'>('local_only');
  readonly lastSyncTime = signal<Date | null>(null);
  readonly isUploading = signal<boolean>(false);

  private unsubscribeCloudListener: Unsubscribe | null = null;
  private isApplyingRemoteUpdate = false;
  // Token OAuth mantenido exclusivamente en memoria volátil (nunca persistido en disco/localStorage)
  private currentAccessToken: string | null = null;

  constructor() {
    this.app = initializeApp(firebaseConfig);
    this.auth = getAuth(this.app);
    this.firestore = getFirestore(this.app);
    this.storage = getStorage(this.app);

    // Listen to Auth State
    onAuthStateChanged(this.auth, (user) => {
      this.currentUser.set(user);
      if (user) {
        this.syncState.set('synced');
      } else {
        this.syncState.set('local_only');
        if (this.unsubscribeCloudListener) {
          this.unsubscribeCloudListener();
          this.unsubscribeCloudListener = null;
        }
      }
    });
  }

  // =========================================================================
  // AUTENTICACIÓN CON GOOGLE (PRINCIPIO DE MENOR PRIVILEGIO / OWASP)
  // =========================================================================

  async loginWithGoogle(): Promise<User | null> {
    try {
      const provider = new GoogleAuthProvider();
      // Alcance mínimo estricto: solo acceso a archivos propios/creados por la app, nunca acceso amplio a Drive
      provider.addScope('https://www.googleapis.com/auth/drive.file');
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await signInWithPopup(this.auth, provider);
      
      // Token en memoria volátil únicamente (nunca escrito en localStorage ni IndexedDB)
      const credential = GoogleAuthProvider.credentialFromResult(result);
      this.currentAccessToken = credential?.accessToken || null;

      this.currentUser.set(result.user);
      this.syncState.set('synced');
      return result.user;
    } catch (error) {
      console.error('Error al iniciar sesión con Google:', error);
      this.syncState.set('error');
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      if (this.unsubscribeCloudListener) {
        this.unsubscribeCloudListener();
        this.unsubscribeCloudListener = null;
      }

      // Revocar token OAuth de Google si está disponible en memoria antes de cerrar
      if (this.currentAccessToken && typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2?.revoke) {
        try {
          (window as any).google.accounts.oauth2.revoke(this.currentAccessToken, () => {});
        } catch (e) {
          console.warn('OAuth revoke notice:', e);
        }
      }
      this.currentAccessToken = null;

      await signOut(this.auth);
      this.currentUser.set(null);
      this.syncState.set('local_only');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  }

  // =========================================================================
  // SINCRONIZACIÓN CLOUD FIRESTORE
  // =========================================================================

  async syncToCloud(snapshot: WorkspaceSnapshot, targetUid?: string): Promise<void> {
    const user = this.currentUser();
    const uid = targetUid || user?.uid;
    if (!uid || this.isApplyingRemoteUpdate) {
      return;
    }

    try {
      this.isSyncing.set(true);
      this.syncState.set('syncing');

      const userDocRef = doc(this.firestore, 'users', uid, 'workspace', 'data');
      
      // Sanitizar snapshot para Firestore (evitar clases complejas o undefined)
      const cleanSnapshot = JSON.parse(JSON.stringify(snapshot));
      cleanSnapshot.updatedAt = new Date().toISOString();
      cleanSnapshot.userId = uid;

      await setDoc(userDocRef, cleanSnapshot);

      this.lastSyncTime.set(new Date());
      this.syncState.set('synced');
    } catch (error) {
      console.error('Error al sincronizar con Cloud Firestore:', error);
      this.syncState.set('error');
    } finally {
      this.isSyncing.set(false);
    }
  }

  async loadFromCloud(targetUid?: string): Promise<WorkspaceSnapshot | null> {
    const user = this.currentUser();
    const uid = targetUid || user?.uid;
    if (!uid) {
      return null;
    }

    try {
      this.isSyncing.set(true);
      const userDocRef = doc(this.firestore, 'users', uid, 'workspace', 'data');
      const snap = await getDoc(userDocRef);

      if (snap.exists()) {
        const data = snap.data() as WorkspaceSnapshot;
        this.lastSyncTime.set(new Date());
        this.syncState.set('synced');
        return data;
      }
      return null;
    } catch (error) {
      console.error('Error al leer de Cloud Firestore:', error);
      this.syncState.set('error');
      return null;
    } finally {
      this.isSyncing.set(false);
    }
  }

  // Listener en tiempo real: si editas o borras en otra computadora, se actualiza en vivo al instante
  listenToCloud(onUpdate: (remoteSnapshot: WorkspaceSnapshot) => void, targetUid?: string): void {
    const user = this.currentUser();
    const uid = targetUid || user?.uid;
    if (!uid) return;

    if (this.unsubscribeCloudListener) {
      this.unsubscribeCloudListener();
    }

    const userDocRef = doc(this.firestore, 'users', uid, 'workspace', 'data');
    this.unsubscribeCloudListener = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const remoteData = docSnap.data() as WorkspaceSnapshot;
        this.isApplyingRemoteUpdate = true;
        try {
          onUpdate(remoteData);
          this.lastSyncTime.set(new Date());
          this.syncState.set('synced');
        } finally {
          setTimeout(() => {
            this.isApplyingRemoteUpdate = false;
          }, 300);
        }
      }
    }, (error) => {
      console.error('Error en listener de Firestore:', error);
      this.syncState.set('error');
    });
  }

  // =========================================================================
  // SUBIDA DE FOTOS E IMÁGENES (FIREBASE STORAGE - 5 GB)
  // =========================================================================

  async uploadImage(file: File): Promise<string> {
    const user = this.currentUser();
    const uid = user ? user.uid : 'public';
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `users/${uid}/images/${timestamp}_${sanitizedName}`;

    this.isUploading.set(true);
    try {
      const fileRef = ref(this.storage, storagePath);
      await uploadBytes(fileRef, file, {
        contentType: file.type
      });
      const downloadUrl = await getDownloadURL(fileRef);
      return downloadUrl;
    } catch (error) {
      console.error('Error al subir imagen a Firebase Storage:', error);
      throw error;
    } finally {
      this.isUploading.set(false);
    }
  }

  // =========================================================================
  // SUBIDA DE ARCHIVOS Y PDFS (FIREBASE STORAGE / GOOGLE DRIVE LINK)
  // =========================================================================

  async uploadDocument(file: File): Promise<FileAttachment> {
    const user = this.currentUser();
    const uid = user ? user.uid : 'public';
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `users/${uid}/documents/${timestamp}_${sanitizedName}`;

    this.isUploading.set(true);
    try {
      const fileRef = ref(this.storage, storagePath);
      
      // Timeout de 8 segundos para evitar que el SDK de Firebase reintente indefinidamente si hay CORS o 404
      const uploadPromise = uploadBytes(fileRef, file, { contentType: file.type });
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT_STORAGE_CORS')), 8000)
      );

      await Promise.race([uploadPromise, timeoutPromise]);
      const downloadUrl = await getDownloadURL(fileRef);

      const attachment: FileAttachment = {
        name: file.name,
        url: downloadUrl,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
        source: 'firebase'
      };

      return attachment;
    } catch (error) {
      console.error('Error al subir documento:', error);
      throw error;
    } finally {
      this.isUploading.set(false);
    }
  }
}
