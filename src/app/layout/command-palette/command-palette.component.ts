import { Component, ElementRef, HostListener, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  LucideAngularModule,
  Search,
  X,
  FileText,
  CheckCircle2,
  Bell,
  ArrowRight,
  Plus,
  Moon,
  Sun
} from 'lucide-angular';
import { WorkspaceService } from '../../core/services/workspace.service';

@Component({
  selector: 'app-command-palette',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './command-palette.component.html'
})
export class CommandPaletteComponent {
  readonly workspace = inject(WorkspaceService);
  private readonly router = inject(Router);

  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  // Icons
  readonly SearchIcon = Search;
  readonly XIcon = X;
  readonly FileTextIcon = FileText;
  readonly CheckCircle2Icon = CheckCircle2;
  readonly BellIcon = Bell;
  readonly ArrowRightIcon = ArrowRight;
  readonly PlusIcon = Plus;
  readonly MoonIcon = Moon;
  readonly SunIcon = Sun;

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.toggleOpen();
    } else if (event.key === 'Escape' && this.workspace.isSearchOpen()) {
      event.preventDefault();
      this.close();
    }
  }

  toggleOpen(): void {
    const next = !this.workspace.isSearchOpen();
    this.workspace.isSearchOpen.set(next);
    if (next) {
      setTimeout(() => this.searchInput?.nativeElement.focus(), 50);
    }
  }

  close(): void {
    this.workspace.isSearchOpen.set(false);
  }

  onSearchChange(value: string): void {
    this.workspace.searchQuery.set(value);
  }

  navigateTo(path: string, param?: string): void {
    this.close();
    if (param) {
      this.router.navigate([path], { queryParams: { id: param } });
    } else {
      this.router.navigate([path]);
    }
  }

  createNewNote(): void {
    const newNote = this.workspace.addNote('Nueva nota rápida');
    this.navigateTo('/apuntes', newNote.id);
  }

  createNewTask(): void {
    this.workspace.addTask({
      title: 'Nueva tarea rápida',
      projectTag: 'Trabajo',
      priority: 'Media',
      status: 'todo',
      subtasks: []
    });
    this.navigateTo('/tareas');
  }

  toggleTheme(): void {
    this.workspace.toggleTheme();
  }
}
