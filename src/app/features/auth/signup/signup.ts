import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-signup',
  imports: [FormsModule, RouterLink],
  templateUrl: './signup.html',
})
export class Signup {
  private auth = inject(AuthService);
  private router = inject(Router);

  username = '';
  email = '';
  password = '';
  error = signal<string | null>(null);
  loading = signal(false);

  async onSubmit() {
    this.error.set(null);
    this.loading.set(true);

    const { error } = await this.auth.signUp(this.email, this.password, this.username);

    this.loading.set(false);

    if (error) {
      this.error.set(error.message);
      return;
    }

    this.router.navigate(['/']);
  }
}
