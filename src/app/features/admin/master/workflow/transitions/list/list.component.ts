import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../../shared/material.module';
import { WorkflowTransition } from '../../../../../../core/models/workflow-transition.model';
import { WorkflowService } from '../../../../../../core/services/workflow.service';
import { WorkflowTransitionManageComponent } from '../manage/manage.component';
import { WorkflowStage } from '../../../../../../core/models/workflow-stage.model';

@Component({
  selector: 'app-workflow-transition-list',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class WorkflowTransitionListComponent implements OnInit {
  transitions: WorkflowTransition[] = [];
  displayedColumns: string[] = [
    'workflow',
    'from_stage',
    'to_stage',
    'condition',
    'actions'
  ];

  constructor(
    private workflowService: WorkflowService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadTransitions();
  }

  loadTransitions(): void {
    this.workflowService.getWorkflowTransitions().subscribe({
      next: (data) => this.transitions = data,
      error: () => Swal.fire('Error', 'Failed to load workflow transitions.', 'error')
    });
  }

  onAdd(): void {
    const dialogRef = this.dialog.open(WorkflowTransitionManageComponent, {
      width: '500px',
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadTransitions();
    });
  }

  onEdit(transition: WorkflowTransition): void {
    const dialogRef = this.dialog.open(WorkflowTransitionManageComponent, {
      width: '500px',
      data: transition
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadTransitions();
    });
  }

  onDelete(transition: WorkflowTransition): void {
    Swal.fire({
      title: 'Are you sure?',
      text: `Delete transition from "${(transition.from_stage as WorkflowStage)?.name}" to "${(transition.to_stage as WorkflowStage)?.name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
    }).then(result => {
      if (result.isConfirmed && transition.id !== undefined) {
        this.workflowService.deleteWorkflowTransition(transition.id).subscribe({
          next: () => {
            Swal.fire('Deleted!', 'Workflow transition deleted successfully.', 'success');
            this.loadTransitions();
          },
          error: () => Swal.fire('Error', 'Failed to delete workflow transition.', 'error')
        });
      }
    });
  }
}