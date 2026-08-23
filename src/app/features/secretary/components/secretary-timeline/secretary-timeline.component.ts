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

  // Search & Results State
  selectedApplication: SecretaryTimelineItem | null = null;
  searchResults: SecretaryTimelineItem[] = [];
  hasSearched: boolean = false;
  searchErrorMessage: string = '';

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
        application_id: 'NLI/1101/2026-27/0001',
        applicant_name: 'Amrit Raj Sharma',
        mobile_no: '7908195062',
        establishment_name: 'ABC Distilleries Limited',
        license_type: 'Distillery Manufacturing & Bottling License',
        category: 'Manufacturing',
        current_status: 'Under Review by Excise Nodal Desk',
        status_code: 'PENDING',
        days_elapsed: '2 Days Elapsed',
        approval_status: 'PENDING',
        approved_by: 'Pending Nodal Officer Clearance',
        approval_date: '2026-05-28 11:59',
        time_taken: '2 Days (Within SLA)',
        current_stage: 'Pending Nodal Officer Clearance',
        pending_officer_name: 'Nodal Officer (Distillery Desk)',
        steps: [
          {
            step_no: 1,
            icon: '✓',
            status_class: 'completed',
            badge_class: 'status-completed',
            event_title: 'Application Submitted Online',
            event_date: '2026-05-28 11:59 AM',
            event_description: 'New License Application NLI/1101/2026-27/0001 submitted for ABC Distilleries Limited with PAN MEWPS9463R.',
            user_details: 'Amrit Raj Sharma (Applicant)',
            time_taken: 'Day 1',
            status_text: 'Completed'
          },
          {
            step_no: 2,
            icon: '⏳',
            status_class: 'final-pending',
            badge_class: 'status-final-pending',
            event_title: 'Nodal Verification & Premises Audit',
            event_date: '2026-05-28 12:00 PM',
            event_description: 'Site address at Opposite Entel Motors, 6th Mile, Tadong under active verification by Excise Nodal Officer.',
            user_details: 'Nodal Officer (Distillery Desk)',
            time_taken: 'Ongoing Review',
            status_text: 'In Progress'
          }
        ]
      },
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
      },
      {
        application_id: 'PLA-2026-0715',
        applicant_name: 'Lahang Spirits Private Limited',
        mobile_no: '9833445566',
        establishment_name: 'Lahag Spirits Manufacturing Plant',
        license_type: 'Distillery Manufacturing & Bottling License',
        category: 'Manufacturing',
        current_status: 'Approved by Excise Commissioner',
        status_code: 'APPROVED',
        days_elapsed: '3 Days Total',
        approval_status: 'APPROVED',
        approved_by: 'Excise Commissioner (IAS)',
        approval_date: '2026-08-15 16:20',
        time_taken: '3 Days (Fast-Tracked)',
        current_stage: 'Completed & License Issued',
        pending_officer_name: 'N/A (Final Approval Granted)',
        steps: [
          {
            step_no: 1,
            icon: '✓',
            status_class: 'completed',
            badge_class: 'status-completed',
            event_title: 'Application Submitted Online',
            event_date: '2026-08-12 10:00 AM',
            event_description: 'Renewal & Expansion application submitted with Security Deposit FD of ₹45,00,000.',
            user_details: 'Lahang Spirits Private Limited',
            time_taken: 'Day 1',
            status_text: 'Completed'
          },
          {
            step_no: 2,
            icon: '✓',
            status_class: 'completed',
            badge_class: 'status-completed',
            event_title: 'Factory Inspector Clearance',
            event_date: '2026-08-13 03:00 PM',
            event_description: 'Technical verification of distillation columns and security deposit verified.',
            user_details: 'Chief Inspector of Distilleries',
            time_taken: '1 Day',
            status_text: 'Cleared'
          },
          {
            step_no: 3,
            icon: '👑',
            status_class: 'final-approved',
            badge_class: 'status-final-approved',
            event_title: 'Final Approval by Commissioner',
            event_date: '2026-08-15 04:20 PM',
            event_description: 'Approved by Excise Commissioner. Factory license issued for FY 2026-27.',
            user_details: 'Excise Commissioner (IAS)',
            time_taken: '2 Days',
            status_text: 'FINAL APPROVED'
          }
        ]
      }
    ],
    pending_queue: [
      {
        application_id: 'NLI/1101/2026-27/0001',
        applicant_name: 'Amrit Raj Sharma',
        mobile_no: '7908195062',
        establishment_name: 'ABC Distilleries Limited',
        license_type: 'Distillery Manufacturing & Bottling License',
        category: 'Manufacturing',
        current_stage: 'Pending Nodal Officer Clearance',
        pending_officer_name: 'Nodal Officer (Distillery Desk)',
        days_elapsed: '2 Days',
        sla_status: 'On Track (SLA: 7 Days)',
        submission_date: '2026-05-28'
      },
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
    this.selectedApplication = null;
    this.searchResults = [];
    this.hasSearched = false;
    this.loadTimelineData();
  }

  loadTimelineData(): void {
    this.isLoading = true;
    this.secretaryService.getTimelineOverview().subscribe({
      next: (res) => {
        if (res && res.timeline_records && res.timeline_records.length > 0) {
          this.overview = res;
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
    const rawQ = (this.searchPhoneOrApp || '').trim();
    if (!rawQ) {
      this.searchErrorMessage = 'Please enter a valid Application Reference ID or Registered Mobile Number.';
      this.selectedApplication = null;
      this.searchResults = [];
      this.hasSearched = false;
      return;
    }

    const q = rawQ.toLowerCase();
    const cleanDigits = rawQ.replace(/[^0-9]/g, '');
    this.searchErrorMessage = '';
    this.hasSearched = true;

    // Search in timeline_records
    const timelineMatches = (this.overview.timeline_records || []).filter(i => {
      const appId = (i.application_id || '').toLowerCase();
      const mobile = (i.mobile_no || '').toLowerCase();
      const name = (i.applicant_name || '').toLowerCase();
      const est = (i.establishment_name || '').toLowerCase();
      return appId.includes(q) ||
             (cleanDigits && cleanDigits.length >= 3 && mobile.includes(cleanDigits)) ||
             mobile.includes(q) ||
             name.includes(q) ||
             est.includes(q);
    });

    // Also search in pending_queue and construct items for any not in timelineMatches
    const pendingMatches: SecretaryTimelineItem[] = [];
    if (this.overview.pending_queue) {
      this.overview.pending_queue.forEach(p => {
        const appId = (p.application_id || '').toLowerCase();
        const mobile = (p.mobile_no || '').toLowerCase();
        const name = (p.applicant_name || '').toLowerCase();
        const est = (p.establishment_name || '').toLowerCase();
        const matches = appId.includes(q) ||
                        (cleanDigits && cleanDigits.length >= 3 && mobile.includes(cleanDigits)) ||
                        mobile.includes(q) ||
                        name.includes(q) ||
                        est.includes(q);

        if (matches && !timelineMatches.some(t => t.application_id.toLowerCase() === p.application_id.toLowerCase())) {
          pendingMatches.push({
            application_id: p.application_id,
            applicant_name: p.applicant_name,
            mobile_no: p.mobile_no,
            establishment_name: p.establishment_name,
            license_type: p.license_type,
            category: p.category,
            current_status: p.current_stage,
            status_code: 'PENDING',
            days_elapsed: p.days_elapsed,
            approval_status: 'PENDING',
            approved_by: `Pending with ${p.pending_officer_name}`,
            approval_date: 'Awaiting Final Approval',
            time_taken: p.days_elapsed,
            current_stage: p.current_stage,
            pending_officer_name: p.pending_officer_name,
            steps: [
              {
                step_no: 1,
                icon: '✓',
                status_class: 'completed',
                badge_class: 'status-completed',
                event_title: 'Application Submitted Online',
                event_date: `${p.submission_date} 10:00 AM`,
                event_description: 'License application submitted online and fee acknowledged.',
                user_details: `${p.applicant_name} (Applicant)`,
                time_taken: 'Day 1',
                status_text: 'Completed'
              },
              {
                step_no: 2,
                icon: '⏳',
                status_class: 'final-pending',
                badge_class: 'status-final-pending',
                event_title: p.current_stage,
                event_date: 'Ongoing Review',
                event_description: `File is under active review by ${p.pending_officer_name}.`,
                user_details: p.pending_officer_name,
                time_taken: p.days_elapsed,
                status_text: 'PENDING'
              }
            ]
          });
        }
      });
    }

    const allMatches = [...timelineMatches, ...pendingMatches];
    this.searchResults = allMatches;
    this.activeTab = 'timeline-search';

    if (allMatches.length === 1) {
      this.selectedApplication = allMatches[0];
    } else if (allMatches.length > 1) {
      this.selectedApplication = null; // Display results list for user to select & track
    } else {
      this.selectedApplication = null;
      this.searchErrorMessage = `No license application record found matching "${this.searchPhoneOrApp}". Try selecting an application from the Pending Queue tab.`;
    }
  }

  quickSearch(term: string): void {
    this.searchPhoneOrApp = term;
    this.performSearch();
  }

  clearSearch(): void {
    this.searchPhoneOrApp = '';
    this.searchErrorMessage = '';
    this.selectedCategory = 'all';
    this.selectedStatus = 'all';
    this.selectedApplication = null;
    this.searchResults = [];
    this.hasSearched = false;
  }

  backToSearchResults(): void {
    this.selectedApplication = null;
  }

  get filteredTimelineRecords(): SecretaryTimelineItem[] {
    let list = this.overview.timeline_records || [];

    if (this.selectedCategory !== 'all') {
      const selCat = this.selectedCategory.toLowerCase();
      list = list.filter(i => {
        const cat = (i.category || '').toLowerCase();
        return cat.includes(selCat) || selCat.includes(cat);
      });
    }

    if (this.selectedStatus !== 'all') {
      list = list.filter(i => (i.status_code || '').toLowerCase() === this.selectedStatus.toLowerCase());
    }

    return list;
  }

  get filteredPendingQueue(): SecretaryPendingQueueItem[] {
    let list = this.overview.pending_queue || [];

    if (this.selectedCategory !== 'all') {
      const selCat = this.selectedCategory.toLowerCase();
      list = list.filter(i => {
        const cat = (i.category || '').toLowerCase();
        return cat.includes(selCat) || selCat.includes(cat);
      });
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
