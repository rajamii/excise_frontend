import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { MaterialModule } from '../../shared/material.module';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-single-window-detail',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './single-window-detail.component.html',
  styleUrls: ['./single-window-detail.component.scss']
})
export class SingleWindowDetailComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroy$ = new Subject<void>();

  type: string | null = null;
  id: string | null = null;
  targetId: string | null = null;
  isLoading = false;
  error: string | null = null;
  detailData: any = null;
  activeTab = 0;

  selectedWorkflowAppId: string | null = null;
  selectedWorkflowApp: any = null;

  ngOnInit() {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.type = params['type'] || null;
      this.id = params['id'] || null;
      this.targetId = params['targetId'] || null;
      if (this.type && this.id) {
        this.fetchDetailData();
      } else {
        this.error = 'Invalid application or licensee parameter.';
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  fetchDetailData() {
    this.isLoading = true;
    this.error = null;
    this.detailData = null;
    this.selectedWorkflowAppId = null;
    this.selectedWorkflowApp = null;

    let url = '';
    if (this.type === 'licensee') {
      url = `${environment.apiBaseUrl}/transactional/single-window/licensee/${this.id}/`;
    } else if (this.type === 'license') {
      url = `${environment.apiBaseUrl}/transactional/single-window/license/${this.id}/`;
    } else if (this.type === 'new_license_app') {
      url = `${environment.apiBaseUrl}/transactional/single-window/application/new/${this.id}/`;
    } else if (this.type === 'renewal_app') {
      url = `${environment.apiBaseUrl}/transactional/single-window/application/renewal/${this.id}/`;
    } else if (this.type === 'salesman_barman_app') {
      url = `${environment.apiBaseUrl}/transactional/single-window/application/salesman-barman/${this.id}/`;
    } else {
      this.error = `Unsupported detail type: ${this.type}`;
      this.isLoading = false;
      return;
    }

    this.http.get<any>(url).subscribe({
      next: (res) => {
        this.detailData = res;
        this.isLoading = false;

        // Auto-select the active workflow application
        if (this.type === 'new_license_app') {
          // Default to the main NLA application
          this.selectedWorkflowAppId = this.detailData.application_id;
          this.selectedWorkflowApp = this.detailData;

          // If a targetId was passed, find if it matches any renewal or SBM sub-application
          if (this.targetId) {
            const renewalMatch = this.detailData.renewal_applications?.find((r: any) => r.application_id === this.targetId);
            if (renewalMatch) {
              this.selectedWorkflowAppId = renewalMatch.application_id;
              this.selectedWorkflowApp = renewalMatch;
              this.activeTab = 1; // Auto-switch to Workflow Tracking tab
            } else {
              const sbmMatch = this.detailData.salesman_barman_applications?.find((s: any) => s.application_id === this.targetId);
              if (sbmMatch) {
                this.selectedWorkflowAppId = sbmMatch.application_id;
                this.selectedWorkflowApp = sbmMatch;
                this.activeTab = 1; // Auto-switch to Workflow Tracking tab
              }
            }
          }
        }
      },
      error: (err) => {
        console.error('Failed to load detail data', err);
        this.error = 'Failed to load detailed information from the server.';
        this.isLoading = false;
      }
    });
  }

  selectWorkflowApp(appId: string, appData: any) {
    this.selectedWorkflowAppId = appId;
    this.selectedWorkflowApp = appData;
  }

  getWorkflowLicenseId(): string | null {
    if (!this.selectedWorkflowApp || !this.detailData) return null;
    
    // If it's a renewal app, show old_license_id
    if (this.selectedWorkflowApp.old_license_id) {
      return this.selectedWorkflowApp.old_license_id;
    }
    // If it's a salesman/barman app, show license_id
    if (this.selectedWorkflowApp.license_id) {
      return this.selectedWorkflowApp.license_id;
    }
    // If it's the main NLA, show issued_license?.license_id
    if (this.selectedWorkflowApp.application_id === this.detailData.application_id) {
      return this.detailData.issued_license?.license_id || null;
    }
    return null;
  }


  goBack() {
    this.router.navigate(['/dashboard'], {
      queryParams: {
        section: 'single-window'
      }
    });
  }

  viewApplicationDetail(appType: string, appId: string) {
    this.router.navigate(['/dashboard'], {
      queryParams: {
        section: 'single-window-detail',
        type: appType,
        id: appId
      }
    });
  }

  getStatusClass(status: string): string {
    if (!status) return 'status-draft';
    const s = status.toLowerCase();
    if (s.includes('active') || s.includes('approve') || s.includes('pass') || s.includes('resolve')) {
      return 'status-active';
    }
    if (s.includes('reject') || s.includes('expire') || s.includes('inactive')) {
      return 'status-inactive';
    }
    if (s.includes('objection') || s.includes('pending') || s.includes('submitted')) {
      return 'status-pending';
    }
    return 'status-draft';
  }

  getTypeLabel(type: string | null): string {
    if (!type) return '';
    const labels: Record<string, string> = {
      'licensee': 'Licensee Profile',
      'license': 'Issued License',
      'new_license_app': 'New License Application',
      'renewal_app': 'Renewal Application',
      'salesman_barman_app': 'Salesman/Barman Application'
    };
    return labels[type] || type;
  }
}
