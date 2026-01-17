import { Component, AfterViewInit } from '@angular/core';
import {
  FormGroup,
  FormControl,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

// Import particles.js for background animation
import 'particles.js';
declare const particlesJS: any;

@Component({
  selector: 'app-signup-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule],
  templateUrl: './signup-form.component.html',
  styleUrls: ['./signup-form.css']
})
export class SignupFormComponent implements AfterViewInit {
  signupForm = new FormGroup({
    name: new FormControl('', Validators.required),
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', Validators.required),
    role: new FormControl('', Validators.required)
  });

  constructor(private router: Router) {}

  ngAfterViewInit(): void {
    // Initialize UKDevilz-style interactive background
    particlesJS('particles-js', {
      particles: {
        number: { value: 100 },
        color: { value: '#000000ff' }, // neon red "Devilz" look
        shape: { type: 'circle' },
        opacity: { value: 0.5, random: true },
        size: { value: 3, random: true },
        line_linked: {
          enable: true,
          distance: 150,
          color: '#000000ff',
          opacity: 0.3,
          width: 1
        },
        move: { enable: true, speed: 2, out_mode: 'out' }
      },
      interactivity: {
        events: {
          onhover: { enable: true, mode: 'grab' },
          onclick: { enable: true, mode: 'push' }
        },
        modes: {
          grab: { distance: 200, line_linked: { opacity: 0.6 } },
          push: { particles_nb: 4 }
        }
      },
      retina_detect: true
    });
  }

  get f() {
    return this.signupForm.controls;
  }

  onSubmit() {
    if (this.signupForm.valid) {
      console.log(this.signupForm.value);
      const name = this.signupForm.value.name?.trim() || '';
      const email = this.signupForm.value.email?.trim() || '';
      const password = this.signupForm.value.password || '';
      const role = this.signupForm.value.role || '';

      const newUser = { name, email, password, role };
      const users = JSON.parse(localStorage.getItem('users') || '[]');

      if (users.some((user: any) => user.email === email)) {
        alert('An account with this email already exists.');
        return;
      }

      users.push(newUser);
      localStorage.setItem('users', JSON.stringify(users));

      alert('Account created successfully!');
      this.signupForm.reset();

      this.router.navigate(['/login']);
    } else {
      this.signupForm.markAllAsTouched();
    }
  }
}
