import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProfileService } from '../../core/services/profile.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  imports: [FormsModule],
  templateUrl: './profile.html',
})
export class ProfilePage implements OnInit {
  private profileService = inject(ProfileService);
  private auth = inject(AuthService);

  profile = this.profileService.profile;

  username = '';
  bio = '';
  avatarUrl = '';

  success = signal(false);
  error = signal<string | null>(null);
  loading = signal(false);

  async ngOnInit() {
    await this.profileService.loadProfile();
    const p = this.profile();
    if (p) {
      this.username = p.username;
      this.bio = p.bio ?? '';
      this.avatarUrl = p.avatar_url ?? '';
    }
  }

  async onSubmit() {
    this.success.set(false);
    this.error.set(null);
    this.loading.set(true);

    const { error } = await this.profileService.updateProfile({
      username: this.username,
      bio: this.bio || null,
      avatar_url: this.avatarUrl || null,
    });

    this.loading.set(false);

    if (error) {
      this.error.set('Une erreur est survenue, réessaie.');
      return;
    }

    this.success.set(true);
  }

  signOut() {
    this.auth.signOut();
  }
}
