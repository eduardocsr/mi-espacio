import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  DragDropModule,
  CdkDragDrop,
  moveItemInArray,
  transferArrayItem
} from '@angular/cdk/drag-drop';
import {
  LucideAngularModule,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Trash2,
  Tag,
  Flag,
  Circle,
  Play,
  Eye,
  CheckCircle,
  Bookmark,
  AlertCircle,
  ArrowUpCircle,
  CheckSquare,
  LayoutGrid,
  List,
  X,
  ExternalLink,
  ArrowRight,
  ArrowLeft,
  Layers,
  Pencil,
  RotateCcw,
  FileText,
  Bell
} from 'lucide-angular';
import { WorkspaceService } from '../../core/services/workspace.service';
import { UiFeedbackService } from '../../core/services/ui-feedback.service';
import {
  IssueType,
  KanbanColumn,
  KanbanColumnIcon,
  Note,
  Reminder,
  SubTask,
  TaskItem,
  TaskPriority,
  TaskStatus
} from '../../core/models/workspace.models';

@Component({
  selector: 'app-tareas',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, LucideAngularModule],
  templateUrl: './tareas.component.html'
})
export class TareasComponent implements OnInit {
  readonly workspace = inject(WorkspaceService);
  readonly feedback = inject(UiFeedbackService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // Icons
  readonly CheckCircle2Icon = CheckCircle2;
  readonly AlertTriangleIcon = AlertTriangle;
  readonly ClockIcon = Clock;
  readonly PlusIcon = Plus;
  readonly SearchIcon = Search;
  readonly FilterIcon = Filter;
  readonly MoreVerticalIcon = MoreVertical;
  readonly FileTextIcon = FileText;
  readonly BellIcon = Bell;
  readonly CalendarIcon = Calendar;
  readonly CheckIcon = Check;
  readonly ChevronDownIcon = ChevronDown;
  readonly ChevronRightIcon = ChevronRight;
  readonly Trash2Icon = Trash2;
  readonly TagIcon = Tag;
  readonly FlagIcon = Flag;
  readonly CircleIcon = Circle;
  readonly PlayIcon = Play;
  readonly EyeIcon = Eye;
  readonly CheckCircleIcon = CheckCircle;
  readonly BookmarkIcon = Bookmark;
  readonly AlertCircleIcon = AlertCircle;
  readonly ArrowUpCircleIcon = ArrowUpCircle;
  readonly CheckSquareIcon = CheckSquare;
  readonly LayoutGridIcon = LayoutGrid;
  readonly ListIcon = List;
  readonly XIcon = X;
  readonly ExternalLinkIcon = ExternalLink;
  readonly ArrowRightIcon = ArrowRight;
  readonly ArrowLeftIcon = ArrowLeft;
  readonly LayersIcon = Layers;
  readonly PencilIcon = Pencil;
  readonly RotateCcwIcon = RotateCcw;

  // View Mode: 'board' (Kanban) or 'list' (Jira list table)
  viewMode = signal<'board' | 'list'>('board');

  // Filter state
  filterDateRange = signal<'all' | 'today' | 'week' | 'overdue'>('all');
  filterType = signal<string>('all');
  filterPriority = signal<string>('all');
  filterTag = signal<string>('all');
  searchQuery = signal<string>('');

  // Quick Inline Creation in Kanban Column
  quickColumnStatus = signal<TaskStatus | null>(null);
  quickColumnTitle = signal<string>('');

  // Detail Modal / Drawer state (Jira item view)
  isDetailOpen = signal<boolean>(false);
  selectedTaskId = signal<string | null>(null);
  newDetailSubtaskInput = signal<string>('');

  // Modal Create Task (for the + Nueva tarea top button)
  showCreateModal = signal<boolean>(false);
  createForm = signal<{
    title: string;
    description: string;
    issueType: IssueType;
    projectTag: string;
    priority: TaskPriority;
    status: TaskStatus;
    dueDate: string;
    dueTime: string;
    reminderEnabled: boolean;
    subtasks: SubTask[];
    newSubtaskInput: string;
  }>({
    title: '',
    description: '',
    issueType: 'Tarea',
    projectTag: 'Trabajo',
    priority: 'Media',
    status: 'todo',
    dueDate: new Date().toISOString().split('T')[0],
    dueTime: '18:00',
    reminderEnabled: false,
    subtasks: [],
    newSubtaskInput: ''
  });

  // Dynamic Column Customizer Modals & State
  showColumnModal = signal<boolean>(false);
  isEditingColumn = signal<boolean>(false);
  columnForm = signal<{
    id?: string;
    label: string;
    color: string;
    icon: KanbanColumnIcon;
    isDoneColumn: boolean;
  }>({
    label: '',
    color: '#74566E',
    icon: 'circle',
    isDoneColumn: false
  });

  activeMenuColumnId = signal<string | null>(null);
  activeTaskMenuId = signal<string | null>(null);

  showDeleteColumnModal = signal<boolean>(false);
  deletingColumn = signal<KanbanColumn | null>(null);
  fallbackColumnId = signal<string>('');

  // Palettes and icon choices for column customizer
  readonly columnColorOptions = [
    { label: 'Gris editorial', value: '#635B5E' },
    { label: 'Ámbar cálido', value: '#8C4A19' },
    { label: 'Púrpura / Ciruela', value: '#5B447A' },
    { label: 'Verde salvia', value: '#246A49' },
    { label: 'Azul zafiro', value: '#265B8A' },
    { label: 'Rojo teja', value: '#9B2C2C' },
    { label: 'Ciruela profundo', value: '#74566E' },
    { label: 'Pizarra oscuro', value: '#4A5568' }
  ];

  readonly columnIconOptions: { icon: KanbanColumnIcon; label: string }[] = [
    { icon: 'circle', label: 'Círculo' },
    { icon: 'play', label: 'Play' },
    { icon: 'eye', label: 'Ojo' },
    { icon: 'check', label: 'Check' },
    { icon: 'alert', label: 'Alerta' },
    { icon: 'flag', label: 'Bandera' },
    { icon: 'layers', label: 'Capas' }
  ];

  // Issue Types and Priorities
  readonly issueTypes: IssueType[] = ['Tarea', 'Historia', 'Error', 'Mejora'];
  readonly priorities: TaskPriority[] = ['Alta', 'Media', 'Baja'];
  readonly tags = ['Trabajo', 'Salud', 'Estudio', 'Personal'];

  // Check if any filter is active
  readonly hasActiveFilters = computed(() => {
    return (
      this.searchQuery().trim() !== '' ||
      this.filterType() !== 'all' ||
      this.filterPriority() !== 'all' ||
      this.filterTag() !== 'all' ||
      this.filterDateRange() !== 'all'
    );
  });

  // Current selected task for detail view
  readonly selectedTask = computed<TaskItem | null>(() => {
    const id = this.selectedTaskId();
    if (!id) return null;
    return this.workspace.tasks().find(t => t.id === id) || null;
  });

  // Filtered tasks base
  readonly filteredTasks = computed(() => {
    let list = this.workspace.tasks();
    const q = this.searchQuery().trim().toLowerCase();
    const type = this.filterType();
    const priority = this.filterPriority();
    const tag = this.filterTag();
    const range = this.filterDateRange();

    const todayStr = new Date().toISOString().split('T')[0];

    // Issue Type filter
    if (type !== 'all') {
      list = list.filter(t => t.issueType === type);
    }

    // Priority filter
    if (priority !== 'all') {
      list = list.filter(t => t.priority === priority);
    }

    // Tag filter
    if (tag !== 'all') {
      list = list.filter(t => t.projectTag === tag);
    }

    // Date range filter
    if (range === 'today') {
      list = list.filter(t => t.dueDate === todayStr);
    } else if (range === 'week') {
      const weekAhead = new Date();
      weekAhead.setDate(weekAhead.getDate() + 7);
      const weekAheadStr = weekAhead.toISOString().split('T')[0];
      list = list.filter(t => t.dueDate && t.dueDate >= todayStr && t.dueDate <= weekAheadStr);
    } else if (range === 'overdue') {
      list = list.filter(
        t => !this.workspace.isTaskStatusDone(t.status) && t.dueDate && t.dueDate < todayStr
      );
    }

    // Search query filter (title, description, issueKey, projectTag)
    if (q) {
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.issueKey && t.issueKey.toLowerCase().includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        t.projectTag.toLowerCase().includes(q)
      );
    }

    return list;
  });

  // Group filtered tasks by column id and manual order
  readonly tasksByColumn = computed(() => {
    const map: Record<string, TaskItem[]> = {};
    const cols = this.workspace.columns();
    for (const col of cols) {
      map[col.id] = [];
    }
    for (const task of this.filteredTasks()) {
      if (map[task.status]) {
        map[task.status].push(task);
      } else {
        const fallback = this.workspace.sortedColumns()[0]?.id || 'todo';
        if (!map[fallback]) map[fallback] = [];
        map[fallback].push(task);
      }
    }
    // Sort each column by manual order
    for (const colId of Object.keys(map)) {
      map[colId].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    return map;
  });

  readonly doneTasks = computed(() =>
    this.filteredTasks().filter(t => this.workspace.isTaskStatusDone(t.status))
  );

  readonly deletingColumnTaskCount = computed(() => {
    const col = this.deletingColumn();
    if (!col) return 0;
    return this.workspace.tasks().filter(t => t.status === col.id).length;
  });

  getTasksForColumn(columnId: string): TaskItem[] {
    return this.tasksByColumn()[columnId] || [];
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.filterType.set('all');
    this.filterPriority.set('all');
    this.filterTag.set('all');
    this.filterDateRange.set('all');
  }

  // Drag and drop event handler
  onDrop(event: CdkDragDrop<TaskItem[]>, targetStatus: TaskStatus): void {
    // 1. Resolve exact task being moved by its data or reference
    const movedTask: TaskItem =
      event.item?.data || event.previousContainer.data[event.previousIndex];
    if (!movedTask) return;

    if (event.previousContainer === event.container) {
      // Reordering within the same column
      if (event.previousIndex === event.currentIndex) return;
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      const orderedIds = event.container.data.map(t => t.id);
      this.workspace.reorderTasksInColumn(targetStatus, orderedIds);
    } else {
      // Moving to a different column
      const sourceColId = movedTask.status;
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
      const orderedIds = event.container.data.map(t => t.id);
      this.workspace.moveTaskToColumn(movedTask.id, targetStatus, orderedIds, sourceColId);
    }
  }

  // Overdue checker
  isOverdue(task: TaskItem): boolean {
    if (this.workspace.isTaskStatusDone(task.status) || !task.dueDate) return false;
    const today = new Date().toISOString().split('T')[0];
    return task.dueDate < today;
  }

  // Calculate subtask progress percentage
  getSubtaskProgress(task: TaskItem): number {
    if (!task.subtasks || task.subtasks.length === 0) return 0;
    const completed = task.subtasks.filter(s => s.completed).length;
    return Math.round((completed / task.subtasks.length) * 100);
  }

  getSubtaskCompletedCount(task: TaskItem): number {
    if (!task.subtasks) return 0;
    return task.subtasks.filter(s => s.completed).length;
  }

  toggleSubTask(taskId: string, subTaskId: string): void {
    this.workspace.toggleSubTask(taskId, subTaskId);
  }

  // Inline Quick Creation in Kanban Column
  startQuickColumnTask(status: TaskStatus): void {
    this.quickColumnStatus.set(status);
    this.quickColumnTitle.set('');
  }

  cancelQuickColumnTask(): void {
    this.quickColumnStatus.set(null);
    this.quickColumnTitle.set('');
  }

  submitQuickColumnTask(status: TaskStatus): void {
    const title = this.quickColumnTitle().trim();
    if (!title) {
      this.cancelQuickColumnTask();
      return;
    }

    this.workspace.addTask({
      title,
      issueType: 'Tarea',
      projectTag: 'Trabajo',
      priority: 'Media',
      status,
      dueDate: new Date().toISOString().split('T')[0],
      subtasks: []
    });

    this.cancelQuickColumnTask();
  }

  // Detail Drawer / Modal
  openDetail(task: TaskItem): void {
    this.selectedTaskId.set(task.id);
    this.newDetailSubtaskInput.set('');
    this.isDetailOpen.set(true);
  }

  closeDetail(): void {
    this.isDetailOpen.set(false);
    this.selectedTaskId.set(null);
  }

  updateDetailField<K extends keyof TaskItem>(field: K, value: TaskItem[K]): void {
    const task = this.selectedTask();
    if (!task) return;
    this.workspace.updateTask(task.id, { [field]: value });
  }

  addDetailSubtask(): void {
    const text = this.newDetailSubtaskInput().trim();
    const task = this.selectedTask();
    if (!text || !task) return;

    const newSub: SubTask = {
      id: 'st-' + Date.now(),
      title: text,
      completed: false
    };

    this.workspace.updateTask(task.id, {
      subtasks: [...(task.subtasks || []), newSub]
    });
    this.newDetailSubtaskInput.set('');
  }

  removeDetailSubtask(subId: string): void {
    const task = this.selectedTask();
    if (!task) return;
    this.workspace.updateTask(task.id, {
      subtasks: (task.subtasks || []).filter(s => s.id !== subId)
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const taskId = params['taskId'] || params['id'];
      if (taskId) {
        queueMicrotask(() => {
          const found = this.workspace.tasks().find(t => t.id === taskId || t.issueKey === taskId);
          if (found) {
            this.openDetail(found);
          }
        });
      }
    });
  }

  getLinkedNote(noteId: string): Note | undefined {
    return this.workspace.notes().find(n => n.id === noteId);
  }

  openLinkedNote(noteId: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.closeDetail();
    this.router.navigate(['/apuntes'], { queryParams: { id: noteId } });
  }

  async deleteTask(taskId: string): Promise<void> {
    const task = this.workspace.tasks().find(t => t.id === taskId);
    const confirmed = await this.feedback.confirm({
      title: 'Eliminar tarea',
      message: task ? `¿Estás seguro de que deseas eliminar permanentemente "${task.title}"?` : '¿Estás seguro de que deseas eliminar esta tarea permanentemente?',
      confirmLabel: 'Eliminar tarea',
      tone: 'danger'
    });
    if (confirmed) {
      const deletedTask = task ? { ...task } : null;
      const deletedReminder = task?.reminderId ? this.workspace.reminders().find(r => r.id === task.reminderId) : null;
      this.workspace.deleteTask(taskId);
      this.closeDetail();
      this.feedback.toast({
        type: 'info',
        message: task ? `Tarea "${task.title}" eliminada.` : 'Tarea eliminada del tablero.',
        durationMs: 6000,
        actionLabel: 'Deshacer',
        onAction: () => {
          if (deletedTask) {
            if (deletedReminder) {
              this.workspace.reminders.update(cur => [...cur, deletedReminder]);
            }
            this.workspace.restoreTask(deletedTask);
            this.feedback.success(`Tarea "${deletedTask.title}" restaurada`);
          }
        }
      });
    }
  }

  getTaskReminder(task: TaskItem): Reminder | undefined {
    if (!task.reminderId) return undefined;
    return this.workspace.reminders().find(r => r.id === task.reminderId);
  }

  toggleTaskReminder(task: TaskItem, event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const enable = checkbox.checked;

    if (enable) {
      const date = task.dueDate || new Date().toISOString().split('T')[0];
      const time = task.dueTime || '09:00';
      
      const taskUpdates: Partial<TaskItem> = {
        reminderEnabled: true,
        dueDate: task.dueDate || date,
        dueTime: task.dueTime || time
      };

      let reminderId = task.reminderId;
      const existingReminder = reminderId ? this.workspace.reminders().find(r => r.id === reminderId) : null;

      if (existingReminder) {
        this.workspace.updateReminder(existingReminder.id, {
          title: `Tarea: ${task.title}`,
          date,
          time,
          active: true,
          completed: this.workspace.isTaskStatusDone(task.status)
        });
      } else {
        const newRem = this.workspace.addReminder({
          title: `Tarea: ${task.title}`,
          description: task.description || `Recordatorio para la tarea ${task.issueKey || task.title}`,
          category: task.projectTag || 'Trabajo',
          recurrence: 'none',
          date,
          time,
          active: true,
          completed: this.workspace.isTaskStatusDone(task.status),
          linkedTaskId: task.id
        });
        reminderId = newRem.id;
      }

      taskUpdates.reminderId = reminderId;
      this.workspace.updateTask(task.id, taskUpdates);
      this.feedback.success(`Recordatorio programado para el ${date} a las ${time}`);
    } else {
      if (task.reminderId) {
        this.workspace.deleteReminder(task.reminderId);
      }
      this.workspace.updateTask(task.id, {
        reminderEnabled: false,
        reminderId: undefined
      });
      this.feedback.info('Recordatorio desactivado');
    }
  }

  // Create Modal Actions
  openCreateModal(defaultStatus?: TaskStatus): void {
    const fallbackStatus = defaultStatus || this.workspace.sortedColumns()[0]?.id || 'todo';
    this.createForm.set({
      title: '',
      description: '',
      issueType: 'Tarea',
      projectTag: 'Trabajo',
      priority: 'Media',
      status: fallbackStatus,
      dueDate: new Date().toISOString().split('T')[0],
      dueTime: '17:00',
      reminderEnabled: false,
      subtasks: [],
      newSubtaskInput: ''
    });
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  addCreateFormSubtask(): void {
    const input = this.createForm().newSubtaskInput.trim();
    if (!input) return;
    const newSub: SubTask = {
      id: 'st-' + Date.now(),
      title: input,
      completed: false
    };
    this.createForm.update(f => ({
      ...f,
      subtasks: [...f.subtasks, newSub],
      newSubtaskInput: ''
    }));
  }

  removeCreateFormSubtask(subId: string): void {
    this.createForm.update(f => ({
      ...f,
      subtasks: f.subtasks.filter(s => s.id !== subId)
    }));
  }

  saveNewTask(): void {
    const form = this.createForm();
    if (!form.title.trim()) return;

    const newTask = this.workspace.addTask({
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      issueType: form.issueType,
      projectTag: form.projectTag,
      priority: form.priority,
      status: form.status,
      dueDate: form.dueDate || undefined,
      dueTime: form.dueTime || undefined,
      subtasks: form.subtasks,
      reminderEnabled: form.reminderEnabled
    });

    if (form.reminderEnabled && newTask.dueDate) {
      const newRem = this.workspace.addReminder({
        title: `Tarea: ${newTask.title}`,
        description: newTask.description || `Recordatorio para la tarea ${newTask.issueKey || newTask.title}`,
        category: newTask.projectTag || 'Trabajo',
        recurrence: 'none',
        date: newTask.dueDate,
        time: newTask.dueTime || '09:00',
        active: true,
        completed: this.workspace.isTaskStatusDone(newTask.status),
        linkedTaskId: newTask.id
      });
      this.workspace.updateTask(newTask.id, { reminderId: newRem.id });
    }

    this.closeCreateModal();
    this.feedback.success('Incidencia creada exitosamente');
  }

  // Column Customizer Actions
  openAddColumnModal(): void {
    this.activeMenuColumnId.set(null);
    this.isEditingColumn.set(false);
    this.columnForm.set({
      label: '',
      color: '#74566E',
      icon: 'circle',
      isDoneColumn: false
    });
    this.showColumnModal.set(true);
  }

  openEditColumnModal(col: KanbanColumn): void {
    this.activeMenuColumnId.set(null);
    this.isEditingColumn.set(true);
    this.columnForm.set({
      id: col.id,
      label: col.label,
      color: col.color,
      icon: col.icon,
      isDoneColumn: !!col.isDoneColumn
    });
    this.showColumnModal.set(true);
  }

  closeColumnModal(): void {
    this.showColumnModal.set(false);
  }

  saveColumn(): void {
    const form = this.columnForm();
    if (!form.label.trim()) return;

    if (this.isEditingColumn() && form.id) {
      this.workspace.updateColumn(form.id, {
        label: form.label.trim(),
        color: form.color,
        icon: form.icon,
        isDoneColumn: form.isDoneColumn
      });
    } else {
      this.workspace.addColumn(
        form.label.trim(),
        form.color,
        form.icon,
        form.isDoneColumn
      );
    }
    this.closeColumnModal();
  }

  toggleColumnMenu(colId: string, event: Event): void {
    event.stopPropagation();
    this.activeMenuColumnId.update(curr => (curr === colId ? null : colId));
  }

  closeColumnMenu(): void {
    this.activeMenuColumnId.set(null);
    this.activeTaskMenuId.set(null);
  }

  toggleTaskMenu(taskId: string, event?: Event): void {
    if (event) event.stopPropagation();
    this.activeMenuColumnId.set(null);
    this.activeTaskMenuId.update(curr => (curr === taskId ? null : taskId));
  }

  moveTaskToColumnFromMenu(taskId: string, targetColId: string, event?: Event): void {
    if (event) event.stopPropagation();
    this.workspace.updateTaskStatus(taskId, targetColId);
    this.activeTaskMenuId.set(null);
  }

  moveColumnLeft(index: number): void {
    if (index > 0) {
      this.workspace.reorderColumns(index, index - 1);
      this.activeMenuColumnId.set(null);
    }
  }

  moveColumnRight(index: number): void {
    if (index < this.workspace.sortedColumns().length - 1) {
      this.workspace.reorderColumns(index, index + 1);
      this.activeMenuColumnId.set(null);
    }
  }

  openDeleteColumnModal(col: KanbanColumn): void {
    this.activeMenuColumnId.set(null);
    if (this.workspace.columns().length <= 1) {
      this.feedback.warning('No puedes eliminar la única columna del tablero.', 'Acción no permitida');
      return;
    }
    this.deletingColumn.set(col);
    const remaining = this.workspace.sortedColumns().filter(c => c.id !== col.id);
    this.fallbackColumnId.set(remaining[0]?.id || '');
    this.showDeleteColumnModal.set(true);
  }

  closeDeleteColumnModal(): void {
    this.showDeleteColumnModal.set(false);
    this.deletingColumn.set(null);
    this.fallbackColumnId.set('');
  }

  confirmDeleteColumn(): void {
    const col = this.deletingColumn();
    if (!col) return;
    const count = this.workspace.tasks().filter(t => t.status === col.id).length;
    if (count > 0 && !this.fallbackColumnId()) {
      this.feedback.warning('Por favor selecciona una columna destino para reasignar las tareas.');
      return;
    }
    this.workspace.deleteColumn(col.id, this.fallbackColumnId());
    this.closeDeleteColumnModal();
    this.feedback.info(`Columna "${col.label}" eliminada`);
  }

  // Style helpers for IssueType
  getIssueTypeColor(type: IssueType): { bg: string; text: string; border: string } {
    switch (type) {
      case 'Historia':
        return { bg: '#E6F3EC', text: '#246A49', border: '#246A49' };
      case 'Error':
        return { bg: '#FDECEC', text: '#9B2C2C', border: '#9B2C2C' };
      case 'Mejora':
        return { bg: '#EFEAF6', text: '#5B447A', border: '#74566E' };
      case 'Tarea':
      default:
        return { bg: '#E8F1FA', text: '#265B8A', border: '#265B8A' };
    }
  }

  // Style helpers for dynamic status
  getStatusBadge(status: TaskStatus): { label: string; color: string; bg: string; text: string } {
    const col = this.workspace.columns().find(c => c.id === status);
    if (col) {
      return {
        label: col.label,
        color: col.color,
        bg: col.color + '18',
        text: col.color
      };
    }
    return {
      label: status,
      color: '#635B5E',
      bg: '#FAF7F5',
      text: '#635B5E'
    };
  }

  // Icon mapping for Kanban columns
  getColumnIcon(iconName: KanbanColumnIcon) {
    switch (iconName) {
      case 'circle': return this.CircleIcon;
      case 'play': return this.PlayIcon;
      case 'eye': return this.EyeIcon;
      case 'check': return this.CheckIcon;
      case 'alert': return this.AlertTriangleIcon;
      case 'flag': return this.FlagIcon;
      case 'layers': return this.LayersIcon;
      default: return this.CircleIcon;
    }
  }
}