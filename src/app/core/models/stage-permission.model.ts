import { WorkflowStage } from './workflow-stage.model';
import { Role } from './role.model';

export class StagePermission {
  id?: number;
  stage: WorkflowStage | number; // Stage object or ID
  role: Role | number; // Role object or ID
  can_process: boolean;

  constructor(data: Partial<StagePermission> = {}) {
    this.id = data.id;
    this.stage = data.stage || 0;
    this.role = data.role || 0;
    this.can_process = data.can_process !== undefined ? data.can_process : true;
  }
}