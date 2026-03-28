import { Routes } from '@angular/router';
import { LoginFormComponent } from './login-form/login-form.component';
import { HeroComponent } from './user-list/hero.component';

export const routes: Routes = [
  { path: '', redirectTo: 'hero', pathMatch: 'full' },
  { path: 'login', component: LoginFormComponent },
  { path: 'hero', component: HeroComponent }
];

