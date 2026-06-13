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
  isLoading = false;
  error: string | null = null;
  detailData: any = null;
  activeTab = 0;

  ngOnInit() {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.type = params['type'] || null;
      this.id = params['id'] || null;
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
      },
      error: (err) => {
        console.error('Failed to load detail data', err);
        this.error = 'Failed to load detailed information from the server.';
        this.isLoading = false;
      }
    });
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
