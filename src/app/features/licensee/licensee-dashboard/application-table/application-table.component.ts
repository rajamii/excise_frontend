import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { UnifiedApplication } from '../../../../core/models/unified-application.model';
import { ApplicationMovementComponent } from './application-movement/application-movement.component';
import { RoleService } from '../../../../core/services/role.service';

@Component({
    selector: 'app-application-table',
    standalone: true,
    imports: [
        CommonModule,
        MatTableModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
        MatDialogModule
    ],
    templateUrl: './application-table.component.html',
    styleUrls: ['./application-table.component.scss']
})
export class ApplicationTableComponent implements OnInit, OnChanges {
    @Input() dataSource: MatTableDataSource<UnifiedApplication> = new MatTableDataSource<UnifiedApplication>();
    @Input() displayedColumns: string[] = ['slNo', 'id', 'currentStage', 'remarks', 'performedBy', 'actions'];
    @Input() tableType: 'applied' | 'pending' | 'objection' | 'approved' | 'rejected' = 'applied';

    @Output() view = new EventEmitter<UnifiedApplication>();
    @Output() payment = new EventEmitter<UnifiedApplication>();
    @Output() print = new EventEmitter<UnifiedApplication>();

    unresolvedObjectionAppIds = new Set<string>();

    // Stage display mapping
    stageDisplayMapping: { [key: string]: string } = {
        'applied': 'Application Submitted',
        'pending': 'Under Review',
        'objection': 'Objection Raised',
        'awaiting_payment': 'Awaiting Payment',
        'approved': 'Approved',
        'rejected': 'Rejected',
        'permit_section_review': 'Permit Section Review',
        'commissioner_review': 'Commissioner Review',
        'it_cell_review': 'IT Cell Review'
    };

    // Role display mapping
    roleDisplayMapping: { [key: string]: string } = {
        'site_admin': 'Site Administrator',
        'licensee': 'Licensee',
        'permit_section': 'Permit Section',
        'commissioner': 'Commissioner',
        'it_cell': 'IT Cell',
        'officer_in_charge': 'Officer In Charge'
    };

    constructor(
        private router: Router,
        private dialog: MatDialog,
        private roleService: RoleService
    ) { }

    ngOnInit(): void {
        // Initialize component
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['dataSource']) {
            // Handle dataSource changes
        }
    }

    hasData(): boolean {
        return this.dataSource && this.dataSource.data && this.dataSource.data.length > 0;
    }

    getApplicationId(element: UnifiedApplication): string {
        return element?.applicationId || '';
    }

    getCurrentStage(element: UnifiedApplication): string {
        if (element?.transactions && element.transactions.length > 0) {
            const lastTransaction = element.transactions[element.transactions.length - 1];
            return lastTransaction?.stage || lastTransaction?.current_stage || element?.currentStage || 'pending';
        }
        return element?.currentStage || 'pending';
    }

    getCurrentStageDisplay(element: UnifiedApplication): string {
        const raw = String(this.getCurrentStage(element) || '').trim();
        const normalized = raw.toLowerCase().replace(/\s+/g, '_');

        if (this.isLicenseeUser()) {
            if (normalized.includes('awaiting_payment') || normalized.includes('payment')) return 'Awaiting Payment';
            if (normalized.includes('approved')) return 'Approved';
            if (normalized.includes('reject')) return 'Rejected';
            return 'Pending';
        }

        return this.stageDisplayMapping[normalized] || this.stageDisplayMapping[raw] || raw || 'N/A';
    }

    getLatestRemarks(element: UnifiedApplication): string {
        if (element?.transactions && element.transactions.length > 0) {
            const lastTransaction = element.transactions[element.transactions.length - 1];
            return lastTransaction?.remarks || '';
        }
        return '';
    }

    getPerformedByUsername(element: UnifiedApplication): string {
        if (element?.transactions && element.transactions.length > 0) {
            const lastTransaction = element.transactions[element.transactions.length - 1];
            return lastTransaction?.performed_by?.username || lastTransaction?.performedBy?.username || 'System';
        }
        return 'System';
    }

    getPerformedByRole(element: UnifiedApplication): string {
        if (element?.transactions && element.transactions.length > 0) {
            const lastTransaction = element.transactions[element.transactions.length - 1];
            return lastTransaction?.performed_by?.role || lastTransaction?.performedBy?.role || 'unknown';
        }
        return 'unknown';
    }

    getLatestTimestamp(element: UnifiedApplication): Date | null {
        if (element?.transactions && element.transactions.length > 0) {
            const lastTransaction = element.transactions[element.transactions.length - 1];
            return lastTransaction?.timestamp ? new Date(lastTransaction.timestamp) : null;
        }
        return null;
    }

    isAwaitingPayment(element: UnifiedApplication): boolean {
        const stage = this.getCurrentStage(element);
        return stage === 'awaiting_payment' || stage === 'awaiting payment';
    }

    onView(element: UnifiedApplication): void {
        this.view.emit(element);
    }

    onPayment(element: UnifiedApplication): void {
        this.payment.emit(element);
    }

    onPrint(element: UnifiedApplication): void {
        this.print.emit(element);
    }

    viewMovement(element: UnifiedApplication): void {
        this.dialog.open(ApplicationMovementComponent, {
            width: '700px',
            maxHeight: '80vh',
            data: { application: element }
        });
    }

    // Method to check if current user is licensee
    isLicenseeUser(): boolean {
        return this.roleService.isLicenseeRole();
    }

    // Method to check if View Timeline button should be shown
    shouldShowTimelineButton(): boolean {
        // Hide timeline button for licensee users in approved applications
        return !(this.tableType === 'approved' && this.isLicenseeUser());
    }
}
