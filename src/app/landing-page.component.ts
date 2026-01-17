import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="landing-container">
      <h2>Select Your Role</h2>
      <label for="role">Role:</label>
      <select [(ngModel)]="selectedRole" id="role" class="role-select">
        <option value="" disabled>Select a role</option>
        <option value="admin">Admin</option>
        <option value="user">User</option>
        <option value="guest">Guest</option>
      </select>
      <br /><br />
      <button (click)="navigateToLogin()" [disabled]="!selectedRole" class="continue-btn">Continue</button>
    </div>
  `,
  styles: [`
    .landing-container {
      max-width: 400px;
      margin: 100px auto;
      padding: 20px;
      text-align: center;
      background-color:rgba(255, 255, 255, 0.1);
      border: 1.5px solid #ffffff;
      color: white;
      border-radius: 8px;
    }

    .role-select {
      width: 100%;
      padding: 8px;
      margin-top: 8px;
      border-radius: 4px;
      border: 1px solidrgb(255, 255, 255);
      background-color: rgba(0, 0, 0, 0);
      color: white;
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      cursor: pointer;
    }

    .role-select option {
      background-color:rgba(0, 0, 0, 1);
      color: white;
    }

    .continue-btn {
      width: 100%;
      padding: 10px;
      margin-top: 8px;
      background-color: #ff7f00; 
      color: white;
      border: none;
      border-radius: 4px;
      font-weight: bold;
      cursor: pointer;
      transition: background-color 0.3s ease;
    }

    .continue-btn:disabled {
      background-color:  #e67300;
      cursor: not-allowed;
    }

    .continue-btn:not(:disabled):hover {
      background-color:rgb(238, 78, 29); 
    }
  `]
})
export class LandingPageComponent {
  selectedRole: string = '';

  constructor(private router: Router) {}

  navigateToLogin() {
    this.router.navigate(['/login'], { queryParams: { role: this.selectedRole } });
  }
}
