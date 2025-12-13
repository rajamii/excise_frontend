import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../../shared/material.module';
import { StagePermission } from '../../../../../../core/models/stage-permission.model';
import { WorkflowService } from '../../../../../../core/services/workflow.service';
import { StagePermissionManageComponent } from '../manage/manage.component';
import { WorkflowStage } from '../../../../../../core/models/workflow-stage.model';
import { Role } from '../../../../../../core/models/role.model';

@Component({
  selector: 'app-stage-permission-list',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class StagePermissionListComponent implements OnInit {
  permissions: StagePermission[] = [];
  displayedColumns: string[] = [
    'stage',
    'role',
    'can_process',
    'actions'
  ];

  constructor(
    private workflowService: WorkflowService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadPermissions();
  }

  loadPermissions(): void {
    this.workflowService.getStagePermissions().subscribe({
      next: (data) => this.permissions = data,
      error: () => Swal.fire('Error', 'Failed to load stage permissions.', 'error')
    });
  }

  onAdd(): void {
    const dialogRef = this.dialog.open(StagePermissionManageComponent, {
      width: '500px',
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadPermissions();
    });
  }

  onEdit(permission: StagePermission): void {
    const dialogRef = this.dialog.open(StagePermissionManageComponent, {
      width: '500px',
      data: permission
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadPermissions();
    });
  }

  onDelete(permission: StagePermission): void {
    Swal.fire({
      title: 'Are you sure?',
      text: `Delete permission for role "${(permission.role as Role)?.name}" on stage "${(permission.stage as WorkflowStage)?.name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
    }).then(result => {
      if (result.isConfirmed && permission.id !== undefined) {
        this.workflowService.deleteStagePermission(permission.id).subscribe({
          next: () => {
            Swal.fire('Deleted!', 'Stage permission deleted successfully.', 'success');
            this.loadPermissions();
          },
          error: () => Swal.fire('Error', 'Failed to delete stage permission.', 'error')
        });
      }
    });
  }
}