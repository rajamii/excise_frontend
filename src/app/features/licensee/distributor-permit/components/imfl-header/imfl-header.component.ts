import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { MaterialModule } from '../../../../../shared/material.module';

export type ImflTabType = 'requisition' | 'brand-arrival' | 'revalidation' | 'cancellation' | 'brand-warehouse';

@Component({
  selector: 'app-imfl-header',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './imfl-header.component.html',
  styleUrl: './imfl-header.component.scss'
})
export class ImflHeaderComponent {
  private readonly location = inject(Location);

  @Input() activeTab: ImflTabType = 'requisition';
  @Input() pendingCounts: Record<string, number> = {};
  @Input() isFormView = false;
  @Input() isOfficer = false;
  @Input() customTitle = '';
  @Output() tabChange = new EventEmitter<ImflTabType>();
  @Output() applyNew = new EventEmitter<void>();
  @Output() viewArrivals = new EventEmitter<void>();
  @Output() backClick = new EventEmitter<void>();

  selectTab(tab: ImflTabType): void {
    if (this.activeTab !== tab) {
      this.activeTab = tab;
      this.tabChange.emit(tab);
    }
  }

  onApplyNewClick(): void {
    this.applyNew.emit();
  }

  onViewArrivalsClick(): void {
    this.viewArrivals.emit();
  }

  onBackClick(): void {
    if (this.backClick.observed) {
      this.backClick.emit();
    } else {
      this.location.back();
    }
  }
}
