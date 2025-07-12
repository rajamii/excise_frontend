import { Component, Inject, Input } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MaterialModule } from '../../../../../shared/material.module';
import { LicenseApplication, Transaction } from '../../../../../core/models/license-application.model';

@Component({
  selector: 'app-application-movement',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './application-movement.component.html',
  styleUrl: './application-movement.component.scss',
})
export class ApplicationMovementComponent {
  // Input to allow setting the data source from outside if needed
  @Input() movementDataSource: MatTableDataSource<Transaction>;

  // Column definitions used by the mat-table in the template
  movementColumns: string[] = ['slNo', 'date', 'forwardedBy', 'forwardedTo', 'remarks'];

  // Mapping of role identifiers to human-readable labels
  private readonly roleDisplayMapping: Record<string, string> = {
    licensee: 'Licensee',
    level_1: 'Level 1',
    level_2: 'Level 2',
    level_3: 'Level 3',
    level_4: 'Level 4',
    level_5: 'Level 5',
  };

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: { movementDataSource: { data: LicenseApplication[] } }
  ) {
    // Extract transactions from all applications passed in dialog data
    const apps = Array.isArray(data.movementDataSource?.data)
      ? data.movementDataSource.data
      : [];

    // Flatten transactions from all applications and add the application ID to each
    const transactions: Transaction[] = apps.flatMap(app =>
      (app.transactions || []).map(txn => ({
        ...txn,
        applicationId: app.applicationId,
      }))
    ) //.reverse(); // Reverse to show latest transaction first

    // Initialize data source for the mat-table
    this.movementDataSource = new MatTableDataSource(transactions);
  }

  // Get human-readable role label from the mapping
  getRoleLabel(role: string): string {
    return this.roleDisplayMapping[role] || role || '-';
  }
}
