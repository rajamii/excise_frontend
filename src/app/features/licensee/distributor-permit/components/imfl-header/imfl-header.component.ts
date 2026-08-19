import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../../../shared/material.module';

export type ImflTabType = 'requisition' | 'revalidation' | 'cancellation';

@Component({
  selector: 'app-imfl-header',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './imfl-header.component.html',
  styleUrl: './imfl-header.component.scss'
})
export class ImflHeaderComponent {
  @Input() activeTab: ImflTabType = 'requisition';
  @Input() pendingCounts: Record<string, number> = {};
  @Input() isFormView = false;
  @Output() tabChange = new EventEmitter<ImflTabType>();
  @Output() applyNew = new EventEmitter<void>();

  selectTab(tab: ImflTabType): void {
    if (this.activeTab !== tab) {
      this.activeTab = tab;
      this.tabChange.emit(tab);
    }
  }

  onApplyNewClick(): void {
    this.applyNew.emit();
  }
}
