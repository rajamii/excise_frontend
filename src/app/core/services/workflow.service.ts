import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Workflow } from '../models/workflow.model';
import { WorkflowStage } from '../models/workflow-stage.model';
import { WorkflowTransition } from '../models/workflow-transition.model';
import { StagePermission } from '../models/stage-permission.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WorkflowService {
  private apiUrl = `${environment.apiBaseUrl}/auth/`;

  constructor(private http: HttpClient) {}

 // Workflow APIs
 getWorkflows(): Observable<Workflow[]> {
  return this.http.get<Workflow[]>(this.apiUrl +'workflows/');
}

addWorkflow(workflow: Workflow): Observable<Workflow> {
  return this.http.post<Workflow>(this.apiUrl + 'workflows/create/', workflow);
}

updateWorkflow(id: number, workflow: Workflow): Observable<Workflow> {
  return this.http.put<Workflow>(`${this.apiUrl}${id}/workflows/update/`, workflow);
}

deleteWorkflow(id: number): Observable<void> {
  return this.http.delete<void>(`${this.apiUrl}${id}/workflows/delete/`);
}

// WorkflowStage APIs
getWorkflowStages(): Observable<WorkflowStage[]> {
  return this.http.get<WorkflowStage[]>(`${this.apiUrl}stages/`);
}

addWorkflowStage(stage: WorkflowStage): Observable<WorkflowStage> {
  return this.http.post<WorkflowStage>(`${this.apiUrl}stages/create/`, stage);
}

updateWorkflowStage(id: number, stage: WorkflowStage): Observable<WorkflowStage> {
  return this.http.put<WorkflowStage>(`${this.apiUrl}stages/${id}/update/`, stage);
}

deleteWorkflowStage(id: number): Observable<void> {
  return this.http.delete<void>(`${this.apiUrl}stages/${id}/delete/`);
}

// WorkflowTransition APIs
getWorkflowTransitions(): Observable<WorkflowTransition[]> {
  return this.http.get<WorkflowTransition[]>(`${this.apiUrl}transitions/`);
}

addWorkflowTransition(transition: WorkflowTransition): Observable<WorkflowTransition> {
  return this.http.post<WorkflowTransition>(`${this.apiUrl}transitions/create/`, transition);
}

updateWorkflowTransition(id: number, transition: WorkflowTransition): Observable<WorkflowTransition> {
  return this.http.put<WorkflowTransition>(`${this.apiUrl}transitions/${id}/update/`, transition);
}

deleteWorkflowTransition(id: number): Observable<void> {
  return this.http.delete<void>(`${this.apiUrl}transitions/${id}/delete/`);
}

// StagePermission APIs
getStagePermissions(): Observable<StagePermission[]> {
  return this.http.get<StagePermission[]>(`${this.apiUrl}permissions/`);
}

addStagePermission(permission: StagePermission): Observable<StagePermission> {
  return this.http.post<StagePermission>(`${this.apiUrl}permissions/create/`, permission);
}

updateStagePermission(id: number, permission: StagePermission): Observable<StagePermission> {
  return this.http.put<StagePermission>(`${this.apiUrl}permissions/${id}/update/`, permission);
}

deleteStagePermission(id: number): Observable<void> {
  return this.http.delete<void>(`${this.apiUrl}permissions/${id}/delete/`);
}
}