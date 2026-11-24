import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Bell, Check, Clock, X } from 'lucide-angular';
import { ReminderAlertService } from '../../core/services/reminder-alert.service';

@Component({
  selector: 'app-reminder-toast',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './reminder-toast.component.html'
})
export class ReminderToastComponent {
  readonly alertService = inject(ReminderAlertService);

  readonly BellIcon = Bell;
  readonly CheckIcon = Check;
  readonly ClockIcon = Clock;
  readonly XIcon = X;

  complete(): void {
    const alert = this.alertService.currentAlert();
    if (alert) {
      this.alertService.completeAlert(alert.id);
    }
  }

  snooze(): void {
    const alert = this.alertService.currentAlert();
    if (alert) {
      this.alertService.snoozeAlert(alert.id, 10);
    }
  }

  dismiss(): void {
    this.alertService.dismissAlert();
  }
}
