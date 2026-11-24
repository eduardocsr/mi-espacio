import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  durationMs: number;
  actionLabel?: string;
  onAction?: () => void;
  createdAt: number;
}

export interface ConfirmDialogOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
}

export interface ConfirmState extends ConfirmDialogOptions {
  resolve: (value: boolean) => void;
}

export interface PromptDialogOptions {
  title?: string;
  message: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  inputType?: 'text' | 'url' | 'email';
}

export interface PromptState extends PromptDialogOptions {
  value: string;
  resolve: (value: string | null) => void;
}

@Injectable({
  providedIn: 'root'
})
export class UiFeedbackService {
  // Toast stack
  readonly toasts = signal<ToastMessage[]>([]);

  // Modal states
  readonly confirmState = signal<ConfirmState | null>(null);
  readonly promptState = signal<PromptState | null>(null);

  private toastTimers = new Map<string, any>();

  // =========================================================================
  // TOAST NOTIFICATIONS
  // =========================================================================

  /**
   * Muestra un toast en la pila visual.
   */
  toast(options: {
    type?: ToastType;
    title?: string;
    message: string;
    durationMs?: number;
    actionLabel?: string;
    onAction?: () => void;
  }): string {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const durationMs = options.durationMs !== undefined ? options.durationMs : 4000;

    const newToast: ToastMessage = {
      id,
      type: options.type || 'info',
      title: options.title,
      message: options.message,
      durationMs,
      actionLabel: options.actionLabel,
      onAction: options.onAction,
      createdAt: Date.now()
    };

    // Añadir al stack de toasts (máximo 4 simultáneos para no saturar la pantalla)
    this.toasts.update(current => [newToast, ...current].slice(0, 4));

    // Auto-dismiss con temporizador si durationMs > 0
    if (durationMs > 0) {
      const timer = setTimeout(() => {
        this.dismissToast(id);
      }, durationMs);
      this.toastTimers.set(id, timer);
    }

    return id;
  }

  success(message: string, title?: string, options?: Partial<ToastMessage>): string {
    return this.toast({ ...options, type: 'success', title, message });
  }

  error(message: string, title?: string, options?: Partial<ToastMessage>): string {
    return this.toast({ ...options, type: 'error', title: title || 'Atención', message, durationMs: options?.durationMs ?? 5500 });
  }

  info(message: string, title?: string, options?: Partial<ToastMessage>): string {
    return this.toast({ ...options, type: 'info', title, message });
  }

  warning(message: string, title?: string, options?: Partial<ToastMessage>): string {
    return this.toast({ ...options, type: 'warning', title: title || 'Aviso', message, durationMs: options?.durationMs ?? 5000 });
  }

  dismissToast(id: string): void {
    const timer = this.toastTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.toastTimers.delete(id);
    }
    this.toasts.update(current => current.filter(t => t.id !== id));
  }

  clearAllToasts(): void {
    this.toastTimers.forEach(timer => clearTimeout(timer));
    this.toastTimers.clear();
    this.toasts.set([]);
  }

  // =========================================================================
  // DIÁLOGO DE CONFIRMACIÓN EDITORIAL
  // =========================================================================

  /**
   * Abre un diálogo de confirmación que devuelve una promesa boolean.
   * Reemplazo directo de window.confirm() con estética editorial.
   */
  confirm(options: ConfirmDialogOptions | string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const config: ConfirmDialogOptions = typeof options === 'string'
        ? { message: options, tone: 'danger', confirmLabel: 'Confirmar' }
        : options;

      this.confirmState.set({
        ...config,
        title: config.title || (config.tone === 'danger' ? 'Confirmar acción' : '¿Continuar?'),
        confirmLabel: config.confirmLabel || (config.tone === 'danger' ? 'Eliminar' : 'Confirmar'),
        cancelLabel: config.cancelLabel || 'Cancelar',
        tone: config.tone || 'primary',
        resolve: (val: boolean) => {
          this.confirmState.set(null);
          resolve(val);
        }
      });
    });
  }

  resolveConfirm(result: boolean): void {
    const current = this.confirmState();
    if (current) {
      current.resolve(result);
    }
  }

  // =========================================================================
  // DIÁLOGO DE ENTRADA (PROMPT) EDITORIAL
  // =========================================================================

  /**
   * Abre un diálogo de texto que devuelve string o null.
   * Reemplazo directo de window.prompt() con estética editorial.
   */
  prompt(options: PromptDialogOptions | string): Promise<string | null> {
    return new Promise<string | null>((resolve) => {
      const config: PromptDialogOptions = typeof options === 'string'
        ? { message: options }
        : options;

      this.promptState.set({
        ...config,
        title: config.title || 'Ingresar datos',
        value: config.defaultValue || '',
        placeholder: config.placeholder || 'Escribe aquí...',
        confirmLabel: config.confirmLabel || 'Aceptar',
        cancelLabel: config.cancelLabel || 'Cancelar',
        inputType: config.inputType || 'text',
        resolve: (val: string | null) => {
          this.promptState.set(null);
          resolve(val);
        }
      });
    });
  }

  resolvePrompt(result: string | null): void {
    const current = this.promptState();
    if (current) {
      current.resolve(result);
    }
  }

  updatePromptValue(value: string): void {
    const current = this.promptState();
    if (current) {
      this.promptState.set({ ...current, value });
    }
  }
}
