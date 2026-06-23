import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProfileService } from '../../core/services/profile.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-favorites',
  imports: [RouterLink],
  templateUrl: './favorites.html',
})
export class Favorites {
  private profileService = inject(ProfileService);
  private auth = inject(AuthService);

  profile = this.profileService.profile;
  currentUser = this.auth.currentUser;
}
