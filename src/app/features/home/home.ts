import { Component, inject, signal, effect } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ActivityService } from '../../core/services/activity.service';
import { AuthService } from '../../core/services/auth.service';
import { ProfileService } from '../../core/services/profile.service';
import { PostService } from '../../core/services/post.service';
import { RoasterService } from '../../core/services/roaster.service';
import { Post } from '../../core/models/post.model';

@Component({
  selector: 'app-home',
  imports: [DatePipe, RouterLink],
  templateUrl: './home.html',
})
export class Home {
  private profileService = inject(ProfileService);
  private auth = inject(AuthService);
  private postService = inject(PostService);
  private activityService = inject(ActivityService);
  private roasterService = inject(RoasterService);

  profile = this.profileService.profile;
  currentUser = this.auth.currentUser;
  activities = this.activityService.activities;
  dailyRoaster = this.roasterService.dailyRoaster;

  recentPosts = signal<Post[]>([]);
  postCount = signal(0);
  favoriteCount = signal(0);

  private dataLoaded = false;

  constructor() {
    effect(() => {
      const userId = this.currentUser()?.id;
      if (userId && !this.dataLoaded) {
        this.dataLoaded = true;
        this.loadData(userId);
      }
    });
  }

  private async loadData(userId: string) {
    const [posts, stats] = await Promise.all([
      this.postService.loadRecentCommunityPosts(3),
      this.postService.getUserStats(userId),
      this.activityService.loadActivities(),
      this.roasterService.loadDailyRoaster(),
    ]);
    this.recentPosts.set(posts);
    this.postCount.set(stats.postCount);
    this.favoriteCount.set(stats.favoriteCount);
  }

  locationStr(city: string | null, country: string | null): string {
    return [city, country].filter(s => !!s).join(', ');
  }

  activityLabel(type: string): string {
    const labels: Record<string, string> = {
      like: 'You liked',
      favorite: 'You saved',
      comment: 'You commented',
      post: 'You published',
    };
    return labels[type] ?? type;
  }

  relativeTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Now";
    if (mins < 60) return `${mins}mins ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
}
