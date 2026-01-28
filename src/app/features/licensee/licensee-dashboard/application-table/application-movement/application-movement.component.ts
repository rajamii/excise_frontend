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
  @Input() movementDataSource: MatTableDataSource<Transaction>;
  movementColumns: string[] = ['slNo', 'date', 'forwardedBy', 'forwardedTo', 'remarks'];

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
    const apps = Array.isArray(data.movementDataSource?.data)
      ? data.movementDataSource.data
      : [];

    // ✅ FIXED: Use application_id instead of applicationId
    const transactions: Transaction[] = apps.flatMap(app =>
      (app.transactions || []).map((txn: Transaction) => ({
        ...txn,
        applicationId: app.application_id, // Changed from app.applicationId
      }))
    );

    this.movementDataSource = new MatTableDataSource(transactions);
  }

  getRoleLabel(role: string): string {
    return this.roleDisplayMapping[role] || role || '-';
  }
}