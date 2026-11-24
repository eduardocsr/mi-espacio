import { Component, HostListener, inject, ElementRef, viewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  Trash2,
  HelpCircle
} from 'lucide-angular';
import { UiFeedbackService, ToastMessage } from '../../core/services/ui-feedback.service';

@Component({
  selector: 'app-feedback-host',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './feedback-host.component.html'
})
export class FeedbackHostComponent {
  readonly feedback = inject(UiFeedbackService);

  readonly promptInput = viewChild<ElementRef<HTMLInputElement>>('promptInput');

  // Icons
  readonly CheckCircle2Icon = CheckCircle2;
  readonly AlertCircleIcon = AlertCircle;
  readonly AlertTriangleIcon = AlertTriangle;
  readonly InfoIcon = Info;
  readonly XIcon = X;
  readonly Trash2Icon = Trash2;
  readonly HelpCircleIcon = HelpCircle;

  constructor() {
    // Focus prompt input whenever prompt modal opens
    effect(() => {
      const state = this.feedback.promptState();
      if (state) {
        setTimeout(() => {
          this.promptInput()?.nativeElement.focus();
          this.promptInput()?.nativeElement.select();
        }, 50);
      }
    });
  }

  // Tecla Escape para cancelar confirm o prompt
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.feedback.confirmState()) {
      this.feedback.resolveConfirm(false);
    } else if (this.feedback.promptState()) {
      this.feedback.resolvePrompt(null);
    }
  }

  // Tecla Enter para confirmar prompt
  onPromptSubmit(e: Event): void {
    e.preventDefault();
    const state = this.feedback.promptState();
    if (state) {
      this.feedback.resolvePrompt(state.value);
    }
  }

  closeToast(toast: ToastMessage, event?: Event): void {
    event?.stopPropagation();
    this.feedback.dismissToast(toast.id);
  }

  executeToastAction(toast: ToastMessage): void {
    if (toast.onAction) {
      toast.onAction();
    }
    this.feedback.dismissToast(toast.id);
  }
}
