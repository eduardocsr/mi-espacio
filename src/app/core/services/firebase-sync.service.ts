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
  // AUTENTICACIÓN CON GOOGLE
  // =========================================================================

  async loginWithGoogle(): Promise<User | null> {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(this.auth, provider);
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

  async syncToCloud(snapshot: WorkspaceSnapshot): Promise<void> {
    const user = this.currentUser();
    if (!user || this.isApplyingRemoteUpdate) {
      return;
    }

    try {
      this.isSyncing.set(true);
      this.syncState.set('syncing');

      const userDocRef = doc(this.firestore, 'users', user.uid, 'workspace', 'data');
      
      // Sanitizar snapshot para Firestore (evitar clases complejas o undefined)
      const cleanSnapshot = JSON.parse(JSON.stringify(snapshot));
      cleanSnapshot.updatedAt = new Date().toISOString();
      cleanSnapshot.userId = user.uid;

      await setDoc(userDocRef, cleanSnapshot, { merge: true });

      this.lastSyncTime.set(new Date());
      this.syncState.set('synced');
    } catch (error) {
      console.error('Error al sincronizar con Cloud Firestore:', error);
      this.syncState.set('error');
    } finally {
      this.isSyncing.set(false);
    }
  }

  async loadFromCloud(): Promise<WorkspaceSnapshot | null> {
    const user = this.currentUser();
    if (!user) {
      return null;
    }

    try {
      this.isSyncing.set(true);
      const userDocRef = doc(this.firestore, 'users', user.uid, 'workspace', 'data');
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

  // Listener en tiempo real: si editas en otra computadora, se actualiza en vivo
  listenToCloud(onUpdate: (remoteSnapshot: WorkspaceSnapshot) => void): void {
    const user = this.currentUser();
    if (!user) return;

    if (this.unsubscribeCloudListener) {
      this.unsubscribeCloudListener();
    }

    const userDocRef = doc(this.firestore, 'users', user.uid, 'workspace', 'data');
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
      await uploadBytes(fileRef, file, {
        contentType: file.type
      });
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
