import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { PostService } from '../../core/services/post.service';

@Component({
  selector: 'app-posts',
  imports: [FormsModule, DatePipe],
  templateUrl: './posts.html',
  styleUrl: './posts.css',
})
export class Posts implements OnInit {
  private postService = inject(PostService);

  posts = this.postService.posts;
  submitting = signal(false);
  error = signal('');

  form: {
    title: string;
    description: string;
    machine_brand: string;
    grinder_brand: string;
    coffee_brand: string;
    bean_type: string;
    water_temp: number | null;
  } = {
    title: '',
    description: '',
    machine_brand: '',
    grinder_brand: '',
    coffee_brand: '',
    bean_type: '',
    water_temp: null,
  };

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
      this.form = {
        title: '',
        description: '',
        machine_brand: '',
        grinder_brand: '',
        coffee_brand: '',
        bean_type: '',
        water_temp: null,
      };
    }
  }
}
