import { Routes } from '@angular/router';
import { HeroComponent } from './user-list/hero.component';

export const routes: Routes = [
  {
    path: '',
    component: HeroComponent
  },
  {
    path: '**',
    redirectTo: ''
  }
];
