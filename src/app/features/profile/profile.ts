import { Component, inject, signal, effect, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProfileService } from '../../core/services/profile.service';
import { AuthService } from '../../core/services/auth.service';
import { PostService } from '../../core/services/post.service';
import { StorageService } from '../../core/services/storage.service';
import { Post } from '../../core/models/post.model';

type Tab = 'overview' | 'settings';

type EditForm = {
  username: string;
  bio: string;
  avatar_url: string;
  cover_url: string;
  location: string;
  favorite_brew: string;
  goto_bean: string;
  preferred_roast: string;
  favorite_gear: string;
  preferred_water_temp: number | null;
};

@Component({
  selector: 'app-profile',
  imports: [FormsModule, DatePipe, RouterLink],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class ProfilePage {
  private profileService = inject(ProfileService);
  private auth = inject(AuthService);
  private postService = inject(PostService);
  private storage = inject(StorageService);

  profile = this.profileService.profile;
  activeTab = signal<Tab>('overview');
  userPosts = signal<Post[]>([]);
  saving = signal(false);
  success = signal(false);
  error = signal<string | null>(null);

  avatarFile: File | null = null;
  coverFile: File | null = null;
  avatarPreview = signal<string | null>(null);
  coverPreview = signal<string | null>(null);

  form: EditForm = {
    username: '',
    bio: '',
    avatar_url: '',
    cover_url: '',
    location: '',
    favorite_brew: '',
    goto_bean: '',
    preferred_roast: '',
    favorite_gear: '',
    preferred_water_temp: null,
  };

  recentPosts = computed(() => this.userPosts().slice(0, 3));
  postCount = computed(() => this.userPosts().length);
  latestPost = computed(() => this.userPosts()[0] ?? null);
  hasCoffeePrefs = computed(() => {
    const p = this.profile();
    return !!(p?.favorite_brew || p?.goto_bean || p?.preferred_roast || p?.favorite_gear || p?.preferred_water_temp);
  });

  constructor() {
    effect(() => {
      const p = this.profile();
      if (p) {
        this.form = {
          username: p.username,
          bio: p.bio ?? '',
          avatar_url: p.avatar_url ?? '',
          cover_url: p.cover_url ?? '',
          location: p.location ?? '',
          favorite_brew: p.favorite_brew ?? '',
          goto_bean: p.goto_bean ?? '',
          preferred_roast: p.preferred_roast ?? '',
          favorite_gear: p.favorite_gear ?? '',
          preferred_water_temp: p.preferred_water_temp ?? null,
        };
        this.avatarPreview.set(null);
        this.coverPreview.set(null);
        this.avatarFile = null;
        this.coverFile = null;
      }
    });

    effect(() => {
      const userId = this.auth.currentUser()?.id;
      if (userId) {
        this.postService.loadUserPosts(userId).then(posts => this.userPosts.set(posts));
      }
    });
  }

  onAvatarSelect(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.avatarFile = file;
    const reader = new FileReader();
    reader.onload = e => this.avatarPreview.set(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  onCoverSelect(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.coverFile = file;
    const reader = new FileReader();
    reader.onload = e => this.coverPreview.set(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  async onSubmit() {
    this.success.set(false);
    this.error.set(null);
    this.saving.set(true);

    const userId = this.auth.currentUser()?.id;
    let avatarUrl = this.form.avatar_url || null;
    let coverUrl = this.form.cover_url || null;

    try {
      if (this.avatarFile && userId) {
        const ext = this.avatarFile.name.split('.').pop();
        const { url, error } = await this.storage.upload('avatars', `${userId}/avatar.${ext}`, this.avatarFile);
        if (error) throw new Error('Avatar upload failed');
        avatarUrl = url;
      }

      if (this.coverFile && userId) {
        const ext = this.coverFile.name.split('.').pop();
        const { url, error } = await this.storage.upload('avatars', `${userId}/cover.${ext}`, this.coverFile);
        if (error) throw new Error('Cover upload failed');
        coverUrl = url;
      }
    } catch (e: any) {
      this.error.set(e.message);
      this.saving.set(false);
      return;
    }

    const { error } = await this.profileService.updateProfile({
      username: this.form.username,
      bio: this.form.bio || null,
      avatar_url: avatarUrl,
      cover_url: coverUrl,
      location: this.form.location || null,
      favorite_brew: this.form.favorite_brew || null,
      goto_bean: this.form.goto_bean || null,
      preferred_roast: this.form.preferred_roast || null,
      favorite_gear: this.form.favorite_gear || null,
      preferred_water_temp: this.form.preferred_water_temp,
    });

    this.saving.set(false);

    if (error) {
      this.error.set('An error occurred, please try again.');
    } else {
      this.success.set(true);
      this.activeTab.set('overview');
    }
  }

  signOut() {
    this.auth.signOut();
  }
}
