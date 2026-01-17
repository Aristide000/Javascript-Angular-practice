import { Routes } from '@angular/router';
import { LoginFormComponent } from './login-form/login-form.component';
import { UserListComponent } from './user-list/user-list.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginFormComponent },
  { path: 'users', component: UserListComponent }
];
