import { Component, Inject, OnInit } from '@angular/core';
import { MaterialModule } from '../../../../../../shared/material.module';
import Swal from 'sweetalert2';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { StagePermission } from '../../../../../../core/models/stage-permission.model';
import { WorkflowService } from '../../../../../../core/services/workflow.service';
import { UserService } from '../../../../../../core/services/user.service';
import { WorkflowStage } from '../../../../../../core/models/workflow-stage.model';
import { Role } from '../../../../../../core/models/role.model';

@Component({
  selector: 'app-stage-permission-manage',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './manage.component.html',
  styleUrl: './manage.component.scss'
})
export class StagePermissionManageComponent implements OnInit {
  permission: StagePermission = new StagePermission();
  isEditMode = false;
  stages: WorkflowStage[] = [];
  roles: Role[] = [];

  constructor(
    private workflowService: WorkflowService,
    private userService: UserService,
    public dialogRef: MatDialogRef<StagePermissionManageComponent>,
    @Inject(MAT_DIALOG_DATA) public data: StagePermission | null
  ) {}

  ngOnInit(): void {
    if (this.data) {
      this.permission = new StagePermission(this.data);
      this.isEditMode = true;
    }
    this.loadStages();
    this.loadRoles();
  }

  loadStages(): void {
    this.workflowService.getWorkflowStages().subscribe({
      next: (data) => this.stages = data,
      error: () => Swal.fire('Error', 'Failed to load stages.', 'error')
    });
  }

  loadRoles(): void {
    this.userService.getRoles().subscribe({
      next: (data) => this.roles = data,
      error: () => Swal.fire('Error', 'Failed to load roles.', 'error')
    });
  }

  onSave(): void {
    Swal.fire({
      title: 'Are you sure?',
      text: this.isEditMode ? 'You want to update this permission?' : 'You want to add this permission?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: this.isEditMode ? 'Update' : 'Save',
    }).then(result => {
      if (!result.isConfirmed) return;

      const request = this.isEditMode
        ? this.workflowService.updateStagePermission(this.permission.id!, this.permission)
        : this.workflowService.addStagePermission(this.permission);

      request.subscribe({
        next: () => {
          Swal.fire('Success', this.isEditMode ? 'Permission updated successfully!' : 'Permission added successfully!', 'success');
          this.dialogRef.close(true);
        },
        error: (error) => {
          Swal.fire('Error', this.isEditMode ? 'Failed to update permission' : 'Failed to add permission', 'error');
          console.error('Error:', error);
        }
      });
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}