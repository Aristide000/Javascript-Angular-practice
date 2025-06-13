import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoginFormComponent } from './login-form/login-form.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [LoginFormComponent],  
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  title = 'angular-forms-demo';  
}
