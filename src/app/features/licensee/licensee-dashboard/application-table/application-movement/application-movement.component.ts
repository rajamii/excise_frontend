import { Component, Inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource } from '@angular/material/table';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MaterialModule } from '../../../../../shared/material.module';
import { LicenseApplication, Transaction } from '../../../../../core/models/license-application.model';

@Component({
  selector: 'app-application-movement',
  standalone: true,
  imports: [MaterialModule, CommonModule],
  templateUrl: './application-movement.component.html',
  styleUrl: './application-movement.component.scss',
})
export class ApplicationMovementComponent {
  @Input() movementDataSource: MatTableDataSource<Transaction>;
  movementColumns: string[] = ['slNo', 'date', 'performedBy', 'forwardedBy', 'forwardedTo', 'remarks'];
  applicationRef: string = '';
  totalSteps: number = 0;

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: { movementDataSource?: { data: LicenseApplication[] }; application?: any }
  ) {
    let apps: any[] = [];
    if (data?.movementDataSource?.data) {
      apps = Array.isArray(data.movementDataSource.data) ? data.movementDataSource.data : [data.movementDataSource.data];
    } else if (data?.application) {
      apps = Array.isArray(data.application) ? data.application : [data.application];
    }

    const firstApp = apps[0];
    if (firstApp) {
      this.applicationRef = firstApp.application_id || firstApp.applicationId || firstApp.reference_no || firstApp.referenceNo || '';
    }

    const transactions: Transaction[] = apps.flatMap(app =>
      (app.transactions || app.movement_history || []).map((txn: Transaction) => ({
        ...txn,
        applicationId: app.application_id || app.applicationId,
      }))
    );

    // Sort ascending by timestamp (oldest first — shows the journey from submission to current stage)
    transactions.sort((a: any, b: any) => {
      const tA = new Date(a.timestamp || a.created_at || 0).getTime();
      const tB = new Date(b.timestamp || b.created_at || 0).getTime();
      return tA - tB;
    });

    this.totalSteps = transactions.length;
    this.movementDataSource = new MatTableDataSource(transactions);
  }

  /** Returns the display name for a performed_by user object */
  getPerformedByName(txn: any): string {
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
    if (txn?.forwarded_by_name) return txn.forwarded_by_name;

    const role = txn?.forwarded_by || txn?.forwardedBy;
    if (!role) return '-';

    return String(role.name || role.roleName || '').trim() || '-';
  }

  /** Returns the display name for a forwarded_to role object */
  getForwardedToName(txn: any): string {
    if (txn?.forwarded_to_name) return txn.forwarded_to_name;

    const role = txn?.forwarded_to || txn?.forwardedTo;
    if (!role) return '-';

    return String(role.name || role.roleName || '').trim() || '-';
  }

  /** Returns 1-2 letter initials for the user avatar */
  getUserInitials(name: string): string {
    if (!name || name === '-') return 'U';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  /** Returns semantic category for remark badge */
  getRemarkType(remarks: string | undefined | null): 'approved' | 'rejected' | 'objection' | 'forwarded' | 'neutral' {
    if (!remarks) return 'neutral';
    const lower = remarks.toLowerCase();
    if (lower.includes('reject') || lower.includes('suspend') || lower.includes('terminat') || lower.includes('cancel')) {
      return 'rejected';
    }
    if (lower.includes('approv') || lower.includes('verified') || lower.includes('passed') || lower.includes('success')) {
      return 'approved';
    }
    if (lower.includes('object') || lower.includes('clarif') || lower.includes('quer') || lower.includes('rectif')) {
      return 'objection';
    }
    if (lower.includes('forward') || lower.includes('submit') || lower.includes('transfer') || lower.includes('level')) {
      return 'forwarded';
    }
    return 'neutral';
  }
}