import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import { Workflow } from '../../../../../core/models/workflow.model';
import { WorkflowService } from '../../../../../core/services/workflow.service';
import { WorkflowManageComponent } from '../manage/manage.component';

@Component({
  selector: 'app-workflow-list',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class WorkflowListComponent implements OnInit {
  // List of workflows
  workflows: Workflow[] = [];

  // Table columns
  displayedColumns: string[] = [
    'name',
    'description',
    'actions'
  ];

  constructor(
    private workflowService: WorkflowService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadWorkflows(); // Fetch workflows on init
  }

  // Fetch all workflows from API
  loadWorkflows(): void {
    this.workflowService.getWorkflows().subscribe({
      next: (data) => this.workflows = data,
      error: () => Swal.fire('Error', 'Failed to load workflows.', 'error')
    });
  }

  // Open add workflow dialog
  onAdd(): void {
    const dialogRef = this.dialog.open(WorkflowManageComponent, {
      width: '500px',
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadWorkflows(); // Reload workflows if added
    });
  }

  // Open edit workflow dialog
  onEdit(workflow: Workflow): void {
    const dialogRef = this.dialog.open(WorkflowManageComponent, {
      width: '500px',
      data: workflow // Pass workflow to be edited
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadWorkflows(); // Reload workflows if edited
    });
  }

  // Confirm and delete workflow
  onDelete(workflow: Workflow): void {
    Swal.fire({
      title: 'Are you sure?',
      text: `Delete workflow "${workflow.name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
    }).then(result => {
      if (result.isConfirmed && workflow.id !== undefined) {
        this.workflowService.deleteWorkflow(workflow.id).subscribe({
          next: () => {
            Swal.fire('Deleted!', 'Workflow deleted successfully.', 'success');
            this.loadWorkflows();
          },
          error: () => Swal.fire('Error', 'Failed to delete workflow.', 'error')
        });
      }
    });
  }
}