import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FeedbackHostComponent } from './layout/feedback/feedback-host.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FeedbackHostComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'mi-espacio';
}
