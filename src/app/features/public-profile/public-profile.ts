import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ProfileService } from '../../core/services/profile.service';
import { PostService } from '../../core/services/post.service';
import { AuthService } from '../../core/services/auth.service';
import { FollowService } from '../../core/services/follow.service';
import { Profile } from '../../core/models/profile.model';
import { Post } from '../../core/models/post.model';

@Component({
  selector: 'app-public-profile',
  imports: [DatePipe],
  templateUrl: './public-profile.html',
  styleUrl: './public-profile.css',
})
export class PublicProfile implements OnInit {
  private route = inject(ActivatedRoute);
  private profileService = inject(ProfileService);
  private postService = inject(PostService);
  private auth = inject(AuthService);
  private followService = inject(FollowService);

  profile = signal<Profile | null>(null);
  userPosts = signal<Post[]>([]);
  loading = signal(true);

  isOwnProfile = computed(() => this.auth.currentUser()?.id === this.profile()?.id);
  isFollowing = signal(false);
  isBlocked = signal(false);
  followersCount = signal(0);
  followingCount = signal(0);

  postCount = computed(() => this.userPosts().length);
  likesReceived = computed(() =>
    this.userPosts().reduce((sum, p) => sum + (p.post_likes?.length ?? 0), 0)
  );
  recentPosts = computed(() => this.userPosts().slice(0, 3));
  latestPost = computed(() => this.userPosts()[0] ?? null);
  hasCoffeePrefs = computed(() => {
    const p = this.profile();
    return !!(p?.favorite_brew || p?.goto_bean || p?.preferred_roast || p?.favorite_gear || p?.preferred_water_temp);
  });

  async ngOnInit() {
    const userId = this.route.snapshot.paramMap.get('id');
    if (!userId) { this.loading.set(false); return; }

    const [profile, posts] = await Promise.all([
      this.profileService.loadProfileById(userId),
      this.postService.loadUserPosts(userId),
    ]);

    this.profile.set(profile);
    this.userPosts.set(posts);

    const currentUserId = this.auth.currentUser()?.id;
    const [counts] = await Promise.all([
      this.followService.getFollowCounts(userId),
    ]);
    this.followersCount.set(counts.followers);
    this.followingCount.set(counts.following);

    if (currentUserId && currentUserId !== userId) {
      const relationship = await this.followService.getRelationship(userId);
      this.isFollowing.set(relationship.isFollowing);
      this.isBlocked.set(relationship.isBlocked);
    }

    this.loading.set(false);
  }

  async toggleFollow() {
    const targetId = this.profile()?.id;
    if (!targetId) return;

    if (this.isFollowing()) {
      await this.followService.unfollow(targetId);
      this.isFollowing.set(false);
      this.followersCount.update(c => Math.max(0, c - 1));
    } else {
      await this.followService.follow(targetId);
      this.isFollowing.set(true);
      this.followersCount.update(c => c + 1);
    }
  }

  async toggleBlock() {
    const targetId = this.profile()?.id;
    if (!targetId) return;

    if (this.isBlocked()) {
      await this.followService.unblock(targetId);
      this.isBlocked.set(false);
    } else {
      await this.followService.block(targetId);
      this.isBlocked.set(true);
      if (this.isFollowing()) {
        this.isFollowing.set(false);
        this.followersCount.update(c => Math.max(0, c - 1));
      }
    }
  }
}
