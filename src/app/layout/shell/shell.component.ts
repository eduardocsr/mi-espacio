import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { CommandPaletteComponent } from '../command-palette/command-palette.component';
import { ReminderToastComponent } from '../reminder-toast/reminder-toast.component';
import { OnboardingModalComponent } from '../onboarding/onboarding-modal.component';
import { WorkspaceService } from '../../core/services/workspace.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    SidebarComponent,
    TopbarComponent,
    CommandPaletteComponent,
    ReminderToastComponent,
    OnboardingModalComponent
  ],
  templateUrl: './shell.component.html'
})
export class ShellComponent {
  readonly workspace = inject(WorkspaceService);
}
