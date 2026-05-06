import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { PostService } from '../../core/services/post.service';
import { AuthService } from '../../core/services/auth.service';
import { StorageService } from '../../core/services/storage.service';
import { Post } from '../../core/models/post.model';

type PostForm = {
  title: string;
  description: string;
  machine_brand: string;
  grinder_brand: string;
  coffee_brand: string;
  bean_type: string;
  water_temp: number | null;
};

const emptyForm = (): PostForm => ({
  title: '',
  description: '',
  machine_brand: '',
  grinder_brand: '',
  coffee_brand: '',
  bean_type: '',
  water_temp: null,
});

@Component({
  selector: 'app-posts',
  imports: [FormsModule, DatePipe],
  templateUrl: './posts.html',
  styleUrl: './posts.css',
})
export class Posts implements OnInit {
  private postService = inject(PostService);
  private auth = inject(AuthService);
  private storage = inject(StorageService);

  posts = this.postService.posts;
  currentUserId = this.auth.currentUser;

  submitting = signal(false);
  savingDraft = signal(false);
  error = signal('');

  editingPostId = signal<string | null>(null);
  editSaving = signal(false);

  editingDraftId = signal<string | null>(null);
  drafts = signal<Post[]>([]);

  form: PostForm = emptyForm();
  editForm: PostForm = emptyForm();

  // Image for the create/draft form
  imageFile: File | null = null;
  imagePreview = signal<string | null>(null);

  // Tags for the create/draft form
  formTags = signal<string[]>([]);
  formTagInput = '';
  allTags = signal<string[]>([]);
  showSuggestions = signal(false);

  // Image for the inline post edit form
  editImageFile: File | null = null;
  editImagePreview = signal<string | null>(null);

  // Tags for the inline post edit form
  editTags = signal<string[]>([]);
  editTagInput = '';

  async ngOnInit() {
    await this.postService.loadPosts();
    this.allTags.set(await this.postService.loadAllTags());
    const userId = this.auth.currentUser()?.id;
    if (userId) {
      this.drafts.set(await this.postService.loadUserDrafts(userId));
    }
  }

  get formTagSuggestions(): string[] {
    const input = this.formTagInput.trim().toLowerCase();
    if (!input) return [];
    return this.allTags().filter(t =>
      t.toLowerCase().includes(input) && !this.formTags().includes(t)
    ).slice(0, 6);
  }

  get editTagSuggestions(): string[] {
    const input = this.editTagInput.trim().toLowerCase();
    if (!input) return [];
    return this.allTags().filter(t =>
      t.toLowerCase().includes(input) && !this.editTags().includes(t)
    ).slice(0, 6);
  }

  onImageSelect(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.imageFile = file;
    const reader = new FileReader();
    reader.onload = e => this.imagePreview.set(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  removeImage() {
    this.imageFile = null;
    this.imagePreview.set(null);
  }

  addFormTag(tag?: string) {
    const value = (tag ?? this.formTagInput).trim().toLowerCase().replace(/\s+/g, '-');
    if (value && !this.formTags().includes(value)) {
      this.formTags.update(tags => [...tags, value]);
    }
    this.formTagInput = '';
    this.showSuggestions.set(false);
  }

  removeFormTag(tag: string) {
    this.formTags.update(tags => tags.filter(t => t !== tag));
  }

  onFormTagKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.addFormTag();
    } else if (event.key === 'Backspace' && !this.formTagInput && this.formTags().length) {
      this.formTags.update(tags => tags.slice(0, -1));
    }
  }

  addEditTag(tag?: string) {
    const value = (tag ?? this.editTagInput).trim().toLowerCase().replace(/\s+/g, '-');
    if (value && !this.editTags().includes(value)) {
      this.editTags.update(tags => [...tags, value]);
    }
    this.editTagInput = '';
  }

  removeEditTag(tag: string) {
    this.editTags.update(tags => tags.filter(t => t !== tag));
  }

  onEditTagKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.addEditTag();
    } else if (event.key === 'Backspace' && !this.editTagInput && this.editTags().length) {
      this.editTags.update(tags => tags.slice(0, -1));
    }
  }

  private async uploadPostImage(): Promise<string | null> {
    if (!this.imageFile) return null;
    const userId = this.auth.currentUser()?.id;
    const ext = this.imageFile.name.split('.').pop();
    const path = `posts/${userId}/${Date.now()}.${ext}`;
    const { url, error } = await this.storage.upload('post-images', path, this.imageFile);
    if (error) throw new Error('Image upload failed');
    return url;
  }

  private buildFields(imageUrl: string | null = null): Parameters<PostService['createPost']>[0] {
    return {
      title: this.form.title.trim(),
      description: this.form.description.trim(),
      image_url: imageUrl,
      machine_brand: this.form.machine_brand.trim() || null,
      grinder_brand: this.form.grinder_brand.trim() || null,
      coffee_brand: this.form.coffee_brand.trim() || null,
      bean_type: this.form.bean_type.trim() || null,
      water_temp: this.form.water_temp,
      tags: this.formTags(),
    };
  }

  private resetForm() {
    this.form = emptyForm();
    this.formTags.set([]);
    this.formTagInput = '';
    this.imageFile = null;
    this.imagePreview.set(null);
    this.editingDraftId.set(null);
  }

  loadDraftForEdit(draft: Post) {
    this.editingDraftId.set(draft.id);
    this.form = {
      title: draft.title,
      description: draft.description,
      machine_brand: draft.machine_brand ?? '',
      grinder_brand: draft.grinder_brand ?? '',
      coffee_brand: draft.coffee_brand ?? '',
      bean_type: draft.bean_type ?? '',
      water_temp: draft.water_temp,
    };
    this.formTags.set([...(draft.tags ?? [])]);
    this.formTagInput = '';
    this.imageFile = null;
    this.imagePreview.set(draft.image_url);
  }

  cancelDraftEdit() {
    this.resetForm();
  }

  async submit() {
    if (!this.form.title.trim() || !this.form.description.trim()) return;
    this.submitting.set(true);
    this.error.set('');

    try {
      const imageUrl = await this.uploadPostImage();
      const draftId = this.editingDraftId();

      if (draftId) {
        await this.postService.updatePost(draftId, this.buildFields(imageUrl ?? this.imagePreview()));
        const { error } = await this.postService.publishDraft(draftId);
        if (error) { this.error.set(error.message); return; }
        this.drafts.update(drafts => drafts.filter(d => d.id !== draftId));
      } else {
        const { error } = await this.postService.createPost(this.buildFields(imageUrl), 'published');
        if (error) { this.error.set(error.message); return; }
      }

      this.resetForm();
      this.allTags.set(await this.postService.loadAllTags());
    } catch (e: any) {
      this.error.set(e.message);
    } finally {
      this.submitting.set(false);
    }
  }

  async saveDraft() {
    if (!this.form.title.trim()) return;
    this.savingDraft.set(true);
    this.error.set('');

    try {
      const imageUrl = await this.uploadPostImage();
      const draftId = this.editingDraftId();

      if (draftId) {
        const { error } = await this.postService.updatePost(draftId, this.buildFields(imageUrl ?? this.imagePreview()));
        if (error) { this.error.set(error.message); return; }
        this.drafts.update(drafts =>
          drafts.map(d => d.id === draftId ? { ...d, ...this.buildFields(imageUrl ?? this.imagePreview()) } : d)
        );
      } else {
        const { data, error } = await this.postService.createPost(this.buildFields(imageUrl), 'draft');
        if (error) { this.error.set(error.message); return; }
        if (data) this.drafts.update(drafts => [data as Post, ...drafts]);
      }

      this.resetForm();
    } catch (e: any) {
      this.error.set(e.message);
    } finally {
      this.savingDraft.set(false);
    }
  }

  async publishDraft(draft: Post) {
    const { error } = await this.postService.publishDraft(draft.id);
    if (!error) this.drafts.update(drafts => drafts.filter(d => d.id !== draft.id));
  }

  async deleteDraft(id: string) {
    const { error } = await this.postService.deletePost(id);
    if (!error) {
      this.drafts.update(drafts => drafts.filter(d => d.id !== id));
      if (this.editingDraftId() === id) this.resetForm();
    }
  }

  onEditImageSelect(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.editImageFile = file;
    const reader = new FileReader();
    reader.onload = e => this.editImagePreview.set(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  removeEditImage() {
    this.editImageFile = null;
    this.editImagePreview.set(null);
  }

  startEdit(post: Post) {
    this.editingPostId.set(post.id);
    this.editForm = {
      title: post.title,
      description: post.description,
      machine_brand: post.machine_brand ?? '',
      grinder_brand: post.grinder_brand ?? '',
      coffee_brand: post.coffee_brand ?? '',
      bean_type: post.bean_type ?? '',
      water_temp: post.water_temp,
    };
    this.editTags.set([...(post.tags ?? [])]);
    this.editTagInput = '';
    this.editImageFile = null;
    this.editImagePreview.set(post.image_url);
  }

  cancelEdit() {
    this.editingPostId.set(null);
  }

  async saveEdit(postId: string) {
    if (!this.editForm.title.trim() || !this.editForm.description.trim()) return;
    this.editSaving.set(true);

    let imageUrl = this.editImagePreview();
    if (this.editImageFile) {
      const userId = this.auth.currentUser()?.id;
      const ext = this.editImageFile.name.split('.').pop();
      const path = `posts/${userId}/${Date.now()}.${ext}`;
      const { url } = await this.storage.upload('post-images', path, this.editImageFile);
      imageUrl = url;
    }

    await this.postService.updatePost(postId, {
      title: this.editForm.title.trim(),
      description: this.editForm.description.trim(),
      image_url: imageUrl,
      machine_brand: this.editForm.machine_brand.trim() || null,
      grinder_brand: this.editForm.grinder_brand.trim() || null,
      coffee_brand: this.editForm.coffee_brand.trim() || null,
      bean_type: this.editForm.bean_type.trim() || null,
      water_temp: this.editForm.water_temp,
      tags: this.editTags(),
    });

    this.editSaving.set(false);
    this.editingPostId.set(null);
    this.editImageFile = null;
    this.allTags.set(await this.postService.loadAllTags());
  }

  async deletePost(id: string) {
    await this.postService.deletePost(id);
  }
}
