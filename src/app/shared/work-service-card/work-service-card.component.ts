import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type WorkServiceVariant = 'web' | 'music' | 'art';
export type WorkServiceIcon = 'web' | 'music' | 'art';

export interface WorkServiceCard {
  readonly variant: WorkServiceVariant;
  readonly index: string;
  readonly category: string;
  readonly title: string;
  readonly description: string;
  readonly services: readonly string[];
  readonly icon: WorkServiceIcon;
  readonly surfaceBackground?: string;
  readonly dark?: boolean;
  readonly imageSrc?: string;
  readonly imageAlt?: string;
}

@Component({
  selector: 'app-work-service-card',
  standalone: true,
  templateUrl: './work-service-card.component.html',
  styleUrls: ['./work-service-card.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkServiceCardComponent {
  @Input({ required: true }) card!: WorkServiceCard;
}
