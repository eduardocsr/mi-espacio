import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell/shell.component';
import { InicioComponent } from './features/inicio/inicio.component';
import { ApuntesComponent } from './features/apuntes/apuntes.component';
import { TareasComponent } from './features/tareas/tareas.component';
import { CalendarioComponent } from './features/calendario/calendario.component';
import { RecordatoriosComponent } from './features/recordatorios/recordatorios.component';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
      { path: 'inicio', component: InicioComponent },
      { path: 'apuntes', component: ApuntesComponent },
      { path: 'tareas', component: TareasComponent },
      { path: 'calendario', component: CalendarioComponent },
      { path: 'recordatorios', component: RecordatoriosComponent }
    ]
  },
  {
    path: '**',
    redirectTo: 'inicio'
  }
];
