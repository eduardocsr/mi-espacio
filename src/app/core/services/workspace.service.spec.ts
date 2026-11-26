import { TestBed } from '@angular/core/testing';
import { WorkspaceService } from './workspace.service';
import { TaskItem, CalendarEvent, Note } from '../models/workspace.models';

describe('WorkspaceService', () => {
  let service: WorkspaceService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [WorkspaceService]
    });
    service = TestBed.inject(WorkspaceService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created and initialized with default structures', () => {
    expect(service).toBeTruthy();
    expect(service.columns().length).toBeGreaterThan(0);
    expect(service.saveStatus()).toBe('Guardado en IndexedDB');
  });

  describe('Notes Management & Undo', () => {
    it('should add a new note with default values', () => {
      const note = service.addNote('Nota de prueba');
      expect(note).toBeTruthy();
      expect(note.id).toMatch(/^n-/);
      expect(note.title).toBe('Nota de prueba');
      expect(service.notes().some(n => n.id === note.id)).toBeTrue();
    });

    it('should update note fields and deduplicate tags', () => {
      const note = service.addNote('Nota con tags');
      service.updateNote(note.id, {
        tags: ['Trabajo', 'Importante', 'Trabajo', 'Sprint']
      });

      const updated = service.notes().find(n => n.id === note.id);
      expect(updated?.tags).toEqual(['Trabajo', 'Importante', 'Sprint']);
    });

    it('should delete a note and restore it via restoreNote', () => {
      const note = service.addNote('Nota a borrar');
      expect(service.notes().some(n => n.id === note.id)).toBeTrue();

      service.deleteNote(note.id);
      expect(service.notes().some(n => n.id === note.id)).toBeFalse();

      service.restoreNote(note);
      expect(service.notes().some(n => n.id === note.id)).toBeTrue();
    });
  });

  describe('Tasks & Kanban Management', () => {
    it('should add a task with auto-generated issueKey', () => {
      const task = service.addTask({
        title: 'Implementar autenticación',
        priority: 'Alta'
      });
      expect(task).toBeTruthy();
      expect(task.id).toMatch(/^t-/);
      expect(task.issueKey).toMatch(/^ESP-\d+/);
      expect(task.title).toBe('Implementar autenticación');
    });

    it('should restore a deleted task via restoreTask', () => {
      const task = service.addTask({ title: 'Tarea temporal' });
      service.deleteTask(task.id);
      expect(service.tasks().some(t => t.id === task.id)).toBeFalse();

      service.restoreTask(task);
      expect(service.tasks().some(t => t.id === task.id)).toBeTrue();
    });
  });

  describe('Bidirectional Linkage: Note <-> Task (Tarea 3.1)', () => {
    it('should cross-link note and task bidirectionally', () => {
      const note = service.addNote('Requerimientos API');
      const task = service.addTask({
        title: 'Desarrollar API',
        linkedNoteId: note.id
      });
      service.updateNote(note.id, { linkedTaskId: task.id });

      const updatedNote = service.notes().find(n => n.id === note.id);
      const updatedTask = service.tasks().find(t => t.id === task.id);

      expect(updatedNote?.linkedTaskId).toBe(task.id);
      expect(updatedTask?.linkedNoteId).toBe(note.id);
    });

    it('should clear linkedTaskId on task when linked note is deleted', () => {
      const note = service.addNote('Nota temporal');
      const task = service.addTask({
        title: 'Tarea con nota',
        linkedNoteId: note.id
      });
      service.updateNote(note.id, { linkedTaskId: task.id });

      service.deleteNote(note.id);

      const taskAfter = service.tasks().find(t => t.id === task.id);
      expect(taskAfter?.linkedNoteId).toBeUndefined();
    });
  });

  describe('Automated Task Reminders & Sync (Tarea 3.2)', () => {
    it('should synchronize reminder changes when task is updated', () => {
      const task = service.addTask({
        title: 'Entrega de informe',
        dueDate: '2026-12-01',
        dueTime: '10:00'
      });

      const reminder = service.addReminder({
        title: `Tarea: ${task.title}`,
        category: 'Trabajo',
        recurrence: 'none',
        date: task.dueDate!,
        time: task.dueTime!,
        active: true,
        completed: false,
        linkedTaskId: task.id
      });

      service.updateTask(task.id, {
        reminderEnabled: true,
        reminderId: reminder.id
      });

      // Actualizar título, fecha y hora de la tarea
      service.updateTask(task.id, {
        title: 'Entrega de informe v2',
        dueDate: '2026-12-05',
        dueTime: '16:00'
      });

      const syncReminder = service.reminders().find(r => r.id === reminder.id);
      expect(syncReminder?.title).toBe('Tarea: Entrega de informe v2');
      expect(syncReminder?.date).toBe('2026-12-05');
      expect(syncReminder?.time).toBe('16:00');
    });

    it('should mark reminder completed when task moves to done column', () => {
      const task = service.addTask({
        title: 'Revisión final',
        status: 'todo',
        dueDate: '2026-12-01'
      });

      const reminder = service.addReminder({
        title: `Tarea: ${task.title}`,
        category: 'Trabajo',
        recurrence: 'none',
        date: '2026-12-01',
        time: '09:00',
        active: true,
        completed: false,
        linkedTaskId: task.id
      });

      service.updateTask(task.id, {
        reminderEnabled: true,
        reminderId: reminder.id
      });

      // Mover a done
      service.updateTask(task.id, { status: 'done' });

      const syncReminder = service.reminders().find(r => r.id === reminder.id);
      expect(syncReminder?.completed).toBeTrue();
    });

    it('should delete associated reminder when task is deleted', () => {
      const task = service.addTask({
        title: 'Tarea con alarma',
        dueDate: '2026-12-01'
      });

      const reminder = service.addReminder({
        title: `Tarea: ${task.title}`,
        category: 'Trabajo',
        recurrence: 'none',
        date: '2026-12-01',
        time: '09:00',
        active: true,
        completed: false,
        linkedTaskId: task.id
      });

      service.updateTask(task.id, {
        reminderEnabled: true,
        reminderId: reminder.id
      });

      expect(service.reminders().some(r => r.id === reminder.id)).toBeTrue();

      service.deleteTask(task.id);

      expect(service.reminders().some(r => r.id === reminder.id)).toBeFalse();
    });

    it('should clear task reminder state when linked reminder is deleted', () => {
      const task = service.addTask({ title: 'Tarea x' });
      const reminder = service.addReminder({
        title: 'Alarma de prueba',
        category: 'Trabajo',
        recurrence: 'none',
        date: '2026-12-01',
        time: '09:00',
        active: true,
        completed: false,
        linkedTaskId: task.id
      });

      service.updateTask(task.id, {
        reminderEnabled: true,
        reminderId: reminder.id
      });

      service.deleteReminder(reminder.id);

      const updatedTask = service.tasks().find(t => t.id === task.id);
      expect(updatedTask?.reminderEnabled).toBeFalse();
      expect(updatedTask?.reminderId).toBeUndefined();
    });
  });

  describe('Bidirectional Linkage: Note <-> CalendarEvent (Tarea 3.3)', () => {
    it('should link note and calendar event bidirectionally', () => {
      const event = service.addCalendarEvent({
        title: 'Reunión de Diseño',
        category: 'Reunión',
        date: '2026-12-10',
        startTime: '11:00'
      });

      const note = service.addNote(`Acta: ${event.title}`);
      service.updateNote(note.id, { linkedEventId: event.id });
      service.updateCalendarEvent(event.id, { linkedNoteId: note.id });

      const updatedEvent = service.calendarEvents().find(e => e.id === event.id);
      const updatedNote = service.notes().find(n => n.id === note.id);

      expect(updatedEvent?.linkedNoteId).toBe(note.id);
      expect(updatedNote?.linkedEventId).toBe(event.id);
    });

    it('should clear linkedEventId on note when calendar event is deleted', () => {
      const event = service.addCalendarEvent({
        title: 'Sprint Demo',
        category: 'Reunión',
        date: '2026-12-15',
        startTime: '15:00'
      });

      const note = service.addNote(`Acta: ${event.title}`);
      service.updateNote(note.id, { linkedEventId: event.id });
      service.updateCalendarEvent(event.id, { linkedNoteId: note.id });

      service.deleteCalendarEvent(event.id);

      const noteAfter = service.notes().find(n => n.id === note.id);
      expect(noteAfter?.linkedEventId).toBeUndefined();
    });
  });
});
