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
    @Input() tableType: 'applied' | 'pending' | 'approved' | 'rejected' = 'applied';

    @Output() view = new EventEmitter<UnifiedApplication>();
    @Output() payment = new EventEmitter<UnifiedApplication>();
    @Output() print = new EventEmitter<UnifiedApplication>();

    unresolvedObjectionAppIds = new Set<string>();

    // Stage display mapping
    stageDisplayMapping: { [key: string]: string } = {
        'applied': 'Application Submitted',
        'pending': 'Under Review',
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
        private dialog: MatDialog
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
}
