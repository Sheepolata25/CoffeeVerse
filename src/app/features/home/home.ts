import { Component, inject, OnInit, Signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Profile } from '../../core/models/profile.model';
import { ProfileService } from '../../core/services/profile.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  private profileService = inject(ProfileService);

  profile: Signal<Profile | null> = this.profileService.profile;

  async ngOnInit() {
    if (!this.profile()) {
      await this.profileService.loadProfile();
    }
  }
}
