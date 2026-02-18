import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DashboardStore } from './core/services';
import { User } from './core/models';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  private readonly store = inject(DashboardStore);

  ngOnInit(): void {
    // Simular un usuario autenticado para el MVP
    const mockUser: User = {
      id: 1,
      name: 'Luis Mata Uzcategui',
      username: 'lmatauzcategui',
      email: 'luis@iris.dev',
    };
    this.store.setUser(mockUser);
  }
}
