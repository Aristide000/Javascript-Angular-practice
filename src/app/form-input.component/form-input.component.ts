import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-form-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './form-input.component.html',
  styleUrls: ['./form-input.component.css']
})
export class FormInputComponent {
  @Input() label!: string;
  @Input() control!: FormControl;
  @Input() type: string = 'text';

  get errorMessage() {
    if (this.control?.hasError('required')) return `${this.label} is required`;
    if (this.control?.hasError('email')) return 'Invalid email format';
    return '';
  }
}
