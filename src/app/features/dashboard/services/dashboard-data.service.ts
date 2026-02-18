import { Injectable, inject, signal, computed } from '@angular/core';
import { ApiService } from '../../../core/services';
import { Post, User, Todo } from '../../../core/models';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DashboardDataService {
  private readonly api = inject(ApiService);

  // --- State ---
  private readonly _posts = signal<Post[]>([]);
  private readonly _users = signal<User[]>([]);
  private readonly _todos = signal<Todo[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  // --- Public readonly ---
  readonly posts = this._posts.asReadonly();
  readonly users = this._users.asReadonly();
  readonly todos = this._todos.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // --- Computed KPIs ---
  readonly totalUsers = computed(() => this._users().length);
  readonly totalPosts = computed(() => this._posts().length);
  readonly completedTodos = computed(
    () => this._todos().filter((t) => t.completed).length
  );
  readonly pendingTodos = computed(
    () => this._todos().filter((t) => !t.completed).length
  );

  // --- Actions ---
  async loadAll(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const [posts, users, todos] = await Promise.all([
        firstValueFrom(this.api.get<Post[]>('/posts')),
        firstValueFrom(this.api.get<User[]>('/users')),
        firstValueFrom(this.api.get<Todo[]>('/todos')),
      ]);

      this._posts.set(posts);
      this._users.set(users);
      this._todos.set(todos);
    } catch (err) {
      this._error.set('Error al cargar los datos del dashboard.');
      console.error('DashboardDataService loadAll error:', err);
    } finally {
      this._loading.set(false);
    }
  }

  async loadPosts(params?: Record<string, string | number>): Promise<void> {
    this._loading.set(true);
    try {
      const posts = await firstValueFrom(
        this.api.get<Post[]>('/posts', params)
      );
      this._posts.set(posts);
    } catch (err) {
      this._error.set('Error al cargar posts.');
      console.error(err);
    } finally {
      this._loading.set(false);
    }
  }
}
