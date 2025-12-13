import { Workflow } from './workflow.model';

export class WorkflowStage {
  id?: number;
  workflow: Workflow | number; // Workflow object or ID
  name: string;
  description: string;
  is_initial: boolean;
  is_final: boolean;

  constructor(data: Partial<WorkflowStage> = {}) {
    this.id = data.id;
    this.workflow = data.workflow || 0;
    this.name = data.name || '';
    this.description = data.description || '';
    this.is_initial = data.is_initial || false;
    this.is_final = data.is_final || false;
  }
}