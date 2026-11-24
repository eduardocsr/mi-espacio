import { Injectable } from '@angular/core';
import { WorkspaceSnapshot } from '../models/workspace.models';

@Injectable({
  providedIn: 'root'
})
export class IndexedStorageService {
  private readonly dbName = 'mi_espacio_db';
  private readonly dbVersion = 5;
  private dbPromise: Promise<IDBDatabase> | null = null;

  public readonly stores = {
    folders: 'folders',
    notes: 'notes',
    tasks: 'tasks',
    columns: 'columns',
    calendarEvents: 'calendar_events',
    reminders: 'reminders',
    snapshot: 'snapshot'
  } as const;

  constructor() {}

  /**
   * Sanitiza cualquier estructura de datos mediante clonación profunda serializable.
   * Elimina referencias circulares, métodos de prototipos, nodos DOM y wrappers de Signals
   * para prevenir de forma absoluta errores DataCloneError en IndexedDB.
   */
  public sanitize<T>(data: T): T {
    try {
      return JSON.parse(JSON.stringify(data));
    } catch (err) {
      console.error('Error al sanitizar datos con JSON.stringify, intentando structuredClone:', err);
      try {
        return structuredClone(data);
      } catch (cloneErr) {
        console.error('DataCloneError crítico: el objeto no pudo clonarse:', cloneErr);
        return data;
      }
    }
  }

  private getDB(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !window.indexedDB) {
          reject(new Error('IndexedDB no está soportado en este entorno'));
          return;
        }

        let isSettled = false;
        const timeout = setTimeout(() => {
          if (!isSettled) {
            isSettled = true;
            console.warn('Timeout (2.5s) esperando conexión a IndexedDB; se liberará para reintentar.');
            this.dbPromise = null;
            reject(new Error('IndexedDB open timeout'));
          }
        }, 2500);

        const request = window.indexedDB.open(this.dbName, this.dbVersion);

        // Prevenir bloqueos si otra pestaña o recarga rápida mantiene conexión abierta
        request.onblocked = () => {
          console.warn('La actualización de IndexedDB está temporalmente bloqueada por otra pestaña.');
        };

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          const db = (event.target as IDBOpenDBRequest).result;

          if (!db.objectStoreNames.contains(this.stores.folders)) {
            db.createObjectStore(this.stores.folders, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(this.stores.notes)) {
            db.createObjectStore(this.stores.notes, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(this.stores.tasks)) {
            db.createObjectStore(this.stores.tasks, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(this.stores.columns)) {
            db.createObjectStore(this.stores.columns, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(this.stores.calendarEvents)) {
            db.createObjectStore(this.stores.calendarEvents, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(this.stores.reminders)) {
            db.createObjectStore(this.stores.reminders, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(this.stores.snapshot)) {
            db.createObjectStore(this.stores.snapshot, { keyPath: 'id' });
          }
        };

        request.onsuccess = () => {
          if (isSettled) return;
          isSettled = true;
          clearTimeout(timeout);
          const db = request.result;
          // Si otra versión se abre, cerrar esta conexión para no bloquearla
          db.onversionchange = () => {
            db.close();
            this.dbPromise = null;
          };
          resolve(db);
        };

        request.onerror = () => {
          if (isSettled) return;
          isSettled = true;
          clearTimeout(timeout);
          console.error('Error al abrir base de datos IndexedDB:', request.error);
          this.dbPromise = null;
          reject(request.error);
        };
      });
    }

    return this.dbPromise;
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.getDB();
    if (!db.objectStoreNames.contains(storeName)) {
      return [];
    }
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result as T[]);
        request.onerror = () => {
          console.error(`Error en getAll(${storeName}):`, request.error);
          reject(request.error);
        };
      } catch (err) {
        console.error(`Excepción síncrona en getAll(${storeName}):`, err);
        resolve([]);
      }
    });
  }

  async getById<T>(storeName: string, id: string): Promise<T | undefined> {
    const db = await this.getDB();
    if (!db.objectStoreNames.contains(storeName)) {
      return undefined;
    }
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result as T | undefined);
        request.onerror = () => {
          console.error(`Error en getById(${storeName}, ${id}):`, request.error);
          reject(request.error);
        };
      } catch (err) {
        console.error(`Excepción síncrona en getById(${storeName}, ${id}):`, err);
        resolve(undefined);
      }
    });
  }

  async put<T>(storeName: string, item: T): Promise<T> {
    const cleanItem = this.sanitize(item);
    const db = await this.getDB();
    if (!db.objectStoreNames.contains(storeName)) {
      return cleanItem;
    }
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(cleanItem);

        request.onsuccess = () => resolve(cleanItem);
        request.onerror = () => {
          console.error(`Error en put(${storeName}):`, request.error);
          reject(request.error);
        };
      } catch (err) {
        console.error(`Excepción síncrona en put(${storeName}):`, err);
        resolve(cleanItem);
      }
    });
  }

  async putMany<T>(storeName: string, items: T[]): Promise<void> {
    const cleanItems = this.sanitize(items);
    const db = await this.getDB();
    if (!db.objectStoreNames.contains(storeName)) {
      return;
    }
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);

        for (const item of cleanItems) {
          store.put(item);
        }

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => {
          console.error(`Error en putMany(${storeName}):`, transaction.error);
          reject(transaction.error);
        };
      } catch (err) {
        console.error(`Excepción síncrona en putMany(${storeName}):`, err);
        resolve();
      }
    });
  }

  async delete(storeName: string, id: string): Promise<void> {
    const db = await this.getDB();
    if (!db.objectStoreNames.contains(storeName)) {
      return;
    }
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => {
          console.error(`Error en delete(${storeName}, ${id}):`, request.error);
          reject(request.error);
        };
      } catch (err) {
        console.error(`Excepción síncrona en delete(${storeName}, ${id}):`, err);
        resolve();
      }
    });
  }

  async clear(storeName: string): Promise<void> {
    const db = await this.getDB();
    if (!db.objectStoreNames.contains(storeName)) {
      return;
    }
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => {
          console.error(`Error en clear(${storeName}):`, request.error);
          reject(request.error);
        };
      } catch (err) {
        console.error(`Excepción síncrona en clear(${storeName}):`, err);
        resolve();
      }
    });
  }

  /**
   * Guarda de forma atómica y sanitizada el snapshot completo en el store de snapshot
   * y sincroniza de forma limpia cada store individual (reemplazo sin duplicados ni residuos).
   */
  async saveSnapshot(snapshot: WorkspaceSnapshot, userId?: string): Promise<void> {
    const cleanSnapshot = this.sanitize(snapshot);
    const db = await this.getDB();
    const snapshotKey = userId ? `snapshot_${userId}` : 'workspace_current';

    return new Promise((resolve, reject) => {
      try {
        const allStores = [
          this.stores.folders,
          this.stores.notes,
          this.stores.tasks,
          this.stores.columns,
          this.stores.calendarEvents,
          this.stores.reminders,
          this.stores.snapshot
        ];
        // Filtrar estrictamente a los stores existentes para evitar NotFoundError
        const availableStores = allStores.filter(name => db.objectStoreNames.contains(name));
        if (availableStores.length === 0) {
          resolve();
          return;
        }

        const tx = db.transaction(availableStores, 'readwrite');

        // 1. Snapshot central aislado por usuario
        if (db.objectStoreNames.contains(this.stores.snapshot)) {
          const snapStore = tx.objectStore(this.stores.snapshot);
          snapStore.put({ id: snapshotKey, ...cleanSnapshot });
        }

        // 2. Stores individuales limpios
        if (db.objectStoreNames.contains(this.stores.folders)) {
          const fStore = tx.objectStore(this.stores.folders);
          fStore.clear();
          for (const item of cleanSnapshot.folders || []) fStore.put(item);
        }

        if (db.objectStoreNames.contains(this.stores.notes)) {
          const nStore = tx.objectStore(this.stores.notes);
          nStore.clear();
          for (const item of cleanSnapshot.notes || []) nStore.put(item);
        }

        if (db.objectStoreNames.contains(this.stores.tasks)) {
          const tStore = tx.objectStore(this.stores.tasks);
          tStore.clear();
          for (const item of cleanSnapshot.tasks || []) tStore.put(item);
        }

        if (db.objectStoreNames.contains(this.stores.columns)) {
          const cStore = tx.objectStore(this.stores.columns);
          cStore.clear();
          for (const item of cleanSnapshot.columns || []) cStore.put(item);
        }

        if (db.objectStoreNames.contains(this.stores.calendarEvents)) {
          const evStore = tx.objectStore(this.stores.calendarEvents);
          evStore.clear();
          for (const item of cleanSnapshot.calendarEvents || []) evStore.put(item);
        }

        if (db.objectStoreNames.contains(this.stores.reminders)) {
          const rStore = tx.objectStore(this.stores.reminders);
          rStore.clear();
          for (const item of cleanSnapshot.reminders || []) rStore.put(item);
        }

        tx.oncomplete = () => resolve();
        tx.onerror = () => {
          console.error('Error en transacción de saveSnapshot:', tx.error);
          reject(tx.error);
        };
      } catch (err) {
        console.error('Excepción síncrona en saveSnapshot:', err);
        resolve();
      }
    });
  }

  /**
   * Carga el snapshot persistido para un usuario específico (o el general).
   * Si no existe ningún registro previo para este usuario, retorna null para inicializar limpio.
   */
  async loadSnapshot(userId?: string): Promise<WorkspaceSnapshot | null> {
    const db = await this.getDB();
    const snapshotKey = userId ? `snapshot_${userId}` : 'workspace_current';

    // 1. Si existe el store de snapshot, intentar leer primero en su propia transacción dedicada
    if (db.objectStoreNames.contains(this.stores.snapshot)) {
      const snapResult = await new Promise<WorkspaceSnapshot | null>((resolve) => {
        try {
          const tx = db.transaction([this.stores.snapshot], 'readonly');
          const store = tx.objectStore(this.stores.snapshot);
          const req = store.get(snapshotKey);
          req.onsuccess = () => {
            if (req.result) {
              const res = req.result;
              resolve({
                version: res.version || '1.0.0',
                exportedAt: res.exportedAt || new Date().toISOString(),
                isSeeded: res.isSeeded !== false,
                folders: res.folders || [],
                notes: res.notes || [],
                tasks: res.tasks || [],
                columns: res.columns || [],
                calendarEvents: res.calendarEvents || [],
                reminders: res.reminders || []
              });
            } else {
              resolve(null);
            }
          };
          req.onerror = () => resolve(null);
          tx.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });

      // Si el snapshot existe, retornarlo directamente (incluso si está vacío pero inicializado)
      if (snapResult) {
        return snapResult;
      }

      // Si se buscaba un usuario específico y no existe su snapshot, no mezclar con datos individuales
      if (userId) {
        return null;
      }
    }

    // 2. Si no hay snapshot central o está vacío, leer todos los stores individuales en una transacción dedicada
    const individualStores = [
      this.stores.folders,
      this.stores.notes,
      this.stores.tasks,
      this.stores.columns,
      this.stores.calendarEvents,
      this.stores.reminders
    ];
    const availableStores = individualStores.filter(name => db.objectStoreNames.contains(name));
    if (availableStores.length === 0) {
      return null;
    }

    return new Promise<WorkspaceSnapshot | null>((resolve) => {
      try {
        const tx = db.transaction(availableStores, 'readonly');
        const fReq = availableStores.includes(this.stores.folders) ? tx.objectStore(this.stores.folders).getAll() : null;
        const nReq = availableStores.includes(this.stores.notes) ? tx.objectStore(this.stores.notes).getAll() : null;
        const tReq = availableStores.includes(this.stores.tasks) ? tx.objectStore(this.stores.tasks).getAll() : null;
        const colReq = availableStores.includes(this.stores.columns) ? tx.objectStore(this.stores.columns).getAll() : null;
        const evReq = availableStores.includes(this.stores.calendarEvents) ? tx.objectStore(this.stores.calendarEvents).getAll() : null;
        const remReq = availableStores.includes(this.stores.reminders) ? tx.objectStore(this.stores.reminders).getAll() : null;

        tx.oncomplete = () => {
          const folders = fReq?.result || [];
          const notes = nReq?.result || [];
          const tasks = tReq?.result || [];
          const columns = colReq?.result || [];
          const calendarEvents = evReq?.result || [];
          const reminders = remReq?.result || [];

          const hasAnyData =
            folders.length > 0 ||
            notes.length > 0 ||
            tasks.length > 0 ||
            calendarEvents.length > 0 ||
            reminders.length > 0;

          if (hasAnyData) {
            resolve({
              version: '1.0.0',
              exportedAt: new Date().toISOString(),
              isSeeded: true,
              folders,
              notes,
              tasks,
              columns,
              calendarEvents,
              reminders
            });
          } else {
            resolve(null);
          }
        };

        tx.onerror = () => {
          console.warn('Error al leer stores individuales en IndexedDB:', tx.error);
          resolve(null);
        };
        tx.onabort = () => resolve(null);
      } catch (err) {
        console.error('Excepción síncrona en lectura individual de IndexedDB:', err);
        resolve(null);
      }
    });
  }
}
