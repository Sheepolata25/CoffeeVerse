import { Routes } from '@angular/router';
import { MainLayout } from './layout/main-layout/main-layout';
import { Home } from './features/home/home';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then(m => m.Login),
  },
  {
    path: 'signup',
    loadComponent: () => import('./features/auth/signup/signup').then(m => m.Signup),
  },
  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    children: [
      { path: '', component: Home },
      { path: 'posts', loadComponent: () => import('./features/posts/posts').then(m => m.Posts) },
      { path: 'profile', loadComponent: () => import('./features/profile/profile').then(m => m.ProfilePage) },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
