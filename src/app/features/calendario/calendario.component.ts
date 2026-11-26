import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
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
  MapPin,
  Pencil,
  CalendarDays,
  Grid,
  List,
  Repeat,
  Sparkles,
  Filter,
  X,
  FileText,
  ArrowRight
} from 'lucide-angular';
import { WorkspaceService } from '../../core/services/workspace.service';
import { UiFeedbackService } from '../../core/services/ui-feedback.service';
import {
  CalendarCategory,
  CalendarEvent,
  Note,
  TaskItem,
  Reminder
} from '../../core/models/workspace.models';

export interface CalendarCell {
  date: Date;
  dateStr: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  events: CalendarEvent[];
  tasks: TaskItem[];
  reminders: Reminder[];
}

export interface WeekDay {
  date: Date;
  dateStr: string;
  dayNumber: number;
  dayName: string;
  isToday: boolean;
  isSelected: boolean;
  events: CalendarEvent[];
  tasks: TaskItem[];
  reminders: Reminder[];
}

export interface AgendaDayGroup {
  dateStr: string;
  date: Date;
  formattedDate: string;
  isToday: boolean;
  isSelected: boolean;
  events: CalendarEvent[];
  tasks: TaskItem[];
  reminders: Reminder[];
  totalCount: number;
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
  readonly feedback = inject(UiFeedbackService);
  private readonly router = inject(Router);
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
  readonly PencilIcon = Pencil;
  readonly CalendarDaysIcon = CalendarDays;
  readonly GridIcon = Grid;
  readonly ListIcon = List;
  readonly RepeatIcon = Repeat;
  readonly SparklesIcon = Sparkles;
  readonly FilterIcon = Filter;
  readonly XIcon = X;
  readonly FileTextIcon = FileText;
  readonly ArrowRightIcon = ArrowRight;

  // State
  currentDate = signal<Date>(new Date());
  selectedDateStr = signal<string>(new Date().toISOString().split('T')[0]);
  selectedCategory = signal<string>('all');
  viewMode = signal<'month' | 'week' | 'agenda'>('month');
  isAgendaHighlighted = signal<boolean>(false);

  // Quick Inline Add in Sidebar
  showQuickAdd = signal<boolean>(false);
  quickAddType = signal<'task' | 'reminder'>('task');
  quickAddTitle = signal<string>('');

  // Modal create/edit event
  showEventModal = signal<boolean>(false);
  editingEventId = signal<string | null>(null);

  readonly currentEditingEvent = computed<CalendarEvent | null>(() => {
    const id = this.editingEventId();
    if (!id) return null;
    return this.workspace.calendarEvents().find(e => e.id === id) || null;
  });
  eventForm = signal<{
    title: string;
    category: CalendarCategory;
    date: string;
    allDay: boolean;
    startTime: string;
    endTime: string;
    recurrence: 'none' | 'daily' | 'weekly' | 'monthly';
    notes: string;
  }>({
    title: '',
    category: 'Reunión',
    date: new Date().toISOString().split('T')[0],
    allDay: false,
    startTime: '10:00',
    endTime: '11:00',
    recurrence: 'none',
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
      const eventId = params['eventId'] || params['id'];
      if (eventId) {
        queueMicrotask(() => {
          const found = this.workspace.calendarEvents().find(e => e.id === eventId);
          if (found) {
            this.selectedDateStr.set(found.date);
            const [y, m, d] = found.date.split('-').map(Number);
            this.currentDate.set(new Date(y, m - 1, d));
            this.openEditEventModal(found);
          }
        });
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
    const todayStr = this.formatDate(new Date());
    const selected = this.selectedDateStr();
    const catFilter = this.selectedCategory();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const allEvents = this.workspace.calendarEvents();
    const allTasks = this.workspace.tasks();
    const allReminders = this.workspace.reminders();

    const cells: CalendarCell[] = [];

    // Prev month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const cellDate = new Date(year, month - 1, dayNum);
      const str = this.formatDate(cellDate);
      cells.push(this.buildCell(cellDate, str, dayNum, false, todayStr, selected, allEvents, allTasks, allReminders, catFilter));
    }

    // Current month days
    for (let dayNum = 1; dayNum <= lastDay.getDate(); dayNum++) {
      const cellDate = new Date(year, month, dayNum);
      const str = this.formatDate(cellDate);
      cells.push(this.buildCell(cellDate, str, dayNum, true, todayStr, selected, allEvents, allTasks, allReminders, catFilter));
    }

    // Next month days to reach multiple of 7
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let dayNum = 1; dayNum <= remaining; dayNum++) {
      const cellDate = new Date(year, month + 1, dayNum);
      const str = this.formatDate(cellDate);
      cells.push(this.buildCell(cellDate, str, dayNum, false, todayStr, selected, allEvents, allTasks, allReminders, catFilter));
    }

    return cells;
  });

  readonly weekDays = computed<WeekDay[]>(() => {
    const [y, m, d] = this.selectedDateStr().split('-').map(Number);
    const baseDate = new Date(y, m - 1, d);
    const dayOfWeek = baseDate.getDay();
    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monDate = new Date(baseDate);
    monDate.setDate(baseDate.getDate() + diffToMon);

    const days: WeekDay[] = [];
    const todayStr = this.formatDate(new Date());
    const catFilter = this.selectedCategory();
    const allEvents = this.workspace.calendarEvents();
    const allTasks = this.workspace.tasks();
    const allReminders = this.workspace.reminders();

    for (let i = 0; i < 7; i++) {
      const cur = new Date(monDate);
      cur.setDate(monDate.getDate() + i);
      const dateStr = this.formatDate(cur);

      let events = allEvents.filter(e => e.date === dateStr);
      if (catFilter !== 'all') {
        events = events.filter(e => e.category === catFilter);
      }
      const tasks = allTasks.filter(t => t.dueDate === dateStr);
      const reminders = allReminders.filter(r => r.date === dateStr);

      const dayName = cur.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase();

      days.push({
        date: cur,
        dateStr,
        dayNumber: cur.getDate(),
        dayName,
        isToday: dateStr === todayStr,
        isSelected: dateStr === this.selectedDateStr(),
        events,
        tasks,
        reminders
      });
    }

    return days;
  });

  readonly agendaDays = computed<AgendaDayGroup[]>(() => {
    const allEvents = this.workspace.calendarEvents();
    const allTasks = this.workspace.tasks();
    const allReminders = this.workspace.reminders();
    const catFilter = this.selectedCategory();
    const todayStr = this.formatDate(new Date());
    const selectedStr = this.selectedDateStr();

    const dateSet = new Set<string>();
    allEvents.forEach(e => {
      if (catFilter === 'all' || e.category === catFilter) dateSet.add(e.date);
    });
    allTasks.forEach(t => {
      if (t.dueDate) dateSet.add(t.dueDate);
    });
    allReminders.forEach(r => {
      if (r.date) dateSet.add(r.date);
    });
    dateSet.add(todayStr);
    dateSet.add(selectedStr);

    const sortedDates = Array.from(dateSet).sort();

    return sortedDates.map(dateStr => {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      let events = allEvents.filter(e => e.date === dateStr);
      if (catFilter !== 'all') {
        events = events.filter(e => e.category === catFilter);
      }
      const tasks = allTasks.filter(t => t.dueDate === dateStr);
      const reminders = allReminders.filter(r => r.date === dateStr);

      const formattedDate = dateObj.toLocaleDateString('es-ES', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      });

      return {
        dateStr,
        date: dateObj,
        formattedDate,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedStr,
        events,
        tasks,
        reminders,
        totalCount: events.length + tasks.length + reminders.length
      };
    });
  });

  readonly selectedDayEvents = computed(() => {
    const date = this.selectedDateStr();
    const catFilter = this.selectedCategory();
    const events = this.workspace.calendarEvents().filter(e => e.date === date);
    if (catFilter !== 'all') {
      return events.filter(e => e.category === catFilter);
    }
    return events;
  });

  readonly selectedDayTasks = computed(() => {
    const date = this.selectedDateStr();
    return this.workspace.tasks().filter(t => t.dueDate === date);
  });

  readonly selectedDayReminders = computed(() => {
    const date = this.selectedDateStr();
    return this.workspace.reminders().filter(r => r.date === date);
  });

  readonly selectedDayTotalItems = computed(() => {
    return (
      this.selectedDayEvents().length +
      this.selectedDayTasks().length +
      this.selectedDayReminders().length
    );
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
    allReminders: Reminder[],
    catFilter: string
  ): CalendarCell {
    let events = allEvents.filter(e => e.date === dateStr);
    if (catFilter !== 'all') {
      events = events.filter(e => e.category === catFilter);
    }
    const tasks = allTasks.filter(t => t.dueDate === dateStr);
    const reminders = allReminders.filter(r => r.date === dateStr);

    return {
      date,
      dateStr,
      dayNumber: dayNum,
      isCurrentMonth,
      isToday: dateStr === todayStr,
      isSelected: dateStr === selectedStr,
      events,
      tasks,
      reminders
    };
  }

  getCellVisibleCount(cell: CalendarCell): number {
    const visibleEvents = Math.min(cell.events.length, 2);
    const visibleTasks = Math.min(cell.tasks.length, 1);
    return visibleEvents + visibleTasks;
  }

  getCellOverflowCount(cell: CalendarCell): number {
    const total = cell.events.length + cell.tasks.length + cell.reminders.length;
    return Math.max(0, total - this.getCellVisibleCount(cell));
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
    this.highlightAgenda();
  }

  selectDate(cellOrDateStr: CalendarCell | string): void {
    if (typeof cellOrDateStr === 'string') {
      this.selectedDateStr.set(cellOrDateStr);
    } else {
      this.selectedDateStr.set(cellOrDateStr.dateStr);
    }
  }

  selectDateAndFocusAgenda(cell: CalendarCell, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.selectedDateStr.set(cell.dateStr);
    this.highlightAgenda();
  }

  highlightAgenda(): void {
    this.isAgendaHighlighted.set(true);
    setTimeout(() => this.isAgendaHighlighted.set(false), 1200);
    const el = document.getElementById('agenda-panel');
    if (el && window.innerWidth < 1280) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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

  // Quick Add Item in Sidebar
  openQuickAdd(): void {
    this.showQuickAdd.set(true);
  }

  closeQuickAdd(): void {
    this.showQuickAdd.set(false);
    this.quickAddTitle.set('');
  }

  isTaskDone(task: TaskItem): boolean {
    return this.workspace.isTaskStatusDone(task.status);
  }

  submitQuickAdd(): void {
    const title = this.quickAddTitle().trim();
    if (!title) return;

    const date = this.selectedDateStr();
    if (this.quickAddType() === 'task') {
      this.workspace.addTask({
        title,
        dueDate: date,
        priority: 'Media'
      });
      this.feedback.info('Tarea agregada para este día');
    } else {
      this.workspace.addReminder({
        title,
        date,
        time: '09:00',
        category: 'Personal',
        recurrence: 'none',
        active: true,
        completed: false
      });
      this.feedback.info('Recordatorio agregado para este día');
    }

    this.quickAddTitle.set('');
  }

  // Event Modal handlers (Create & Edit)
  openCreateEventModal(): void {
    this.editingEventId.set(null);
    this.eventForm.set({
      title: '',
      category: 'Reunión',
      date: this.selectedDateStr(),
      allDay: false,
      startTime: '10:00',
      endTime: '11:00',
      recurrence: 'none',
      notes: ''
    });
    this.showEventModal.set(true);
  }

  openEditEventModal(event: CalendarEvent): void {
    this.editingEventId.set(event.id);
    this.eventForm.set({
      title: event.title,
      category: event.category,
      date: event.date,
      allDay: !!event.allDay,
      startTime: event.startTime || '10:00',
      endTime: event.endTime || '',
      recurrence: event.recurrence || 'none',
      notes: event.notes || ''
    });
    this.showEventModal.set(true);
  }

  closeEventModal(): void {
    this.showEventModal.set(false);
    this.editingEventId.set(null);
  }

  saveEvent(): void {
    const form = this.eventForm();
    if (!form.title.trim()) return;

    if (this.editingEventId()) {
      this.workspace.updateCalendarEvent(this.editingEventId()!, {
        title: form.title.trim(),
        category: form.category,
        date: form.date,
        allDay: form.allDay,
        startTime: form.allDay ? '00:00' : form.startTime,
        endTime: form.allDay ? undefined : (form.endTime || undefined),
        recurrence: form.recurrence,
        notes: form.notes.trim() || undefined
      });
      this.feedback.info('Evento actualizado');
    } else {
      this.workspace.addCalendarEvent({
        title: form.title.trim(),
        category: form.category,
        date: form.date,
        allDay: form.allDay,
        startTime: form.allDay ? '00:00' : form.startTime,
        endTime: form.allDay ? undefined : (form.endTime || undefined),
        recurrence: form.recurrence,
        notes: form.notes.trim() || undefined
      });
      this.feedback.info('Evento guardado en el calendario');
    }

    this.closeEventModal();
  }

  async deleteEvent(id: string): Promise<void> {
    const confirmed = await this.feedback.confirm({
      title: 'Eliminar evento',
      message: '¿Estás seguro de que deseas eliminar este evento del calendario?',
      confirmLabel: 'Eliminar evento',
      tone: 'danger'
    });
    if (confirmed) {
      this.workspace.deleteCalendarEvent(id);
      this.feedback.info('Evento eliminado del calendario');
    }
  }

  toggleTask(id: string): void {
    this.workspace.toggleTaskCompleted(id);
  }

  toggleReminder(id: string): void {
    this.workspace.toggleReminderCompleted(id);
  }

  getLinkedNote(noteId?: string): Note | undefined {
    if (!noteId) return undefined;
    return this.workspace.notes().find(n => n.id === noteId);
  }

  openLinkedNote(noteId: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.closeEventModal();
    this.router.navigate(['/apuntes'], { queryParams: { id: noteId } });
  }

  generateMeetingMinutes(event: CalendarEvent, clickEv?: Event): void {
    if (clickEv) {
      clickEv.stopPropagation();
    }
    if (event.linkedNoteId) {
      this.openLinkedNote(event.linkedNoteId);
      return;
    }

    const minutesHtml = `<h2>Acta de Reunión: ${event.title}</h2>
<p><strong>Fecha:</strong> ${event.date} | <strong>Horario:</strong> ${event.startTime}${event.endTime ? ' – ' + event.endTime : ''}</p>
<p><strong>Categoría:</strong> ${event.category}${event.notes ? ' | <strong>Notas previas:</strong> ' + event.notes : ''}</p>
<hr/>
<h3>1. Participantes y Asistentes</h3>
<ul>
  <li>Organizador / Responsable:</li>
  <li>Asistentes:</li>
</ul>
<h3>2. Objetivos de la Sesión</h3>
<p>${event.notes || 'Revisión y coordinación de objetivos estratégicos, estado de entregables y resolución de dudas.'}</p>
<h3>3. Puntos Tratados</h3>
<ol>
  <li>Revisión de acuerdos previos y estado general del proyecto.</li>
  <li>Discusión de requerimientos y obstáculos encontrados.</li>
  <li>Decisiones adoptadas durante la sesión.</li>
</ol>
<h3>4. Acuerdos y Próximos Pasos</h3>
<ul>
  <li>[ ] Acción 1 (Responsable / Fecha límite)</li>
  <li>[ ] Acción 2 (Responsable / Fecha límite)</li>
</ul>
<p><em>Acta generada y vinculada al evento de calendario "${event.title}".</em></p>`;

    const plainText = `Acta de Reunión: ${event.title}\nFecha: ${event.date} ${event.startTime}\nCategoría: ${event.category}\n\n1. Participantes\n2. Objetivos\n3. Puntos Tratados\n4. Acuerdos y Próximos Pasos`;

    // Crear la nota en Apuntes
    const noteTitle = `Acta: ${event.title}`;
    const newNote = this.workspace.addNote(noteTitle);

    const tags = Array.from(new Set(['Reunión', event.category].filter(Boolean)));

    this.workspace.updateNote(newNote.id, {
      html: minutesHtml,
      contentJson: undefined,
      plainText,
      tags,
      linkedEventId: event.id
    });

    // Vincular el evento de calendario con la nota
    this.workspace.updateCalendarEvent(event.id, { linkedNoteId: newNote.id });

    this.closeEventModal();
    this.feedback.toast({
      type: 'success',
      title: 'Acta de reunión generada',
      message: `Plantilla editorial vinculada a "${event.title}"`,
      durationMs: 6000
    });
    this.router.navigate(['/apuntes'], { queryParams: { id: newNote.id } });
  }
}
