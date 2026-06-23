import { Component, inject, OnInit, signal, computed, ChangeDetectorRef } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PostService } from '../../core/services/post.service';
import { AuthService } from '../../core/services/auth.service';
import { ProfileService } from '../../core/services/profile.service';
import { CommentService } from '../../core/services/comment.service';
import { FollowService } from '../../core/services/follow.service';
import { CollectionService } from '../../core/services/collection.service';
import { Post } from '../../core/models/post.model';
import { PostComment } from '../../core/models/comment.model';

@Component({
  selector: 'app-community',
  imports: [DatePipe, RouterLink, FormsModule],
  templateUrl: './community.html',
  styleUrl: './community.css',
})
export class Community implements OnInit {
  private postService = inject(PostService);
  private auth = inject(AuthService);
  private profileService = inject(ProfileService);
  private commentService = inject(CommentService);
  private cdr = inject(ChangeDetectorRef);
  followService = inject(FollowService);
  collectionService = inject(CollectionService);

  posts = this.postService.posts;
  profile = this.profileService.profile;
  currentUserId = this.auth.currentUser;

  selectedTag = signal<string | null>(null);
  searchQuery = signal('');
  openDropdownPostId = signal<string | null>(null);

  expandedPostId = signal<string | null>(null);
  commentsMap: Record<string, PostComment[]> = {};
  loadingComments: Record<string, boolean> = {};
  commentTexts: Record<string, string> = {};
  submittingComment: Record<string, boolean> = {};

  popularTags = computed(() => {
    const counts = new Map<string, number>();
    for (const post of this.posts()) {
      for (const tag of post.tags ?? []) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  });

  filteredPosts = computed(() => {
    const tag = this.selectedTag();
    const query = this.searchQuery().toLowerCase().trim();
    let result = this.posts();
    if (tag) result = result.filter(p => p.tags.includes(tag));
    if (query) result = result.filter(p =>
      p.title.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query) ||
      (p.profiles?.username.toLowerCase().includes(query) ?? false) ||
      p.tags.some(t => t.toLowerCase().includes(query))
    );
    return result;
  });

  async ngOnInit() {
    await this.postService.loadPosts();
    this.followService.loadFollowingList();
    this.collectionService.loadCollections();
  }

  getPostCollectionId(post: Post): string | null {
    const userId = this.currentUserId()?.id;
    return post.post_favorites?.find(f => f.user_id === userId)?.collection_id ?? null;
  }

  toggleDropdown(postId: string) {
    this.openDropdownPostId.set(this.openDropdownPostId() === postId ? null : postId);
  }

  async assignToCollection(post: Post, collectionId: string | null) {
    const { error } = await this.collectionService.assignToCollection(post.id, collectionId);
    if (!error) {
      this.postService.updatePostCollectionLocally(post.id, collectionId);
    }
    this.openDropdownPostId.set(null);
  }

  selectTag(tag: string) {
    this.selectedTag.set(this.selectedTag() === tag ? null : tag);
  }

  hasLiked(post: Post): boolean {
    const userId = this.currentUserId()?.id;
    return !!userId && (post.post_likes?.some(l => l.user_id === userId) ?? false);
  }

  toggleLike(post: Post) {
    if (this.hasLiked(post)) {
      this.postService.unlikePost(post.id);
    } else {
      this.postService.likePost(post.id);
    }
  }

  hasFavorited(post: Post): boolean {
    const userId = this.currentUserId()?.id;
    return !!userId && (post.post_favorites?.some(f => f.user_id === userId) ?? false);
  }

  toggleFavorite(post: Post) {
    if (this.hasFavorited(post)) {
      this.postService.unfavoritePost(post.id);
    } else {
      this.postService.favoritePost(post.id);
    }
  }

  async toggleComments(postId: string) {
    if (this.expandedPostId() === postId) {
      this.expandedPostId.set(null);
      return;
    }
    this.expandedPostId.set(postId);
    if (!this.commentsMap[postId]) {
      this.loadingComments[postId] = true;
      this.commentsMap[postId] = await this.commentService.loadComments(postId);
      this.loadingComments[postId] = false;
      this.cdr.markForCheck();
    }
  }

  async submitComment(postId: string) {
    const text = this.commentTexts[postId]?.trim();
    if (!text || this.submittingComment[postId]) return;

    this.submittingComment[postId] = true;
    const { data, error } = await this.commentService.addComment(postId, text);
    this.submittingComment[postId] = false;

    if (!error && data) {
      this.commentsMap[postId] = [...(this.commentsMap[postId] ?? []), data];
      this.commentTexts[postId] = '';
      this.postService.incrementCommentCount(postId);
    }
  }

  async deleteComment(postId: string, commentId: string) {
    const { error } = await this.commentService.deleteComment(commentId);
    if (!error) {
      this.commentsMap[postId] = this.commentsMap[postId].filter(c => c.id !== commentId);
      this.postService.decrementCommentCount(postId);
    }
  }
}
