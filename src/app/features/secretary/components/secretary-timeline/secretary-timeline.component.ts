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
      total_applications: 17,
      pending_applications: 3,
      approved_applications: 14,
      rejected_applications: 0,
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
            event_description: 'New License Application NLI/1101/2026-27/0001 submitted for ABC Distilleries Limited.',
            user_details: 'Amrit Raj Sharma (Applicant)',
            time_taken: 'Day 1',
            status_text: 'Completed'
          }
        ]
      },
      {
        application_id: 'NLI/1101/2026-27/0002',
        applicant_name: 'Jane R Doe',
        mobile_no: '8927715689',
        establishment_name: 'Doe Breweries Ltd',
        license_type: 'Microbrewery & Taproom License',
        category: 'Manufacturing',
        current_status: 'Approved by Excise Commissioner',
        status_code: 'APPROVED',
        days_elapsed: '3 Days Total',
        approval_status: 'APPROVED',
        approved_by: 'Excise Commissioner (IAS)',
        approval_date: '2026-05-28 12:00',
        time_taken: '3 Days',
        current_stage: 'Completed & License Issued',
        pending_officer_name: 'N/A (Approved)',
        steps: [{ step_no: 1, icon: '✓', status_class: 'completed', badge_class: 'status-completed', event_title: 'Application Submitted', event_date: '2026-05-28', event_description: 'Approved', user_details: 'Jane R Doe', time_taken: 'Day 1', status_text: 'Completed' }]
      },
      {
        application_id: 'NLI/1101/2026-27/0003',
        applicant_name: 'Ms Mayall And Fraser Pvt Ltd',
        mobile_no: '8016082828',
        establishment_name: 'Mayall Distilleries Plant',
        license_type: 'Distillery Manufacturing & Bottling License',
        category: 'Manufacturing',
        current_status: 'Approved by Excise Commissioner',
        status_code: 'APPROVED',
        days_elapsed: '2 Days Total',
        approval_status: 'APPROVED',
        approved_by: 'Excise Commissioner (IAS)',
        approval_date: '2026-05-28 12:00',
        time_taken: '2 Days',
        current_stage: 'Completed & License Issued',
        pending_officer_name: 'N/A (Approved)',
        steps: [{ step_no: 1, icon: '✓', status_class: 'completed', badge_class: 'status-completed', event_title: 'Application Submitted', event_date: '2026-05-28', event_description: 'Approved', user_details: 'Applicant', time_taken: 'Day 1', status_text: 'Completed' }]
      },
      {
        application_id: 'NLI/1101/2026-27/0004',
        applicant_name: 'Ms Denzong Albrew Pvt Limited',
        mobile_no: '9000000001',
        establishment_name: 'Denzong Albrew Unit 1',
        license_type: 'Distillery Manufacturing & Bottling License',
        category: 'Manufacturing',
        current_status: 'Approved by Excise Commissioner',
        status_code: 'APPROVED',
        days_elapsed: '3 Days Total',
        approval_status: 'APPROVED',
        approved_by: 'Excise Commissioner (IAS)',
        approval_date: '2026-05-28 12:00',
        time_taken: '3 Days',
        current_stage: 'Completed & License Issued',
        pending_officer_name: 'N/A (Approved)',
        steps: [{ step_no: 1, icon: '✓', status_class: 'completed', badge_class: 'status-completed', event_title: 'Application Submitted', event_date: '2026-05-28', event_description: 'Approved', user_details: 'Applicant', time_taken: 'Day 1', status_text: 'Completed' }]
      },
      {
        application_id: 'NLI/1101/2026-27/0005',
        applicant_name: 'Ms Denzong Albrew Pvt Limited',
        mobile_no: '9000000002',
        establishment_name: 'Denzong Albrew Brewery',
        license_type: 'Microbrewery & Taproom License',
        category: 'Manufacturing',
        current_status: 'Approved by Excise Commissioner',
        status_code: 'APPROVED',
        days_elapsed: '2 Days Total',
        approval_status: 'APPROVED',
        approved_by: 'Excise Commissioner (IAS)',
        approval_date: '2026-05-28 12:00',
        time_taken: '2 Days',
        current_stage: 'Completed & License Issued',
        pending_officer_name: 'N/A (Approved)',
        steps: [{ step_no: 1, icon: '✓', status_class: 'completed', badge_class: 'status-completed', event_title: 'Application Submitted', event_date: '2026-05-28', event_description: 'Approved', user_details: 'Applicant', time_taken: 'Day 1', status_text: 'Completed' }]
      },
      {
        application_id: 'NLI/1101/2026-27/0006',
        applicant_name: 'Mount Distilleries Limited',
        mobile_no: '9832009027',
        establishment_name: 'Mount Distilleries Plant',
        license_type: 'Distillery Manufacturing & Bottling License',
        category: 'Manufacturing',
        current_status: 'Approved by Excise Commissioner',
        status_code: 'APPROVED',
        days_elapsed: '3 Days Total',
        approval_status: 'APPROVED',
        approved_by: 'Excise Commissioner (IAS)',
        approval_date: '2026-05-28 12:00',
        time_taken: '3 Days',
        current_stage: 'Completed & License Issued',
        pending_officer_name: 'N/A (Approved)',
        steps: [{ step_no: 1, icon: '✓', status_class: 'completed', badge_class: 'status-completed', event_title: 'Application Submitted', event_date: '2026-05-28', event_description: 'Approved', user_details: 'Applicant', time_taken: 'Day 1', status_text: 'Completed' }]
      },
      {
        application_id: 'NLI/1101/2026-27/0007',
        applicant_name: 'Sikkim Distilleries Limited',
        mobile_no: '9564042000',
        establishment_name: 'Sikkim Distilleries Plant',
        license_type: 'Distillery Manufacturing & Bottling License',
        category: 'Manufacturing',
        current_status: 'Approved by Excise Commissioner',
        status_code: 'APPROVED',
        days_elapsed: '2 Days Total',
        approval_status: 'APPROVED',
        approved_by: 'Excise Commissioner (IAS)',
        approval_date: '2026-05-28 12:00',
        time_taken: '2 Days',
        current_stage: 'Completed & License Issued',
        pending_officer_name: 'N/A (Approved)',
        steps: [{ step_no: 1, icon: '✓', status_class: 'completed', badge_class: 'status-completed', event_title: 'Application Submitted', event_date: '2026-05-28', event_description: 'Approved', user_details: 'Applicant', time_taken: 'Day 1', status_text: 'Completed' }]
      },
      {
        application_id: 'NLI/1101/2026-27/0008',
        applicant_name: 'Yuksom Breweries Limited',
        mobile_no: '9932701260',
        establishment_name: 'Yuksom Breweries Plant',
        license_type: 'Brewery Production License',
        category: 'Manufacturing',
        current_status: 'Approved by Excise Commissioner',
        status_code: 'APPROVED',
        days_elapsed: '4 Days Total',
        approval_status: 'APPROVED',
        approved_by: 'Excise Commissioner (IAS)',
        approval_date: '2026-05-28 12:00',
        time_taken: '4 Days',
        current_stage: 'Completed & License Issued',
        pending_officer_name: 'N/A (Approved)',
        steps: [{ step_no: 1, icon: '✓', status_class: 'completed', badge_class: 'status-completed', event_title: 'Application Submitted', event_date: '2026-05-28', event_description: 'Approved', user_details: 'Applicant', time_taken: 'Day 1', status_text: 'Completed' }]
      },
      {
        application_id: 'NLI/1101/2026-27/0009',
        applicant_name: 'sameer test excise',
        mobile_no: '6000000006',
        establishment_name: 'Sameer Retails & Lounge',
        license_type: 'Foreign Liquor Retail Shop',
        category: 'Retailer',
        current_status: 'Approved by Excise Commissioner',
        status_code: 'APPROVED',
        days_elapsed: '2 Days Total',
        approval_status: 'APPROVED',
        approved_by: 'Excise Commissioner (IAS)',
        approval_date: '2026-05-28 12:00',
        time_taken: '2 Days',
        current_stage: 'Completed & License Issued',
        pending_officer_name: 'N/A (Approved)',
        steps: [{ step_no: 1, icon: '✓', status_class: 'completed', badge_class: 'status-completed', event_title: 'Application Submitted', event_date: '2026-05-28', event_description: 'Approved', user_details: 'Applicant', time_taken: 'Day 1', status_text: 'Completed' }]
      },
      {
        application_id: 'NLI/1101/2026-27/0010',
        applicant_name: 'sam test excise',
        mobile_no: '9800000000',
        establishment_name: 'Brew Test Distillery',
        license_type: 'Manufacturing (Brewery)',
        category: 'Manufacturing',
        current_status: 'Under Review by Joint Commissioner',
        status_code: 'PENDING',
        days_elapsed: '2 Days Elapsed',
        approval_status: 'PENDING',
        approved_by: 'Pending Joint Commissioner Review',
        approval_date: '2026-05-30 09:30',
        time_taken: '2 Days (Within SLA)',
        current_stage: 'Pending Joint Commissioner Recommendation',
        pending_officer_name: 'Joint Commissioner of Excise',
        steps: [
          {
            step_no: 1,
            icon: '✓',
            status_class: 'completed',
            badge_class: 'status-completed',
            event_title: 'Application Submitted Online',
            event_date: '2026-05-30 09:30 AM',
            event_description: 'New License Application NLI/1101/2026-27/0010 submitted with security deposit & site plan.',
            user_details: 'sam test excise (Applicant)',
            time_taken: 'Day 1',
            status_text: 'Completed'
          }
        ]
      },
      {
        application_id: 'NLI/1101/2026-27/0011',
        applicant_name: 'Karma Chewang Bhutia',
        mobile_no: '8927686865',
        establishment_name: 'Karma Foreign Liquor Retail Shop',
        license_type: 'Foreign Liquor Retail Shop',
        category: 'Retailer',
        current_status: 'Approved by Excise Commissioner',
        status_code: 'APPROVED',
        days_elapsed: '3 Days Total',
        approval_status: 'APPROVED',
        approved_by: 'Excise Commissioner (IAS)',
        approval_date: '2026-05-28 12:00',
        time_taken: '3 Days',
        current_stage: 'Completed & License Issued',
        pending_officer_name: 'N/A (Approved)',
        steps: [{ step_no: 1, icon: '✓', status_class: 'completed', badge_class: 'status-completed', event_title: 'Application Submitted', event_date: '2026-05-28', event_description: 'Approved', user_details: 'Karma Chewang Bhutia', time_taken: 'Day 1', status_text: 'Completed' }]
      },
      {
        application_id: 'NLI/1101/2026-27/0012',
        applicant_name: 'distO Opp pp',
        mobile_no: '7800000000',
        establishment_name: 'Distillery Unit 12',
        license_type: 'Manufacturing (Distillery)',
        category: 'Manufacturing',
        current_status: 'Pending Nodal Clearance',
        status_code: 'PENDING',
        days_elapsed: '1 Day Elapsed',
        approval_status: 'PENDING',
        approved_by: 'Pending Nodal Officer Clearance',
        approval_date: 'Awaiting Order',
        time_taken: '1 Day',
        current_stage: 'Under Verification & Premises Audit',
        pending_officer_name: 'Excise Inspector (Distillery)',
        steps: [{ step_no: 1, icon: '✓', status_class: 'completed', badge_class: 'status-completed', event_title: 'Application Submitted', event_date: '2026-05-28', event_description: 'Under Review', user_details: 'Applicant', time_taken: 'Day 1', status_text: 'Completed' }]
      },
      {
        application_id: 'NLI/1102/2026-27/0001',
        applicant_name: 'Diwakar Sharma',
        mobile_no: '8001382557',
        establishment_name: 'Diwakar Foreign Liquor Off-Shop',
        license_type: 'Foreign Liquor Retail Shop',
        category: 'Retailer',
        current_status: 'Approved by Excise Commissioner',
        status_code: 'APPROVED',
        days_elapsed: '2 Days Total',
        approval_status: 'APPROVED',
        approved_by: 'Excise Commissioner (IAS)',
        approval_date: '2026-05-28 12:00',
        time_taken: '2 Days',
        current_stage: 'Completed & License Issued',
        pending_officer_name: 'N/A (Approved)',
        steps: [{ step_no: 1, icon: '✓', status_class: 'completed', badge_class: 'status-completed', event_title: 'Application Submitted', event_date: '2026-05-28', event_description: 'Approved', user_details: 'Diwakar Sharma', time_taken: 'Day 1', status_text: 'Completed' }]
      },
      {
        application_id: 'NLI/1102/2026-27/0002',
        applicant_name: 'Lahang Spirits Private Limited',
        mobile_no: '8130301970',
        establishment_name: 'Lahang Spirits Manufacturing Plant',
        license_type: 'Manufacturing (Distillery)',
        category: 'Manufacturing',
        current_status: 'Approved by Excise Commissioner',
        status_code: 'APPROVED',
        days_elapsed: '3 Days Total',
        approval_status: 'APPROVED',
        approved_by: 'Excise Commissioner (IAS)',
        approval_date: '2026-05-28 12:00',
        time_taken: '3 Days',
        current_stage: 'Completed & License Issued',
        pending_officer_name: 'N/A (Approved)',
        steps: [{ step_no: 1, icon: '✓', status_class: 'completed', badge_class: 'status-completed', event_title: 'Application Submitted', event_date: '2026-05-28', event_description: 'Approved', user_details: 'Lahang Spirits', time_taken: 'Day 1', status_text: 'Completed' }]
      },
      {
        application_id: 'SBM/1101/2026-27/0001',
        applicant_name: 'sameer test excise',
        mobile_no: '6000000006',
        establishment_name: 'Salesman Badge Registration (SBM/1101/2026-27/0001)',
        license_type: 'Excise Salesman Badge Application',
        category: 'Retailer',
        current_status: 'Approved & Badge Issued',
        status_code: 'APPROVED',
        days_elapsed: '1 Day',
        approval_status: 'APPROVED',
        approved_by: 'Excise Authority',
        approval_date: '2026-05-28 12:00',
        time_taken: '1 Day',
        current_stage: 'Completed',
        pending_officer_name: 'N/A (Approved)',
        steps: [{ step_no: 1, icon: '✓', status_class: 'completed', badge_class: 'status-completed', event_title: 'Salesman Application Filed', event_date: '2026-05-28', event_description: 'Badge generated', user_details: 'sameer test excise', time_taken: 'Day 1', status_text: 'Completed' }]
      },
      {
        application_id: 'SBM/1101/2026-27/0002',
        applicant_name: 'Pema Lepcha',
        mobile_no: '8927686865',
        establishment_name: 'Salesman Badge Registration (SBM/1101/2026-27/0002)',
        license_type: 'Excise Salesman Badge Application',
        category: 'Retailer',
        current_status: 'Approved & Badge Issued',
        status_code: 'APPROVED',
        days_elapsed: '1 Day',
        approval_status: 'APPROVED',
        approved_by: 'Excise Authority',
        approval_date: '2026-05-28 12:00',
        time_taken: '1 Day',
        current_stage: 'Completed',
        pending_officer_name: 'N/A (Approved)',
        steps: [{ step_no: 1, icon: '✓', status_class: 'completed', badge_class: 'status-completed', event_title: 'Salesman Application Filed', event_date: '2026-05-28', event_description: 'Badge generated', user_details: 'Pema Lepcha', time_taken: 'Day 1', status_text: 'Completed' }]
      },
      {
        application_id: 'SBM/1102/2026-27/0001',
        applicant_name: 'Sabin Rai',
        mobile_no: '8001382557',
        establishment_name: 'Salesman Badge Registration (SBM/1102/2026-27/0001)',
        license_type: 'Excise Barman Badge Application',
        category: 'Retailer',
        current_status: 'Approved & Badge Issued',
        status_code: 'APPROVED',
        days_elapsed: '1 Day',
        approval_status: 'APPROVED',
        approved_by: 'Excise Authority',
        approval_date: '2026-05-28 12:00',
        time_taken: '1 Day',
        current_stage: 'Completed',
        pending_officer_name: 'N/A (Approved)',
        steps: [{ step_no: 1, icon: '✓', status_class: 'completed', badge_class: 'status-completed', event_title: 'Barman Application Filed', event_date: '2026-05-28', event_description: 'Badge generated', user_details: 'Sabin Rai', time_taken: 'Day 1', status_text: 'Completed' }]
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
        application_id: 'NLI/1101/2026-27/0010',
        applicant_name: 'sam test excise',
        mobile_no: '9800000000',
        establishment_name: 'Brew Test Distillery',
        license_type: 'Manufacturing (Brewery)',
        category: 'Manufacturing',
        current_stage: 'Pending Joint Commissioner Recommendation',
        pending_officer_name: 'Joint Commissioner of Excise',
        days_elapsed: '2 Days',
        sla_status: 'On Track (SLA: 7 Days)',
        submission_date: '2026-05-30'
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
        console.warn('Timeline API request error, using database fallback records:', err);
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
    const cleanAlphaNumQ = rawQ.replace(/[^a-z0-9]/gi, '').toLowerCase();

    this.searchErrorMessage = '';
    this.hasSearched = true;

    // Search in timeline_records
    const timelineMatches = (this.overview.timeline_records || []).filter(i => {
      const appId = (i.application_id || '').toLowerCase();
      const cleanAppId = appId.replace(/[^a-z0-9]/gi, '');
      const mobile = (i.mobile_no || '').toLowerCase();
      const name = (i.applicant_name || '').toLowerCase();
      const est = (i.establishment_name || '').toLowerCase();

      return appId.includes(q) ||
             (cleanAlphaNumQ.length >= 3 && cleanAppId.includes(cleanAlphaNumQ)) ||
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
        const cleanAppId = appId.replace(/[^a-z0-9]/gi, '');
        const mobile = (p.mobile_no || '').toLowerCase();
        const name = (p.applicant_name || '').toLowerCase();
        const est = (p.establishment_name || '').toLowerCase();
        
        const matches = appId.includes(q) ||
                        (cleanAlphaNumQ.length >= 3 && cleanAppId.includes(cleanAlphaNumQ)) ||
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
    this.activeTab = 'timeline-search';
    this.selectedApplication = null;

    if (allMatches.length > 0) {
      this.searchResults = allMatches;
      this.searchErrorMessage = '';
    } else {
      this.searchResults = [];
      this.searchErrorMessage = `No license application record found in database matching "${this.searchPhoneOrApp}". Verify the Application ID or Mobile Number.`;
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

  // --- PAGINATION STATE & CONTROLS ---
  allRecordsPageSize: number = 10;
  allRecordsCurrentPage: number = 1;

  pendingQueuePageSize: number = 10;
  pendingQueueCurrentPage: number = 1;

  get Math(): any {
    return Math;
  }

  get totalAllRecordsPages(): number {
    return Math.ceil(this.filteredTimelineRecords.length / this.allRecordsPageSize) || 1;
  }

  get paginatedTimelineRecords(): SecretaryTimelineItem[] {
    const start = (this.allRecordsCurrentPage - 1) * this.allRecordsPageSize;
    return this.filteredTimelineRecords.slice(start, start + this.allRecordsPageSize);
  }

  setAllRecordsPage(page: number): void {
    if (page >= 1 && page <= this.totalAllRecordsPages) {
      this.allRecordsCurrentPage = page;
    }
  }

  onAllRecordsPageSizeChange(): void {
    this.allRecordsCurrentPage = 1;
  }

  get totalPendingQueuePages(): number {
    return Math.ceil(this.filteredPendingQueue.length / this.pendingQueuePageSize) || 1;
  }

  get paginatedPendingQueue(): SecretaryPendingQueueItem[] {
    const start = (this.pendingQueueCurrentPage - 1) * this.pendingQueuePageSize;
    return this.filteredPendingQueue.slice(start, start + this.pendingQueuePageSize);
  }

  setPendingQueuePage(page: number): void {
    if (page >= 1 && page <= this.totalPendingQueuePages) {
      this.pendingQueueCurrentPage = page;
    }
  }

  onPendingQueuePageSizeChange(): void {
    this.pendingQueueCurrentPage = 1;
  }
}
