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
  movementColumns: string[] = ['slNo', 'date', 'performedBy', 'forwardedBy', 'forwardedTo', 'remarks'];

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: { movementDataSource: { data: LicenseApplication[] } }
  ) {
    const apps = Array.isArray(data.movementDataSource?.data)
      ? data.movementDataSource.data
      : [];

    const transactions: Transaction[] = apps.flatMap(app =>
      (app.transactions || []).map((txn: Transaction) => ({
        ...txn,
        applicationId: app.application_id,
      }))
    );

    // Sort ascending by timestamp (oldest first — shows the journey from submission to current stage)
    transactions.sort((a: any, b: any) => {
      const tA = new Date(a.timestamp || 0).getTime();
      const tB = new Date(b.timestamp || 0).getTime();
      return tA - tB;
    });

    this.movementDataSource = new MatTableDataSource(transactions);
  }

  /** Returns the display name for a performed_by user object */
  getPerformedByName(txn: any): string {
    // Try the pre-computed name field first (from backend serializer)
    if (txn?.performed_by_name) return txn.performed_by_name;

    const user = txn?.performed_by || txn?.performedBy;
    if (!user) return '-';

    const parts = [
      String(user.firstName || user.first_name || '').trim(),
      String(user.middleName || user.middle_name || '').trim(),
      String(user.lastName || user.last_name || '').trim(),
    ].filter(Boolean);

    return parts.join(' ') || String(user.username || '').trim() || '-';
  }

  /** Returns the display name for a forwarded_by role object */
  getForwardedByName(txn: any): string {
    // Try the pre-computed name field first
    if (txn?.forwarded_by_name) return txn.forwarded_by_name;

    const role = txn?.forwarded_by || txn?.forwardedBy;
    if (!role) return '-';

    return String(role.name || role.roleName || '').trim() || '-';
  }

  /** Returns the display name for a forwarded_to role object */
  getForwardedToName(txn: any): string {
    // Try the pre-computed name field first
    if (txn?.forwarded_to_name) return txn.forwarded_to_name;

    const role = txn?.forwarded_to || txn?.forwardedTo;
    if (!role) return '-';

    return String(role.name || role.roleName || '').trim() || '-';
  }
}