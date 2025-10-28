import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../../shared/material.module';
import { WorkflowStage } from '../../../../../../core/models/workflow-stage.model';
import { WorkflowService } from '../../../../../../core/services/workflow.service';
import { WorkflowStageManageComponent } from '../manage/manage.component';

@Component({
  selector: 'app-workflow-stage-list',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class WorkflowStageListComponent implements OnInit {
  stages: WorkflowStage[] = [];
  displayedColumns: string[] = [
    'name',
    'workflow',
    'description',
    'is_initial',
    'is_final',
    'actions'
  ];

  constructor(
    private workflowService: WorkflowService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadStages();
  }

  loadStages(): void {
    this.workflowService.getWorkflowStages().subscribe({
      next: (data) => this.stages = data,
      error: () => Swal.fire('Error', 'Failed to load workflow stages.', 'error')
    });
  }

  onAdd(): void {
    const dialogRef = this.dialog.open(WorkflowStageManageComponent, {
      width: '500px',
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadStages();
    });
  }

  onEdit(stage: WorkflowStage): void {
    const dialogRef = this.dialog.open(WorkflowStageManageComponent, {
      width: '500px',
      data: stage
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadStages();
    });
  }

  onDelete(stage: WorkflowStage): void {
    Swal.fire({
      title: 'Are you sure?',
      text: `Delete stage "${stage.name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
    }).then(result => {
      if (result.isConfirmed && stage.id !== undefined) {
        this.workflowService.deleteWorkflowStage(stage.id).subscribe({
          next: () => {
            Swal.fire('Deleted!', 'Workflow stage deleted successfully.', 'success');
            this.loadStages();
          },
          error: () => Swal.fire('Error', 'Failed to delete workflow stage.', 'error')
        });
      }
    });
  }
}