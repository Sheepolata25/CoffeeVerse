import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
})
export class Login {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  error = signal<string | null>(null);
  loading = signal(false);

  async onSubmit() {
    this.error.set(null);
    this.loading.set(true);

    const { error } = await this.auth.signIn(this.email, this.password);

    this.loading.set(false);

    if (error) {
      this.error.set('Wrong Email or password.');
      return;
    }

    this.router.navigate(['/']);
  }
}
