import { Component, Inject, OnInit } from '@angular/core';
import { MaterialModule } from '../../../../../../shared/material.module';
import Swal from 'sweetalert2';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { WorkflowStage } from '../../../../../../core/models/workflow-stage.model';
import { WorkflowService } from '../../../../../../core/services/workflow.service';
import { Workflow } from '../../../../../../core/models/workflow.model';

@Component({
  selector: 'app-workflow-stage-manage',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './manage.component.html',
  styleUrl: './manage.component.scss'
})
export class WorkflowStageManageComponent implements OnInit {
  stage: WorkflowStage = new WorkflowStage();
  isEditMode = false;
  workflows: Workflow[] = [];

  constructor(
    private workflowService: WorkflowService,
    public dialogRef: MatDialogRef<WorkflowStageManageComponent>,
    @Inject(MAT_DIALOG_DATA) public data: WorkflowStage | null
  ) {}

  ngOnInit(): void {
    if (this.data) {
      this.stage = new WorkflowStage(this.data);
      this.isEditMode = true;
    }
    this.loadWorkflows();
  }

  loadWorkflows(): void {
    this.workflowService.getWorkflows().subscribe({
      next: (data) => this.workflows = data,
      error: () => Swal.fire('Error', 'Failed to load workflows.', 'error')
    });
  }

  onSave(): void {
    Swal.fire({
      title: 'Are you sure?',
      text: this.isEditMode ? 'You want to update this stage?' : 'You want to add this stage?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: this.isEditMode ? 'Update' : 'Save',
    }).then(result => {
      if (!result.isConfirmed) return;

      const request = this.isEditMode
        ? this.workflowService.updateWorkflowStage(this.stage.id!, this.stage)
        : this.workflowService.addWorkflowStage(this.stage);

      request.subscribe({
        next: () => {
          Swal.fire('Success', this.isEditMode ? 'Stage updated successfully!' : 'Stage added successfully!', 'success');
          this.dialogRef.close(true);
        },
        error: (error) => {
          Swal.fire('Error', this.isEditMode ? 'Failed to update stage' : 'Failed to add stage', 'error');
          console.error('Error:', error);
        }
      });
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}