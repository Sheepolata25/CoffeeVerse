import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ActivityService } from '../../core/services/activity.service';
import { AuthService } from '../../core/services/auth.service';
import { ProfileService } from '../../core/services/profile.service';
import { PostService } from '../../core/services/post.service';
import { Post } from '../../core/models/post.model';

@Component({
  selector: 'app-home',
  imports: [DatePipe, RouterLink, FormsModule],
  templateUrl: './home.html',
})
export class Home implements OnInit {
  private profileService = inject(ProfileService);
  private auth = inject(AuthService);
  private postService = inject(PostService);
  private activityService = inject(ActivityService);

  profile = this.profileService.profile;
  currentUser = this.auth.currentUser;
  activities = this.activityService.activities;

  searchQuery = signal('');
  recentPosts = signal<Post[]>([]);
  postCount = signal(0);
  favoriteCount = signal(0);

  async ngOnInit() {
    const userId = this.currentUser()?.id;
    if (!userId) return;

    const [posts, stats] = await Promise.all([
      this.postService.loadRecentUserPosts(userId, 3),
      this.postService.getUserStats(userId),
      this.activityService.loadActivities(),
    ]);

    this.recentPosts.set(posts);
    this.postCount.set(stats.postCount);
    this.favoriteCount.set(stats.favoriteCount);
  }

  activityLabel(type: string): string {
    const labels: Record<string, string> = {
      like: 'Vous avez aimé',
      favorite: 'Vous avez enregistré',
      comment: 'Vous avez commenté',
      post: 'Vous avez publié',
    };
    return labels[type] ?? type;
  }

  relativeTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "À l'instant";
    if (mins < 60) return `il y a ${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    return `il y a ${days}j`;
  }
}
