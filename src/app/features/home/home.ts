import { Component, inject, Signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Profile } from '../../core/models/profile.model';
import { ProfileService } from '../../core/services/profile.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private profileService = inject(ProfileService);

  profile: Signal<Profile | null> = this.profileService.profile;
}
