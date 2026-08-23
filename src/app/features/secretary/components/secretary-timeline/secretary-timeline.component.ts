// Secretary Timeline & License Workflow Tracking Component
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  SecretaryService, 
  SecretaryTimelineOverview, 
  SecretaryTimelineItem, 
  SecretaryPendingQueueItem 
} from '../../services/secretary.service';

@Component({
  selector: 'app-secretary-timeline',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './secretary-timeline.component.html',
  styleUrls: ['./secretary-timeline.component.scss']
})
export class SecretaryTimelineComponent implements OnInit {
  isLoading = false;

  // Active View Tab: 'timeline-search' | 'pending-queue' | 'all-applications'
  activeTab: 'timeline-search' | 'pending-queue' | 'all-applications' = 'timeline-search';

  // Search Inputs
  searchPhoneOrApp: string = '';
  selectedCategory: string = 'all';
  selectedStatus: string = 'all';

  // Selected Application for Timeline View
  selectedApplication: SecretaryTimelineItem | null = null;

  overview: SecretaryTimelineOverview = {
    summary_kpis: {
      total_applications: 28,
      pending_applications: 9,
      approved_applications: 16,
      rejected_applications: 3,
      avg_processing_days: '4.2 Days'
    },
    timeline_records: [
      {
        application_id: 'PLA-2026-0891',
        applicant_name: 'Amrit Raj Sharma',
        mobile_no: '9800112233',
        establishment_name: 'ABC Distilleries & Retails',
        license_type: 'Retail Bar & Restaurant License (L-2)',
        category: 'Retailer',
        current_status: 'Approved by Excise Commissioner',
        status_code: 'APPROVED',
        days_elapsed: '4 Days Total',
        approval_status: 'APPROVED',
        approved_by: 'Excise Commissioner (IAS)',
        approval_date: '2026-08-22 15:45',
        time_taken: '4 Days (Within 7-Day SLA)',
        current_stage: 'Completed & License Issued',
        pending_officer_name: 'N/A (Final Approval Granted)',
        steps: [
          {
            step_no: 1,
            icon: '✓',
            status_class: 'completed',
            badge_class: 'status-completed',
            event_title: 'Application Submitted Online',
            event_date: '2026-08-18 10:30 AM',
            event_description: 'License application submitted with required KYC, premises lease deed, and solvency certificate.',
            user_details: 'Amrit Raj Sharma (Applicant)',
            time_taken: 'Day 1',
            status_text: 'Completed'
          },
          {
            step_no: 2,
            icon: '✓',
            status_class: 'completed',
            badge_class: 'status-completed',
            event_title: 'Document Verification & Site Inspection',
            event_date: '2026-08-19 02:15 PM',
            event_description: 'Physical site inspection conducted by Inspector of Excise. Location verified & cleared.',
            user_details: 'Inspector of Excise (East District)',
            time_taken: '1 Day 3 Hours',
            status_text: 'Verified'
          },
          {
            step_no: 3,
            icon: '✓',
            status_class: 'completed',
            badge_class: 'status-completed',
            event_title: 'Police NOC & Financial Security Clearance',
            event_date: '2026-08-20 11:00 AM',
            event_description: 'Police NOC received. Revenue security deposit of ₹30,000 verified in e-wallet.',
            user_details: 'Superintendent of Police & Nodal Officer',
            time_taken: '20 Hours',
            status_text: 'Cleared'
          },
          {
            step_no: 4,
            icon: '✓',
            status_class: 'completed',
            badge_class: 'status-completed',
            event_title: 'Scrutiny & Recommendation by Joint Commissioner',
            event_date: '2026-08-21 04:30 PM',
            event_description: 'Application file scrutinized and recommended for final grant by Commissioner.',
            user_details: 'Joint Commissioner of Excise',
            time_taken: '1 Day 5 Hours',
            status_text: 'Recommended'
          },
          {
            step_no: 5,
            icon: '👑',
            status_class: 'final-approved',
            badge_class: 'status-final-approved',
            event_title: 'Final Order by Excise Commissioner',
            event_date: '2026-08-22 03:45 PM',
            event_description: 'License grant approved. Digital License Certificate #LC-2026-0891 generated.',
            user_details: 'Excise Commissioner (IAS)',
            time_taken: '23 Hours',
            status_text: 'FINAL APPROVED'
          }
        ]
      },
      {
        application_id: 'PLA-2026-0842',
        applicant_name: 'Diwakar Sharma',
        mobile_no: '9876543210',
        establishment_name: 'DEF Retails & Lounge Bar',
        license_type: 'Retail Off-Shop License (L-1)',
        category: 'Retailer',
        current_status: 'Pending with Commissioner',
        status_code: 'PENDING_COMMISSIONER',
        days_elapsed: '5 Days Elapsed',
        approval_status: 'PENDING',
        approved_by: 'Pending Commissioner Decision',
        approval_date: 'Awaiting Order',
        time_taken: '5 Days (SLA Limit: 7 Days)',
        current_stage: 'Pending with Excise Commissioner',
        pending_officer_name: 'Excise Commissioner (IAS)',
        steps: [
          {
            step_no: 1,
            icon: '✓',
            status_class: 'completed',
            badge_class: 'status-completed',
            event_title: 'Application Submitted Online',
            event_date: '2026-08-17 11:15 AM',
            event_description: 'New license application submitted online with affidavit and property clearance.',
            user_details: 'Diwakar Sharma (Applicant)',
            time_taken: 'Day 1',
            status_text: 'Completed'
          },
          {
            step_no: 2,
            icon: '✓',
            status_class: 'completed',
            badge_class: 'status-completed',
            event_title: 'Field Verification & Distance Report',
            event_date: '2026-08-18 05:00 PM',
            event_description: 'Distance from educational institutes & places of worship verified (>500m).',
            user_details: 'Sub-Inspector of Excise (Gangtok)',
            time_taken: '1 Day 5 Hours',
            status_text: 'Verified'
          },
          {
            step_no: 3,
            icon: '✓',
            status_class: 'completed',
            badge_class: 'status-completed',
            event_title: 'Nodal & Police Clearance',
            event_date: '2026-08-19 03:30 PM',
            event_description: 'No objection certificate issued by SP Gangtok & District Collectorate.',
            user_details: 'District Nodal Desk',
            time_taken: '22 Hours',
            status_text: 'Cleared'
          },
          {
            step_no: 4,
            icon: '✓',
            status_class: 'completed',
            badge_class: 'status-completed',
            event_title: 'Joint Commissioner Review',
            event_date: '2026-08-20 02:00 PM',
            event_description: 'File reviewed and forwarded to Excise Commissioner for final sanction.',
            user_details: 'Joint Commissioner of Excise',
            time_taken: '22 Hours',
            status_text: 'Forwarded'
          },
          {
            step_no: 5,
            icon: '⏳',
            status_class: 'final-pending',
            badge_class: 'status-final-pending',
            event_title: 'Pending Commissioner Order',
            event_date: '2026-08-21 10:00 AM (Ongoing)',
            event_description: 'Awaiting final signature and license approval order by Excise Commissioner.',
            user_details: 'Excise Commissioner (IAS)',
            time_taken: '2 Days Elapsed',
            status_text: 'PENDING APPROVAL'
          }
        ]
      },
      {
        application_id: 'PLA-2026-0790',
        applicant_name: 'Jane R Doe',
        mobile_no: '9811223344',
        establishment_name: 'Doe Breweries Limited',
        license_type: 'Microbrewery & Taproom License',
        category: 'Manufacturing',
        current_status: 'Objection Raised by Nodal Desk',
        status_code: 'OBJECTION',
        days_elapsed: '6 Days Elapsed',
        approval_status: 'OBJECTION',
        approved_by: 'Pending Fire Safety NOC',
        approval_date: '2026-08-21 (Objection)',
        time_taken: '6 Days Elapsed',
        current_stage: 'Pending Fire Safety Clearance',
        pending_officer_name: 'Fire & Emergency Services Desk',
        steps: [
          {
            step_no: 1,
            icon: '✓',
            status_class: 'completed',
            badge_class: 'status-completed',
            event_title: 'Application Submitted Online',
            event_date: '2026-08-16 09:00 AM',
            event_description: 'Application for Microbrewery submitted with machinery specifications & master plan.',
            user_details: 'Jane R Doe (Applicant)',
            time_taken: 'Day 1',
            status_text: 'Completed'
          },
          {
            step_no: 2,
            icon: '✓',
            status_class: 'completed',
            badge_class: 'status-completed',
            event_title: 'Pollution Control Board Clearance',
            event_date: '2026-08-18 01:30 PM',
            event_description: 'Consent to Establish (CTE) granted by State Pollution Control Board.',
            user_details: 'State Pollution Board Desk',
            time_taken: '2 Days',
            status_text: 'Cleared'
          },
          {
            step_no: 3,
            icon: '⚠️',
            status_class: 'objection',
            badge_class: 'status-objection',
            event_title: 'Fire Safety NOC Objection Raised',
            event_date: '2026-08-21 11:45 AM',
            event_description: 'Objection: Revised Fire Safety NOC required for high-capacity boiler installation.',
            user_details: 'Fire & Emergency Services Nodal Officer',
            time_taken: '3 Days Elapsed',
            status_text: 'Objection Raised'
          }
        ]
      }
    ],
    pending_queue: [
      {
        application_id: 'PLA-2026-0842',
        applicant_name: 'Diwakar Sharma',
        mobile_no: '9876543210',
        establishment_name: 'DEF Retails & Lounge Bar',
        license_type: 'Retail Off-Shop License (L-1)',
        category: 'Retailer',
        current_stage: 'Pending with Excise Commissioner',
        pending_officer_name: 'Excise Commissioner (IAS)',
        days_elapsed: '5 Days',
        sla_status: 'On Track (SLA: 7 Days)',
        submission_date: '2026-08-17'
      },
      {
        application_id: 'PLA-2026-0790',
        applicant_name: 'Jane R Doe',
        mobile_no: '9811223344',
        establishment_name: 'Doe Breweries Limited',
        license_type: 'Microbrewery & Taproom License',
        category: 'Manufacturing',
        current_stage: 'Objection: Fire Safety Clearance Pending',
        pending_officer_name: 'Fire & Emergency Services Desk',
        days_elapsed: '6 Days',
        sla_status: 'Attention Needed',
        submission_date: '2026-08-16'
      },
      {
        application_id: 'PLA-2026-0905',
        applicant_name: 'Sam Test Excise',
        mobile_no: '9800998877',
        establishment_name: 'Brew Test Distillery',
        license_type: 'Distillery Bottling License',
        category: 'Manufacturing',
        current_stage: 'Pending with Joint Commissioner',
        pending_officer_name: 'Joint Commissioner of Excise',
        days_elapsed: '2 Days',
        sla_status: 'On Track (SLA: 7 Days)',
        submission_date: '2026-08-20'
      },
      {
        application_id: 'PLA-2026-0912',
        applicant_name: 'Yuksom Breweries Ltd',
        mobile_no: '9811002299',
        establishment_name: 'Yuksom Breweries (Gyalshing)',
        license_type: 'Brewery Production License',
        category: 'Manufacturing',
        current_stage: 'Pending Field Site Inspection',
        pending_officer_name: 'Inspector of Excise (Gyalshing)',
        days_elapsed: '1 Day',
        sla_status: 'On Track (SLA: 7 Days)',
        submission_date: '2026-08-21'
      }
    ]
  };

  constructor(private secretaryService: SecretaryService) {}

  ngOnInit(): void {
    if (this.overview.timeline_records && this.overview.timeline_records.length > 0) {
      this.selectedApplication = this.overview.timeline_records[0];
    }
    this.loadTimelineData();
  }

  loadTimelineData(): void {
    this.isLoading = true;
    this.secretaryService.getTimelineOverview().subscribe({
      next: (res) => {
        if (res && res.timeline_records && res.timeline_records.length > 0) {
          this.overview = res;
          if (!this.selectedApplication) {
            this.selectedApplication = res.timeline_records[0];
          }
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load Timeline overview:', err);
        this.isLoading = false;
      }
    });
  }

  setTab(tab: 'timeline-search' | 'pending-queue' | 'all-applications'): void {
    this.activeTab = tab;
  }

  selectApplication(item: SecretaryTimelineItem): void {
    this.selectedApplication = item;
    this.activeTab = 'timeline-search';
  }

  selectPendingApplication(pending: SecretaryPendingQueueItem): void {
    const found = (this.overview.timeline_records || []).find(
      t => t.application_id.toLowerCase() === pending.application_id.toLowerCase()
    );

    if (found) {
      this.selectedApplication = found;
    } else {
      this.selectedApplication = {
        application_id: pending.application_id,
        applicant_name: pending.applicant_name,
        mobile_no: pending.mobile_no,
        establishment_name: pending.establishment_name,
        license_type: pending.license_type,
        category: pending.category,
        current_status: pending.current_stage,
        status_code: 'PENDING',
        days_elapsed: pending.days_elapsed,
        approval_status: 'PENDING',
        approved_by: `Pending with ${pending.pending_officer_name}`,
        approval_date: 'Awaiting Final Approval',
        time_taken: pending.days_elapsed,
        current_stage: pending.current_stage,
        pending_officer_name: pending.pending_officer_name,
        steps: [
          {
            step_no: 1,
            icon: '✓',
            status_class: 'completed',
            badge_class: 'status-completed',
            event_title: 'Application Submitted Online',
            event_date: `${pending.submission_date} 10:00 AM`,
            event_description: 'License application submitted online and fee acknowledged.',
            user_details: `${pending.applicant_name} (Applicant)`,
            time_taken: 'Day 1',
            status_text: 'Completed'
          },
          {
            step_no: 2,
            icon: '⏳',
            status_class: 'final-pending',
            badge_class: 'status-final-pending',
            event_title: pending.current_stage,
            event_date: 'Ongoing Review',
            event_description: `File is under active review by ${pending.pending_officer_name}.`,
            user_details: pending.pending_officer_name,
            time_taken: pending.days_elapsed,
            status_text: 'PENDING'
          }
        ]
      };
    }
    this.activeTab = 'timeline-search';
  }

  performSearch(): void {
    if (!this.searchPhoneOrApp.trim()) return;

    const query = this.searchPhoneOrApp.toLowerCase().trim();
    const match = (this.overview.timeline_records || []).find(
      i => i.application_id.toLowerCase().includes(query) ||
           i.mobile_no.includes(query) ||
           i.applicant_name.toLowerCase().includes(query) ||
           i.establishment_name.toLowerCase().includes(query)
    );

    if (match) {
      this.selectedApplication = match;
    }
  }

  clearSearch(): void {
    this.searchPhoneOrApp = '';
    this.selectedCategory = 'all';
    this.selectedStatus = 'all';
    if (this.overview.timeline_records && this.overview.timeline_records.length > 0) {
      this.selectedApplication = this.overview.timeline_records[0];
    }
  }

  get filteredTimelineRecords(): SecretaryTimelineItem[] {
    let list = this.overview.timeline_records || [];

    if (this.selectedCategory !== 'all') {
      list = list.filter(i => (i.category || '').toLowerCase() === this.selectedCategory.toLowerCase());
    }

    if (this.selectedStatus !== 'all') {
      list = list.filter(i => (i.status_code || '').toLowerCase() === this.selectedStatus.toLowerCase());
    }

    if (this.searchPhoneOrApp.trim()) {
      const q = this.searchPhoneOrApp.toLowerCase().trim();
      list = list.filter(i => 
        i.application_id.toLowerCase().includes(q) ||
        i.mobile_no.includes(q) ||
        i.applicant_name.toLowerCase().includes(q) ||
        i.establishment_name.toLowerCase().includes(q)
      );
    }
    return list;
  }

  get filteredPendingQueue(): SecretaryPendingQueueItem[] {
    let list = this.overview.pending_queue || [];

    if (this.selectedCategory !== 'all') {
      list = list.filter(i => (i.category || '').toLowerCase() === this.selectedCategory.toLowerCase());
    }

    if (this.searchPhoneOrApp.trim()) {
      const q = this.searchPhoneOrApp.toLowerCase().trim();
      list = list.filter(i => 
        i.application_id.toLowerCase().includes(q) ||
        i.mobile_no.includes(q) ||
        i.applicant_name.toLowerCase().includes(q) ||
        i.establishment_name.toLowerCase().includes(q) ||
        i.pending_officer_name.toLowerCase().includes(q)
      );
    }
    return list;
  }

  getApprovalBannerClass(): string {
    if (!this.selectedApplication) return 'approval-pending';
    const status = (this.selectedApplication.approval_status || '').toUpperCase();
    if (status === 'APPROVED') return 'approval-yes';
    if (status === 'REJECTED' || status === 'OBJECTION') return 'approval-no';
    return 'approval-pending';
  }

  getApprovalBadgeClass(): string {
    if (!this.selectedApplication) return 'badge-pend';
    const status = (this.selectedApplication.approval_status || '').toUpperCase();
    if (status === 'APPROVED') return 'badge-yes';
    if (status === 'REJECTED' || status === 'OBJECTION') return 'badge-no';
    return 'badge-pend';
  }

  printTimeline(): void {
    window.print();
  }
}
