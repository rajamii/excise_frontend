import { Component, Inject, OnInit } from '@angular/core';
import { MaterialModule } from '../../../../../../shared/material.module';
import Swal from 'sweetalert2';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { WorkflowTransition } from '../../../../../../core/models/workflow-transition.model';
import { WorkflowService } from '../../../../../../core/services/workflow.service';
import { Workflow } from '../../../../../../core/models/workflow.model';
import { WorkflowStage } from '../../../../../../core/models/workflow-stage.model';

@Component({
  selector: 'app-workflow-transition-manage',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './manage.component.html',
  styleUrl: './manage.component.scss'
})
export class WorkflowTransitionManageComponent implements OnInit {
  transition: WorkflowTransition = new WorkflowTransition();
  isEditMode = false;
  workflows: Workflow[] = [];
  stages: WorkflowStage[] = [];

  constructor(
    private workflowService: WorkflowService,
    public dialogRef: MatDialogRef<WorkflowTransitionManageComponent>,
    @Inject(MAT_DIALOG_DATA) public data: WorkflowTransition | null
  ) {}

  ngOnInit(): void {
    if (this.data) {
      this.transition = new WorkflowTransition(this.data);
      this.isEditMode = true;
    }
    this.loadWorkflows();
  }

  loadWorkflows(): void {
    this.workflowService.getWorkflows().subscribe({
      next: (data) => {
        this.workflows = data;
        if (this.transition.workflow) this.loadStages();
      },
      error: () => Swal.fire('Error', 'Failed to load workflows.', 'error')
    });
  }

  loadStages(): void {
    this.workflowService.getWorkflowStages().subscribe({
      next: (data) => this.stages = data.filter(s => (s.workflow as Workflow)?.id === (this.transition.workflow as Workflow)?.id || s.workflow === this.transition.workflow),
      error: () => Swal.fire('Error', 'Failed to load stages.', 'error')
    });
  }

  onWorkflowChange(): void {
    this.transition.from_stage = 0;
    this.transition.to_stage = 0;
    this.loadStages();
  }

  onSave(): void {
    Swal.fire({
      title: 'Are you sure?',
      text: this.isEditMode ? 'You want to update this transition?' : 'You want to add this transition?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: this.isEditMode ? 'Update' : 'Save',
    }).then(result => {
      if (!result.isConfirmed) return;

      const request = this.isEditMode
        ? this.workflowService.updateWorkflowTransition(this.transition.id!, this.transition)
        : this.workflowService.addWorkflowTransition(this.transition);

      request.subscribe({
        next: () => {
          Swal.fire('Success', this.isEditMode ? 'Transition updated successfully!' : 'Transition added successfully!', 'success');
          this.dialogRef.close(true);
        },
        error: (error) => {
          Swal.fire('Error', this.isEditMode ? 'Failed to update transition' : 'Failed to add transition', 'error');
          console.error('Error:', error);
        }
      });
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}