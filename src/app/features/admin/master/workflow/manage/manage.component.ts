import { Component, Inject, OnInit } from '@angular/core';
import { MaterialModule } from '../../../../../shared/material.module';
import Swal from 'sweetalert2';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Workflow } from '../../../../../core/models/workflow.model';
import { WorkflowService } from '../../../../../core/services/workflow.service';

@Component({
  selector: 'app-workflow-manage',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './manage.component.html',
  styleUrl: './manage.component.scss'
})
export class WorkflowManageComponent implements OnInit {
  workflow: Workflow = new Workflow();
  isEditMode = false;

  constructor(
    private workflowService: WorkflowService,
    public dialogRef: MatDialogRef<WorkflowManageComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Workflow | null
  ) {}

  ngOnInit(): void {
    if (this.data) {
      this.workflow = new Workflow(this.data);
      this.isEditMode = true;
    }
  }

  // Save workflow (add or edit)
  onSave(): void {
    Swal.fire({
      title: 'Are you sure?',
      text: this.isEditMode ? 'You want to update this Workflow?' : 'You want to add this Workflow?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: this.isEditMode ? 'Update' : 'Save',
      cancelButtonText: 'Cancel',
    }).then(result => {
      if (!result.isConfirmed) return;

      const request = this.isEditMode
        ? this.workflowService.updateWorkflow(this.workflow.id!, this.workflow)
        : this.workflowService.addWorkflow(this.workflow);

      request.subscribe({
        next: () => {
          Swal.fire('Success', this.isEditMode ? 'Workflow updated successfully!' : 'Workflow added successfully!', 'success');
          this.dialogRef.close(true);
        },
        error: (error) => {
          Swal.fire('Error', this.isEditMode ? 'Failed to update Workflow' : 'Failed to add Workflow', 'error');
          console.error('Error:', error);
        }
      });
    });
  }

  // Close dialog
  onCancel(): void {
    this.dialogRef.close();
  }
}