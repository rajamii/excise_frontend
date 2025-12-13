import { Workflow } from './workflow.model';
import { WorkflowStage } from './workflow-stage.model';

export class WorkflowTransition {
  id?: number;
  workflow: Workflow | number; // Workflow object or ID
  from_stage: WorkflowStage | number; // Stage object or ID
  to_stage: WorkflowStage | number; // Stage object or ID
  condition: { [key: string]: any }; // JSON object

  constructor(data: Partial<WorkflowTransition> = {}) {
    this.id = data.id;
    this.workflow = data.workflow || 0;
    this.from_stage = data.from_stage || 0;
    this.to_stage = data.to_stage || 0;
    this.condition = data.condition || {};
  }
}