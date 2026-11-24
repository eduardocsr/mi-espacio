import { Injectable, effect, inject, signal } from '@angular/core';
import { WorkspaceService } from './workspace.service';
import { Reminder } from '../models/workspace.models';

export interface ActiveAlert {
  id: string;
  reminder: Reminder;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class ReminderAlertService {
  private readonly workspace = inject(WorkspaceService);

  readonly currentAlert = signal<ActiveAlert | null>(null);
  private alertedIds = new Set<string>();
  private intervalId: any = null;
  private audioCtx: AudioContext | null = null;

  constructor() {
    this.initNotificationPermission();
    this.startAlertMonitoring();
  }

  private initNotificationPermission(): void {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
  }

  private startAlertMonitoring(): void {
    if (typeof window === 'undefined') return;

    // Check every 15 seconds
    this.intervalId = setInterval(() => {
      this.checkDueReminders();
    }, 15000);

    // Initial check after 3 seconds
    setTimeout(() => this.checkDueReminders(), 3000);
  }

  checkDueReminders(): void {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMinutes = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}`;

    const reminders = this.workspace.reminders();

    for (const reminder of reminders) {
      if (!reminder.active || reminder.completed) continue;

      // Check date & time match or past due
      const isToday = reminder.date === todayStr;
      const isPastOrDue = reminder.date < todayStr || (isToday && reminder.time <= currentTimeStr);

      const alertKey = `${reminder.id}_${reminder.date}_${reminder.time}`;

      if (isPastOrDue && !this.alertedIds.has(alertKey)) {
        this.alertedIds.add(alertKey);
        this.triggerAlert(reminder);
        break; // Show one modal toast at a time
      }
    }
  }

  triggerAlert(reminder: Reminder): void {
    this.currentAlert.set({
      id: reminder.id,
      reminder,
      timestamp: Date.now()
    });

    // 1. Play gentle chime with Web Audio API
    if (this.workspace.soundEnabled()) {
      this.playSoftChime();
    }

    // 2. Trigger native browser Notification
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`Recordatorio: ${reminder.title}`, {
          body: `${reminder.category} • Programado para las ${reminder.time}. ${reminder.description || ''}`,
          icon: '/favicon.ico'
        });
      } catch (e) {
        console.warn('Error al lanzar notificación nativa:', e);
      }
    }
  }

  private playSoftChime(): void {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      if (!this.audioCtx || this.audioCtx.state === 'suspended') {
        this.audioCtx = new AudioCtxClass();
      }

      const now = this.audioCtx.currentTime;

      // Dual tone pleasant chime (D5 587.33Hz -> A5 880Hz)
      const osc1 = this.audioCtx.createOscillator();
      const osc2 = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(880, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.18, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc1.start(now);
      osc2.start(now + 0.05);

      osc1.stop(now + 1.2);
      osc2.stop(now + 1.2);
    } catch (err) {
      console.warn('AudioContext chime blocked by browser autoplay policy:', err);
    }
  }

  completeAlert(reminderId: string): void {
    const reminder = this.workspace.reminders().find(r => r.id === reminderId);
    if (!reminder) {
      this.dismissAlert();
      return;
    }

    if (reminder.recurrence !== 'none') {
      // Calculate next recurring date
      const nextDate = this.calculateNextDate(reminder.date, reminder.recurrence);
      this.workspace.updateReminder(reminderId, {
        date: nextDate,
        completed: false,
        active: true
      });
    } else {
      this.workspace.toggleReminderCompleted(reminderId);
    }

    this.dismissAlert();
  }

  snoozeAlert(reminderId: string, minutes: number = 10): void {
    this.workspace.snoozeReminder(reminderId, minutes);
    this.dismissAlert();
  }

  dismissAlert(): void {
    this.currentAlert.set(null);
  }

  private calculateNextDate(currentDateStr: string, recurrence: 'daily' | 'weekly' | 'monthly'): string {
    const [y, m, d] = currentDateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);

    if (recurrence === 'daily') {
      date.setDate(date.getDate() + 1);
    } else if (recurrence === 'weekly') {
      date.setDate(date.getDate() + 7);
    } else if (recurrence === 'monthly') {
      date.setMonth(date.getMonth() + 1);
    }

    const nextY = date.getFullYear();
    const nextM = String(date.getMonth() + 1).padStart(2, '0');
    const nextD = String(date.getDate()).padStart(2, '0');
    return `${nextY}-${nextM}-${nextD}`;
  }
}
