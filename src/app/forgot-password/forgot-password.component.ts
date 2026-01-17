import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-forgot-password',
  standalone: true,                // 👈 mark as standalone
  imports: [FormsModule],          // 👈 import FormsModule
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css'],
})
export class ForgotPasswordComponent {
  onSubmit() {
    // Logic to send a password reset email
    console.log('Password reset email sent!');
  }
}
