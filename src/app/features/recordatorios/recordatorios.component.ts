import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  Bell,
  Clock,
  Plus,
  Trash2,
  Check,
  RotateCw,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Volume2,
  AlertCircle
} from 'lucide-angular';
import { WorkspaceService } from '../../core/services/workspace.service';
import { ReminderAlertService } from '../../core/services/reminder-alert.service';
import { Reminder, ReminderRecurrence } from '../../core/models/workspace.models';

// Vista /recordatorios (Alertas, Recurrencias y Resumen)
@Component({
  selector: 'app-recordatorios',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './recordatorios.component.html'
})
export class RecordatoriosComponent {
  readonly workspace = inject(WorkspaceService);
  readonly alertService = inject(ReminderAlertService);

  // Icons
  readonly BellIcon = Bell;
  readonly ClockIcon = Clock;
  readonly PlusIcon = Plus;
  readonly Trash2Icon = Trash2;
  readonly CheckIcon = Check;
  readonly RotateCwIcon = RotateCw;
  readonly SearchIcon = Search;
  readonly FilterIcon = Filter;
  readonly CheckCircle2Icon = CheckCircle2;
  readonly CalendarIcon = Calendar;
  readonly Volume2Icon = Volume2;
  readonly AlertCircleIcon = AlertCircle;

  // Filter & Search
  filterTab = signal<'all' | 'today' | 'scheduled' | 'completed'>('all');
  searchQuery = signal<string>('');
  selectedCategory = signal<string>('all');

  // Form State
  isEditing = signal<boolean>(false);
  editingReminderId = signal<string | null>(null);

  reminderForm = signal<{
    title: string;
    description: string;
    category: string;
    date: string;
    time: string;
    recurrence: ReminderRecurrence;
    active: boolean;
  }>({
    title: '',
    description: '',
    category: 'Salud',
    date: new Date().toISOString().split('T')[0],
    time: '20:00',
    recurrence: 'none',
    active: true
  });

  // Categories list
  readonly categories = ['Salud', 'Trabajo', 'Personal', 'Pagos', 'Estudio'];

  // Summary Metrics
  readonly metrics = computed(() => {
    const list = this.workspace.reminders();
    const total = list.length;
    const pending = list.filter(r => !r.completed && r.active).length;
    const completed = list.filter(r => r.completed).length;
    return { total, pending, completed };
  });

  // Filtered Reminders List
  readonly filteredReminders = computed(() => {
    let list = this.workspace.reminders();
    const tab = this.filterTab();
    const q = this.searchQuery().trim().toLowerCase();
    const cat = this.selectedCategory();
    const todayStr = new Date().toISOString().split('T')[0];

    // Tab filter
    if (tab === 'today') {
      list = list.filter(r => r.date === todayStr);
    } else if (tab === 'scheduled') {
      list = list.filter(r => r.date >= todayStr && !r.completed);
    } else if (tab === 'completed') {
      list = list.filter(r => r.completed);
    }

    // Category filter
    if (cat !== 'all') {
      list = list.filter(r => r.category === cat);
    }

    // Search query
    if (q) {
      list = list.filter(r =>
        r.title.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q)) ||
        r.category.toLowerCase().includes(q)
      );
    }

    // Sort by date & time
    return list.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  });

  openCreateForm(): void {
    this.isEditing.set(false);
    this.editingReminderId.set(null);
    this.reminderForm.set({
      title: '',
      description: '',
      category: 'Salud',
      date: new Date().toISOString().split('T')[0],
      time: '20:00',
      recurrence: 'none',
      active: true
    });
  }

  editReminder(reminder: Reminder): void {
    this.isEditing.set(true);
    this.editingReminderId.set(reminder.id);
    this.reminderForm.set({
      title: reminder.title,
      description: reminder.description || '',
      category: reminder.category,
      date: reminder.date,
      time: reminder.time,
      recurrence: reminder.recurrence,
      active: reminder.active
    });
  }

  saveReminder(): void {
    const form = this.reminderForm();
    if (!form.title.trim()) return;

    if (this.isEditing() && this.editingReminderId()) {
      this.workspace.updateReminder(this.editingReminderId()!, {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        category: form.category,
        date: form.date,
        time: form.time,
        recurrence: form.recurrence,
        active: form.active
      });
    } else {
      this.workspace.addReminder({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        category: form.category,
        date: form.date,
        time: form.time,
        recurrence: form.recurrence,
        active: form.active,
        completed: false
      });
    }

    this.openCreateForm();
  }

  toggleFormActive(): void {
    this.reminderForm.update(f => ({ ...f, active: !f.active }));
  }

  toggleActive(id: string): void {
    this.workspace.toggleReminderActive(id);
  }

  toggleCompleted(id: string): void {
    this.workspace.toggleReminderCompleted(id);
  }

  deleteReminder(id: string): void {
    if (confirm('¿Eliminar este recordatorio?')) {
      this.workspace.deleteReminder(id);
      if (this.editingReminderId() === id) {
        this.openCreateForm();
      }
    }
  }

  testAlertNotification(): void {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const testReminder: Reminder = {
      id: 'test-' + Date.now(),
      title: 'Prueba de Alerta: Mi Espacio',
      description: 'El motor de alertas, Web Audio API y la notificación nativa están funcionando correctamente.',
      category: 'Salud',
      date: now.toISOString().split('T')[0],
      time: timeStr,
      recurrence: 'none',
      active: true,
      completed: false
    };

    this.alertService.triggerAlert(testReminder);
  }
}
