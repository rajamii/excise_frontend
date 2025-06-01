import { Component, Inject, Input } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { ApplicationStage } from '../../../../core/models/dashboard.model';
import { LicenseApplicationService } from '../../../../core/services/license-application.service';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MaterialModule } from '../../../../shared/material.module';

@Component({
  selector: 'app-application-movement',
  imports: [MaterialModule],
  templateUrl: './application-movement.component.html',
  styleUrl: './application-movement.component.scss'
})
export class ApplicationMovementComponent {
  @Input() movementDataSource: MatTableDataSource<any>;
  movementColumns: string[] = ['slNo', 'date', 'forwardedBy', 'forwardedTo', 'remarks'];

  roleDisplayMapping: { [key: string]: string } = {
    level_1: 'Level 1',
    level_2: 'Level 2',
    licensee: 'Licensee',
    approved: 'Approved',
    rejected_by_level_1: 'Rejected by Level 1',
    rejected_by_level_2: 'Rejected by Level 2'
  };

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {
    const sourceArray = Array.isArray(data.movementDataSource?.data)
      ? data.movementDataSource.data
      : [];

    const flattenedTransactions: any[] = [];

    for (const app of sourceArray) {
      for (const transaction of app.transactions || []) {
        flattenedTransactions.push({
          ...transaction,
          applicationId: app.application_id
        });
      }
    }

    // Reverse the transactions to show the latest one first
    flattenedTransactions.reverse();

    this.movementDataSource = new MatTableDataSource(flattenedTransactions);
  }
}
