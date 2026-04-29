import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { PostService } from '../../core/services/post.service';
import { AuthService } from '../../core/services/auth.service';
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

  posts = this.postService.posts;
  currentUserId = this.auth.currentUser;

  submitting = signal(false);
  error = signal('');

  editingPostId = signal<string | null>(null);
  editSaving = signal(false);

  form: PostForm = emptyForm();
  editForm: PostForm = emptyForm();

  async ngOnInit() {
    await this.postService.loadPosts();
  }

  async submit() {
    if (!this.form.title.trim() || !this.form.description.trim()) return;

    this.submitting.set(true);
    this.error.set('');

    const { error } = await this.postService.createPost({
      title: this.form.title.trim(),
      description: this.form.description.trim(),
      machine_brand: this.form.machine_brand.trim() || null,
      grinder_brand: this.form.grinder_brand.trim() || null,
      coffee_brand: this.form.coffee_brand.trim() || null,
      bean_type: this.form.bean_type.trim() || null,
      water_temp: this.form.water_temp,
    });

    this.submitting.set(false);

    if (error) {
      this.error.set(error.message);
    } else {
      this.form = emptyForm();
    }
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
  }

  cancelEdit() {
    this.editingPostId.set(null);
  }

  async saveEdit(postId: string) {
    if (!this.editForm.title.trim() || !this.editForm.description.trim()) return;

    this.editSaving.set(true);

    await this.postService.updatePost(postId, {
      title: this.editForm.title.trim(),
      description: this.editForm.description.trim(),
      machine_brand: this.editForm.machine_brand.trim() || null,
      grinder_brand: this.editForm.grinder_brand.trim() || null,
      coffee_brand: this.editForm.coffee_brand.trim() || null,
      bean_type: this.editForm.bean_type.trim() || null,
      water_temp: this.editForm.water_temp,
    });

    this.editSaving.set(false);
    this.editingPostId.set(null);
  }

  async deletePost(id: string) {
    await this.postService.deletePost(id);
  }
}
