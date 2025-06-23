import { Component, Inject, Input } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MaterialModule } from '../../../../../shared/material.module';
import { MovementTransaction, ApplicationWithTransactions } from '../../../../../core/models/application-movement.model';

@Component({
  selector: 'app-application-movement',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './application-movement.component.html',
  styleUrl: './application-movement.component.scss',
})
export class ApplicationMovementComponent {
  @Input() movementDataSource: MatTableDataSource<MovementTransaction>;
  movementColumns: string[] = ['slNo', 'date', 'forwardedBy', 'forwardedTo', 'remarks'];

  private readonly roleDisplayMapping: Record<string, string> = {
    licensee: 'Licensee',
    level_1: 'Level 1',
    level_2: 'Level 2',
    level_3: 'Level 3',
    level_4: 'Level 4',
    level_5: 'Level 5',

    rejected_by_level_1: 'Rejected by Level 1',
    rejected_by_level_2: 'Rejected by Level 2',
    rejected_by_level_3: 'Rejected by Level 3',
    rejected_by_level_4: 'Rejected by Level 4',
    rejected_by_level_5: 'Rejected by Level 5',

    level_1_objection: 'Objection by Level 1',
    level_2_objection: 'Objection by Level 2',
    level_3_objection: 'Objection by Level 3',
    level_4_objection: 'Objection by Level 4',
    level_5_objection: 'Objection by Level 5',

    approved: 'Approved',
    rejected: 'Application Rejected',
  };

  constructor(@Inject(MAT_DIALOG_DATA) public data: { movementDataSource: { data: ApplicationWithTransactions[] } }) {
    const apps = Array.isArray(data.movementDataSource?.data)
      ? data.movementDataSource.data
      : [];

    const transactions: MovementTransaction[] = apps.flatMap(app =>
      (app.transactions || []).map(txn => ({
        ...txn,
        applicationId: app.application_id,
      }))
    ).reverse();

    this.movementDataSource = new MatTableDataSource(transactions);
  }

  getRoleLabel(role: string): string {
    return this.roleDisplayMapping[role] || role || 'N/A';
  }
}
