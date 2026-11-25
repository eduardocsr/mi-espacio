import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  FileText,
  CheckCircle2,
  Bell,
  Calendar,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Plus,
  Clock,
  Sparkles,
  Check,
  MoreVertical,
  RotateCw
} from 'lucide-angular';
import { WorkspaceService } from '../../core/services/workspace.service';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { TaskItem, Note, Reminder } from '../../core/models/workspace.models';

interface CalendarDay {
  date: Date;
  dateStr: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  hasItems: boolean;
  itemTypes: ('task' | 'event' | 'reminder')[];
}

// Vista Principal /inicio (Dashboard)
@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule],
  templateUrl: './inicio.component.html'
})
export class InicioComponent {
  readonly workspace = inject(WorkspaceService);
  readonly authSession = inject(AuthSessionService);
  private readonly router = inject(Router);

  // Icons
  readonly FileTextIcon = FileText;
  readonly CheckCircle2Icon = CheckCircle2;
  readonly BellIcon = Bell;
  readonly CalendarIcon = Calendar;
  readonly ChevronRightIcon = ChevronRight;
  readonly ChevronLeftIcon = ChevronLeft;
  readonly ArrowRightIcon = ArrowRight;
  readonly PlusIcon = Plus;
  readonly ClockIcon = Clock;
  readonly SparklesIcon = Sparkles;
  readonly CheckIcon = Check;
  readonly MoreVerticalIcon = MoreVertical;
  readonly RotateCwIcon = RotateCw;

  // Compact Calendar State
  readonly currentCalendarDate = signal<Date>(new Date());
  readonly selectedCalendarDate = signal<string>(new Date().toISOString().split('T')[0]);

  // Quick Task Creation Inline
  quickTaskTitle = signal<string>('');
  showQuickTaskInput = signal<boolean>(false);

  // Month Title Formatted (e.g. "Enero 2025" or "Noviembre 2026")
  readonly calendarMonthTitle = computed(() => {
    const d = this.currentCalendarDate();
    const month = d.toLocaleDateString('es-ES', { month: 'long' });
    const year = d.getFullYear();
    return `${month.charAt(0).toUpperCase() + month.slice(1)} ${year}`;
  });

  // Calendar Days Grid
  readonly calendarDays = computed<CalendarDay[]>(() => {
    const d = this.currentCalendarDate();
    const year = d.getFullYear();
    const month = d.getMonth();

    const todayStr = new Date().toISOString().split('T')[0];
    const tasks = this.workspace.tasks();
    const events = this.workspace.calendarEvents();
    const reminders = this.workspace.reminders();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Monday as first day: 0 (Mon) -> 6 (Sun)
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days: CalendarDay[] = [];

    // Days from previous month
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const date = new Date(year, month - 1, dayNum);
      const dateStr = this.formatDate(date);
      days.push(this.createCalendarDay(date, dateStr, dayNum, false, todayStr, tasks, events, reminders));
    }

    // Days of current month
    for (let dayNum = 1; dayNum <= lastDayOfMonth.getDate(); dayNum++) {
      const date = new Date(year, month, dayNum);
      const dateStr = this.formatDate(date);
      days.push(this.createCalendarDay(date, dateStr, dayNum, true, todayStr, tasks, events, reminders));
    }

    // Days of next month to complete 35 or 42 cells
    const remainingDays = (7 - (days.length % 7)) % 7;
    for (let dayNum = 1; dayNum <= remainingDays; dayNum++) {
      const date = new Date(year, month + 1, dayNum);
      const dateStr = this.formatDate(date);
      days.push(this.createCalendarDay(date, dateStr, dayNum, false, todayStr, tasks, events, reminders));
    }

    return days;
  });

  // Today tasks (either due today or priority tasks for display)
  readonly todayTasksList = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    const all = this.workspace.tasks();
    const forToday = all.filter(t => t.dueDate === today);
    if (forToday.length > 0) return forToday;
    return all.slice(0, 30);
  });

  readonly todayTasksCompletedCount = computed(() => {
    return this.todayTasksList().filter(t => this.workspace.isTaskStatusDone(t.status)).length;
  });

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private createCalendarDay(
    date: Date,
    dateStr: string,
    dayNum: number,
    isCurrentMonth: boolean,
    todayStr: string,
    tasks: TaskItem[],
    events: any[],
    reminders: Reminder[]
  ): CalendarDay {
    const itemTypes: ('task' | 'event' | 'reminder')[] = [];
    if (tasks.some(t => t.dueDate === dateStr)) itemTypes.push('task');
    if (events.some(e => e.date === dateStr)) itemTypes.push('event');
    if (reminders.some(r => r.date === dateStr && r.active)) itemTypes.push('reminder');

    return {
      date,
      dateStr,
      dayNumber: dayNum,
      isCurrentMonth,
      isToday: dateStr === todayStr,
      hasItems: itemTypes.length > 0,
      itemTypes
    };
  }

  prevMonth(): void {
    const d = this.currentCalendarDate();
    this.currentCalendarDate.set(new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }

  nextMonth(): void {
    const d = this.currentCalendarDate();
    this.currentCalendarDate.set(new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  selectCalendarDay(day: CalendarDay): void {
    this.selectedCalendarDate.set(day.dateStr);
    this.router.navigate(['/calendario'], { queryParams: { date: day.dateStr } });
  }

  openNote(noteId: string): void {
    this.router.navigate(['/apuntes'], { queryParams: { id: noteId } });
  }

  toggleTask(taskId: string): void {
    this.workspace.toggleTaskCompleted(taskId);
  }

  toggleReminder(reminderId: string): void {
    this.workspace.toggleReminderCompleted(reminderId);
  }

  addQuickTask(): void {
    const title = this.quickTaskTitle().trim();
    if (!title) return;

    const todayStr = new Date().toISOString().split('T')[0];
    this.workspace.addTask({
      title,
      projectTag: 'Personal',
      priority: 'Media',
      status: 'todo',
      dueDate: todayStr,
      subtasks: []
    });

    this.quickTaskTitle.set('');
    this.showQuickTaskInput.set(false);
  }

  getFolderColor(folderId: string): string {
    const folder = this.workspace.folders().find(f => f.id === folderId);
    return folder ? folder.color : '#74566E';
  }

  formatRelativeTime(isoDate: string): string {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const itemDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const timeStr = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });

    const diffDays = Math.round((today.getTime() - itemDay.getTime()) / (1000 * 3600 * 24));
    if (diffDays === 0) return `Hoy, ${timeStr}`;
    if (diffDays === 1) return `Ayer, ${timeStr}`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  }
}
