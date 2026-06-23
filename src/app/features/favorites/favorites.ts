import { Component, inject, OnInit, signal, computed, ChangeDetectorRef } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PostService } from '../../core/services/post.service';
import { AuthService } from '../../core/services/auth.service';
import { ProfileService } from '../../core/services/profile.service';
import { CommentService } from '../../core/services/comment.service';
import { CollectionService } from '../../core/services/collection.service';
import { Post } from '../../core/models/post.model';
import { PostComment } from '../../core/models/comment.model';

@Component({
  selector: 'app-favorites',
  imports: [DatePipe, RouterLink, FormsModule],
  templateUrl: './favorites.html',
})
export class Favorites implements OnInit {
  private postService = inject(PostService);
  private auth = inject(AuthService);
  private profileService = inject(ProfileService);
  private commentService = inject(CommentService);
  private cdr = inject(ChangeDetectorRef);
  collectionService = inject(CollectionService);

  profile = this.profileService.profile;
  currentUser = this.auth.currentUser;
  favoritedPosts = this.postService.favoritedPosts;

  searchQuery = signal('');
  selectedTag = signal<string | null>(null);
  selectedCollectionId = signal<string | null | 'all'>('all');

  showNewCollectionInput = signal(false);
  newCollectionName = '';
  openDropdownPostId = signal<string | null>(null);

  expandedPostId = signal<string | null>(null);
  commentsMap: Record<string, PostComment[]> = {};
  loadingComments: Record<string, boolean> = {};
  commentTexts: Record<string, string> = {};
  submittingComment: Record<string, boolean> = {};

  favoriteTags = computed(() => {
    const counts = new Map<string, number>();
    for (const post of this.favoritedPosts()) {
      for (const tag of post.tags ?? []) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  });

  filteredPosts = computed(() => {
    const colId = this.selectedCollectionId();
    const tag = this.selectedTag();
    const query = this.searchQuery().toLowerCase().trim();
    const userId = this.currentUser()?.id;

    let result = this.favoritedPosts();

    if (colId !== 'all' && userId) {
      result = result.filter(p =>
        p.post_favorites?.find(f => f.user_id === userId)?.collection_id === colId
      );
    }
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
    const userId = this.currentUser()?.id;
    if (userId) {
      await Promise.all([
        this.postService.loadFavoritedPosts(userId),
        this.collectionService.loadCollections(),
      ]);
    }
  }

  selectCollection(id: string | null | 'all') {
    this.selectedCollectionId.set(id);
    this.selectedTag.set(null);
  }

  selectTag(tag: string) {
    this.selectedTag.set(this.selectedTag() === tag ? null : tag);
  }

  getPostCollectionId(post: Post): string | null {
    const userId = this.currentUser()?.id;
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

  async createCollection() {
    const name = this.newCollectionName.trim();
    if (!name) return;
    await this.collectionService.createCollection(name);
    this.newCollectionName = '';
    this.showNewCollectionInput.set(false);
  }

  async deleteCollection(id: string) {
    if (this.selectedCollectionId() === id) {
      this.selectedCollectionId.set('all');
    }
    await this.collectionService.deleteCollection(id);
  }

  hasLiked(post: Post): boolean {
    const userId = this.currentUser()?.id;
    return !!userId && (post.post_likes?.some(l => l.user_id === userId) ?? false);
  }

  toggleLike(post: Post) {
    if (this.hasLiked(post)) {
      this.postService.unlikePost(post.id);
    } else {
      this.postService.likePost(post.id);
    }
  }

  toggleFavorite(post: Post) {
    this.postService.unfavoritePost(post.id);
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
