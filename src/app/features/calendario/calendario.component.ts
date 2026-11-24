import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  LucideAngularModule,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MoreVertical,
  CheckCircle2,
  Trash2,
  Bell,
  Check,
  Tag,
  MapPin
} from 'lucide-angular';
import { WorkspaceService } from '../../core/services/workspace.service';
import { CalendarCategory, CalendarEvent, TaskItem } from '../../core/models/workspace.models';

interface CalendarCell {
  date: Date;
  dateStr: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  events: CalendarEvent[];
  tasks: TaskItem[];
}

// Vista /calendario (Planificación y Agenda Diaria)
@Component({
  selector: 'app-calendario',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './calendario.component.html'
})
export class CalendarioComponent implements OnInit {
  readonly workspace = inject(WorkspaceService);
  private readonly route = inject(ActivatedRoute);

  // Icons
  readonly CalendarIcon = Calendar;
  readonly ChevronLeftIcon = ChevronLeft;
  readonly ChevronRightIcon = ChevronRight;
  readonly PlusIcon = Plus;
  readonly ClockIcon = Clock;
  readonly MoreVerticalIcon = MoreVertical;
  readonly CheckCircle2Icon = CheckCircle2;
  readonly Trash2Icon = Trash2;
  readonly BellIcon = Bell;
  readonly CheckIcon = Check;
  readonly TagIcon = Tag;
  readonly MapPinIcon = MapPin;

  // State
  currentDate = signal<Date>(new Date());
  selectedDateStr = signal<string>(new Date().toISOString().split('T')[0]);
  selectedCategory = signal<string>('all');

  // Modal create event
  showEventModal = signal<boolean>(false);
  eventForm = signal<{
    title: string;
    category: CalendarCategory;
    date: string;
    startTime: string;
    endTime: string;
    notes: string;
  }>({
    title: '',
    category: 'Reunión',
    date: new Date().toISOString().split('T')[0],
    startTime: '10:00',
    endTime: '11:00',
    notes: ''
  });

  readonly categories: { name: CalendarCategory; color: string; bg: string; text: string }[] = [
    { name: 'Reunión', color: '#74566E', bg: '#EFEAF6', text: '#5B447A' },
    { name: 'Pago', color: '#246A49', bg: '#E6F3EC', text: '#246A49' },
    { name: 'Estudio', color: '#265B8A', bg: '#E8F1FA', text: '#265B8A' },
    { name: 'Ejercicio', color: '#8C4A19', bg: '#FDF0E6', text: '#8C4A19' },
    { name: 'Entrega', color: '#D97706', bg: '#FEF3C7', text: '#92400E' }
  ];

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['date']) {
        this.selectedDateStr.set(params['date']);
        const [y, m, d] = params['date'].split('-').map(Number);
        this.currentDate.set(new Date(y, m - 1, d));
      }
    });
  }

  readonly monthTitle = computed(() => {
    const d = this.currentDate();
    const month = d.toLocaleDateString('es-ES', { month: 'long' });
    const year = d.getFullYear();
    return `${month.charAt(0).toUpperCase() + month.slice(1)} ${year}`;
  });

  readonly formattedSelectedDay = computed(() => {
    const [y, m, d] = this.selectedDateStr().split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  });

  readonly calendarCells = computed<CalendarCell[]>(() => {
    const d = this.currentDate();
    const year = d.getFullYear();
    const month = d.getMonth();
    const todayStr = new Date().toISOString().split('T')[0];
    const selected = this.selectedDateStr();
    const catFilter = this.selectedCategory();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const allEvents = this.workspace.calendarEvents();
    const allTasks = this.workspace.tasks();

    const cells: CalendarCell[] = [];

    // Prev month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const cellDate = new Date(year, month - 1, dayNum);
      const str = this.formatDate(cellDate);
      cells.push(this.buildCell(cellDate, str, dayNum, false, todayStr, selected, allEvents, allTasks, catFilter));
    }

    // Current month days
    for (let dayNum = 1; dayNum <= lastDay.getDate(); dayNum++) {
      const cellDate = new Date(year, month, dayNum);
      const str = this.formatDate(cellDate);
      cells.push(this.buildCell(cellDate, str, dayNum, true, todayStr, selected, allEvents, allTasks, catFilter));
    }

    // Next month days to reach multiple of 7
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let dayNum = 1; dayNum <= remaining; dayNum++) {
      const cellDate = new Date(year, month + 1, dayNum);
      const str = this.formatDate(cellDate);
      cells.push(this.buildCell(cellDate, str, dayNum, false, todayStr, selected, allEvents, allTasks, catFilter));
    }

    return cells;
  });

  readonly selectedDayEvents = computed(() => {
    const date = this.selectedDateStr();
    return this.workspace.calendarEvents().filter(e => e.date === date);
  });

  readonly selectedDayTasks = computed(() => {
    const date = this.selectedDateStr();
    return this.workspace.tasks().filter(t => t.dueDate === date);
  });

  readonly selectedDayReminders = computed(() => {
    const date = this.selectedDateStr();
    return this.workspace.reminders().filter(r => r.date === date);
  });

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private buildCell(
    date: Date,
    dateStr: string,
    dayNum: number,
    isCurrentMonth: boolean,
    todayStr: string,
    selectedStr: string,
    allEvents: CalendarEvent[],
    allTasks: TaskItem[],
    catFilter: string
  ): CalendarCell {
    let events = allEvents.filter(e => e.date === dateStr);
    if (catFilter !== 'all') {
      events = events.filter(e => e.category === catFilter);
    }
    const tasks = allTasks.filter(t => t.dueDate === dateStr);

    return {
      date,
      dateStr,
      dayNumber: dayNum,
      isCurrentMonth,
      isToday: dateStr === todayStr,
      isSelected: dateStr === selectedStr,
      events,
      tasks
    };
  }

  prevMonth(): void {
    const d = this.currentDate();
    this.currentDate.set(new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }

  nextMonth(): void {
    const d = this.currentDate();
    this.currentDate.set(new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  goToToday(): void {
    const today = new Date();
    this.currentDate.set(today);
    this.selectedDateStr.set(this.formatDate(today));
  }

  selectDate(cell: CalendarCell): void {
    this.selectedDateStr.set(cell.dateStr);
  }

  getCategoryColor(category: CalendarCategory): string {
    const match = this.categories.find(c => c.name === category);
    return match ? match.color : '#74566E';
  }

  getCategoryBg(category: CalendarCategory): string {
    const match = this.categories.find(c => c.name === category);
    return match ? match.bg : '#EFEAF6';
  }

  getCategoryText(category: CalendarCategory): string {
    const match = this.categories.find(c => c.name === category);
    return match ? match.text : '#5B447A';
  }

  openCreateEventModal(): void {
    this.eventForm.set({
      title: '',
      category: 'Reunión',
      date: this.selectedDateStr(),
      startTime: '10:00',
      endTime: '11:00',
      notes: ''
    });
    this.showEventModal.set(true);
  }

  closeEventModal(): void {
    this.showEventModal.set(false);
  }

  saveEvent(): void {
    const form = this.eventForm();
    if (!form.title.trim()) return;

    this.workspace.addCalendarEvent({
      title: form.title.trim(),
      category: form.category,
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime || undefined,
      notes: form.notes.trim() || undefined
    });

    this.closeEventModal();
  }

  deleteEvent(id: string): void {
    if (confirm('¿Eliminar este evento del calendario?')) {
      this.workspace.deleteCalendarEvent(id);
    }
  }

  toggleReminder(id: string): void {
    this.workspace.toggleReminderCompleted(id);
  }
}
