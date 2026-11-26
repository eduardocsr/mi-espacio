import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, RotateCcw, X, Download, ShieldAlert, FileText } from 'lucide-angular';
import { WorkspaceService } from '../../core/services/workspace.service';

@Component({
  selector: 'app-reset-workspace-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    @if (isOpen) {
      <div 
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
        (click)="handleBackdropClick($event)">
        <div 
          class="w-full max-w-md bg-white dark:bg-[#19181E] border border-[#EAE2DE] dark:border-[#2A2832] rounded-3xl p-6 shadow-2xl space-y-5"
          (click)="$event.stopPropagation()">
          
          <!-- Header: Icon, Title & Close -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200/60 dark:border-rose-900/40 shadow-2xs">
                <lucide-icon [img]="RotateCcwIcon" [size]="20" [strokeWidth]="2"></lucide-icon>
              </div>
              <div class="min-w-0">
                <h3 class="text-base font-bold text-[#231F20] dark:text-[#F3EFEA] leading-tight truncate">
                  ¿Deseas dejar todo desde cero?
                </h3>
                <span class="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 dark:text-rose-400 mt-0.5">
                  <lucide-icon [img]="ShieldAlertIcon" [size]="12" [strokeWidth]="2"></lucide-icon>
                  <span>Acción de reinicio completo</span>
                </span>
              </div>
            </div>
            <button
              type="button"
              (click)="handleClose()"
              [disabled]="isProcessing()"
              class="p-1.5 rounded-xl text-[#635B5E] hover:text-[#231F20] dark:hover:text-white hover:bg-[#FAF7F5] dark:hover:bg-[#201E27] transition-colors cursor-pointer shrink-0"
              title="Cerrar modal">
              <lucide-icon [img]="XIcon" [size]="16" [strokeWidth]="2"></lucide-icon>
            </button>
          </div>

          <!-- Body: Explicación editorial y opción de respaldo -->
          <div class="space-y-3.5 text-xs text-[#635B5E] dark:text-neutral-300 leading-relaxed">
            <p>
              Se eliminarán permanentemente todos los <strong class="text-[#231F20] dark:text-[#F3EFEA] font-semibold">apuntes, tareas, eventos del calendario y recordatorios</strong> de tu espacio local en este navegador y de la nube sincronizada en Google Cloud.
            </p>

            <!-- Checkbox de Respaldo Automático (activado por defecto) -->
            <div class="p-3.5 rounded-2xl bg-[#FAF7F5] dark:bg-[#121115] border border-[#EAE2DE] dark:border-[#2A2832] transition-colors">
              <label class="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  [checked]="backupBeforeReset()"
                  (change)="backupBeforeReset.set($any($event.target).checked)"
                  [disabled]="isProcessing()"
                  class="w-4 h-4 mt-0.5 rounded border-[#EAE2DE] text-[#74566E] focus:ring-[#74566E] cursor-pointer shrink-0 accent-[#74566E]"
                />
                <div class="min-w-0 flex-1">
                  <div class="text-xs font-bold text-[#231F20] dark:text-[#F3EFEA]">
                    Descargar respaldo JSON automáticamente antes de borrar
                  </div>
                  <p class="text-[11px] text-[#635B5E] dark:text-neutral-400 mt-0.5">
                    Genera un archivo <code class="font-mono text-[10px] px-1 py-0.5 rounded bg-white dark:bg-[#19181E] border border-[#EAE2DE] dark:border-[#2A2832]">mi-espacio-respaldo-*.json</code> con todo tu estado actual para restaurarlo cuando desees.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <!-- Footer Buttons -->
          <div class="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              (click)="handleClose()"
              [disabled]="isProcessing()"
              class="px-4 py-2 rounded-xl text-xs font-semibold text-[#635B5E] dark:text-neutral-400 hover:text-[#231F20] dark:hover:text-white hover:bg-[#FAF7F5] dark:hover:bg-[#201E27] transition-colors cursor-pointer">
              Cancelar
            </button>
            <button
              type="button"
              (click)="confirmReset()"
              [disabled]="isProcessing()"
              class="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all shadow-xs cursor-pointer disabled:opacity-50"
              [ngClass]="backupBeforeReset() ? 'bg-[#74566E] hover:bg-[#5E4359] dark:bg-[#9D7B96] dark:hover:bg-[#85637E]' : 'bg-[#9B2C2C] hover:bg-[#7D2424] dark:bg-rose-700 dark:hover:bg-rose-800'">
              @if (isProcessing()) {
                <span class="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
                <span>Procesando...</span>
              } @else {
                <lucide-icon [img]="backupBeforeReset() ? DownloadIcon : RotateCcwIcon" [size]="14" [strokeWidth]="2"></lucide-icon>
                <span>{{ backupBeforeReset() ? 'Respaldar y reiniciar' : 'Reiniciar desde cero' }}</span>
              }
            </button>
          </div>

        </div>
      </div>
    }
  `
})
export class ResetWorkspaceModalComponent {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();

  private readonly workspace = inject(WorkspaceService);

  readonly backupBeforeReset = signal<boolean>(true);
  readonly isProcessing = signal<boolean>(false);

  readonly RotateCcwIcon = RotateCcw;
  readonly XIcon = X;
  readonly DownloadIcon = Download;
  readonly ShieldAlertIcon = ShieldAlert;
  readonly FileTextIcon = FileText;

  handleClose(): void {
    if (this.isProcessing()) return;
    this.close.emit();
  }

  handleBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.handleClose();
    }
  }

  async confirmReset(): Promise<void> {
    this.isProcessing.set(true);
    try {
      await this.workspace.resetWorkspaceToZero(this.backupBeforeReset());
      this.close.emit();
    } catch (err) {
      console.error('Error al ejecutar la puesta a cero:', err);
    } finally {
      this.isProcessing.set(false);
    }
  }
}
