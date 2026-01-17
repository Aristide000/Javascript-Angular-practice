// login-form.component.ts
import { Component } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-login-form',
  standalone: true,
  imports: [ReactiveFormsModule, NgIf, RouterModule],
  templateUrl: './login-form.html',
  styleUrls: ['./login-form.css']
})
export class LoginFormComponent {
  loginForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', Validators.required)
  });

  constructor(private router: Router) {}

  onSubmit() {
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const matchedUser = users.find((user: any) => user.email === email && user.password === password);

      if (matchedUser) {
        localStorage.setItem('auth', 'true');
        localStorage.setItem('role', matchedUser.role);
        this.router.navigate(['/user-list']);
      } else {
        alert('Invalid credentials');
      }
    }
  }
}
