import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectorRef, ElementRef, AfterViewInit, inject } from '@angular/core';
import { CommonModule, DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { EnaRequisitionService } from '../../core/services/ena-requisition.service';
import { SupplyChainService } from '../licensee/supplyChain/services/supplychain.service';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, forkJoin, finalize, of, catchError, interval, skip, take, map, tap } from 'rxjs';

import { DashboardConfig, User } from '../../core/models/dashboard.models';
import { RoleService } from '../../core/services/role.service';
import { TimerConfigService } from '../../core/services/timer-config.service';
import { RenewalConfigService } from '../../core/services/renewal-config.service';
import { DashboardConfigService } from '../../core/services/dashboard-config.service';
import { secureRandomFloat, secureRandomInt } from '../../core/utils/secure-random';
import { UnifiedDashboardService } from '../../core/services/unified-dashboard.service';
import { LicenseMeService } from '../../core/services/license-me.service';
import { UnifiedApplication } from '../../core/models/unified-application.model';
import { DashboardCount } from '../../core/models/dashboard.model';
import { MatTableDataSource } from '@angular/material/table';
import { ApplicationTableComponent } from '../licensee/licensee-dashboard/application-table/application-table.component';
import { SalesmanBarmanRegistrationService } from '../../core/services/salesman-barman-registration.service';
import { AccountService } from '../../core/services/account.service';
import { HologramDataService } from '../licensee/supplyChain/services/hologram-data.service';
import { SidebarPendingBadgeService } from '../../shared/services/sidebar-pending-badge.service';
import { CompanyRegistrationService } from '../../core/services/company-registration.service';
import { CompanyCollaborationService } from '../../core/services/company-collaboration.service';
import Swal from 'sweetalert2';
import { environment } from '../../../environments/environment';
import {
  filterRowsForSupplyChainSidebarMenus,
  isLicenseeWalletNavEligible
} from '../../shared/utils/wallet-nav-eligibility.util';

// Supply Chain Components
import { RequisitionComponent } from '../licensee/supplyChain/supplychaincomponents/requisition/requisition.component';
import { RevalidationComponent } from '../licensee/supplyChain/supplychaincomponents/revalidation/revalidation.component';
import { CancellationComponent } from '../licensee/supplyChain/supplychaincomponents/cancellation/cancellation.component';
import { TransitComponent } from '../licensee/supplyChain/supplychaincomponents/transit/transit.component';
import { OicTransitPermitComponent } from '../licensee/supplyChain/supplychaincomponents/oic-transit-permit/oic-transit-permit.component';
import { HologramprocurementComponent } from '../licensee/supplyChain/supplychaincomponents/hologramprocurement/hologramprocurement.component';
import { HologramrequestComponent } from '../licensee/supplyChain/supplychaincomponents/hologramrequest/hologramrequest.component';
import { TransitPermitComponent } from '../licensee/supplyChain/transit-permit/transit-permit.component';
import { ImportPermitComponent } from '../licensee/supplyChain/import-permit/import-permit.component';
import { Hologramrequestlevel1Component } from '../licensee/supplyChain/HoloGram/hologramrequestlevel1/hologramrequestlevel1.component';
import { HologramComponent } from '../licensee/supplyChain/HoloGram/hologram/hologram.component';
import { NewLicenseDashboardComponent } from '../licensee/supplyChain/supplychaincomponents/new-license/new-license-dashboard.component';
import { LicenseRenewalDashboardComponent } from '../licensee/supplyChain/supplychaincomponents/license-renewal/license-renewal-dashboard.component';
import { SpecialPermitDashboardComponent } from '../licensee/supplyChain/supplychaincomponents/special-permit/special-permit-dashboard.component';
import { RegistrationManagementComponent } from '../licensee/supplyChain/supplychaincomponents/registration-management/registration-management.component';
import { PaymentConfirmationComponent } from '../licensee/supplyChain/payments/paymentconformationpage/payment-confirmation.component';

// Officer-specific Components
import { HologramMonthlyReportComponent } from '../licensee/supplyChain/registers/hologram-monthly-report/hologram-monthly-report.component';
import { HologramdetailsComponent } from '../licensee/supplyChain/HoloGram/hologramdetails/hologramdetails.component';
import { OfficerinchargehologramreqComponent } from '../licensee/supplyChain/HoloGram/officerinchargehologramreq/officerinchargehologramreq.component';
import { OicdailyhologramregisterComponent } from '../licensee/supplyChain/registers/oicdailyhologramregister/oicdailyhologramregister.component';
import { BrandwarehouseComponent } from '../licensee/supplyChain/registers/brandwarehouse/brandwarehouse.component';
import { OicBlDetailsComponent } from '../admin/officer-in-charge/oic-bl-details/oic-bl-details.component';
import { ITCELLComponent } from '../admin/it-cell/itcell.component';
import { HologramoveriewComponent } from '../licensee/supplyChain/HoloGram/hologramoveriew/hologramoveriew.component';
import { DailyhologramrecordregisterComponent } from '../admin/commissioner/dailyhologramrecordregister/dailyhologramrecordregister.component';

// Role-specific Dashboard Components
import { PermitSectionDashboardComponent } from './role-components/permit-section-dashboard.component';
import { CommissionerDashboardComponent as CommissionerDashboard } from '../admin/commissioner/commissioner-dashboard/commissioner-dashboard.component';
import { ITCellDashboardComponent } from './role-components/itcell-dashboard.component';
import { OfficerInChargeDashboardComponent } from './role-components/officer-in-charge-dashboard.component';
import { PrepareApplicationComponent as CompanyPrepareApplicationComponent } from '../licensee/company-registration-and-collaboration/company-registration/prepare-application/prepare-application.component';
import { PrepareApplicationComponent as CompanyCollaborationPrepareApplicationComponent } from '../licensee/company-registration-and-collaboration/company-collaboration/prepare-application/prepare-application.component';
import { PrepareApplicationComponent as SalesmanPrepareApplicationComponent } from '../licensee/salesman-registration/prepare-application.component';
import { LabelRegistrationPrepareApplicationComponent } from '../licensee/label-registration/prepare-application/prepare-application.component';
import { ApplyNewLicenseComponent } from '../licensee/apply-new-license/apply-new-license.component';
import { ApplySpecialPermitComponent } from '../licensee/special-permit/apply-special-permit.component';
import { DistributorPermitComponent } from '../licensee/distributor-permit/distributor-permit.component';
import { DistributorPermitService } from '../../core/services/distributor-permit.service';
import { SingleWindowComponent } from '../single-window/single-window.component';
import { SingleWindowDetailComponent } from '../single-window/single-window-detail.component';
import { PaymentTransactionsComponent } from '../admin/payment-transactions/payment-transactions.component';

/** Module-level constant — created once, never reassigned, so ng2-charts never triggers re-render loops */
const CHART_BAR_LABELS_PLUGIN = [{
  id: 'barValueLabels',
  afterDatasetsDraw(chart: any) {
    const ctx = chart.ctx;
    const barColors = ['#4F46E5', '#F59E0B', '#10B981', '#F97316', '#EF4444'];
    chart.data.datasets.forEach((dataset: any, datasetIndex: number) => {
      const meta = chart.getDatasetMeta(datasetIndex);
      if (!meta.hidden) {
        meta.data.forEach((bar: any, index: number) => {
          const value = dataset.data[index];
          if (value != null && value > 0) {
            ctx.save();
            ctx.fillStyle = barColors[index] || '#374151';
            ctx.font = 'bold 14px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(value, bar.x, bar.y - 4);
            ctx.restore();
          }
        });
      }
    });
  }
}];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgIf,
    NgFor,
    NgClass,
    DatePipe,
    MatIconModule,
    BaseChartDirective,
    MatButtonModule,
    MatCardModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatTabsModule,
    MatBadgeModule,
    MatProgressSpinnerModule,
    ApplicationTableComponent,
    // Supply Chain Components
    RequisitionComponent,
    RevalidationComponent,
    CancellationComponent,
    TransitComponent,
    OicTransitPermitComponent,
    HologramprocurementComponent,
    HologramrequestComponent,
    TransitPermitComponent,
    ImportPermitComponent,
    Hologramrequestlevel1Component,
    HologramComponent,
    NewLicenseDashboardComponent,
    LicenseRenewalDashboardComponent,
    SpecialPermitDashboardComponent,
    RegistrationManagementComponent,
    PaymentConfirmationComponent,
    // Officer-specific Components
    HologramMonthlyReportComponent,
    HologramdetailsComponent,
    OfficerinchargehologramreqComponent,
    OicdailyhologramregisterComponent,
    BrandwarehouseComponent,
    OicBlDetailsComponent,
    ITCELLComponent,
    HologramoveriewComponent,
    DailyhologramrecordregisterComponent,
    // Role-specific Dashboard Components
    PermitSectionDashboardComponent,
    CommissionerDashboard,
    ITCellDashboardComponent,
    OfficerInChargeDashboardComponent,
    CompanyPrepareApplicationComponent,
    CompanyCollaborationPrepareApplicationComponent,
    SalesmanPrepareApplicationComponent,
    LabelRegistrationPrepareApplicationComponent,
    ApplyNewLicenseComponent,
    ApplySpecialPermitComponent,
    DistributorPermitComponent,
    SingleWindowComponent,
    SingleWindowDetailComponent,
    PaymentTransactionsComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild(DailyhologramrecordregisterComponent)
  private dailyHologramWorkingRecords?: DailyhologramrecordregisterComponent;

  @ViewChild('bubbleCanvas') bubbleCanvasRef?: ElementRef<HTMLCanvasElement>;
  public readonly enableDashboardBubbles = false;
  private canvasAnimationId?: number;
  private canvasResizeListener?: () => void;
  private bubbles: any[] = [];

  private destroy$ = new Subject<void>();
  private readonly licenseApiBase = `${environment.apiBaseUrl}/masters/license`;
  private readonly newLicenseApiBase = `${environment.apiBaseUrl}/transactional/new_license_application`;
  private dashboardInitLoadHandled = false;
  private dashboardLoadInFlight = false;

  dashboardConfig!: DashboardConfig;
  currentUser: User | null = null;
  dashboardData: any = {};
  isLoading = false;
  isChartLoading = true;
  error: string | null = null;

  // Professional dashboard properties (from licensee dashboard)
  renewalWarnings: any[] = [];
  dashboardCounts: DashboardCount & { awaitingPayment?: number } = {
    applied: 0,
    pending: 0,
    objection: 0,
    approved: 0,
    rejected: 0,
    awaitingPayment: 0
  };

  public singleWindowChartData: ChartConfiguration<'bar'>['data'] = {
    labels: ['Applied', 'Pending', 'Approved', 'Objection', 'Rejected'],
    datasets: [
      {
        data: [0, 0, 0, 0, 0],
        label: 'System Applications',
        backgroundColor: [
          'rgba(79, 70, 229, 0.18)',   // Applied (vibrant indigo)
          'rgba(245, 158, 11, 0.18)',  // Pending (warm amber)
          'rgba(16, 185, 129, 0.18)',  // Approved (emerald green)
          'rgba(249, 115, 22, 0.18)',  // Objection (orange)
          'rgba(239, 68, 68, 0.18)'    // Rejected (rose red)
        ],
        borderColor: [
          '#4F46E5',  // Applied
          '#F59E0B',  // Pending
          '#10B981',  // Approved
          '#F97316',  // Objection
          '#EF4444'   // Rejected
        ],
        borderWidth: 2,
        borderRadius: 8,
        barThickness: 45,
        hoverBackgroundColor: [
          'rgba(79, 70, 229, 0.35)',
          'rgba(245, 158, 11, 0.35)',
          'rgba(16, 185, 129, 0.35)',
          'rgba(249, 115, 22, 0.35)',
          'rgba(239, 68, 68, 0.35)'
        ],
        hoverBorderColor: [
          '#4F46E5',
          '#F59E0B',
          '#10B981',
          '#F97316',
          '#EF4444'
        ],
        hoverBorderWidth: 3
      }
    ]
  };

  public singleWindowChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    transitions: {
      active: {
        animation: {
          duration: 0
        }
      }
    },
    layout: {
      padding: { top: 30 }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(28, 43, 120, 0.9)',
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 12,
        displayColors: false,
        callbacks: {
          label: (context) => {
            return `Count: ${context.raw}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 13,
            weight: 'bold'
          },
          color: '#4b5563'
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          stepSize: 1,
          font: {
            size: 12
          },
          color: '#6b7280'
        }
      }
    }
  };

  // Reference to the module-level constant to avoid change-detection loops
  public readonly singleWindowChartPlugins = CHART_BAR_LABELS_PLUGIN;

  selectedChartModule = 'all';
  selectedChartMonth: number | string = '';
  selectedChartYear: number | string = '';

  public readonly chartMonthOptions: { label: string; value: number }[] = [
    { label: 'January', value: 1 }, { label: 'February', value: 2 },
    { label: 'March', value: 3 }, { label: 'April', value: 4 },
    { label: 'May', value: 5 }, { label: 'June', value: 6 },
    { label: 'July', value: 7 }, { label: 'August', value: 8 },
    { label: 'September', value: 9 }, { label: 'October', value: 10 },
    { label: 'November', value: 11 }, { label: 'December', value: 12 }
  ];

  public readonly chartYearOptions: number[] = (() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
  })();
  public readonly activityMonthOptions: { label: string; value: string }[] = this.buildActivityMonthOptions();
  detailedCounts: {
    total: DashboardCount & { awaitingPayment?: number };
    newLicense: DashboardCount & { awaitingPayment?: number };
    renewal: DashboardCount & { awaitingPayment?: number };
    salesman: DashboardCount & { awaitingPayment?: number };
    company: DashboardCount & { awaitingPayment?: number };
    companyCollaboration: DashboardCount & { awaitingPayment?: number };
    specialPermit: DashboardCount & { awaitingPayment?: number };
    labelRegistration?: DashboardCount & { awaitingPayment?: number };
  } = {
    total: { applied: 0, pending: 0, objection: 0, approved: 0, rejected: 0, awaitingPayment: 0 },
    newLicense: { applied: 0, pending: 0, objection: 0, approved: 0, rejected: 0, awaitingPayment: 0 },
    renewal: { applied: 0, pending: 0, objection: 0, approved: 0, rejected: 0, awaitingPayment: 0 },
    salesman: { applied: 0, pending: 0, objection: 0, approved: 0, rejected: 0, awaitingPayment: 0 },
    company: { applied: 0, pending: 0, objection: 0, approved: 0, rejected: 0, awaitingPayment: 0 },
    companyCollaboration: { applied: 0, pending: 0, objection: 0, approved: 0, rejected: 0, awaitingPayment: 0 },
    specialPermit: { applied: 0, pending: 0, objection: 0, approved: 0, rejected: 0, awaitingPayment: 0 },
    labelRegistration: { applied: 0, pending: 0, objection: 0, approved: 0, rejected: 0, awaitingPayment: 0 }
  };

  public showSpecialPermitChartOption = false;

  public getModuleTotal(moduleName: string): number {
    if (moduleName === 'all') {
      return (this.dashboardCounts.applied != null && this.dashboardCounts.applied > 0)
        ? this.dashboardCounts.applied
        : (this.dashboardCounts.pending || 0) +
          (this.dashboardCounts.approved || 0) +
          (this.dashboardCounts.objection || 0) +
          (this.dashboardCounts.rejected || 0) +
          (this.dashboardCounts.awaitingPayment || 0);
    }

    const scModules = ['requisition', 'revalidation', 'cancellation', 'transit', 'hologram'];
    if (scModules.includes(moduleName)) {
      const counts = this.supplyChainModuleCounts[moduleName];
      if (counts?.applied != null && counts.applied > 0) return counts.applied;
      return (counts?.pending || 0) + (counts?.approved || 0) + (counts?.objection || 0) + (counts?.rejected || 0) + ((counts as any)?.awaitingPayment || 0);
    }

    let sourceCounts: DashboardCount = this.dashboardCounts;

    if (moduleName === 'newLicense') {
      sourceCounts = this.detailedCounts.newLicense;
    } else if (moduleName === 'renewal') {
      sourceCounts = this.detailedCounts.renewal;
    } else if (moduleName === 'salesman') {
      sourceCounts = this.detailedCounts.salesman;
    } else if (moduleName === 'company') {
      const sc = this.supplyChainModuleCounts['company'];
      const hasSc = sc && ((sc.applied || 0) > 0 || (sc.pending || 0) > 0 || (sc.approved || 0) > 0);
      sourceCounts = hasSc ? sc : this.detailedCounts.company;
    } else if (moduleName === 'companyCollaboration' || moduleName === 'company-collaboration') {
      const sc = this.supplyChainModuleCounts['company-collaboration'];
      const hasSc = sc && ((sc.applied || 0) > 0 || (sc.pending || 0) > 0 || (sc.approved || 0) > 0);
      sourceCounts = hasSc ? sc : this.detailedCounts.companyCollaboration;
    } else if (moduleName === 'specialPermit') {
      sourceCounts = this.detailedCounts.specialPermit;
    } else if (moduleName === 'label-registration' || moduleName === 'labelRegistration') {
      sourceCounts = this.detailedCounts.labelRegistration || { applied: 0, pending: 0, approved: 0, objection: 0, rejected: 0 };
    } else if (this.supplyChainModuleCounts[moduleName]) {
      sourceCounts = this.supplyChainModuleCounts[moduleName];
    }

    if (!sourceCounts) return 0;

    if (sourceCounts.applied != null && sourceCounts.applied > 0) {
      return sourceCounts.applied;
    }

    return (sourceCounts.pending || 0) +
           (sourceCounts.approved || 0) +
           (sourceCounts.objection || 0) +
           (sourceCounts.rejected || 0) +
           ((sourceCounts as any).awaitingPayment || 0);
  }

  updateSingleWindowChart(): void {
    if (this.isOicUser()) {
      this.singleWindowChartData = {
        ...this.singleWindowChartData,
        datasets: [
          {
            ...this.singleWindowChartData.datasets[0],
            data: [
              this.getFilteredCount('applied'),
              this.getFilteredCount('pending'),
              this.getFilteredCount('approved'),
              this.getFilteredCount('objection'),
              this.getFilteredCount('rejected')
            ]
          }
        ]
      };
      return;
    }

    const isITCell = this.currentUser?.roleId === 6;
    const isPermitSection = Number(this.currentUser?.roleId || 0) === 5;
    const isCommissioner  = this.isCommissionerUser();

    // For IT Cell, "All Modules" means hologram only — redirect to hologram counts
    const effectiveModule = (isITCell && this.selectedChartModule === 'all')
      ? 'hologram'
      : this.selectedChartModule;

    let sourceCounts = this.dashboardCounts;
    if (effectiveModule === 'newLicense') {
      sourceCounts = this.detailedCounts.newLicense;
    } else if (effectiveModule === 'renewal') {
      sourceCounts = this.detailedCounts.renewal;
    } else if (effectiveModule === 'salesman') {
      sourceCounts = this.detailedCounts.salesman;
    } else if (effectiveModule === 'company' && (this.supplyChainModuleCounts['company']?.applied ?? 0) > 0) {
      // For permit section: company counts come from supplyChainModuleCounts (loaded from list API)
      sourceCounts = this.supplyChainModuleCounts['company'];
    } else if (effectiveModule === 'company') {
      sourceCounts = this.detailedCounts.company;
    } else if (effectiveModule === 'company-collaboration' && (this.supplyChainModuleCounts['company-collaboration']?.applied ?? 0) > 0) {
      sourceCounts = this.supplyChainModuleCounts['company-collaboration'];
    } else if (effectiveModule === 'company-collaboration') {
      sourceCounts = this.detailedCounts.companyCollaboration;
    } else if (effectiveModule === 'specialPermit') {
      sourceCounts = this.detailedCounts.specialPermit;
    } else if (effectiveModule === 'label-registration') {
      sourceCounts = this.detailedCounts.labelRegistration || { applied: 0, pending: 0, approved: 0, objection: 0, rejected: 0 };
    } else if (this.supplyChainModuleCounts[effectiveModule]) {
      sourceCounts = this.supplyChainModuleCounts[effectiveModule];
    }

    const isAllModules = this.selectedChartModule === 'all' && !isITCell;



    // For the Applied bar, use getModuleTotal() which accounts for roles where
    // the API returns applied=0 (admin/officer roles) by summing all statuses.
    // For supply chain modules, always use the stored count (0 if not yet loaded).
    const appliedValue = isAllModules
      ? this.getModuleTotal('all') + this.getSupplyChainAppliedTotal()
      : this.getModuleTotal(effectiveModule);

    this.singleWindowChartData = {
      ...this.singleWindowChartData,
      datasets: [
        {
          ...this.singleWindowChartData.datasets[0],
          data: [
            appliedValue,
            isAllModules
              ? (this.dashboardCounts.pending || 0) + this.getSupplyChainPendingTotal()
              : (sourceCounts.pending || 0),
            isAllModules
              ? (this.dashboardCounts.approved || 0) + this.getSupplyChainApprovedTotal()
              : (sourceCounts.approved || 0),
            isAllModules
              ? (this.dashboardCounts.objection || 0) + this.getSupplyChainObjectionTotal()
              : (sourceCounts.objection || 0),
            isAllModules
              ? (this.dashboardCounts.rejected || 0) + this.getSupplyChainRejectedTotal()
              : (sourceCounts.rejected || 0)
          ]
        }
      ]
    };
  }

  onChartModuleChange(moduleName: string): void {
    this.selectedChartModule = moduleName;
    this.updateSingleWindowChart();
  }

  public updateAvailableChartModules(): void {
    const roleId = this.getCurrentRoleId();
    const isITCell = roleId === 6;
    const isJointCommissioner = roleId === 9;

    // IT Cell only deals with Hologram Procurement
    if (isITCell) {
      this.availableChartModules = [
        { value: 'all', label: 'All Modules' },
        { value: 'hologram', label: 'Hologram Procurement' }
      ];
      return;
    }

    // Site Inquiry Officer only handles: New License, License Renewal, Salesman/Barman
    if (roleId === 8) {
      this.availableChartModules = [
        { value: 'all', label: 'All Modules' },
        { value: 'newLicense', label: 'New Licenses' },
        { value: 'renewal', label: 'Renewals' },
        { value: 'salesman', label: 'Salesman / Barman' }
      ];
      return;
    }

    // District User only handles: New License, License Renewal, Dry Day Permit, Salesman/Barman Registration
    if (roleId === 4) {
      this.availableChartModules = [
        { value: 'all', label: 'All Modules' },
        { value: 'newLicense', label: 'New Licenses' },
        { value: 'renewal', label: 'Renewals' },
        { value: 'specialPermit', label: 'Dry Day Permits' },
        { value: 'salesman', label: 'Salesman / Barman' }
      ];
      return;
    }

    // Joint Commissioner only handles: New License, License Renewal, Salesman/Barman
    if (isJointCommissioner) {
      this.availableChartModules = [
        { value: 'all', label: 'All Modules' },
        { value: 'newLicense', label: 'New Licenses' },
        { value: 'renewal', label: 'Renewals' },
        { value: 'salesman', label: 'Salesman / Barman' }
      ];
      return;
    }

    // Permit Section handles Requisitions, Company Registration, and Company Collaboration
    const isPermitSection = roleId === 5;
    if (isPermitSection) {
      this.availableChartModules = [
        { value: 'all', label: 'All Modules' },
        { value: 'requisition', label: 'Requisitions' },
        { value: 'company', label: 'Company Reg.' },
        { value: 'company-collaboration', label: 'Company Collab.' }
      ];
      return;
    }

    // Officer in Charge handles ONLY: Transit Applications, Bulk Spirit Details, Hologram Procurement, Hologram Requests
    const isOIC = this.isOicUser();
    if (isOIC) {
      this.availableChartModules = [
        { value: 'all', label: 'All Modules' },
        { value: 'transit', label: 'Transit Applications' },
        { value: 'bldetails', label: 'Bulk Spirit Details' },
        { value: 'hologram', label: 'Hologram Procurement' },
        { value: 'hologramRequests', label: 'Hologram Requests' }
      ];
      return;
    }

    // Distributor user handles: New Licenses, Renewals, IMFL Requisition, IMFL Revalidation, IMFL Cancellation, Company Reg, Company Collab, Salesman/Barman, Label Reg
    if (this.isDistributorUser()) {
      this.availableChartModules = [
        { value: 'all', label: 'All Modules' },
        { value: 'newLicense', label: 'New Licenses' },
        { value: 'renewal', label: 'Renewals' },
        { value: 'distributor-permit-requisition', label: 'IMFL Requisition' },
        { value: 'distributor-permit-revalidation', label: 'IMFL Revalidation' },
        { value: 'distributor-permit-cancellation', label: 'IMFL Cancellation' },
        { value: 'company', label: 'Company Reg.' },
        { value: 'company-collaboration', label: 'Company Collab.' },
        { value: 'salesman', label: 'Salesman / Barman' },
        { value: 'label-registration', label: 'Label Reg.' }
      ];
      return;
    }

    const modules = [
      { value: 'all', label: 'All Modules' },
      { value: 'newLicense', label: 'New Licenses' },
      { value: 'renewal', label: 'Renewals' },
      { value: 'salesman', label: 'Salesman / Barman' },
      { value: 'company', label: 'Company Reg.' },
      { value: 'company-collaboration', label: 'Company Collab.' },
      { value: 'label-registration', label: 'Label Reg.' }
    ];

    const isAdmin = roleId === 1 || roleId === 3;
    // isCommissioner here means the full Commissioner (roleId 10), not Joint Commissioner
    const isCommissioner = roleId === 10;

    if (isAdmin || isCommissioner || this.isDistributorUser()) {
      modules.push(
        { value: 'distributor-permit-requisition', label: 'IMFL Requisition' },
        { value: 'distributor-permit-revalidation', label: 'IMFL Revalidation' },
        { value: 'distributor-permit-cancellation', label: 'IMFL Cancellation' }
      );
    }

    // Distillery-only supply chain items: Requisition, Revalidation, Cancellation
    if (isAdmin || isCommissioner || this.showDistilleryMenus) {
      modules.push(
        { value: 'requisition', label: 'Requisitions' },
        { value: 'revalidation', label: 'Revalidations' },
        { value: 'cancellation', label: 'Cancellations' }
      );
    }

    // Brewery/Distillery/OIC supply chain items: Transit, Hologram
    if (isAdmin || isOIC || this.showBreweryOrDistilleryMenus) {
      modules.push({ value: 'transit', label: 'Transit Applications' });
    }
    if (isAdmin || isCommissioner || isOIC || this.showBreweryOrDistilleryMenus) {
      modules.push({ value: 'hologram', label: 'Hologram Procurement' });
    }
    if (this.showSpecialPermitChartOption) {
      modules.push({ value: 'specialPermit', label: 'Dry Day Permits' });
    }
    this.availableChartModules = modules;
  }

  public getFilteredCount(status: string): number {
    if (this.isOicUser()) {
      if (this.selectedChartModule === 'all') {
        const oicModules = ['transit', 'bldetails', 'hologram', 'hologramRequests'];
        return oicModules.reduce((sum, m) => sum + ((this.supplyChainModuleCounts[m] as any)?.[status] || 0), 0);
      }
      const sourceCounts = this.supplyChainModuleCounts[this.selectedChartModule] || { applied: 0, pending: 0, approved: 0, objection: 0, rejected: 0 };
      return (sourceCounts as any)[status] || 0;
    }

    let sourceCounts = this.dashboardCounts;
    if (this.selectedChartModule === 'newLicense') {
      sourceCounts = this.detailedCounts.newLicense;
    } else if (this.selectedChartModule === 'renewal') {
      sourceCounts = this.detailedCounts.renewal;
    } else if (this.selectedChartModule === 'salesman') {
      sourceCounts = this.detailedCounts.salesman;
    } else if (this.selectedChartModule === 'company' && (this.supplyChainModuleCounts['company']?.applied ?? 0) > 0) {
      // Permit section: company counts live in supplyChainModuleCounts
      sourceCounts = this.supplyChainModuleCounts['company'];
    } else if (this.selectedChartModule === 'company') {
      sourceCounts = this.detailedCounts.company;
    } else if (this.selectedChartModule === 'company-collaboration' && (this.supplyChainModuleCounts['company-collaboration']?.applied ?? 0) > 0) {
      sourceCounts = this.supplyChainModuleCounts['company-collaboration'];
    } else if (this.selectedChartModule === 'company-collaboration') {
      sourceCounts = this.detailedCounts.companyCollaboration;
    } else if (this.selectedChartModule === 'specialPermit') {
      sourceCounts = this.detailedCounts.specialPermit;
    } else if (this.selectedChartModule === 'label-registration') {
      sourceCounts = this.detailedCounts.labelRegistration || { applied: 0, pending: 0, approved: 0, objection: 0, rejected: 0 };
    } else if (this.supplyChainModuleCounts[this.selectedChartModule]) {
      sourceCounts = this.supplyChainModuleCounts[this.selectedChartModule];
    }

    if (status === 'applied') {
      if (this.selectedChartModule === 'all') {
        return this.getModuleTotal('all') + this.getSupplyChainAppliedTotal();
      }
      return this.getModuleTotal(this.selectedChartModule);
    }
    if (status === 'pending') {
      if (this.selectedChartModule === 'all') {
        return (this.dashboardCounts.pending || 0) + this.getSupplyChainPendingTotal();
      }
      return sourceCounts.pending || 0;
    }
    if (status === 'awaitingPayment') {
      if (this.selectedChartModule === 'all') {
        return (this.dashboardCounts.awaitingPayment || 0) + this.getSupplyChainAwaitingPaymentTotal();
      }
      return sourceCounts.awaitingPayment || 0;
    }
    if (status === 'approved') {
      if (this.selectedChartModule === 'all') {
        return (this.dashboardCounts.approved || 0) + this.getSupplyChainApprovedTotal();
      }
      return sourceCounts.approved || 0;
    }
    if (status === 'objection') {
      if (this.selectedChartModule === 'all') {
        return (this.dashboardCounts.objection || 0) + this.getSupplyChainObjectionTotal();
      }
      return sourceCounts.objection || 0;
    }
    if (status === 'rejected') {
      if (this.selectedChartModule === 'all') {
        return (this.dashboardCounts.rejected || 0) + this.getSupplyChainRejectedTotal();
      }
      return sourceCounts.rejected || 0;
    }
    return 0;
  }

  public loadSupplyChainModuleStats(
    prefetched?: { hologram?: any[]; requisition?: any[]; revalidation?: any[]; cancellation?: any[]; transit?: any[] },
    onComplete?: () => void
  ): void {
    const isAdminOrOfficer = [1, 3, 5, 6, 7, 9, 10].includes(Number(this.currentUser?.roleId || 0));
    if (!this.isLicenseeUser() && !isAdminOrOfficer) {
      onComplete?.();
      return;
    }
    if (!prefetched && this.supplyChainModuleStatsLoaded) {
      this.updateSingleWindowChart();
      onComplete?.();
      return;
    }

    const isPermitSection = Number(this.currentUser?.roleId || 0) === 5;
    const isCommissioner  = this.isCommissionerUser();
    const isJointComm     = Number(this.currentUser?.roleId || 0) === 9;
    const isITCell        = this.currentUser?.roleId === 6;
    const skipTransit     = isCommissioner || isJointComm || isPermitSection;

    // For a licensee user, skip all full-list supply chain fetches on login.
    // Data is only fetched lazily when the user selects a specific chart module.
    // If prefetched data is provided (from lazy load), use it directly.
    const isLicensee = this.isLicenseeUser();

    // Build observables — reuse prefetched data where available to avoid duplicate HTTP calls.
    const req$ = prefetched?.requisition
      ? of(prefetched.requisition)
      : this.enaRequisitionService.getRequisitions().pipe(
          map((r: any) => Array.isArray(r) ? r : (r?.results || [])),
          catchError(() => of([]))
        );

    const rev$ = prefetched?.revalidation
      ? of(prefetched.revalidation)
      : this.supplyChainService.getRevalidationData().pipe(catchError(() => of([])));

    const can$ = prefetched?.cancellation
      ? of(prefetched.cancellation)
      : this.supplyChainService.getCancellationData().pipe(catchError(() => of([])));

    const tra$ = (skipTransit)
      ? (prefetched?.transit ? of(prefetched.transit) : of([] as any[]))
      : prefetched?.transit
        ? of(prefetched.transit)
        : this.supplyChainService.getTransitPermits().pipe(catchError(() => of([])));

    const hol$ = isPermitSection
      ? of([] as any[])
      : prefetched?.hologram
        ? of(prefetched.hologram)
        : this.hologramService.getProcurements().pipe(catchError(() => of([])));

    // Company registration — only for Permit Section
    const comp$ = isPermitSection
      ? this.companyRegistrationService.getApplicationsByStatus().pipe(catchError(() => of({})))
      : of(null as any);

    // Company collaboration — for Permit Section and Commissioner
    const collab$ = (isPermitSection || isCommissioner)
      ? this.companyCollaborationService.getDashboardCounts().pipe(catchError(() => of(null)))
      : of(null as any);

    const isOIC = this.isOicUser();
    const bld$ = isOIC
      ? this.enaRequisitionService.getRequisitionArrivalDetailsByStatus('ALL').pipe(
          map((res: any) => Array.isArray(res) ? res : (res?.data || res?.results || [])),
          catchError(() => of([]))
        )
      : of([] as any[]);

    const holReq$ = isOIC
      ? this.hologramService.getRequests().pipe(catchError(() => of([])))
      : of([] as any[]);

    const dist$ = (this.isDistributorUser() || isAdminOrOfficer)
      ? this.distributorPermitService.listApplications().pipe(catchError(() => of([] as any[])))
      : of([] as any[]);

    forkJoin({ req: req$, rev: rev$, can: can$, tra: tra$, hol: hol$, comp: comp$, collab: collab$, bld: bld$, holReq: holReq$, dist: dist$ })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => onComplete?.())
      )
      .subscribe(({ req, rev, can, tra, hol, comp, collab, bld, holReq, dist }) => {

        // ── REQUISITIONS ──────────────────────────────────────────────────────
        {
          const items: any[] = Array.isArray(req) ? req : [];
          let pending = (isCommissioner || isPermitSection)
            ? this.sidebarPendingBadgeService.countActionable(items, ['APPROVE', 'REJECT', 'FORWARD', 'VERIFY'])
            : this.sidebarPendingBadgeService.countRequisitionPendingReview(items, false);
          // For Permit Section / Commissioner: PENDING status = application just submitted, awaiting review.
          // The backend may not populate allowedActions at this initial stage, so countActionable
          // can return 0 even when there are actionable records. Add any items not already
          // counted that are at this role's stage (plain PENDING or forwarded-to-role status).
          if (isPermitSection || isCommissioner) {
            const actionableIds = new Set(
              items
                .filter(x => {
                  const acts: string[] = (x.allowedActions ?? x.allowed_actions ?? []).map((a: any) => String(a).toUpperCase());
                  return acts.some(a => ['APPROVE','REJECT','FORWARD','VERIFY'].includes(a));
                })
                .map(x => x.id)
            );
            const extraPending = items.filter(x => {
              if (actionableIds.has(x.id)) return false; // already counted
              const st = String(x.status || x.current_stage_name || x.currentStageName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
              if (st.includes('approv') || st.includes('reject') || st.includes('cancel')) return false;
              // Plain PENDING (just submitted)
              if (st === 'pending') return true;
              // Permit Section: payslip forwarded back to PS for action (e.g. "FORWARDED PAYSLIP PERMIT SECTION")
              if (isPermitSection && st.includes('permitsection') &&
                  (st.includes('forward') || st.includes('payslip') || st.includes('submit'))) return true;
              // Commissioner: forwarded to commissioner for review (e.g. "FORWARDED COMMISSIONER")
              if (isCommissioner && st.includes('commissioner') && st.includes('forward')) return true;
              return false;
            }).length;
            pending += extraPending;
          }
          const awaitingPayment = (isCommissioner || isPermitSection)
            ? 0
            : this.sidebarPendingBadgeService.countRequisitionAwaitingPayment(items);
          const approved = items.filter(x => {
            const status   = String(x.status || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const stage    = String(x.current_stage_name || x.currentStageName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const combined = `${status} ${stage}`;
            const stageId  = Number(x.current_stage ?? x.currentStage ?? -1);
            if (isCommissioner) {
              const isAwaitingPayment = combined.includes('approvedcommissioner') &&
                !['forwardedpayslip','approvedpayslip','rejectedpayslip','paymentcompleted','paymentdone','permitsection']
                  .some(m => combined.includes(m));
              if (isAwaitingPayment) return false;
              if (combined.includes('forwardedpayslip') && combined.includes('permitsection')) return false;
              if (combined.includes('rejectedpayslip')) return false;
              if (combined.includes('approvedpayslip')) return true;
              if (combined.includes('issued') || combined.includes('complete') || combined.includes('paymentcompleted')) return true;
              if (x.currentStageIsFinal === true && combined.includes('approv') && !combined.includes('reject')) return true;
              if (stageId > 33) return true;
              return false;
            }
            return (combined.includes('approved') || combined.includes('issued')) && !combined.includes('reject');
          }).length;
          const rejected = items.filter(x => {
            const combined = `${String(x.status||'').toLowerCase().replace(/[^a-z0-9]/g,'')} ${String(x.current_stage_name||x.currentStageName||'').toLowerCase().replace(/[^a-z0-9]/g,'')}`;
            if (isCommissioner) {
              if (combined.includes('rejectedpayslip')) return true;
              if (x.currentStageIsFinal === true && combined.includes('reject')) return true;
              return false;
            }
            return combined.includes('rejected') || combined.includes('cancelled');
          }).length;
          this.supplyChainModuleCounts['requisition'] = {
            applied: (isCommissioner || isPermitSection) ? (pending + approved + rejected) : items.length,
            pending: pending + awaitingPayment,
            approved,
            objection: 0,
            rejected,
            awaitingPayment: awaitingPayment
          };
          // feed badge counts too
          this.supplyChainPendingCounts['requisition'] = pending;
          if (this.isLicenseeUser()) {
            this.supplyChainPendingCounts['requisition:payment'] = awaitingPayment;
          }
        }

        // ── REVALIDATIONS ─────────────────────────────────────────────────────
        {
          const items: any[] = Array.isArray(rev) ? rev : [];
          const pending = (isCommissioner || isPermitSection)
            ? this.sidebarPendingBadgeService.countActionable(items, ['APPROVE', 'REJECT', 'FORWARD', 'VERIFY'])
            : this.sidebarPendingBadgeService.countLicenseePendingItems(items);
          const approved = items.filter(x => String(x.status || '').toLowerCase().includes('approved')).length;
          const rejected = items.filter(x => { const s = String(x.status||'').toLowerCase(); return s.includes('rejected') || s.includes('cancelled'); }).length;
          this.supplyChainModuleCounts['revalidation'] = { 
            applied: (isCommissioner || isPermitSection) ? (pending + approved + rejected) : items.length, 
            pending, 
            approved, 
            objection: 0, 
            rejected 
          };
          this.supplyChainPendingCounts['revalidation'] = pending;
        }

        // ── CANCELLATIONS ─────────────────────────────────────────────────────
        {
          const items: any[] = Array.isArray(can) ? can : [];
          const pending = (isCommissioner || isPermitSection)
            ? this.sidebarPendingBadgeService.countActionableWithStatusFallback(items, ['APPROVE', 'REJECT', 'FORWARD', 'VERIFY', 'APPROVEPAYSLIP', 'REJECTPAYSLIP'])
            : this.sidebarPendingBadgeService.countLicenseePendingItems(items);
          const approved = items.filter(x => String(x.status || '').toLowerCase().includes('approved')).length;
          const rejected = items.filter(x => { const s = String(x.status||'').toLowerCase(); return s.includes('rejected') || s.includes('cancelled'); }).length;
          this.supplyChainModuleCounts['cancellation'] = { 
            applied: (isCommissioner || isPermitSection) ? (pending + approved + rejected) : items.length, 
            pending, 
            approved, 
            objection: 0, 
            rejected 
          };
          this.supplyChainPendingCounts['cancellation'] = pending;
        }

        // ── TRANSIT PERMITS ───────────────────────────────────────────────────
        if (skipTransit) {
          this.supplyChainModuleCounts['transit'] = { applied: 0, pending: 0, approved: 0, objection: 0, rejected: 0 };
        } else {
          let raw: any[] = Array.isArray(tra) ? tra : [];
          if (this.isOicUser()) {
            raw = this.filterByOicScopedLicense(raw);
          }
          const billNos = new Set<string>();
          const items: any[] = [];
          raw.forEach(item => {
            const billNo = item.billNo || item.bill_no;
            if (billNo && !billNos.has(billNo)) { billNos.add(billNo); items.push(item); }
          });
          const pending  = this.isOicUser()
            ? items.filter(x => {
                const s = String(x.status || '').toLowerCase();
                return !s.includes('approved') && !s.includes('issued') && !s.includes('terminated') && !s.includes('cancelled');
              }).length
            : this.sidebarPendingBadgeService.countLicenseePendingItems(items);
          const approved = items.filter(x => { const s = String(x.status || '').toLowerCase(); return s.includes('approved') || s.includes('issued'); }).length;
          const rejected = items.filter(x => { const s = String(x.status||'').toLowerCase(); return s.includes('rejected') || s.includes('cancelled') || s.includes('terminated'); }).length;
          this.supplyChainModuleCounts['transit'] = { applied: items.length, pending, approved, objection: 0, rejected };
          if (this.isLicenseeUser() || this.isOicUser()) this.supplyChainPendingCounts['transit'] = pending;
        }

        // ── HOLOGRAMS ─────────────────────────────────────────────────────────
        if (isPermitSection) {
          this.supplyChainModuleCounts['hologram'] = { applied: 0, pending: 0, approved: 0, objection: 0, rejected: 0 };
        } else if (this.isOicUser()) {
          let items: any[] = Array.isArray(hol) ? hol : [];
          items = this.filterByOicScopedLicense(items);
          const oicCounts = this.countOicHologramProcurementStatus(items);
          this.supplyChainModuleCounts['hologram'] = {
            applied: oicCounts.applied,
            pending: oicCounts.pending,
            approved: oicCounts.approved,
            objection: 0,
            rejected: oicCounts.rejected,
            awaitingPayment: 0
          };
          this.supplyChainPendingCounts['hologram'] = oicCounts.pending;
        } else {
          let items: any[] = Array.isArray(hol) ? hol : [];
          let pending: number;
          if (isITCell) {
            pending = items.filter(item => {
              const t = String(item?.status ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
              if (t.includes('rejected') || t.includes('cancelled')) return false;
              return t.includes('submittedhp') || t.includes('submitted') ||
                     t.includes('underitcellreview') || t.includes('itcellreview');
            }).length;
          } else {
            pending = this.sidebarPendingBadgeService.countHologramPendingReview(items);
          }
          const awaitingPayment = (isITCell || isCommissioner) ? 0 : this.sidebarPendingBadgeService.countHologramAwaitingPayment(items);
          const approved = isITCell
            ? items.filter(x => {
                const t = String(x.status || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                if (t.includes('rejected') || t.includes('cancelled')) return false;
                return !(t.includes('submittedhp') || t.includes('submitted') || t.includes('underitcellreview') || t.includes('itcellreview'));
              }).length
            : items.filter(x => {
                const t = String(x.status || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                return t.includes('approved') || t.includes('issued') ||
                       t.includes('paymentcompleted') || t.includes('cartoonassigned') || t.includes('cartonassigned');
              }).length;
          const rejected = items.filter(x => { const s = String(x.status||'').toLowerCase(); return s.includes('rejected') || s.includes('cancelled'); }).length;
          this.supplyChainModuleCounts['hologram'] = {
            applied: (isCommissioner || isITCell) ? (pending + approved + rejected) : items.length,
            pending: pending + awaitingPayment,
            approved,
            objection: 0,
            rejected,
            awaitingPayment: awaitingPayment
          };
          if (this.isLicenseeUser()) {
            this.supplyChainPendingCounts['hologram'] = pending;
            this.supplyChainPendingCounts['hologram:payment'] = awaitingPayment;
          }
        }

        // ── BULK SPIRIT DETAILS (OIC) ─────────────────────────────────────────
        if (this.isOicUser()) {
          this.rawOicData = {
            transit: Array.isArray(tra) ? tra : [],
            bldetails: Array.isArray(bld) ? bld : [],
            hologram: Array.isArray(hol) ? hol : [],
            hologramRequests: Array.isArray(holReq) ? holReq : []
          };
          const month = this.selectedChartMonth !== '' ? Number(this.selectedChartMonth) : undefined;
          const year = this.selectedChartYear !== '' ? Number(this.selectedChartYear) : undefined;
          this.recalculateOicStats(month, year);
        }

        // ── COMPANY REGISTRATION (Permit Section only) ────────────────────────
        if (isPermitSection && comp) {
          const flatten = (arr: any[]) => Array.isArray(arr) ? arr : [];
          // For the Permit Section, the response buckets are from the officer perspective:
          // "pending" = stages at Permit Section level, "approved" = forwarded to Commissioner or approved
          // Use buckets directly — countActionable() won't work because allowedActions isn't in the response
          const pendingItems  = flatten(comp?.pending);
          const appliedItems  = flatten(comp?.applied);
          const approvedItems = flatten(comp?.approved);
          const rejectedItems = flatten(comp?.rejected);
          const objectionItems = flatten(comp?.objection);
          const awaitingItems = flatten(comp?.awaiting_payment);

          // Permit section sees "pending" as whatever is currently at their stage.
          // The API returns items at permit_section stage under comp.pending.
          // Items that came through applied are also actionable for permit section (initial applicant_applied stage).
          const pending   = pendingItems.length + appliedItems.length;
          const approved  = approvedItems.length;
          const rejected  = rejectedItems.length;
          const objection = objectionItems.length;
          const totalItems = pending + approved + rejected + objection + awaitingItems.length;

          this.supplyChainModuleCounts['company'] = { applied: totalItems, pending, approved, objection, rejected };
        }

        // ── COMPANY COLLABORATION (Permit Section + Commissioner) ─────────────
        if ((isPermitSection || isCommissioner) && collab) {
          const collabApproved = Number(collab?.approved || 0);
          const collabPending = Number(collab?.pending || 0);
          const collabObjection = Number(collab?.objection || 0);
          const collabRejected = Number(collab?.rejected || 0);
          const collabAwaiting = Number(collab?.awaiting_payment || collab?.awaitingPayment || 0);
          const collabApplied = Number(collab?.applied || collab?.total || (collabPending + collabApproved + collabObjection + collabRejected + collabAwaiting));

          this.supplyChainModuleCounts['company-collaboration'] = {
            applied: collabApplied,
            pending: collabPending,
            approved: collabApproved,
            objection: collabObjection,
            rejected: collabRejected
          };
          this.detailedCounts.companyCollaboration = {
            ...this.supplyChainModuleCounts['company-collaboration'],
            awaitingPayment: collabAwaiting
          };
        }

        // ── DISTRIBUTOR PERMIT ────────────────────────────────────────────────
        {
          const distApps: any[] = Array.isArray(dist) ? dist : [];
          let reqApplied = distApps.length;
          let reqPending = 0;
          let reqApproved = 0;
          let reqObjection = 0;
          let reqRejected = 0;

          distApps.forEach((app: any) => {
            const st = String(app.status || app.current_stage || '').toLowerCase();
            if (st.includes('approved')) {
              reqApproved++;
            } else if (st.includes('reject')) {
              reqRejected++;
            } else if (st.includes('object')) {
              reqObjection++;
            } else {
              reqPending++;
            }
          });

          const reqStats = {
            applied: reqApplied,
            pending: reqPending,
            approved: reqApproved,
            objection: reqObjection,
            rejected: reqRejected
          };

          this.supplyChainModuleCounts['distributor-permit'] = reqStats;
          this.supplyChainModuleCounts['distributor-permit-requisition'] = reqStats;
          this.supplyChainModuleCounts['distributor-permit-revalidation'] = {
            applied: 0,
            pending: 0,
            approved: 0,
            objection: 0,
            rejected: 0
          };
          this.supplyChainModuleCounts['distributor-permit-cancellation'] = {
            applied: 0,
            pending: 0,
            approved: 0,
            objection: 0,
            rejected: 0
          };

          if (this.isDistributorUser()) {
            this.supplyChainPendingCounts['distributor-permit'] = reqPending;
          }
        }

        this.supplyChainModuleStatsLoaded = true;
        this.updateSingleWindowChart();
      });
  }

  onChartDateFilterChange(): void {
    const month = this.selectedChartMonth !== '' ? Number(this.selectedChartMonth) : undefined;
    const year  = this.selectedChartYear  !== '' ? Number(this.selectedChartYear)  : undefined;
    const isITCell = this.currentUser?.roleId === 6;
    this.isChartLoading = true;

    if (this.isOicUser()) {
      this.recalculateOicStats(month, year);
      this.updateSingleWindowChart();
      this.isChartLoading = false;
      return;
    }

    if (isITCell) {
      // IT Cell: filter hologram items client-side by month/year then recount
      this.hologramService.getProcurements().pipe(
        catchError(() => of([])),
        finalize(() => { this.isChartLoading = false; })
      ).subscribe((res: any[]) => {
        let items = Array.isArray(res) ? res : [];

        // Apply month/year filter on the date field
        if (month !== undefined || year !== undefined) {
          items = items.filter(item => {
            const d = new Date(item.date || item.created_at || item.submissionDate || '');
            if (isNaN(d.getTime())) return false;
            if (month !== undefined && (d.getMonth() + 1) !== month) return false;
            if (year  !== undefined && d.getFullYear() !== year)         return false;
            return true;
          });
        }

        const pending = items.filter(item => {
          const t = String(item?.status ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const isApproved = t.includes('approved') || t.includes('cartoonassigned') || t.includes('cartonassigned');
          if (isApproved) return false;
          return t.includes('submit') || t.includes('underitcellreview') ||
                 t.includes('itcellreview') || t.includes('pending') || t.includes('review');
        }).length;
        // approved = everything NOT pending and NOT rejected (all downstream stages count as IT Cell approved)
        const approved = items.filter(x => {
          const t = String(x.status || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          if (t.includes('rejected') || t.includes('cancelled')) return false;
          const isPending = t.includes('submittedhp') || t.includes('submitted') ||
                            t.includes('underitcellreview') || t.includes('itcellreview');
          return !isPending;
        }).length;
        const rejected = items.filter(x => {
          const s = String(x.status || '').toLowerCase();
          return s.includes('rejected') || s.includes('cancelled');
        }).length;

        this.supplyChainModuleCounts['hologram'] = {
          applied: items.length,
          pending,
          approved,
          objection: 0,
          rejected
        };
        this.updateSingleWindowChart();
      });
      return;
    }

    this.unifiedDashboardService
      .getDetailedUnifiedDashboardCounts(
        this.dashboardConfig,
        true,
        month,
        year
      )
      .pipe(finalize(() => { this.isChartLoading = false; }))
      .subscribe({
        next: (res) => {
          const roleId = this.getCurrentRoleId();
          const isDistrictUser = roleId === 4;
          const isScopedOfficer = roleId === 8 || roleId === 9;
          if (isDistrictUser) {
            res.company = { applied: 0, pending: 0, objection: 0, approved: 0, rejected: 0, awaitingPayment: 0 } as any;
            res.companyCollaboration = { applied: 0, pending: 0, objection: 0, approved: 0, rejected: 0, awaitingPayment: 0 } as any;
            res.labelRegistration = { applied: 0, pending: 0, objection: 0, approved: 0, rejected: 0, awaitingPayment: 0 } as any;
            const allowed = [res.newLicense, res.renewal, res.salesman, res.specialPermit];
            res.total = {
              applied: allowed.reduce((sum, item) => sum + (item?.applied || 0), 0),
              pending: allowed.reduce((sum, item) => sum + (item?.pending || 0), 0),
              objection: allowed.reduce((sum, item) => sum + (item?.objection || 0), 0),
              approved: allowed.reduce((sum, item) => sum + (item?.approved || 0), 0),
              rejected: allowed.reduce((sum, item) => sum + (item?.rejected || 0), 0),
              awaitingPayment: allowed.reduce((sum, item) => sum + (item?.awaitingPayment || (item as any)?.awaiting_payment || 0), 0)
            } as any;
          }
          if (isScopedOfficer) {
            res.company = { applied: 0, pending: 0, objection: 0, approved: 0, rejected: 0, awaitingPayment: 0 } as any;
            res.companyCollaboration = { applied: 0, pending: 0, objection: 0, approved: 0, rejected: 0, awaitingPayment: 0 } as any;
            res.specialPermit = { applied: 0, pending: 0, objection: 0, approved: 0, rejected: 0, awaitingPayment: 0 } as any;
            res.labelRegistration = { applied: 0, pending: 0, objection: 0, approved: 0, rejected: 0, awaitingPayment: 0 } as any;
            // Officer APIs don't return `applied`, so compute it from pending+approved+rejected
            const fixApplied = (item: any) => {
              if (!item) return { applied: 0, pending: 0, objection: 0, approved: 0, rejected: 0, awaitingPayment: 0 };
              const a = (item.applied || 0) || ((item.pending || 0) + (item.approved || 0) + (item.rejected || 0) + (item.objection || 0));
              return { ...item, applied: a };
            };
            res.newLicense = fixApplied(res.newLicense);
            res.renewal = fixApplied(res.renewal);
            res.salesman = fixApplied(res.salesman);
            const allowed = [res.newLicense, res.renewal, res.salesman];
            res.total = {
              applied: allowed.reduce((sum, item) => sum + (item?.applied || 0), 0),
              pending: allowed.reduce((sum, item) => sum + (item?.pending || 0), 0),
              objection: allowed.reduce((sum, item) => sum + (item?.objection || 0), 0),
              approved: allowed.reduce((sum, item) => sum + (item?.approved || 0), 0),
              rejected: allowed.reduce((sum, item) => sum + (item?.rejected || 0), 0),
              awaitingPayment: allowed.reduce((sum, item) => sum + (item?.awaitingPayment || (item as any)?.awaiting_payment || 0), 0)
            } as any;
          }
          this.detailedCounts = {
            total: res.total,
            newLicense: res.newLicense,
            renewal: res.renewal,
            salesman: res.salesman,
            company: res.company,
            companyCollaboration: (res as any).companyCollaboration || { applied: 0, pending: 0, objection: 0, approved: 0, rejected: 0, awaitingPayment: 0 },
            specialPermit: res.specialPermit,
            labelRegistration: res.labelRegistration || { applied: 0, pending: 0, objection: 0, approved: 0, rejected: 0, awaitingPayment: 0 }
          };
          this.dashboardCounts = {
            applied: res.total.applied || 0,
            pending: res.total.pending || 0,
            objection: res.total.objection || 0,
            approved: res.total.approved || 0,
            rejected: res.total.rejected || 0,
            awaitingPayment: res.total.awaitingPayment || 0
          };
          this.updateSingleWindowChart();
        },
        error: () => { this.updateSingleWindowChart(); }
      });
  }

  awaitingPaymentBreakdown = {
    newLicense: 0,
    licenseRenewal: 0,
    salesmanBarman: 0,
    companyRegistration: 0,
    companyCollaboration: 0,
    specialPermit: 0
  };

  private buildActivityMonthOptions(): { label: string; value: string }[] {
    const formatter = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' });
    const cursor = new Date();
    cursor.setDate(1);

    return Array.from({ length: 24 }, (_, index) => {
      const date = new Date(cursor.getFullYear(), cursor.getMonth() - index, 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return {
        label: formatter.format(date),
        value: `${year}-${month}`
      };
    });
  }

  supplyChainPendingCounts: Record<string, number> = {};
  oicActionPendingCounts: Record<string, number> = {};

  selectedMetricsPeriod: 'today' | 'week' | 'month' | 'quarter' = 'week';

  appliedDataSource = new MatTableDataSource<UnifiedApplication>();
  pendingDataSource = new MatTableDataSource<UnifiedApplication>();
  objectionDataSource = new MatTableDataSource<UnifiedApplication>();
  approvedDataSource = new MatTableDataSource<UnifiedApplication>();
  rejectedDataSource = new MatTableDataSource<UnifiedApplication>();

  displayedColumns: string[] = ['slNo', 'id', 'currentStage', 'remarks', 'performedBy', 'actions'];
  activeTable: 'default' | 'applied' | 'pending' | 'objection' | 'approved' | 'rejected' = 'approved';
  private applicationsLoaded = false;
  private supplyChainModuleStatsLoaded = false;
  private licenseeHologramProcurementsCache: any[] | null = null;
  private applicationsLoading = false;

  // Supply Chain Section Management
  selectedSupplyChainSection: string | null = null;
  distributorPermitMode: 'list' | 'apply' = 'list';
  walletViewMode: 'wallets' | 'others' = 'wallets';
  private licenseeMenuAccessResolved = false;
  public showDistilleryMenus = false;
  public showBreweryOrDistilleryMenus = false;
  public supplyChainService = inject(SupplyChainService);
  public distributorPermitService = inject(DistributorPermitService);
  public enaRequisitionService = inject(EnaRequisitionService);
  private companyRegistrationService = inject(CompanyRegistrationService);
  private companyCollaborationService = inject(CompanyCollaborationService);
  public availableChartModules: { value: string; label: string }[] = [];

  public supplyChainModuleCounts: Record<string, DashboardCount> = {
    requisition: { applied: 0, pending: 0, approved: 0, objection: 0, rejected: 0 },
    revalidation: { applied: 0, pending: 0, approved: 0, objection: 0, rejected: 0 },
    cancellation: { applied: 0, pending: 0, approved: 0, objection: 0, rejected: 0 },
    transit: { applied: 0, pending: 0, approved: 0, objection: 0, rejected: 0 },
    hologram: { applied: 0, pending: 0, approved: 0, objection: 0, rejected: 0 },
    company: { applied: 0, pending: 0, approved: 0, objection: 0, rejected: 0 },
    'company-collaboration': { applied: 0, pending: 0, approved: 0, objection: 0, rejected: 0 }
  };
  private showBreweryOrDistilleryWalletViews = false;
  private showManufacturingWalletNav = false;
  private walletEligibilityResolved = false;
  private walletEligibilityLoading = false;

  // Professional dashboard enhancements
  previousCounts: DashboardCount = { applied: 0, pending: 0, objection: 0, approved: 0, rejected: 0 };
  recentActivities: any[] = [];
  performanceMetrics: any[] = [];
  customStats: any[] = [];
  quickActions: any[] = [];

  // User activity log (Officer Activity / License Activity)
  userActivities: any[] = [];
  userActivityLoading = false;
  userActivityError: string | null = null;
  userActivityLimit = 500;
  activityFilterType = '';
  activityFilterUserId = '';
  activityFilterMonth = '';       // YYYY-MM
  activityFilterDate = '';        // YYYY-MM-DD
  activityFilterAction = '';      // '' | 'LOGIN' | 'LOGOUT'

  // Pagination
  activityPage = 1;
  activityPageSize = 10;
  activityTotalCount = 0;

  get activityTotalPages(): number {
    return Math.max(1, Math.ceil(this.activityTotalCount / this.activityPageSize));
  }

  get activityPagedRows(): any[] {
    const start = (this.activityPage - 1) * Number(this.activityPageSize);
    return this.userActivities.slice(start, start + Number(this.activityPageSize));
  }

  get activityPageNumbers(): number[] {
    const total = this.activityTotalPages;
    const current = this.activityPage;
    const delta = 2;
    const pages: number[] = [];
    for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) {
      pages.push(i);
    }
    return pages;
  }

  activityGoToPage(page: number): void {
    if (page < 1 || page > this.activityTotalPages) return;
    this.activityPage = page;
  }

  now = new Date();
  greetingText = 'Welcome';
  userDisplayName = 'User';
  userRoleDisplayName = 'User';
  private pendingHologramOverviewRedirect = false;
  private navigationCount = 0;

  constructor(
    private roleService: RoleService,
    private dashboardConfigService: DashboardConfigService,
    private unifiedDashboardService: UnifiedDashboardService,
    private salesmanBarmanService: SalesmanBarmanRegistrationService,
    private accountService: AccountService,
    private hologramService: HologramDataService,
    private sidebarPendingBadgeService: SidebarPendingBadgeService,
    private licenseMeService: LicenseMeService,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private timerConfigService: TimerConfigService,
    private renewalConfigService: RenewalConfigService
  ) { }

  ngOnInit() {
    this.startWelcomeClock();
    this.bindCurrentUser();
    this.handleQueryParams();
    this.initializeDashboard();
    this.initializeProfessionalFeatures();
  }

  private initializeProfessionalFeatures(): void {
    // Initialize quick actions based on role
    this.initializeQuickActions();
    
    // Initialize custom stats based on role
    this.initializeCustomStats();
    
    // Load recent activities
    this.loadRecentActivities();
    
    // Load performance metrics for admin roles
    if (this.shouldShowPerformanceMetrics()) {
      this.loadPerformanceMetrics();
    }
  }


  private extractValidUpToDate(raw: any): Date | null {
    const strVal = raw.valid_up_to || raw.validUpTo || (raw.license && raw.license.valid_up_to) || raw.valid_till || raw.validTill;
    if (!strVal) return null;
    const str = String(strVal).trim();
    if (!str) return null;
    const dmY = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(str);
    if (dmY) {
      const dt = new Date(Number(dmY[3]), Number(dmY[2]) - 1, Number(dmY[1]), 23, 59, 59);
      return Number.isFinite(dt.getTime()) ? dt : null;
    }
    const dt = new Date(str);
    return Number.isFinite(dt.getTime()) ? dt : null;
  }

  private extractLicenseId(app: any): string | null {
    const raw = app.raw || {};
    const possibleFields = [
      raw.license_id, raw.licenseId, raw.license?.id, raw.license?.license_id, raw.issued_license_id, raw.issuedLicenseId
    ];
    for (const field of possibleFields) {
      if (field && typeof field === 'string' && this.isValidLicenseIdForWarning(field)) return field;
      if (field && typeof field === 'object' && field.id && this.isValidLicenseIdForWarning(field.id)) return field.id;
    }
    const appId = app.applicationId || app.raw?.application_id || '';
    if (appId.startsWith('LIC/')) return appId.replace('LIC/', 'LA/');
    if (appId.startsWith('NLI/')) return appId.replace('NLI/', 'NA/');
    if (appId.startsWith('SBM/')) return appId.replace('SBM/', 'SB/');
    if (appId.startsWith('COMP/')) return appId.replace('COMP/', 'CREG/');
    if (appId.startsWith('CCOL/')) return appId.replace('CCOL/', 'CC/1101/');
    if (appId.startsWith('RCOL/')) return appId.replace('RCOL/', 'CC/1101/');
    return null;
  }

  private isValidLicenseIdForWarning(licenseId: string): boolean {
    if (!licenseId || typeof licenseId !== 'string') return false;
    const validPrefixes = ['LA/', 'NA/', 'SB/', 'LIC/', 'NLI/', 'SBM/', 'COMP/', 'CREG/', 'CC/', 'CCOL/', 'RCOL/'];
    return validPrefixes.some(prefix => licenseId.trim().startsWith(prefix));
  }

  private getRenewedLicenseIds(
    applied: any[], 
    pending: any[], 
    awaitingPayment: any[]
  ): Set<string> {
    const renewedIds = new Set<string>();
    
    [...applied, ...pending, ...awaitingPayment].forEach(app => {
      if (app.type !== 'license-renewal') {
        return;
      }
      const raw = app.raw || {};
      
      const renewalOfValue = 
        raw.renewalOf || 
        raw.renewal_of || 
        raw.renewalOfLicenseId || 
        raw.renewal_of_license_id || 
        raw.old_license_id || 
        raw.oldLicenseId || 
        raw.old_license || 
        raw.oldLicense;
      
      if (renewalOfValue) {
        let licenseIdStr = '';
        if (typeof renewalOfValue === 'string') {
          licenseIdStr = renewalOfValue;
        } else if (typeof renewalOfValue === 'object' && renewalOfValue !== null) {
          licenseIdStr = renewalOfValue.license_id || renewalOfValue.id || String(renewalOfValue);
        } else {
          licenseIdStr = String(renewalOfValue);
        }
        
        if (licenseIdStr && this.isValidLicenseIdForWarning(licenseIdStr)) {
          renewedIds.add(licenseIdStr);
          return;
        }
      }
      
      const licenseValue = raw.license || raw.license_id || raw.issued_license_id || raw.issuedLicenseId;
      if (licenseValue) {
        let licenseIdStr = '';
        if (typeof licenseValue === 'string') {
          licenseIdStr = licenseValue;
        } else if (typeof licenseValue === 'object' && licenseValue !== null) {
          licenseIdStr = licenseValue.license_id || licenseValue.id || String(licenseValue);
        } else {
          licenseIdStr = String(licenseValue);
        }
        
        if (licenseIdStr && this.isValidLicenseIdForWarning(licenseIdStr)) {
          renewedIds.add(licenseIdStr);
        }
      }
      
      const appId = app.applicationId || app.raw?.application_id || '';
      if (appId) {
        let derivedLicenseId = null;
        if (appId.startsWith('LIC/')) {
          derivedLicenseId = appId.replace('LIC/', 'LA/');
        } else if (appId.startsWith('NLI/')) {
          derivedLicenseId = appId.replace('NLI/', 'NA/');
        } else if (appId.startsWith('SBM/')) {
          derivedLicenseId = appId.replace('SBM/', 'SB/');
        } else if (appId.startsWith('COMP/')) {
          derivedLicenseId = appId.replace('COMP/', 'CREG/');
        } else if (appId.startsWith('LRA/')) {
          renewedIds.add(appId.replace('LRA/', 'LA/'));
          renewedIds.add(appId.replace('LRA/', 'NA/'));
          renewedIds.add(appId.replace('LRA/', 'CC/1101/'));
        } else if (appId.startsWith('RSBM/')) {
          renewedIds.add(appId.replace('RSBM/', 'SB/'));
        } else if (appId.startsWith('RCOL/')) {
          renewedIds.add(appId.replace('RCOL/', 'CC/1101/'));
        }
        
        if (derivedLicenseId && this.isValidLicenseIdForWarning(derivedLicenseId)) {
          renewedIds.add(derivedLicenseId);
        }
      }
    });
    
    return renewedIds;
  }

  private formatDDMMYYYY(date: Date): string {
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  }

  private checkRenewalEligibility(approvedWithoutRenewal: any[], approvedWithRenewal: any[] = []): void {
    if (!this.isLicenseeUser()) return;
    
    const fallbackSeconds = 90 * 24 * 60 * 60;
    
    forkJoin({
      timer: this.timerConfigService.getTimerConfig('LICENSE_RENEWAL_REMINDER_TIMER', fallbackSeconds).pipe(take(1)),
      renewalConfig: this.renewalConfigService.getConfig().pipe(take(1))
    }).subscribe(({ timer, renewalConfig }) => {
      let newWarnings: any[] = [];
      const windowMs = Math.max(0, Number((timer as any)?.delay_ms ?? 0) || 0);
      if (!windowMs) {
        return;
      }

      const appMap = new Map<string, {
        app: any,
        validUpTo: Date,
        hasActiveRenewal: boolean
      }>();

      const collectApp = (app: any, hasActiveRenewal: boolean) => {
        if (app.type === 'license-renewal') {
          return;
        }
        const raw = app.raw || {};
        let validUpTo = this.extractValidUpToDate(raw);
        if (!validUpTo && renewalConfig) {
          const month = renewalConfig.renewal_month || renewalConfig.renewalMonth || 3;
          const day = renewalConfig.renewal_day || renewalConfig.renewalDay || 31;
          const time = renewalConfig.renewal_time || renewalConfig.renewalTime || '23:59:59';
          const timeParts = time.split(':');
          const now = new Date();
          let year = now.getFullYear();
          if (now.getMonth() + 1 > month || (now.getMonth() + 1 === month && now.getDate() > day)) year++;
          validUpTo = new Date(year, month - 1, day, Number(timeParts[0]||23), Number(timeParts[1]||59), Number(timeParts[2]||59));
        }

        if (!validUpTo) return;

        const licenseId = this.extractLicenseId(app);
        if (!licenseId) return;

        const existing = appMap.get(licenseId);
        if (!existing || validUpTo.getTime() > existing.validUpTo.getTime()) {
          appMap.set(licenseId, {
            app,
            validUpTo,
            hasActiveRenewal: existing ? (existing.hasActiveRenewal || hasActiveRenewal) : hasActiveRenewal
          });
        } else {
          existing.hasActiveRenewal = existing.hasActiveRenewal || hasActiveRenewal;
        }
      };

      approvedWithoutRenewal.forEach(app => collectApp(app, false));
      approvedWithRenewal.forEach(app => collectApp(app, true));

      appMap.forEach(({ app, validUpTo, hasActiveRenewal }, licenseId) => {
        const validMs = validUpTo.getTime();
        const now = Date.now();
        const eligibleFrom = validMs - windowMs;

        if (now >= eligibleFrom) {
          newWarnings.push({
            licenseId,
            type: app.type || '',
            establishmentName: app.establishmentName || app.applicantFullName || 'N/A',
            licenseCategoryName: (app as any).licenseCategoryName || (app.raw?.license_category_name) || '',
            licenseSubCategoryName: (app.raw?.license_sub_category_name) || (app.raw?.licenseSubCategoryName) || (app.raw?.license_sub_category?.name) || (app.raw?.license_sub_category?.description) || '',
            validUpTo,
            finalDateStr: this.formatDDMMYYYY(validUpTo),
            isExpired: now > validMs,
            hasActiveRenewal
          });
        }
      });
      
      this.renewalWarnings = newWarnings;
      try { if (this.cdr) this.cdr.detectChanges(); } catch (e) {}
    });
  }

  openMyLicensesForRenewal(): void {
    this.router.navigate(['/licensee/supply-chain'], { queryParams: { section: 'license-renewal' } });
  }

  ngAfterViewInit() {
    if (!this.enableDashboardBubbles) return;
    this.initBubbleEngine();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopBubbleEngine();
  }

  private initBubbleEngine(): void {
    const canvasRef = this.bubbleCanvasRef;
    if (!canvasRef) return;
    const canvas = canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const parentW = canvas.parentElement?.clientWidth || 0;
      const parentH = canvas.parentElement?.clientHeight || 0;
      canvas.width = parentW > 100 ? parentW : window.innerWidth;
      canvas.height = parentH > 100 ? parentH : window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    this.canvasResizeListener = resizeCanvas;

    let mouseX = -1000;
    let mouseY = -1000;
    let targetMouseX = -1000;
    let targetMouseY = -1000;

    const container = canvas.parentElement;
    const onMouseMove = (e: MouseEvent) => {
      if (container) {
        const rect = container.getBoundingClientRect();
        targetMouseX = e.clientX - rect.left;
        targetMouseY = e.clientY - rect.top;
      }
    };

    const onMouseLeave = () => {
      targetMouseX = -1000;
      targetMouseY = -1000;
    };

    const onClick = (e: MouseEvent) => {
      if (container) {
        const rect = container.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        this.spawnBubbleBurst(clickX, clickY);
      }
    };

    if (container) {
      container.addEventListener('mousemove', onMouseMove);
      container.addEventListener('mouseleave', onMouseLeave);
      container.addEventListener('click', onClick);
    }

    this.bubbles = [];
    const totalBubbles = 45;
    
    for (let i = 0; i < totalBubbles; i++) {
      this.bubbles.push(this.createBubble(canvas.width, canvas.height, true));
    }

    const animate = () => {
      // If a sub-section is active, clear and pause canvas updates to save CPU
      if (this.selectedSupplyChainSection) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        this.canvasAnimationId = requestAnimationFrame(animate);
        return;
      }

      // Dynamic parent dimensions check to support async height layout changes
      const parentW = canvas.parentElement?.clientWidth || window.innerWidth;
      const parentH = canvas.parentElement?.clientHeight || window.innerHeight;
      
      if (canvas.width !== parentW || canvas.height !== parentH) {
        canvas.width = parentW;
        canvas.height = parentH;
      }

      if (targetMouseX === -1000) {
        mouseX = -1000;
        mouseY = -1000;
      } else {
        if (mouseX === -1000) {
          mouseX = targetMouseX;
          mouseY = targetMouseY;
        } else {
          mouseX += (targetMouseX - mouseX) * 0.1;
          mouseY += (targetMouseY - mouseY) * 0.1;
        }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      this.checkBubbleMerging();

      for (let layer = 1; layer <= 3; layer++) {
        const layerBubbles = this.bubbles.filter(b => b.layer === layer);
        
        for (const b of layerBubbles) {
          b.y -= b.speedY;
          b.swayOffset += b.frequency;
          b.wobble += b.wobbleSpeed;

          let currentX = b.x + Math.sin(b.swayOffset) * b.amplitude;

          if (mouseX !== -1000) {
            const dx = currentX - mouseX;
            const dy = b.y - mouseY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const radius = 130;
            if (dist < radius) {
              const force = (radius - dist) / radius;
              const angle = Math.atan2(dy, dx);
              currentX += Math.cos(angle) * force * 3;
              b.y += Math.sin(angle) * force * 1.5;
            }
          }

          if (currentX < -b.size) currentX = canvas.width + b.size;
          if (currentX > canvas.width + b.size) currentX = -b.size;

          ctx.save();
          
          const wobbleScale = 1 + Math.sin(b.wobble) * 0.06 * b.wobbleFactor;
          const rx = b.size * 0.5 * wobbleScale;
          const ry = b.size * 0.5 * (2 - wobbleScale);

          if (b.layer === 1) {
            const grad = ctx.createRadialGradient(currentX, b.y, 0, currentX, b.y, b.size * 0.5);
            grad.addColorStop(0, `rgba(255, 255, 255, ${b.opacity})`);
            grad.addColorStop(0.5, `rgba(255, 255, 255, ${b.opacity * 0.4})`);
            grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(currentX, b.y, b.size * 0.5, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.translate(currentX, b.y);
            ctx.rotate(b.swayOffset * 0.2);

            const sphereGrad = ctx.createRadialGradient(-rx * 0.2, -ry * 0.2, 0, 0, 0, rx);
            sphereGrad.addColorStop(0, `rgba(255, 255, 255, ${b.opacity * 1.55})`);
            sphereGrad.addColorStop(0.35, `rgba(251, 191, 36, ${b.opacity * 0.45})`);
            sphereGrad.addColorStop(0.7, `rgba(245, 158, 11, ${b.opacity * 0.15})`);
            sphereGrad.addColorStop(0.9, `rgba(255, 255, 255, ${b.opacity * 0.35})`);
            sphereGrad.addColorStop(1, `rgba(255, 255, 255, ${b.opacity * 0.65})`);

            ctx.fillStyle = sphereGrad;
            ctx.beginPath();
            ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
            ctx.fill();

            // Softer Amber/Gold outer ring - made slightly more visible and crisp
            ctx.strokeStyle = `rgba(217, 119, 6, ${b.opacity * 0.85})`;
            ctx.lineWidth = 1.0;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(-rx * 0.3, -ry * 0.3, rx * 0.4, Math.PI * 1.0, Math.PI * 1.6);
            ctx.strokeStyle = `rgba(255, 255, 255, ${b.opacity * 2.2})`;
            ctx.lineWidth = Math.max(1, b.size * 0.08);
            ctx.stroke();
          }

          ctx.restore();

          if (b.y < -b.size * 2) {
            Object.assign(b, this.createBubble(canvas.width, canvas.height, false));
          }
        }
      }

      this.canvasAnimationId = requestAnimationFrame(animate);
    };

    (canvas as any)._onMouseMove = onMouseMove;
    (canvas as any)._onMouseLeave = onMouseLeave;
    (canvas as any)._onClick = onClick;
    (canvas as any)._container = container;

    this.canvasAnimationId = requestAnimationFrame(animate);
  }

  private createBubble(width: number, height: number, initSpreading = false): any {
    const r = secureRandomFloat();
    let layer: 1 | 2 | 3 = 2;
    let size = 12;
    let opacity = 0.3;
    let speedY = 0.6;

    if (r < 0.35) {
      // Layer 1: background bubbles
      layer = 1;
      size = 6 + secureRandomFloat() * 6; // 6px to 12px
      opacity = 0.22 + secureRandomFloat() * 0.08; // 0.22 to 0.30
      speedY = 0.3 + secureRandomFloat() * 0.3;
    } else if (r < 0.85) {
      // Layer 2: midground bubbles
      layer = 2;
      size = 12 + secureRandomFloat() * 10; // 12px to 22px
      opacity = 0.32 + secureRandomFloat() * 0.13; // 0.32 to 0.45
      speedY = 0.5 + secureRandomFloat() * 0.4;
    } else {
      // Layer 3: foreground large sharp bubbles
      layer = 3;
      size = 22 + secureRandomFloat() * 10; // 22px to 32px
      opacity = 0.48 + secureRandomFloat() * 0.15; // 0.48 to 0.63
      speedY = 0.8 + secureRandomFloat() * 0.5;
    }

    const startY = initSpreading 
      ? secureRandomFloat() * height 
      : height + 20 + secureRandomFloat() * 50;

    return {
      x: secureRandomFloat() * width,
      y: startY,
      size,
      speedY,
      speedX: (secureRandomFloat() - 0.5) * 0.15,
      amplitude: 15 + secureRandomFloat() * 20,
      frequency: 0.01 + secureRandomFloat() * 0.02,
      swayOffset: secureRandomFloat() * Math.PI * 2,
      opacity,
      layer,
      wobble: secureRandomFloat() * Math.PI * 2,
      wobbleSpeed: 0.03 + secureRandomFloat() * 0.04,
      wobbleFactor: 0.5 + secureRandomFloat() * 0.5
    };
  }

  private checkBubbleMerging(): void {
    const activeBubbles = this.bubbles.filter(b => b.layer > 1);
    
    for (let i = 0; i < activeBubbles.length; i++) {
      const b1 = activeBubbles[i];
      for (let j = i + 1; j < activeBubbles.length; j++) {
        const b2 = activeBubbles[j];
        
        const dx = b1.x - b2.x;
        const dy = b1.y - b2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        const mergeThreshold = (b1.size + b2.size) * 0.52;
        if (dist < mergeThreshold) {
          const larger = b1.size >= b2.size ? b1 : b2;
          const smaller = b1.size < b2.size ? b1 : b2;
          
          const newArea = (larger.size * larger.size) + (smaller.size * smaller.size * 0.5);
          larger.size = Math.min(22, Math.sqrt(newArea));
          
          larger.wobbleFactor = 2.5;
          
          setTimeout(() => {
            larger.wobbleFactor = 1.0;
          }, 800);

          const canvas = this.bubbleCanvasRef?.nativeElement;
          if (canvas) {
            Object.assign(smaller, this.createBubble(canvas.width, canvas.height, false));
          }
        }
      }
    }
  }

  private spawnBubbleBurst(clickX: number, clickY: number): void {
    const canvas = this.bubbleCanvasRef?.nativeElement;
    if (!canvas) return;
    
    const burstCount = 6 + secureRandomInt(4);
    for (let i = 0; i < burstCount; i++) {
      const size = 3 + secureRandomFloat() * 6;
      const opacity = 0.15 + secureRandomFloat() * 0.1;
      const angle = (Math.PI * 2 / burstCount) * i + (secureRandomFloat() - 0.5) * 0.4;
      const speed = 1.5 + secureRandomFloat() * 2;
      
      const burstBubble = {
        x: clickX,
        y: clickY,
        size,
        speedY: 0.8 + secureRandomFloat() * 0.6,
        speedX: Math.cos(angle) * speed,
        amplitude: 5 + secureRandomFloat() * 10,
        frequency: 0.02 + secureRandomFloat() * 0.03,
        swayOffset: secureRandomFloat() * Math.PI * 2,
        opacity,
        layer: 3,
        wobble: secureRandomFloat() * Math.PI * 2,
        wobbleSpeed: 0.08 + secureRandomFloat() * 0.08,
        wobbleFactor: 1.5
      };

      this.bubbles.push(burstBubble);
      
      if (this.bubbles.length > 250) {
        this.bubbles.shift();
      }
    }
  }

  private stopBubbleEngine(): void {
    if (this.canvasAnimationId) {
      cancelAnimationFrame(this.canvasAnimationId);
    }
    
    const canvas = this.bubbleCanvasRef?.nativeElement;
    if (canvas) {
      const container = (canvas as any)._container;
      const onMouseMove = (canvas as any)._onMouseMove;
      const onMouseLeave = (canvas as any)._onMouseLeave;
      const onClick = (canvas as any)._onClick;
      
      if (container && onMouseMove) {
        container.removeEventListener('mousemove', onMouseMove);
        container.removeEventListener('mouseleave', onMouseLeave);
        container.removeEventListener('click', onClick);
      }
    }

    if (this.canvasResizeListener) {
      window.removeEventListener('resize', this.canvasResizeListener);
    }
  }

  private startWelcomeClock(): void {
    this.refreshWelcomeText();
    interval(60_000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.now = new Date();
        this.refreshWelcomeText();
      });
  }

  private bindCurrentUser(): void {
    this.roleService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user) {
          this.currentUser = user;
          this.refreshWelcomeText();
          this.tryRedirectHologramOverview();
        }
      });
  }

  private tryRedirectHologramOverview(): void {
    if (!this.pendingHologramOverviewRedirect) return;
    if (this.currentUser?.roleId !== 7) return; // Only OIC

    this.pendingHologramOverviewRedirect = false;
    this.router.navigate(['/dashboard/hologram-overview'], { replaceUrl: true });
  }

  private refreshWelcomeText(): void {
    const hour = this.now.getHours();
    if (hour < 12) this.greetingText = 'Good morning';
    else if (hour < 17) this.greetingText = 'Good afternoon';
    else if (hour < 21) this.greetingText = 'Good evening';
    else this.greetingText = 'Welcome';

    const name = (this.currentUser?.fullName || '').trim() || (this.currentUser?.username || '').trim();
    this.userDisplayName = name || 'User';

    let roleFromUser =
      (this.currentUser?.role?.displayName || '').trim() ||
      (this.currentUser?.role?.name || '').trim();

    // If RoleService fallback labels are present, prefer backend/localStorage role name for dynamic roles.
    if (/^Role ID:\s*\d+$/i.test(roleFromUser) || /^Role\s+\d+$/i.test(roleFromUser)) {
      const backendRoleName =
        String((this.accountService.getCurrentUser() as any)?.role?.name || '').trim() ||
        String(localStorage.getItem('role') || '').trim();
      if (backendRoleName) {
        roleFromUser = this.humanizeRoleName(backendRoleName);
      }
    } else if (roleFromUser) {
      roleFromUser = this.humanizeRoleName(roleFromUser);
    }

    if (roleFromUser) {
      this.userRoleDisplayName = roleFromUser;
    } else if (this.currentUser?.roleId) {
      this.userRoleDisplayName = this.roleService.getRoleName(this.currentUser.roleId);
    } else {
      this.userRoleDisplayName = 'User';
    }
  }

  get userDistrictDisplayName(): string {
    const roleId = this.getCurrentRoleId();
    if (roleId !== 4 && roleId !== 8) {
      return '';
    }

    const districtCodeMap: { [key: string]: string } = {
      '1': 'Gangtok', '225': 'Gangtok', 'gangtok': 'Gangtok',
      '2': 'Namchi', '226': 'Namchi', 'namchi': 'Namchi',
      '3': 'Gyalshing', '227': 'Gyalshing', 'gyalshing': 'Gyalshing', 'geyzing': 'Gyalshing',
      '4': 'Mangan', '228': 'Mangan', 'mangan': 'Mangan',
      '5': 'Pakyong', '229': 'Pakyong', 'pakyong': 'Pakyong',
      '6': 'Soreng', '230': 'Soreng', 'soreng': 'Soreng'
    };

    const extractName = (d: any): string => {
      if (d === null || d === undefined) return '';
      if (typeof d === 'number' || (typeof d === 'string' && /^\d+$/.test(d.trim()))) {
        const key = String(d).trim();
        if (districtCodeMap[key]) return districtCodeMap[key];
      }
      if (typeof d === 'string') {
        const trimmed = d.trim();
        const low = trimmed.toLowerCase();
        if (districtCodeMap[low]) return districtCodeMap[low];
        return trimmed;
      }
      if (typeof d === 'object') {
        const name = d.district || d.district_name || d.districtName || d.name || d.district_code || d.districtCode || d.code;
        if (name) return extractName(name);
      }
      return '';
    };

    const candidates = [
      (this.currentUser as any)?.district,
      (this.currentUser as any)?.district_name,
      (this.currentUser as any)?.districtName,
      (this.currentUser as any)?.district_id,
      (this.currentUser as any)?.districtId,
      (this.currentUser as any)?.district_code,
      (this.currentUser as any)?.districtCode,
      (this.accountService?.getCurrentUser() as any)?.district,
      (this.accountService?.getCurrentUser() as any)?.district_name,
      (this.accountService?.getCurrentUser() as any)?.districtName,
    ];

    for (const cand of candidates) {
      const resolved = extractName(cand);
      if (resolved) return resolved;
    }

    if (typeof window !== 'undefined') {
      const storageKeys = ['currentUser', 'user', 'account'];
      for (const key of storageKeys) {
        for (const storage of [sessionStorage, localStorage]) {
          const raw = storage.getItem(key);
          if (!raw) continue;
          try {
            const parsed = JSON.parse(raw);
            const d = parsed?.district || parsed?.district_name || parsed?.districtName || parsed?.district_id || parsed?.district_code || parsed?.user?.district;
            const resolved = extractName(d);
            if (resolved) return resolved;
          } catch {}
        }
      }
    }

    return '';
  }

  private humanizeRoleName(value: string): string {
    const cleaned = String(value || '').trim();
    if (!cleaned) return '';

    return cleaned
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .split(' ')
      .map(w => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
      .join(' ');
  }

  // Handle query parameters for supply chain section navigation
  private handleQueryParams(): void {
    const initialSection = this.route.snapshot.queryParamMap.get('section');
    this.selectedSupplyChainSection = initialSection || null;
    this.distributorPermitMode = this.readDistributorPermitMode(this.route.snapshot.queryParams);
    this.enforceSectionAccess();
    this.walletViewMode = this.readWalletViewFromParams(this.route.snapshot.queryParams);
    this.ensureWalletViewParamAllowed(this.route.snapshot.queryParams);

    if (this.selectedSupplyChainSection === 'hologram-overview') {
      this.pendingHologramOverviewRedirect = true;
      this.tryRedirectHologramOverview();
    }

    // Subscribe to query parameter changes
    this.route.queryParams
      .pipe(skip(1), takeUntil(this.destroy$))
      .subscribe(params => {
        const section = params['section'];
        if (section === 'single-window') {
          this.navigationCount = 0;
        } else if (section === 'single-window-detail') {
          this.navigationCount++;
        } else {
          this.navigationCount = 0;
        }
        this.selectedSupplyChainSection = section || null;
        this.distributorPermitMode = this.readDistributorPermitMode(params);
        this.enforceSectionAccess();
        this.walletViewMode = this.readWalletViewFromParams(params);
        this.ensureWalletViewParamAllowed(params);

        if (this.selectedSupplyChainSection === 'hologram-overview') {
          this.pendingHologramOverviewRedirect = true;
          this.tryRedirectHologramOverview();
        }

        if (this.selectedSupplyChainSection === 'officer-activity') {
          this.loadUserActivities();
        }

        // Returning to /dashboard should reuse cached dashboard data unless the user
        // explicitly refreshes or performs an action that changes counts.
        if (!this.selectedSupplyChainSection) {
          this.activeTable = 'approved';
          if (this.dashboardInitLoadHandled) {
            this.loadDashboardData();
          }
        }
      });
  }

  get activitySectionTitle(): string {
    return this.isLicenseeUser() ? 'License Activity' : 'Officer Activity';
  }

  loadUserActivities(): void {
    if (!this.currentUser) {
      return;
    }

    this.userActivityLoading = true;
    this.userActivityError = null;
    this.activityPage = 1; // reset to first page on every fresh load

    let params = new HttpParams().set('limit', String(Number(this.userActivityLimit) || 500));

    const type = String(this.activityFilterType || '').trim();
    if (type) {
      params = params.set('type', type);
    }

    // Login / Logout quick filter
    const action = String(this.activityFilterAction || '').trim();
    if (action) {
      params = params.set('action', action);
    }

    // Month filter (YYYY-MM)
    const month = String(this.activityFilterMonth || '').trim();
    if (month) {
      params = params.set('month', month);
    }

    // Specific date filter (YYYY-MM-DD) — takes precedence over month if both set
    const date = String(this.activityFilterDate || '').trim();
    if (date) {
      params = params.set('date', date);
    }

    // Only admins/officers can filter other users; licensee always gets their own activity from backend.
    const userId = String(this.activityFilterUserId || '').trim();
    if (!this.isLicenseeUser() && userId) {
      params = params.set('user_id', userId);
    }

    this.http.get<any[]>(`${environment.apiBaseUrl}/transactional/logs/activities/`, { params })
      .pipe(
        finalize(() => (this.userActivityLoading = false)),
        catchError((err) => {
          this.userActivityError = err?.error?.detail || 'Failed to load activity log.';
          this.userActivities = [];
          this.activityTotalCount = 0;
          return of([]);
        })
      )
      .subscribe((rows: any[]) => {
        this.userActivities = Array.isArray(rows) ? rows : [];
        this.activityTotalCount = this.userActivities.length;
      });
  }

  private getActivityCode(row: any): string {
    return String(row?.activity_type || row?.activityType || '').trim().toUpperCase();
  }

  private getActivityDisplay(row: any): string {
    return String(row?.activity_type_display || row?.activityTypeDisplay || '').trim().toLowerCase();
  }

  private getRowTimestampMs(row: any): number | null {
    const raw = row?.timestamp || row?.created_at || row?.createdAt;
    if (!raw) return null;
    const t = new Date(raw).getTime();
    return Number.isFinite(t) ? t : null;
  }

  getActivityActionLabel(row: any): string {
    // Check both the raw code and the display value (API may return either)
    const code = this.getActivityCode(row);
    const display = this.getActivityDisplay(row);

    if (code === 'LOGIN'  || display === 'login')          return 'Login';
    if (code === 'LOGOUT' || display === 'logout')         return 'Logout';
    if (code === 'REG'    || display.includes('registr'))  return 'Registration';
    if (code === 'PASS_RESET' || display.includes('password')) return 'Password Reset';
    if (code === 'USR_UPD'   || display.includes('update'))    return 'User Update';
    if (code === 'USR_DEL'   || display.includes('delet'))     return 'User Delete';

    // Fallback: use display value if available, else code
    return (row?.activity_type_display || row?.activityTypeDisplay || code || 'Activity');
  }

  getActivityBadgeClass(row: any): string {
    const code = this.getActivityCode(row);
    const display = this.getActivityDisplay(row);

    if (code === 'LOGIN'  || display === 'login')          return 'act-badge--login';
    if (code === 'LOGOUT' || display === 'logout')         return 'act-badge--logout';
    if (code === 'PASS_RESET' || display.includes('password')) return 'act-badge--warn';
    if (code === 'USR_DEL'   || display.includes('delet'))     return 'act-badge--danger';
    if (code === 'USR_UPD'   || display.includes('update'))    return 'act-badge--update';
    if (code === 'REG'    || display.includes('registr'))  return 'act-badge--reg';
    return 'act-badge--default';
  }

  getActivityIcon(row: any): string {
    const code = this.getActivityCode(row);
    const display = this.getActivityDisplay(row);

    if (code === 'LOGIN'  || display === 'login')   return 'login';
    if (code === 'LOGOUT' || display === 'logout')  return 'logout';
    if (code === 'PASS_RESET' || display.includes('password')) return 'key';
    if (code === 'USR_DEL'   || display.includes('delet'))     return 'person_remove';
    if (code === 'USR_UPD'   || display.includes('update'))    return 'manage_accounts';
    if (code === 'REG'    || display.includes('registr'))      return 'person_add';
    return 'radio_button_checked';
  }

  isLoginActivity(row: any): boolean {
    const code = this.getActivityCode(row);
    const display = this.getActivityDisplay(row);
    return code === 'LOGIN' || display === 'login';
  }

  isLogoutActivity(row: any): boolean {
    const code = this.getActivityCode(row);
    const display = this.getActivityDisplay(row);
    return code === 'LOGOUT' || display === 'logout';
  }

  isWarnActivity(row: any): boolean {
    const code = this.getActivityCode(row);
    const display = this.getActivityDisplay(row);
    return code === 'PASS_RESET' || code === 'USR_DEL' ||
           display.includes('password') || display.includes('delet');
  }

  isInfoActivity(row: any): boolean {
    const code = this.getActivityCode(row);
    const display = this.getActivityDisplay(row);
    return code === 'REG' || code === 'USR_UPD' ||
           display.includes('registr') || display.includes('update');
  }

  /** Returns first ~70 chars of user agent — browser + OS only, no full UA string */
  getShortUserAgent(userAgent: any): string {
    const ua = String(userAgent || '').trim();
    if (!ua) return '';
    const lower = ua.toLowerCase();
    const browser =
      lower.includes('edg/') ? 'Edge' :
      lower.includes('chrome/') ? 'Chrome' :
      lower.includes('firefox/') ? 'Firefox' :
      lower.includes('safari/') && !lower.includes('chrome/') ? 'Safari' :
      'Browser';
    const os =
      lower.includes('windows') ? 'Windows' :
      lower.includes('android') ? 'Android' :
      lower.includes('iphone') || lower.includes('ipad') ? 'iOS' :
      lower.includes('mac os') || lower.includes('macintosh') ? 'macOS' :
      lower.includes('linux') ? 'Linux' : '';
    return os ? `${browser} / ${os}` : browser;
  }

  /**
   * Session duration:
   * - LOGOUT row → find the nearest LOGIN in the full list (same user, within 24h), show |diff|
   * - LOGIN row  → find the nearest LOGOUT after it (same user, within 24h), show diff
   *
   * Uses loose equality for user_id to handle int/string mismatches from the API.
   * Falls back to ignoring user_id when only one user's data is present (licensee view).
   */
  getSessionDuration(row: any): string | null {
    const code    = this.getActivityCode(row);
    const display = this.getActivityDisplay(row);
    const isLogin  = code === 'LOGIN'  || display === 'login';
    const isLogout = code === 'LOGOUT' || display === 'logout';

    if (!isLogin && !isLogout) return null;

    const rowTimeMs = this.getRowTimestampMs(row);
    if (!rowTimeMs) return null;

    // Use loose equality — API may return user_id as int, stored as number, but coerce to string for safety
    const userId = row?.user_id != null ? String(row.user_id) : null;

    const sameUser = (candidate: any): boolean => {
      if (!userId) return true; // no user_id on row — match all (single-user view)
      const cId = candidate?.user_id != null ? String(candidate.user_id) : null;
      if (!cId) return true;
      return cId === userId;
    };

    const formatDiff = (ms: number): string => {
      const absMs = Math.abs(ms);
      const mins  = Math.floor(absMs / 60000);
      if (mins < 1) return '< 1 min';
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

    if (isLogout) {
      // Find the nearest LOGIN by the same user — closest absolute time within 24h window.
      let bestDiff: number | null = null;

      for (const candidate of this.userActivities) {
        if (!candidate || candidate === row) continue;
        if (!sameUser(candidate)) continue;
        const cCode    = this.getActivityCode(candidate);
        const cDisplay = this.getActivityDisplay(candidate);
        if (cCode !== 'LOGIN' && cDisplay !== 'login') continue;
        const loginTime = this.getRowTimestampMs(candidate);
        if (!loginTime) continue;
        const diff = Math.abs(rowTimeMs - loginTime);
        if (diff > WINDOW_MS) continue;
        if (bestDiff === null || diff < bestDiff) {
          bestDiff = diff;
        }
      }

      return bestDiff !== null ? formatDiff(bestDiff) : null;
    }

    // LOGIN row: find the nearest LOGOUT for the same user within 24h.
    let bestDiff: number | null = null;

    for (const candidate of this.userActivities) {
      if (!candidate || candidate === row) continue;
      if (!sameUser(candidate)) continue;
      const cCode    = this.getActivityCode(candidate);
      const cDisplay = this.getActivityDisplay(candidate);
      if (cCode !== 'LOGOUT' && cDisplay !== 'logout') continue;
      const logoutTime = this.getRowTimestampMs(candidate);
      if (!logoutTime) continue;
      const diff = Math.abs(logoutTime - rowTimeMs);
      if (diff > WINDOW_MS) continue;
      if (bestDiff === null || diff < bestDiff) {
        bestDiff = diff;
      }
    }

    return bestDiff !== null ? formatDiff(bestDiff) : null;
  }

  /** Single compact summary line for the detail area */
  getActivitySummaryLine(row: any): string {
    const code = this.getActivityCode(row);
    const display = this.getActivityDisplay(row);
    const meta = (row?.metadata && typeof row.metadata === 'object') ? row.metadata : {};

    const isLogin  = code === 'LOGIN'  || display === 'login';
    const isLogout = code === 'LOGOUT' || display === 'logout';
    const isReg    = code === 'REG'    || display.includes('registr');

    if (isLogin) {
      const method = String(meta?.auth_method ?? meta?.authMethod ?? meta?.method ?? '').trim();
      return method ? `Auth method: ${method}` : 'Session started';
    }
    if (isLogout) {
      const method = String(meta?.method ?? meta?.logout_method ?? meta?.logoutMethod ?? '').trim();
      return method ? `Logout method: ${method}` : 'Session ended';
    }
    if (isReg) {
      const src = String(meta?.initial_source ?? meta?.initialSource ?? '').trim();
      const method = String(meta?.registration_method ?? meta?.registrationMethod ?? meta?.method ?? '').trim();
      const parts = [method && `via ${method}`, src && `source: ${src}`].filter(Boolean);
      return parts.length ? parts.join(', ') : 'Account registered';
    }
    if (code === 'PASS_RESET' || display.includes('password')) return 'Password reset completed';
    if (code === 'USR_UPD' || display.includes('update')) {
      const fields = meta?.updated_fields ?? meta?.updatedFields ?? meta?.fields;
      if (Array.isArray(fields) && fields.length) {
        return `Updated: ${fields.slice(0, 3).map((v: any) => String(v)).join(', ')}${fields.length > 3 ? '…' : ''}`;
      }
      return 'Profile updated';
    }
    if (code === 'USR_DEL' || display.includes('delet')) return 'Account deleted';

    // Fallback: render all metadata key-value pairs compactly
    const entries = Object.entries(meta).filter(([_, v]) => v !== null && v !== undefined && v !== '');
    if (entries.length) {
      return entries.slice(0, 3).map(([k, v]) => `${this.humanizeKey(k)}: ${String(v).slice(0, 40)}`).join(' · ');
    }
    return '';
  }

  private humanizeKey(key: string): string {
    return String(key || '')
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .trim()
      .split(/\s+/)
      .map(w => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
      .join(' ');
  }

  private readWalletViewFromParams(params: any): 'wallets' | 'others' {
    if (this.selectedSupplyChainSection !== 'wallet') {
      return 'wallets';
    }
    if (this.isLicenseeUser() && this.licenseeMenuAccessResolved && !this.showBreweryOrDistilleryWalletViews) {
      return 'others';
    }
    const value = String(params?.walletView || '').trim().toLowerCase();
    return value === 'others' ? 'others' : 'wallets';
  }

  private readDistributorPermitMode(params: any): 'list' | 'apply' {
    if (this.selectedSupplyChainSection !== 'distributor-permit') {
      return 'list';
    }
    const value = String(params?.mode || '').trim().toLowerCase();
    return value === 'apply' ? 'apply' : 'list';
  }

  private ensureWalletViewParamAllowed(params: any): void {
    if (this.selectedSupplyChainSection !== 'wallet') {
      return;
    }
    if (!this.isLicenseeUser()) {
      return;
    }
    if (!this.licenseeMenuAccessResolved) {
      return;
    }
    if (this.showBreweryOrDistilleryWalletViews) {
      return;
    }

    const raw = String(params?.walletView || '').trim().toLowerCase();
    if (raw === 'others' || raw === '') {
      return;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { walletView: 'others' },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  shouldShowWalletViewToggle(): boolean {
    if (this.selectedSupplyChainSection !== 'wallet') {
      return false;
    }
    if (!this.isLicenseeUser()) {
      return true;
    }
    if (!this.licenseeMenuAccessResolved) {
      return false;
    }
    return this.showManufacturingWalletNav && this.showBreweryOrDistilleryWalletViews;
  }

  setWalletViewMode(mode: 'wallets' | 'others'): void {
    if (this.isLicenseeUser() && this.licenseeMenuAccessResolved && !this.showBreweryOrDistilleryWalletViews) {
      mode = 'others';
    }
    if (!mode || this.walletViewMode === mode) return;
    this.walletViewMode = mode;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { walletView: mode },
      queryParamsHandling: 'merge'
    });
  }

  private checkSpecialPermitEligibility(): void {
    const roleId = Number(this.currentUser?.roleId || 0);
    const isCommissioner = roleId === 10;
    const isDistrictUser = roleId === 4;
    const isAdmin = roleId === 1 || roleId === 3;

    if (isCommissioner || isDistrictUser || isAdmin) {
      this.showSpecialPermitChartOption = true;
      this.updateAvailableChartModules();
    } else {
      this.licenseMeService.getMyLicenses().subscribe({
        next: (res: any) => {
          const rows = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
          this.showSpecialPermitChartOption = rows.some((row: any) =>
            row?.isSpecialPermitAllowed === true || row?.is_special_permit_allowed === true
          );
          this.updateAvailableChartModules();
        },
        error: () => {
          this.showSpecialPermitChartOption = false;
          this.updateAvailableChartModules();
        }
      });
    }
  }

  private initializeDashboard() {
    // Get current user from role service
    this.currentUser = this.roleService.getCurrentUser();
    this.refreshWelcomeText();
    if (this.currentUser) {
      this.checkSpecialPermitEligibility();
    }

    // If no current user in role service, try to get from account service
    if (!this.currentUser) {
      this.accountService.identity().subscribe(accountUser => {
        if (accountUser) {
          // Map account user to unified user (same logic as unified layout)
          const mappedUser = this.mapAccountUserToUnifiedUser(accountUser);
          this.roleService.setCurrentUser(mappedUser);
          this.currentUser = mappedUser;
          this.refreshWelcomeText();
          this.checkSpecialPermitEligibility();
          this.proceedWithDashboardLoad();
        } else {
          this.error = 'No user found. Please log in again.';
          this.isLoading = false;
        }
      });
    } else {
      this.proceedWithDashboardLoad();
    }
  }

  private mapAccountUserToUnifiedUser(accountUser: any): User {
    // Use backend role id directly (no name-based mapping)
    const roleId = Number(accountUser?.role?.id) || 1;

    return {
      id: accountUser.id || 1,
      username: accountUser.username || accountUser.login || 'user',
      email: accountUser.email || 'user@excise.gov',
      fullName: `${accountUser.firstName || ''} ${accountUser.lastName || ''}`.trim() || 'User',
      roleId: roleId,
      role: this.roleService.getRoleById(roleId)!,
      permissions: this.roleService.getRoleById(roleId)?.permissions || [],
      isActive: true,
      lastLogin: new Date()
    };
  }

  private proceedWithDashboardLoad() {
    // Load dashboard configuration
    this.dashboardConfigService.getCurrentUserDashboardConfigCached()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (config) => {
          this.dashboardConfig = config;
          this.loadLicenseeMenuAccess();
        },
        error: (error) => {
          console.error('Error loading dashboard configuration:', error);
          this.error = 'Failed to load dashboard configuration.';
          this.isLoading = false;
        }
      });
  }

  private loadDashboardData(forceRefresh = false) {
    if (this.dashboardLoadInFlight && !forceRefresh) {
      return;
    }

    this.dashboardLoadInFlight = true;
    if (forceRefresh) {
      this.supplyChainModuleStatsLoaded = false;
      this.licenseeHologramProcurementsCache = null;
    }

    // Officer dashboards are full-page components and should render directly
    // without waiting for unified stats/table data.
    if (this.shouldShowRoleSpecificDashboard()) {
      this.isLoading = false;
      this.isChartLoading = true;
      // Paint the dashboard and chart loader before role APIs begin.
      setTimeout(() => this.loadDashboardStatsLight(forceRefresh), 0);
      return;
    }

    // If no specific section is selected, load dashboard stats
    if (!this.selectedSupplyChainSection) {
      if (this.isLicenseeUser()) {
        this.loadDashboardStats(forceRefresh);
      } else {
        this.loadDashboardStatsLight(forceRefresh);
      }
    } else {
      this.isLoading = false; // Directly show the section
      this.dashboardLoadInFlight = false;
    }
  }

  getSupplyChainPendingCount(section: string): number {
    const key = String(section || '').trim().toLowerCase();
    const sidebarPending = Number(this.supplyChainPendingCounts?.[key] || 0);
    if (sidebarPending > 0) {
      return sidebarPending;
    }

    return Number(this.supplyChainModuleCounts?.[key]?.pending || 0);
  }

  getOicPendingCount(section: string): number {
    const key = String(section || '').trim().toLowerCase();
    return Number(this.oicActionPendingCounts?.[key] || 0);
  }

  getSupplyChainPendingTotal(): number {
    const roleId = this.getCurrentRoleId();
    if (roleId === 4 || roleId === 8 || roleId === 9) return 0;
    const isCommissioner = this.isCommissionerUser();
    return this.getSupplyChainPendingCount('requisition') +
           this.getSupplyChainPendingCount('revalidation') +
           this.getSupplyChainPendingCount('cancellation') +
           this.getSupplyChainPendingCount('hologram') +
           (isCommissioner ? 0 : this.getSupplyChainPendingCount('transit'));
  }

  getSupplyChainAwaitingPaymentTotal(): number {
    const roleId = this.getCurrentRoleId();
    if (roleId === 4 || roleId === 8 || roleId === 9) return 0;
    const isCommissioner = this.isCommissionerUser();
    if (isCommissioner) return 0;
    return (this.supplyChainModuleCounts['requisition']?.awaitingPayment || 0) +
           (this.supplyChainModuleCounts['hologram']?.awaitingPayment || 0);
  }

  getSupplyChainAppliedTotal(): number {
    const roleId = this.getCurrentRoleId();
    if (roleId === 4 || roleId === 8 || roleId === 9) return 0;
    const isCommissioner = this.isCommissionerUser();
    const modules = ['requisition', 'revalidation', 'cancellation', 'hologram'];
    if (!isCommissioner) {
      modules.push('transit');
    }
    return modules.reduce((sum, m) => sum + (this.supplyChainModuleCounts[m]?.applied || 0), 0);
  }

  getSupplyChainApprovedTotal(): number {
    const roleId = this.getCurrentRoleId();
    if (roleId === 4 || roleId === 8 || roleId === 9) return 0;
    const isCommissioner = this.isCommissionerUser();
    const modules = ['requisition', 'revalidation', 'cancellation', 'hologram'];
    if (!isCommissioner) {
      modules.push('transit');
    }
    return modules.reduce((sum, m) => sum + (this.supplyChainModuleCounts[m]?.approved || 0), 0);
  }

  getSupplyChainRejectedTotal(): number {
    const roleId = this.getCurrentRoleId();
    if (roleId === 4 || roleId === 8 || roleId === 9) return 0;
    const isCommissioner = this.isCommissionerUser();
    const modules = ['requisition', 'revalidation', 'cancellation', 'hologram'];
    if (!isCommissioner) {
      modules.push('transit');
    }
    return modules.reduce((sum, m) => sum + (this.supplyChainModuleCounts[m]?.rejected || 0), 0);
  }

  getSupplyChainObjectionTotal(): number {
    const roleId = this.getCurrentRoleId();
    if (roleId === 4 || roleId === 8 || roleId === 9) return 0;
    const isCommissioner = this.isCommissionerUser();
    const modules = ['requisition', 'revalidation', 'cancellation', 'hologram'];
    if (!isCommissioner) {
      modules.push('transit');
    }
    return modules.reduce((sum, m) => sum + (this.supplyChainModuleCounts[m]?.objection || 0), 0);
  }

  getCurrentRoleId(): number {
    const direct = Number(
      this.currentUser?.roleId ||
      this.currentUser?.role?.id ||
      (this.accountService?.getCurrentUser() as any)?.roleId ||
      (this.accountService?.getCurrentUser() as any)?.role?.id ||
      0
    );
    if (direct > 0) return direct;

    if (typeof window !== 'undefined') {
      const storedRole = String(localStorage.getItem('role') || sessionStorage.getItem('role') || '').trim();
      const parsedRole = Number(storedRole);
      if (!isNaN(parsedRole) && parsedRole > 0) return parsedRole;

      const sources = [
        sessionStorage.getItem('currentUser'),
        localStorage.getItem('currentUser'),
        sessionStorage.getItem('user'),
        localStorage.getItem('user')
      ];
      for (const raw of sources) {
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw);
          const rId = Number(parsed?.roleId || parsed?.role?.id || parsed?.user?.roleId || parsed?.user?.role?.id || 0);
          if (rId > 0) return rId;
        } catch {}
      }
    }

    return 0;
  }

  isOicUser(): boolean {
    const roleId = this.getCurrentRoleId();
    if (roleId === 7) return true;
    if (roleId === 8 || roleId === 4) return false;

    if (typeof window !== 'undefined') {
      const storedRole = String(localStorage.getItem('role') || sessionStorage.getItem('role') || '').trim().toLowerCase();
      if (storedRole === '7' || storedRole.includes('officerincharge') || storedRole === 'oic') return true;

      const sources = [
        sessionStorage.getItem('currentUser'),
        localStorage.getItem('currentUser'),
        sessionStorage.getItem('user'),
        localStorage.getItem('user')
      ];
      for (const raw of sources) {
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw);
          const rId = Number(parsed?.roleId || parsed?.role?.id || parsed?.user?.roleId || parsed?.user?.role?.id || 0);
          if (rId === 7) return true;
          if (rId === 8 || rId === 4) return false;
          const rName = String(parsed?.role?.name || parsed?.role?.displayName || parsed?.role_name || parsed?.user?.role?.name || '').toLowerCase();
          const norm = rName.replace(/[^a-z0-9]/g, '');
          if (norm.includes('officerincharge') || norm === 'oic' || norm === 'offcierincharge') return true;
        } catch {}
      }
    }

    const roleName = String(
      this.currentUser?.role?.name ||
      this.currentUser?.role?.displayName ||
      ''
    ).toLowerCase();
    const normalized = roleName.replace(/[^a-z0-9]/g, '');
    return normalized.includes('officerincharge') || normalized === 'oic' || normalized === 'offcierincharge';
  }

  private rawOicData = {
    transit: [] as any[],
    bldetails: [] as any[],
    hologram: [] as any[],
    hologramRequests: [] as any[]
  };

  private matchesDateFilter(item: any, month?: number, year?: number): boolean {
    if (month === undefined && year === undefined) return true;
    const rawDate =
      item?.date || item?.created_at || item?.createdAt ||
      item?.submissionDate || item?.submittedAt || item?.submission_date || item?.submitted_at ||
      item?.created_on || item?.issue_date || item?.issued_at || '';
    if (!rawDate) return true;
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return true;
    if (month !== undefined && (d.getMonth() + 1) !== month) return false;
    if (year !== undefined && d.getFullYear() !== year) return false;
    return true;
  }

  private recalculateOicStats(month?: number, year?: number): void {
    if (!this.isOicUser()) return;

    // Filter Transit Permits by month and year
    let tra = this.filterByOicScopedLicense(this.rawOicData.transit || []);
    if (month !== undefined || year !== undefined) {
      tra = tra.filter(x => this.matchesDateFilter(x, month, year));
    }
    const billNos = new Set<string>();
    const traItems: any[] = [];
    tra.forEach(item => {
      const billNo = item.billNo || item.bill_no;
      if (billNo && !billNos.has(billNo)) { billNos.add(billNo); traItems.push(item); }
      else if (!billNo) { traItems.push(item); }
    });
    const traPending = traItems.filter(x => {
      const s = String(x.status || '').toLowerCase();
      return !s.includes('approved') && !s.includes('issued') && !s.includes('terminated') && !s.includes('cancelled');
    }).length;
    const traApproved = traItems.filter(x => {
      const s = String(x.status || '').toLowerCase();
      return s.includes('approved') || s.includes('issued');
    }).length;
    const traRejected = traItems.filter(x => {
      const s = String(x.status || '').toLowerCase();
      return s.includes('rejected') || s.includes('cancelled') || s.includes('terminated');
    }).length;
    this.supplyChainModuleCounts['transit'] = { applied: traItems.length, pending: traPending, approved: traApproved, objection: 0, rejected: traRejected };

    // Filter Hologram Procurement by month and year
    let hol = this.filterByOicScopedLicense(this.rawOicData.hologram || []);
    if (month !== undefined || year !== undefined) {
      hol = hol.filter(x => this.matchesDateFilter(x, month, year));
    }
    const oicHolCounts = this.countOicHologramProcurementStatus(hol);
    this.supplyChainModuleCounts['hologram'] = { applied: oicHolCounts.applied, pending: oicHolCounts.pending, approved: oicHolCounts.approved, objection: 0, rejected: oicHolCounts.rejected };

    // Filter Bulk Spirit Details by month and year
    let bld = this.filterByOicScopedLicense(this.rawOicData.bldetails || []);
    if (month !== undefined || year !== undefined) {
      bld = bld.filter(x => this.matchesDateFilter(x, month, year));
    }
    const bldPending = bld.filter(x => {
      const s = String(x.approvalStatus || x.approval_status || x.review_status || x.reviewStatus || x.status || '').toLowerCase();
      return s.includes('pending') || s === '';
    }).length;
    const bldApproved = bld.filter(x => {
      const s = String(x.approvalStatus || x.approval_status || x.review_status || x.reviewStatus || x.status || '').toLowerCase();
      return s.includes('approved') || s.includes('completed');
    }).length;
    const bldRejected = bld.filter(x => {
      const s = String(x.approvalStatus || x.approval_status || x.review_status || x.reviewStatus || x.status || '').toLowerCase();
      return s.includes('rejected') || s.includes('cancelled');
    }).length;
    this.supplyChainModuleCounts['bldetails'] = { applied: bld.length, pending: bldPending, approved: bldApproved, objection: 0, rejected: bldRejected };

    // Filter Hologram Requests by month and year
    let holReq = this.filterByOicScopedLicense(this.rawOicData.hologramRequests || []);
    if (month !== undefined || year !== undefined) {
      holReq = holReq.filter(x => this.matchesDateFilter(x, month, year));
    }
    const holReqPending = holReq.filter(x => {
      const s = String(x.currentStageName || x.current_stage_name || x.status || '').toLowerCase();
      return s.includes('pending') || s.includes('under') || s.includes('submitted');
    }).length;
    const holReqApproved = holReq.filter(x => {
      const s = String(x.currentStageName || x.current_stage_name || x.status || '').toLowerCase();
      return s.includes('approved') || s.includes('complete') || s.includes('issued');
    }).length;
    const holReqRejected = holReq.filter(x => {
      const s = String(x.currentStageName || x.current_stage_name || x.status || '').toLowerCase();
      return s.includes('rejected') || s.includes('cancelled');
    }).length;
    this.supplyChainModuleCounts['hologramRequests'] = { applied: holReq.length, pending: holReqPending, approved: holReqApproved, objection: 0, rejected: holReqRejected };
  }

  private resolveOicScopedLicenseId(): string {
    if (typeof window === 'undefined') return '';
    const userFromAccount: any = this.accountService?.getCurrentUser() || {};
    const directFromAccount = this.extractOicLicenseIdFromObject(userFromAccount);
    if (directFromAccount) return directFromAccount;

    const sources = [
      sessionStorage.getItem('currentUser'),
      localStorage.getItem('currentUser'),
      sessionStorage.getItem('user'),
      localStorage.getItem('user')
    ];
    for (const raw of sources) {
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        const resolved = this.extractOicLicenseIdFromObject(parsed);
        if (resolved) return resolved;
      } catch {}
    }
    return '';
  }

  private extractOicLicenseIdFromObject(payload: any): string {
    if (!payload || typeof payload !== 'object') return '';
    const direct = payload.license_id || payload.licenseId || payload.licensee_id || payload.licenseeId;
    if (direct && String(direct).trim()) return String(direct).trim();
    const nestedCandidates = [
      payload.user, payload.profile, payload.supply_chain_profile,
      payload.supplyChainProfile, payload.oic_assignment, payload.oicAssignment, payload.assignment
    ];
    for (const nested of nestedCandidates) {
      const nestedId = this.extractOicLicenseIdFromObject(nested);
      if (nestedId) return nestedId;
    }
    return '';
  }

  private expandOicLicenseAliases(licenseId: string): string[] {
    const normalized = String(licenseId || '').trim();
    if (!normalized) return [];
    const aliases = [normalized];
    if (normalized.startsWith('NLI/')) aliases.push(`NA/${normalized.slice(4)}`);
    if (normalized.startsWith('NA/')) aliases.push(`NLI/${normalized.slice(3)}`);
    return aliases;
  }

  private filterByOicScopedLicense(rows: any[]): any[] {
    const scopedLicense = this.resolveOicScopedLicenseId();
    if (!scopedLicense) return rows || [];
    const allowed = new Set(this.expandOicLicenseAliases(scopedLicense));
    return (rows || []).filter((row: any) => {
      const rowLicense = row?.license_id || row?.licenseId || row?.licensee_id || row?.licenseeId;
      if (!rowLicense) return false;
      return this.expandOicLicenseAliases(rowLicense).some((alias) => allowed.has(alias));
    });
  }

  private refreshSupplyChainPendingCounts(force = false): void {
    if (!this.isLicenseeUser()) {
      this.supplyChainPendingCounts = {};
      return;
    }

    this.sidebarPendingBadgeService
      .refresh(['requisition', 'revalidation', 'cancellation', 'hologram', 'transit'], force, { audience: 'licensee', mode: 'full' })
      .pipe(
        takeUntil(this.destroy$),
        catchError(() => of({} as Record<string, number>))
      )
      .subscribe((counts) => {
        this.supplyChainPendingCounts = counts || {};
        this.updateSingleWindowChart();
      });
  }

  private refreshOicActionPendingCount(force = false): void {
    if (!this.isOicUser()) {
      this.oicActionPendingCounts = {};
      return;
    }

    // OIC dashboard "Pending" should reflect only items where the user has an action
    // (align with sidebar badges), not all in-flight applications.
    // Include Daily Hologram Entry so OIC remembers to complete the daily register.
    const sections = ['transit-applications', 'hologram-daily-entry'];
    this.sidebarPendingBadgeService
      .refresh(sections, force, { audience: 'officer', mode: 'full' })
      .pipe(
        takeUntil(this.destroy$),
        catchError(() => of({} as Record<string, number>))
      )
      .subscribe((counts) => {
        this.oicActionPendingCounts = counts || {};
        const total = Object.values(counts || {}).reduce((sum, v) => sum + Number(v || 0), 0);
        this.dashboardCounts = { ...this.dashboardCounts, pending: total };
      });
  }

  private loadDashboardStatsLight(forceRefresh = false) {
    // Keep login fast: fetch only counts. Lists are fetched on-demand when user opens a table.
    this.applicationsLoaded = false;
    this.applicationsLoading = false;
    this.clearDataSources();
    this.isChartLoading = true;

    this.unifiedDashboardService
      .getDetailedUnifiedDashboardCounts(this.dashboardConfig, forceRefresh)
      .pipe(finalize(() => { this.isLoading = false; }))
      .subscribe({
        next: (res) => {
          const roleId = this.getCurrentRoleId();
          const isDistrictUser = roleId === 4;
          const isScopedOfficer = roleId === 8 || roleId === 9;
          if (isDistrictUser) {
            res.company = { applied: 0, pending: 0, objection: 0, approved: 0, rejected: 0, awaitingPayment: 0 } as any;
            res.companyCollaboration = { applied: 0, pending: 0, objection: 0, approved: 0, rejected: 0, awaitingPayment: 0 } as any;
            res.labelRegistration = { applied: 0, pending: 0, objection: 0, approved: 0, rejected: 0, awaitingPayment: 0 } as any;
            const allowed = [res.newLicense, res.renewal, res.salesman, res.specialPermit];
            res.total = {
              applied: allowed.reduce((sum, item) => sum + (item?.applied || 0), 0),
              pending: allowed.reduce((sum, item) => sum + (item?.pending || 0), 0),
              objection: allowed.reduce((sum, item) => sum + (item?.objection || 0), 0),
              approved: allowed.reduce((sum, item) => sum + (item?.approved || 0), 0),
              rejected: allowed.reduce((sum, item) => sum + (item?.rejected || 0), 0),
              awaitingPayment: allowed.reduce((sum, item) => sum + (item?.awaitingPayment || (item as any)?.awaiting_payment || 0), 0)
            } as any;
          }
          if (isScopedOfficer) {
            res.company = { applied: 0, pending: 0, objection: 0, approved: 0, rejected: 0, awaitingPayment: 0 } as any;
            res.companyCollaboration = { applied: 0, pending: 0, objection: 0, approved: 0, rejected: 0, awaitingPayment: 0 } as any;
            res.specialPermit = { applied: 0, pending: 0, objection: 0, approved: 0, rejected: 0, awaitingPayment: 0 } as any;
            res.labelRegistration = { applied: 0, pending: 0, objection: 0, approved: 0, rejected: 0, awaitingPayment: 0 } as any;
            // Officer APIs don't return `applied`, compute it from pending+approved+rejected
            const fixApplied = (item: any) => {
              if (!item) return { applied: 0, pending: 0, objection: 0, approved: 0, rejected: 0, awaitingPayment: 0 };
              const a = (item.applied || 0) || ((item.pending || 0) + (item.approved || 0) + (item.rejected || 0) + (item.objection || 0));
              return { ...item, applied: a };
            };
            res.newLicense = fixApplied(res.newLicense);
            res.renewal = fixApplied(res.renewal);
            res.salesman = fixApplied(res.salesman);
            const allowed = [res.newLicense, res.renewal, res.salesman];
            res.total = {
              applied: allowed.reduce((sum, item) => sum + (item?.applied || 0), 0),
              pending: allowed.reduce((sum, item) => sum + (item?.pending || 0), 0),
              objection: allowed.reduce((sum, item) => sum + (item?.objection || 0), 0),
              approved: allowed.reduce((sum, item) => sum + (item?.approved || 0), 0),
              rejected: allowed.reduce((sum, item) => sum + (item?.rejected || 0), 0),
              awaitingPayment: allowed.reduce((sum, item) => sum + (item?.awaitingPayment || (item as any)?.awaiting_payment || 0), 0)
            } as any;
          }
          this.detailedCounts = {
            total: res.total,
            newLicense: res.newLicense,
            renewal: res.renewal,
            salesman: res.salesman,
            company: res.company,
            companyCollaboration: (res as any).companyCollaboration || { applied: 0, pending: 0, objection: 0, approved: 0, rejected: 0, awaitingPayment: 0 },
            specialPermit: res.specialPermit,
            labelRegistration: res.labelRegistration || { applied: 0, pending: 0, objection: 0, approved: 0, rejected: 0, awaitingPayment: 0 }
          };
          this.dashboardCounts = {
            applied: res.total.applied || 0,
            pending: res.total.pending || 0,
            objection: res.total.objection || 0,
            approved: res.total.approved || 0,
            rejected: res.total.rejected || 0,
            awaitingPayment: res.total.awaitingPayment || 0
          };
          this.refreshOicActionPendingCount();
          this.loadSupplyChainModuleStats(undefined, () => {
            this.isChartLoading = false;
          });
          this.updateSingleWindowChart();
          this.dashboardLoadInFlight = false;
        },
        error: (error) => {
          console.error('❌ Error loading dashboard counts:', error);
          this.dashboardCounts = { applied: 0, pending: 0, objection: 0, awaitingPayment: 0, approved: 0, rejected: 0 };
          this.supplyChainPendingCounts = {};
          this.updateSingleWindowChart();
          this.isChartLoading = false;
          this.dashboardLoadInFlight = false;
        }
      });
  }

  private loadDashboardStats(forceRefresh = false) {
    if (forceRefresh) {
      this.unifiedDashboardService.clearUnifiedAppsCache();
    }
    this.isChartLoading = true;
    // Use the unified dashboard service for all roles
    forkJoin({
      applications: this.unifiedDashboardService.getUnifiedApplicationsByStatus(forceRefresh, this.dashboardConfig),
      hologramProcurements: (this.isLicenseeUser() || this.isOicUser())
        ? (
            !forceRefresh && this.licenseeHologramProcurementsCache
              ? of(this.licenseeHologramProcurementsCache)
              : this.hologramService.getProcurements().pipe(
                  tap((rows) => {
                    this.licenseeHologramProcurementsCache = Array.isArray(rows) ? rows : [];
                  }),
                  catchError(() => of([]))
                )
          )
        : of([])
    })
      .pipe(finalize(() => {
        this.isLoading = false;
        this.isChartLoading = false;
      }))
      .subscribe({
        next: (result) => {
          let filteredApplications = {
            applied: result.applications.applied || [],
            pending: result.applications.pending || [],
            objection: (result.applications as any).objection || [],
            awaitingPayment: result.applications.awaitingPayment || [],
            approved: result.applications.approved || [],
            rejected: result.applications.rejected || []
          };

          // For licensee users: the backend places company-collaboration and company-registration
          // items in the 'approved' bucket once they leave the applicant's hands (i.e. forwarded
          // to Permit Section, Commissioner etc.). From the licensee's view these are still
          // "Under Review" (pending). Reclassify them based on their actual stage name.
          if (this.isLicenseeUser()) {
            const isOfficerStage = (app: any): boolean => {
              const stage = String(
                app?.current_stage_name ?? app?.currentStageName ?? app?.status ?? ''
              ).toLowerCase().replace(/[^a-z0-9]/g, '');
              // Truly final stages that should remain 'approved'
              const finalStages = ['approved', 'finalapproved', 'issued', 'complete', 'active'];
              if (finalStages.some(s => stage.includes(s))) return false;
              // Rejected stages should stay in rejected
              if (stage.includes('reject') || stage.includes('cancel')) return false;
              // Objection stages
              if (stage.includes('objection')) return false;
              // Otherwise it's at an officer review stage → treat as pending
              return true;
            };

            const reClassifyTypes = ['company-collaboration', 'company'];
            const stillApproved: any[] = [];
            const movedToPending: any[] = [];

            filteredApplications.approved.forEach((app: any) => {
              if (reClassifyTypes.includes(app.type) && isOfficerStage(app)) {
                movedToPending.push(app);
              } else {
                stillApproved.push(app);
              }
            });

            if (movedToPending.length > 0) {
              filteredApplications = {
                ...filteredApplications,
                approved: stillApproved,
                pending: [...filteredApplications.pending, ...movedToPending]
              };
            }
          }

          // Product requirement: newly submitted applications should appear under Pending.
          const pendingBucket = [
            ...filteredApplications.pending,
            ...filteredApplications.applied
          ];

          const renewedLicenseIds = this.getRenewedLicenseIds(
            filteredApplications.applied,
            filteredApplications.pending,
            filteredApplications.awaitingPayment
          );

          const approvedWithoutRenewal: UnifiedApplication[] = [];
          const approvedWithRenewal: UnifiedApplication[] = [];
          filteredApplications.approved.forEach((app: UnifiedApplication) => {
            const licenseId = this.extractLicenseId(app);
            const isRenewed = (app.type === 'new-license' || app.type === 'salesman-barman' || app.type === 'company-collaboration') && licenseId && renewedLicenseIds.has(licenseId);
            if (isRenewed) {
              approvedWithRenewal.push(app);
            } else {
              approvedWithoutRenewal.push(app);
            }
          });

           // Store counts separately but combine pending display
          const getCountsForType = (typeVal: string) => {
            return {
              applied: filteredApplications.applied.filter((app: any) => app.type === typeVal).length,
              pending: pendingBucket.filter((app: any) => app.type === typeVal).length,
              awaitingPayment: filteredApplications.awaitingPayment.filter((app: any) => app.type === typeVal).length,
              approved: approvedWithoutRenewal.filter((app: any) => app.type === typeVal).length,
              objection: filteredApplications.objection.filter((app: any) => app.type === typeVal).length,
              rejected: filteredApplications.rejected.filter((app: any) => app.type === typeVal).length
            };
          };

          this.detailedCounts = {
            total: {
              applied: filteredApplications.applied.length,
              pending: pendingBucket.length,
              awaitingPayment: filteredApplications.awaitingPayment.length,
              approved: approvedWithoutRenewal.length,
              objection: filteredApplications.objection.length,
              rejected: filteredApplications.rejected.length
            },
            newLicense: getCountsForType('new-license'),
            renewal: getCountsForType('license-renewal'),
            salesman: getCountsForType('salesman-barman'),
            company: getCountsForType('company-registration'),
            companyCollaboration: getCountsForType('company-collaboration'),
            specialPermit: getCountsForType('special-permit'),
            labelRegistration: getCountsForType('label-registration')
          };

          this.dashboardCounts = {
            applied: 0,
            pending: pendingBucket.length,
            awaitingPayment: filteredApplications.awaitingPayment.length,
            objection: filteredApplications.objection.length,
            approved: approvedWithoutRenewal.length,
            rejected: filteredApplications.rejected.length
          };

          this.awaitingPaymentBreakdown = {
            newLicense: filteredApplications.awaitingPayment.filter(app => app.type === 'new-license').length,
            licenseRenewal: filteredApplications.awaitingPayment.filter(app => app.type === 'license-renewal').length,
            salesmanBarman: filteredApplications.awaitingPayment.filter(app => app.type === 'salesman-barman').length,
            companyRegistration: filteredApplications.awaitingPayment.filter(app => app.type === 'company-registration').length,
            companyCollaboration: filteredApplications.awaitingPayment.filter(app => app.type === 'company-collaboration').length,
            specialPermit: filteredApplications.awaitingPayment.filter(app => app.type === 'special-permit').length
          };

          // Licensee & OIC UX: include hologram procurement workflow in Pending/Approved totals.
          if (this.isLicenseeUser()) {
            const hologramCounts = this.countLicenseeHologramProcurements(result.hologramProcurements || []);
            this.dashboardCounts = {
              ...this.dashboardCounts,
              pending: (this.dashboardCounts.pending || 0) + hologramCounts.pending,
              approved: (this.dashboardCounts.approved || 0) + hologramCounts.approved,
              rejected: (this.dashboardCounts.rejected || 0) + hologramCounts.rejected
            };
          } else if (this.isOicUser()) {
            const oicHologramCounts = this.countOicHologramProcurementStatus(result.hologramProcurements || []);
            this.dashboardCounts = {
              ...this.dashboardCounts,
              applied: (this.dashboardCounts.applied || 0) + oicHologramCounts.applied,
              pending: (this.dashboardCounts.pending || 0) + oicHologramCounts.pending,
              approved: (this.dashboardCounts.approved || 0) + oicHologramCounts.approved,
              rejected: (this.dashboardCounts.rejected || 0) + oicHologramCounts.rejected
            };
          }

          // Show submitted + pending + awaiting payment together in Pending table.
          this.checkRenewalEligibility(approvedWithoutRenewal, approvedWithRenewal);
          this.updateDataSources({
            applied: [],
            pending: pendingBucket,
            objection: filteredApplications.objection,
            approved: approvedWithoutRenewal,
            rejected: filteredApplications.rejected
          });

          this.refreshOicActionPendingCount();
          // Pass the already-fetched hologram data so loadSupplyChainModuleStats
          // does not re-fetch it, eliminating a duplicate /hologram/procurement/ call.
          this.loadSupplyChainModuleStats({ hologram: result.hologramProcurements || [] });
          this.updateSingleWindowChart();
          this.dashboardLoadInFlight = false;
        },
        error: (error) => {
          console.error('❌ Error loading dashboard data:', error);
          this.dashboardCounts = { applied: 0, pending: 0, objection: 0, awaitingPayment: 0, approved: 0, rejected: 0 };
          this.clearDataSources();
          this.supplyChainPendingCounts = {};
          this.dashboardLoadInFlight = false;
        }
      });
  }

  private ensureApplicationsLoaded(forceRefresh = false): void {
    if (this.applicationsLoading) return;
    if (!forceRefresh && this.applicationsLoaded) return;

    this.applicationsLoading = true;

    forkJoin({
      applications: this.unifiedDashboardService.getUnifiedApplicationsByStatus(forceRefresh, this.dashboardConfig),
      hologramProcurements: (this.isLicenseeUser() || this.isOicUser())
        ? (
            !forceRefresh && this.licenseeHologramProcurementsCache
              ? of(this.licenseeHologramProcurementsCache)
              : this.hologramService.getProcurements().pipe(
                  tap((rows) => {
                    this.licenseeHologramProcurementsCache = Array.isArray(rows) ? rows : [];
                  }),
                  catchError(() => of([]))
                )
          )
        : of([])
    })
      .pipe(finalize(() => { this.applicationsLoading = false; }))
      .subscribe({
        next: (result) => {
          this.applicationsLoaded = true;

          const filteredApplications = {
            applied: result.applications.applied || [],
            pending: result.applications.pending || [],
            objection: (result.applications as any).objection || [],
            awaitingPayment: result.applications.awaitingPayment || [],
            approved: result.applications.approved || [],
            rejected: result.applications.rejected || []
          };

          const pendingBucket = [
            ...filteredApplications.pending,
            ...filteredApplications.applied
          ];

          const renewedLicenseIds = this.getRenewedLicenseIds(
            filteredApplications.applied,
            filteredApplications.pending,
            filteredApplications.awaitingPayment
          );

          const approvedWithoutRenewal: UnifiedApplication[] = [];
          const approvedWithRenewal: UnifiedApplication[] = [];
          filteredApplications.approved.forEach((app: UnifiedApplication) => {
            const licenseId = this.extractLicenseId(app);
            const isRenewed = (app.type === 'new-license' || app.type === 'salesman-barman' || app.type === 'company-collaboration') && licenseId && renewedLicenseIds.has(licenseId);
            if (isRenewed) {
              approvedWithRenewal.push(app);
            } else {
              approvedWithoutRenewal.push(app);
            }
          });

          this.dashboardCounts = {
            ...this.dashboardCounts,
            awaitingPayment: filteredApplications.awaitingPayment.length,
            approved: approvedWithoutRenewal.length
          };

          this.awaitingPaymentBreakdown = {
            newLicense: filteredApplications.awaitingPayment.filter(app => app.type === 'new-license').length,
            licenseRenewal: filteredApplications.awaitingPayment.filter(app => app.type === 'license-renewal').length,
            salesmanBarman: filteredApplications.awaitingPayment.filter(app => app.type === 'salesman-barman').length,
            companyRegistration: filteredApplications.awaitingPayment.filter(app => app.type === 'company-registration').length,
            companyCollaboration: filteredApplications.awaitingPayment.filter(app => app.type === 'company-collaboration').length,
            specialPermit: filteredApplications.awaitingPayment.filter(app => app.type === 'special-permit').length
          };

          if (this.isLicenseeUser()) {
            const hologramCounts = this.countLicenseeHologramProcurements(result.hologramProcurements || []);
            this.dashboardCounts = {
              ...this.dashboardCounts,
              pending: (this.dashboardCounts.pending || 0) + hologramCounts.pending,
              approved: (this.dashboardCounts.approved || 0) + hologramCounts.approved,
              rejected: (this.dashboardCounts.rejected || 0) + hologramCounts.rejected
            };
          }

          this.checkRenewalEligibility(approvedWithoutRenewal, approvedWithRenewal);
          this.updateDataSources({
            applied: [],
            pending: pendingBucket,
            objection: filteredApplications.objection,
            approved: approvedWithoutRenewal,
            rejected: filteredApplications.rejected
          });

          this.loadSupplyChainModuleStats({ hologram: result.hologramProcurements || [] });
          this.updateSingleWindowChart();
        },
        error: (error) => {
          console.error('❌ Error loading dashboard applications:', error);
          this.clearDataSources();
          this.supplyChainPendingCounts = {};
        }
      });
  }

  private countLicenseeHologramProcurements(procurements: any[]): { pending: number; approved: number; rejected: number } {
    const rows = Array.isArray(procurements) ? procurements : [];
    let pending = 0;
    let approved = 0;
    let rejected = 0;

    for (const row of rows) {
      const statusToken = this.normalizeStageToken(row?.status);
      if (!statusToken) continue;

      if (statusToken.includes('reject')) {
        rejected += 1;
        continue;
      }

      // Only count as approved once cartons are assigned (or payment is completed).
      const isCartonAssigned = statusToken.includes('cartoonassigned') || statusToken.includes('cartonassigned');
      const isPaymentCompleted = statusToken.includes('paymentcompleted');
      if (isCartonAssigned || isPaymentCompleted) {
        approved += 1;
        continue;
      }

      // Pending = anything still in workflow approvals / commissioner approval, excluding drafts.
      if (statusToken.includes('draft')) {
        continue;
      }
      pending += 1;
    }

    return { pending, approved, rejected };
  }

  private countOicHologramProcurementStatus(procurements: any[]): { applied: number; pending: number; approved: number; rejected: number } {
    const rows = Array.isArray(procurements) ? procurements : [];
    let pending = 0;
    let approved = 0;
    let rejected = 0;

    for (const row of rows) {
      const statusToken = this.normalizeStageToken(row?.status);
      const stageId = Number(row?.stage_id ?? row?.stageId ?? row?.current_stage ?? row?.currentStage ?? 0);
      const isPaymentDone = stageId === 80 || (statusToken && statusToken.includes('paymentcompleted')) || String(row?.payment_status || row?.paymentStatus || '').toLowerCase() === 'completed';

      const details = row?.carton_details ?? row?.cartoon_details ?? row?.cartonDetails ?? row?.cartoonDetails ?? [];
      const hasDetails = Array.isArray(details) && details.length > 0;

      if (statusToken.includes('reject') || statusToken.includes('cancel')) {
        rejected += 1;
      } else if (hasDetails || statusToken.includes('cartonassigned') || statusToken.includes('cartoonassigned')) {
        approved += 1;
      } else {
        // Stage 80 / Payment Completed or pending OIC arrival update -> PENDING for OIC!
        pending += 1;
      }
    }

    return { applied: rows.length, pending, approved, rejected };
  }

  private normalizeStageToken(value: any): string {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  shouldShowRoleSpecificDashboard(): boolean {
    const roleId = this.currentUser?.roleId;

    // If a specific section is selected, we should show generic supply chain content
    // instead of the role-specific dashboard component
    if (this.selectedSupplyChainSection) {
      return false;
    }

    // Roles that have their own full dashboard component (SPA-like)
    return roleId ? [5, 6, 7].includes(roleId) : false;
  }

  isLicenseeUser(): boolean {
    return this.currentUser?.roleId === 2 || this.currentUser?.roleId === 16;
  }

  isDistributorUser(): boolean {
    const roleName = String(
      this.currentUser?.role?.name ||
      this.currentUser?.role?.displayName ||
      ''
    ).toLowerCase();
    const normalized = roleName.replace(/[^a-z0-9]/g, '');
    return normalized === 'distributor' || normalized.includes('distributor');
  }

  isCommissionerUser(): boolean {
    const roleId = this.getCurrentRoleId();
    if (roleId === 10) return true;
    if (roleId === 9) return false;

    const roleName = String(
      this.currentUser?.role?.name ||
      this.currentUser?.role?.displayName ||
      ''
    ).toLowerCase();
    const normalized = roleName.replace(/[^a-z0-9]/g, '');
    return normalized === 'commissioner' || normalized === 'excisecommissioner';
  }

  canRenderWalletSection(): boolean {
    return true;
  }

  private enforceSectionAccess(): void {
    if (String(this.selectedSupplyChainSection || '') === 'payment-transactions') {
      const roleId = Number(this.currentUser?.roleId || 0);
      if (roleId !== 1 && roleId !== 3) {
        this.selectedSupplyChainSection = null;
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { section: null, tab: null, source: null },
          queryParamsHandling: 'merge',
          replaceUrl: true
        });
        return;
      }
    }

    if ([5, 6].includes(Number(this.currentUser?.roleId || 0)) && String(this.selectedSupplyChainSection || '') === 'new-license') {
      this.selectedSupplyChainSection = null;
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { section: null, tab: null, source: null },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
      return;
    }

    // Licensee: cannot open ENA / transit / hologram until license fee is paid (exclude awaiting unpaid rows).
    if (
      this.isLicenseeUser() &&
      this.licenseeMenuAccessResolved &&
      this.selectedSupplyChainSection
    ) {
      const sec = String(this.selectedSupplyChainSection);
      const enaSections = new Set([
        'requisition',
        'revalidation',
        'cancellation',
        'import-permit'
      ]);
      const breweryDistSections = new Set([
        'transit',
        'hologram',
        'hologram-request',
        'transit-permit',
        'oic-transit',
        'hologram-new',
        'hologram-request-form'
      ]);
      const blocked =
        (enaSections.has(sec) && !this.showDistilleryMenus) ||
        (breweryDistSections.has(sec) && !this.showBreweryOrDistilleryMenus);
      if (blocked) {
        this.selectedSupplyChainSection = null;
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { section: null, tab: null, source: null },
          queryParamsHandling: 'merge',
          replaceUrl: true
        });
        return;
      }
    }

    // Joint Commissioner should not access New Hologram Procurement.
    if (this.currentUser?.roleId === 9 && String(this.selectedSupplyChainSection || '') === 'hologram') {
      this.selectedSupplyChainSection = null;
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { section: null, tab: null, source: null },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
      return;
    }

    if (this.currentUser?.roleId === 5 && ['transit-applications'].includes(String(this.selectedSupplyChainSection || ''))) {
      this.selectedSupplyChainSection = null;
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { section: null, tab: null, source: null },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
      return;
    }

    if (this.selectedSupplyChainSection !== 'wallet') {
      return;
    }
    if (!this.isLicenseeUser()) {
      return;
    }
    if (!this.licenseeMenuAccessResolved) {
      return;
    }
    if (!this.walletEligibilityResolved) {
      this.ensureLicenseeWalletEligibilityLoaded();
      return;
    }
    // Wallet becomes visible once the source application reaches `awaiting_payment`
    // (Awaiting License Fee Payment) or final approval.
    if (!this.showManufacturingWalletNav) {
      this.selectedSupplyChainSection = null;
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { section: null, tab: null, source: null },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
      return;
    }
  }

  private loadLicenseeMenuAccess(): void {
    if (!this.isLicenseeUser()) {
      this.licenseeMenuAccessResolved = true;
      this.showDistilleryMenus = false;
      this.showBreweryOrDistilleryMenus = false;
      this.showBreweryOrDistilleryWalletViews = false;
      this.showManufacturingWalletNav = false;
      this.dashboardInitLoadHandled = true;
      this.loadDashboardData();
      return;
    }

    this.licenseeMenuAccessResolved = false;
    this.showDistilleryMenus = false;
    this.showBreweryOrDistilleryMenus = false;
    this.showBreweryOrDistilleryWalletViews = false;
    this.showManufacturingWalletNav = false;

    // Keep login fast: derive initial menu visibility only from licenses.
    // Wallet eligibility and application-derived menus are computed lazily when the user opens wallet.
    this.walletEligibilityResolved = false;
    this.walletEligibilityLoading = false;
    this.licenseMeService
      .getMyLicenses()
      .subscribe({
        next: (licenses) => {
          const licenseRows = Array.isArray(licenses) ? licenses : [];
          const menuRows = filterRowsForSupplyChainSidebarMenus(licenseRows);
          const hasDistillery = menuRows.some((item) => this.isDistillery(item));
          const hasBrewery = menuRows.some((item) => this.isBrewery(item));

          this.showDistilleryMenus = hasDistillery;
          this.showBreweryOrDistilleryMenus = hasDistillery || hasBrewery;
          this.showBreweryOrDistilleryWalletViews = hasDistillery || hasBrewery;
          this.showManufacturingWalletNav = false;
          this.licenseeMenuAccessResolved = true;
          this.enforceSectionAccess();
          this.ensureWalletViewParamAllowed(this.route.snapshot.queryParams);
          this.updateAvailableChartModules();
          this.dashboardInitLoadHandled = true;
          this.loadDashboardData();
        },
        error: () => {
          this.showDistilleryMenus = false;
          this.showBreweryOrDistilleryMenus = false;
          this.showBreweryOrDistilleryWalletViews = false;
          this.showManufacturingWalletNav = false;
          this.licenseeMenuAccessResolved = true;
          this.enforceSectionAccess();
          this.updateAvailableChartModules();
          this.dashboardInitLoadHandled = true;
          this.loadDashboardData();
        }
      });
  }

  private ensureLicenseeWalletEligibilityLoaded(): void {
    if (!this.isLicenseeUser()) return;
    if (!this.licenseeMenuAccessResolved) return;
    if (this.walletEligibilityResolved || this.walletEligibilityLoading) return;

    this.walletEligibilityLoading = true;

    forkJoin({
      licenses: this.licenseMeService.getMyLicenses(),
      approvedPayload: this.http.get<any>(`${this.newLicenseApiBase}/list-by-status/`).pipe(catchError(() => of({ approved: [] }))),
      allApplications: this.http.get<any[]>(`${this.newLicenseApiBase}/list/`).pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ licenses, approvedPayload, allApplications }) => {
        const licenseRows = Array.isArray(licenses) ? licenses : [];
        const approvedRows = Array.isArray(approvedPayload?.approved) ? approvedPayload.approved : [];
        const allRows = Array.isArray(allApplications) ? allApplications : [];
        const approvedFromAll = allRows.filter((item) => this.isApprovedStage(item));
        const awaitingPaymentFromAll = allRows.filter((item) => this.isAwaitingPaymentStage(item));
        const combinedRows = [...licenseRows, ...approvedRows, ...approvedFromAll, ...awaitingPaymentFromAll];

        this.showManufacturingWalletNav = this.computeWalletNavVisible(combinedRows);
        this.walletEligibilityResolved = true;
        this.walletEligibilityLoading = false;

        this.enforceSectionAccess();
        this.ensureWalletViewParamAllowed(this.route.snapshot.queryParams);
      },
      error: () => {
        this.showManufacturingWalletNav = false;
        this.walletEligibilityResolved = true;
        this.walletEligibilityLoading = false;
        this.enforceSectionAccess();
      }
    });
  }

  private isApprovedStage(item: any): boolean {
    const stage = String(
      item?.current_stage_name ??
      item?.currentStageName ??
      item?.current_stage ??
      item?.currentStage ??
      ''
    ).toLowerCase();
    return stage.includes('approved');
  }

  private isAwaitingPaymentStage(item: any): boolean {
    const stage = String(
      item?.current_stage_name ??
      item?.currentStageName ??
      item?.current_stage ??
      item?.currentStage ??
      ''
    ).toLowerCase();
    const normalized = stage.replace(/[^a-z0-9]/g, '');
    return normalized === 'awaitingpayment' || (normalized.includes('awaiting') && normalized.includes('payment'));
  }

  private computeWalletNavVisible(rows: any[]): boolean {
    const list = Array.isArray(rows) ? rows : [];

    const appsById = new Map<string, any>();
    for (const item of list) {
      const appId = String(item?.application_id ?? item?.applicationId ?? item?.pk ?? '').trim();
      if (appId) {
        appsById.set(appId, item);
      }
    }

    const isNewLicenseDerivedLicenseRow = (item: any): boolean => {
      const srcId = String(item?.source_object_id ?? item?.sourceObjectId ?? '').trim().toUpperCase();
      return srcId.startsWith('NLI/');
    };

    for (const item of list) {
      const hasLicenseId = !!(item?.license_id ?? item?.licenseId);

      const appId = String(item?.application_id ?? item?.applicationId ?? '').trim();
      if (appId && !hasLicenseId) {
        if (isLicenseeWalletNavEligible(item)) {
          return true;
        }
        continue;
      }

      if (hasLicenseId) {
        if (!isNewLicenseDerivedLicenseRow(item)) {
          return true;
        }

        const srcId = String(item?.source_object_id ?? item?.sourceObjectId ?? '').trim();
        const srcApp = srcId ? appsById.get(srcId) : undefined;
        if (srcApp && isLicenseeWalletNavEligible(srcApp)) {
          return true;
        }
      }
    }

    return false;
  }

  private isDistillery(item: any): boolean {
    const subCategoryId = this.extractSubCategoryId(item);
    if (subCategoryId === 2) {
      return true;
    }
    const name = this.extractSubCategoryName(item);
    return name.includes('distiller');
  }

  private isBrewery(item: any): boolean {
    const subCategoryId = this.extractSubCategoryId(item);
    if (subCategoryId === 1) {
      return true;
    }
    const name = this.extractSubCategoryName(item);
    return name.includes('brew');
  }

  private extractSubCategoryId(item: any): number {
    const nested = item?.license_sub_category ?? item?.licenseSubCategory;
    const raw =
      item?.license_sub_category_id ??
      item?.licenseSubCategoryId ??
      (typeof nested === 'object' ? nested?.id : nested) ??
      0;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private extractSubCategoryName(item: any): string {
    const nested = item?.license_sub_category ?? item?.licenseSubCategory;
    const raw =
      item?.license_sub_category_name ??
      item?.licenseSubCategoryName ??
      (typeof nested === 'object'
        ? (nested?.description ?? nested?.name ?? nested?.label ?? '')
        : nested ?? '');
    return String(raw ?? '').toLowerCase();
  }

  // Supply Chain Section Handlers
  clearSupplyChainSection(): void {
    if (this.selectedSupplyChainSection === 'distributor-permit' && this.distributorPermitMode === 'apply') {
      this.distributorPermitMode = 'list';
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { section: 'distributor-permit', mode: null },
        queryParamsHandling: 'merge'
      });
      return;
    }

    if (this.selectedSupplyChainSection === 'single-window-detail') {
      if (this.navigationCount > 0) {
        this.navigationCount -= 2;
        window.history.back();
        return;
      } else {
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { section: 'single-window', type: null, id: null, targetId: null },
          queryParamsHandling: 'merge'
        });
        return;
      }
    }

    const parentSectionMap: Record<string, string> = {
      'import-permit': 'requisition',
      'transit-permit': 'transit',
      'hologram-new': 'hologram',
      'hologram-request-form': 'hologram-request',
      'new-license-apply': 'new-license',
      'company-registration-apply': 'company-registration',
      'company-collaboration-apply': 'company-collaboration',
      'label-registration-apply': 'label-registration',
      'salesman-barman-registration-apply': 'salesman-barman-registration'
    };

    const current = String(this.selectedSupplyChainSection || '').trim();
    const parent = parentSectionMap[current];

    if (parent) {
      this.selectedSupplyChainSection = parent;
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { section: parent },
        queryParamsHandling: 'merge'
      });
      return;
    }

    this.selectedSupplyChainSection = null;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { section: null },
      queryParamsHandling: 'merge'
    });
  }

  // Professional dashboard methods (from licensee dashboard)
  showTable(table: 'applied' | 'pending' | 'objection' | 'approved' | 'rejected') {
    this.activeTable = table;
    // Load list-by-status APIs only when user opens a table.
    this.ensureApplicationsLoaded(false);
  }

  goBack() {
    this.activeTable = 'approved';
  }

  openFinalLicense(application: UnifiedApplication): void {
    if (!this.hasPermission(['licensee.module.view'])) {
      Swal.fire('Not allowed', 'Print license is available only for Licensee users.', 'info');
      return;
    }

    const applicationId =
      application?.applicationId ||
      (application as any)?.raw?.application_id ||
      (application as any)?.raw?.applicationId ||
      '';

    this.router.navigate(['/final-license'], {
      queryParams: {
        applicationId,
        type: application?.type || '',
        returnUrl: this.router.url
      }
    });
  }

  viewApplication(application: UnifiedApplication): void {
    // This is primarily used by Licensee dashboard tables to open the application view.
    const applicationId =
      application?.applicationId ||
      (application as any)?.raw?.application_id ||
      (application as any)?.raw?.applicationId ||
      '';

    if (!applicationId) return;

    const type = (application as any)?.type || (application as any)?.raw?.type || '';

    this.router.navigate(['/supply-chain-view'], {
      queryParams: {
        id: applicationId,
        ref: applicationId,
        type,
        source: 'licensee'
      }
    });
  }

  private updateDataSources(result: {
    applied: UnifiedApplication[];
    pending: UnifiedApplication[];
    objection: UnifiedApplication[];
    approved: UnifiedApplication[];
    rejected: UnifiedApplication[];
  }): void {
    this.appliedDataSource.data = result.applied || [];
    this.pendingDataSource.data = result.pending || [];
    this.objectionDataSource.data = result.objection || [];
    this.approvedDataSource.data = result.approved || [];
    this.rejectedDataSource.data = result.rejected || [];
  }

  private clearDataSources(): void {
    this.appliedDataSource.data = [];
    this.pendingDataSource.data = [];
    this.objectionDataSource.data = [];
    this.approvedDataSource.data = [];
    this.rejectedDataSource.data = [];
  }

  onPaymentConfirmed(application: UnifiedApplication): void {
    Swal.fire({
      title: 'Confirm Payment Receipt',
      text: `Have you received the payment for application ${application.applicationId}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Payment Received',
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (result.isConfirmed) {
        this.processPayment(application);
      }
    });
  }

  private processPayment(application: UnifiedApplication): void {
    Swal.fire({
      title: 'Processing...',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    this.salesmanBarmanService.getNextStages(application.applicationId).subscribe({
      next: (stages: any[]) => {
        const approvalStage = stages.find(s => {
          const stageName = (s.name || s.stage_name || '').toLowerCase();
          const stageId = s.id || s.stage_id;
          return stageName === 'approved' || stageId === 12 || stageId === 16;
        });

        if (!approvalStage) {
          console.error('❌ No approval stage found in:', stages);
          Swal.fire('Error', 'No approval stage found. Available stages: ' + stages.map(s => s.name || s.id).join(', '), 'error');
          return;
        }

        const stageId = approvalStage.id || approvalStage.stage_id;
        this.salesmanBarmanService.advanceStage(application.applicationId, stageId, {
          payment_confirmed: true,
          remarks: 'Payment received and confirmed'
        }).subscribe({
          next: (_response) => {
            Swal.fire({
              title: 'Success!',
              text: 'Payment confirmed and application approved.',
              icon: 'success'
            }).then(() => {
              this.unifiedDashboardService.clearUnifiedAppsCache();
              this.loadDashboardData(true);
            });
          },
          error: (err) => {
            console.error('❌ Error advancing application:', err);
            Swal.fire('Error', err?.error?.detail || 'Failed to process payment.', 'error');
          }
        });
      },
      error: (err) => {
        console.error('❌ Error fetching stages:', err);
        Swal.fire('Error', 'Failed to fetch approval stages: ' + (err?.error?.detail || err?.message || 'Unknown error'), 'error');
      }
    });
  }

  // Helper method to check if user has required permissions
  hasPermission(permissions: string[]): boolean {
    return this.roleService.hasAnyPermission(permissions);
  }

  // Method to handle dashboard refresh
  onDashboardRefresh() {
    this.error = null;
    this.unifiedDashboardService.clearUnifiedAppsCache();
    this.isLoading = true;
    this.loadDashboardData(true);
  }

  // Get role-specific title
  getDashboardTitle(): string {
    if (!this.currentUser) return 'Dashboard';

    // First try role ID mapping
    const roleNames: { [key: number]: string } = {
      1: 'Site Administrator Dashboard',
      2: 'Licensee Dashboard',
      3: 'Single Window Dashboard',
      4: 'District User Dashboard',
      5: 'Permit Section Dashboard',
      6: 'IT Cell Dashboard',
      7: 'Officer in Charge Dashboard',
      8: 'Sub Enquiry Officer Dashboard',
      9: 'Joint Commissioner Dashboard',
      10: 'Commissioner Dashboard',
      11: 'Secretary Dashboard',
      12: 'Deputy Commissioner Dashboard',
    };

    const titleFromRoleId = roleNames[this.currentUser?.roleId || 0];
    if (titleFromRoleId) {
      console.log('✅ Dashboard title from roleId:', this.currentUser?.roleId, '→', titleFromRoleId);
      return titleFromRoleId;
    }

    // Fallback: try to get from account service
    this.accountService.identity().subscribe(user => {
      if (user && (user as any).role) {
        console.log('⚠️ Fallback dashboard title from account service role id:', (user as any).role.id);
      }
    });

    return 'Dashboard';
  }

  // Get supply chain section title
  getSupplyChainSectionTitle(): string {
    if (this.selectedSupplyChainSection === 'officer-activity') {
      return this.isLicenseeUser() ? 'License Activity' : 'Officer Activity';
    }
    if (this.selectedSupplyChainSection === 'distributor-permit') {
      if (this.distributorPermitMode === 'apply') return 'Apply for Import Permit';
      const tab = this.route.snapshot.queryParamMap.get('tab') || 'requisition';
      const tabLabels: Record<string, string> = {
        requisition:  'IMFL / Requisition',
        revalidation: 'IMFL / Revalidation',
        cancellation: 'IMFL / Cancellation',
      };
      return tabLabels[tab] ?? 'IMFL Requisition / Cancellation';
    }
    const titles: { [key: string]: string } = {
      // Common sections
      'single-window': 'User Details',
      'single-window-detail': 'User Details',
      'payment-transactions': 'Transactions',
      'requisition': 'Requisition Management',
      'revalidation': 'Revalidation Management',
      'cancellation': 'Cancellation Management',
      'transit': 'Transit Management',
      'hologram': 'Hologram Procurement',
      'commissioner-hologram-working-records': 'Hologram Working Records',
      'commissioner-monthly-view-details': 'Monthly View Details',
      'hologram-request': 'Hologram Request',
      'company-registration': 'Company Registration',
      'company-registration-apply': 'Company Registration',
      'company-collaboration': 'Company Collaboration',
      'company-collaboration-apply': 'Company Collaboration',
      'salesman-barman-registration': 'Salesman/Barman Registration',
      'salesman-barman-registration-apply': 'Salesman/Barman Registration',
      'label-registration': 'Label Registration',
      'label-registration-apply': 'Label Registration',
      'new-license': 'New License Management',
      'new-license-apply': 'Apply New License',
      'license-renewal': 'License Renewal Management',
      'special-permit': 'Dry Day Permit',
      'special-permit-apply': 'Prepare Dry Day Permit Application',
      'distributor-permit': 'IMFL Requisition / Cancellation',

      // SPA Forms
      'transit-permit': 'Apply Transit Permit',
      'import-permit': 'New Requisition Application',
      'hologram-request-form': 'New Hologram Request',
      'hologram-new': 'New Hologram Procurement',
      'wallet': 'Payment & Wallet',

      // IT Cell Sections
      'itcell-hologram': 'Hologram Management (IT Cell)',
      'process-flow': 'Process Flow Diagram',

      // Officer Sections
      'transit-applications': 'Transit Applications',
      'brands': 'Brand Details',
      'monthly-hologram-statement': 'Monthly Hologram Statement',
      'oic-hologram-requests': 'Hologram Requests',
      'hologram-register': 'Hologram Procurement',
      'hologram-daily-entry': 'Daily Hologram Entry',
      'stock-inventory': 'Brand Warehouse Stock',
      'bl-details': 'Bulk Spirit Details',

      'hologram-overview': 'Hologram Overview',
      'officer-activity': 'Officer Activity',
      'system-monitoring': 'System Monitoring'
    };

    return titles[this.selectedSupplyChainSection || ''] || 'Management';
  }

  // Header Action Logic
  showHeaderAction(): boolean {
    if (!this.selectedSupplyChainSection) return false;

    const section = this.selectedSupplyChainSection;

    if (section === 'distributor-permit' && this.distributorPermitMode === 'apply') {
      return false;
    }

    // Commissioner: show Refresh for Working Records
    if (section === 'commissioner-hologram-working-records' && this.isCommissionerUser()) {
      return true;
    }

    if (section === 'distributor-permit') {
      return this.isDistributorUser();
    }

    // Licensee or Distributor: show Create actions only
    if (!this.isLicenseeUser() && !this.isDistributorUser()) {
      return false;
    }

    // List of sections that have a "Create" action for Licensees
    const sectionsWithActions = [
      'requisition',
      'transit',
      'hologram',
      'hologram-request',
      'new-license',
      'special-permit',
      'company-registration',
      'company-collaboration',
      'label-registration',
      'salesman-barman-registration',
      'distributor-permit'
    ];

    return sectionsWithActions.includes(section);
  }

  getHeaderActionLabel(): string {
    const section = this.selectedSupplyChainSection;

    switch (section) {
      case 'commissioner-hologram-working-records': return 'Refresh';
      case 'requisition': return 'New Requisition';
      case 'transit': return 'Apply Transit';
      case 'hologram': return 'New Hologram';
      case 'hologram-request': return 'New Request';
      case 'new-license': return 'Apply New License';
      case 'special-permit': return 'Apply Dry Day Permit';
      case 'company-registration': return 'Apply Company';
      case 'company-collaboration': return 'Apply Collaboration';
      case 'label-registration': return 'Apply Label';
      case 'salesman-barman-registration': return 'Apply Salesman/Barman';
      case 'distributor-permit': return 'Apply for Import Permit';
      default: return 'Create New';
    }
  }

  getHeaderActionIcon(): string {
    const section = this.selectedSupplyChainSection;

    switch (section) {
      case 'commissioner-hologram-working-records': return 'refresh';
      case 'requisition': return 'add_circle';
      case 'transit': return 'local_shipping';
      case 'hologram': return 'add_circle';
      case 'hologram-request': return 'add_circle';
      case 'new-license': return 'add_circle';
      case 'special-permit': return 'add_circle';
      case 'company-registration': return 'add_circle';
      case 'company-collaboration': return 'add_circle';
      case 'label-registration': return 'add_circle';
      case 'salesman-barman-registration': return 'add_circle';
      case 'distributor-permit': return 'add_circle';
      default: return 'add';
    }
  }

  onHeaderAction(): void {
    const section = this.selectedSupplyChainSection;

    if (section === 'commissioner-hologram-working-records') {
      this.dailyHologramWorkingRecords?.refreshData();
      return;
    }

    if (section === 'requisition') {
      // Navigate within SPA to the import permit (requisition) application form
      this.router.navigate(['/dashboard'], { queryParams: { section: 'import-permit' } });
    } else if (section === 'transit') {
      this.router.navigate(['/dashboard'], { queryParams: { section: 'transit-permit' } });
    } else if (section === 'hologram') {
      this.router.navigate(['/dashboard'], { queryParams: { section: 'hologram-new' } });
    } else if (section === 'hologram-request') {
      this.router.navigate(['/dashboard'], { queryParams: { section: 'hologram-request-form' } });
    } else if (section === 'new-license') {
      this.router.navigate(['/dashboard'], { queryParams: { section: 'new-license-apply' } });
    } else if (section === 'special-permit') {
      this.router.navigate(['/dashboard'], { queryParams: { section: 'special-permit-apply' } });
    } else if (section === 'company-registration') {
      this.router.navigate(['/dashboard'], { queryParams: { section: 'company-registration-apply' } });
    } else if (section === 'company-collaboration') {
      this.router.navigate(['/dashboard'], { queryParams: { section: 'company-collaboration-apply' } });
    } else if (section === 'label-registration') {
      this.router.navigate(['/dashboard'], { queryParams: { section: 'label-registration-apply' } });
    } else if (section === 'salesman-barman-registration') {
      this.router.navigate(['/dashboard'], { queryParams: { section: 'salesman-barman-registration-apply' } });
    } else if (section === 'distributor-permit') {
      this.router.navigate(['/dashboard'], { queryParams: { section: 'distributor-permit', mode: 'apply' } });
    }
  }



  // Open wallet dialog
  openWallet(): void {
    const walletView =
      this.isLicenseeUser() && this.licenseeMenuAccessResolved && !this.showBreweryOrDistilleryWalletViews
        ? 'others'
        : 'wallets';
    this.router.navigate(['/dashboard'], {
      queryParams: {
        section: 'wallet',
        tab: 'recharge', // Default to recharge/wallet tab
        walletView,
        source: 'dashboard-wallet',
        nav: Date.now()
      }
    });
  }

  // Remove the fallback method since we're using existing component
  // private showBasicWalletInfo(): void { ... }

  // ========================================
  // PROFESSIONAL DASHBOARD ENHANCEMENTS
  // ========================================

  // Notification system
  getNotificationCount(): number {
    const roleId = this.currentUser?.roleId;
    if (!roleId) return 0;

    // Calculate notifications based on role and pending items
    let count = 0;
    
    // For admin roles, count items requiring attention
    if (roleId && [1, 3, 4, 5, 6, 7, 8, 9, 10, 11].includes(roleId)) {
      count += this.dashboardCounts.pending || 0;
      count += this.dashboardCounts.awaitingPayment || 0;
    }
    
    // For licensee roles, count rejected items and payment due
    if (roleId && [2, 16].includes(roleId)) {
      count += this.dashboardCounts.rejected || 0;
      count += this.dashboardCounts.awaitingPayment || 0;
    }

    return Math.min(count, 99); // Cap at 99
  }

  // Quick Actions based on role
  initializeQuickActions(): void {
    const roleId = this.currentUser?.roleId;
    this.quickActions = [];

    switch (roleId) {
      case 2: // Licensee
        this.quickActions = [
          { id: 'new-requisition', label: 'New Requisition', icon: 'add_circle', color: 'primary', action: () => this.navigateToSection('import-permit') },
          { id: 'transit-permit', label: 'Transit Permit', icon: 'local_shipping', color: 'accent', action: () => this.navigateToSection('transit-permit') },
          { id: 'hologram-request', label: 'Hologram Request', icon: 'security', color: 'warn', action: () => this.navigateToSection('hologram-request-form') },
          { id: 'payment-wallet', label: 'Payment & Wallet', icon: 'account_balance_wallet', color: 'primary', action: () => this.openWallet() }
        ];
        break;
      
      case 5: // Permit Section
        this.quickActions = [
          { id: 'review-permits', label: 'Review Permits', icon: 'assignment', color: 'primary', action: () => this.navigateToSection('requisition') },
          { id: 'generate-report', label: 'Generate Report', icon: 'assessment', color: 'warn', action: () => this.generateReport() }
        ];
        break;
      
      case 10: // Commissioner
        this.quickActions = [
          { id: 'final-approvals', label: 'Final Approvals', icon: 'verified', color: 'primary', action: () => this.showTable('pending') },
          { id: 'hologram-management', label: 'Hologram Management', icon: 'security', color: 'accent', action: () => this.navigateToSection('hologram') },
          { id: 'system-reports', label: 'System Reports', icon: 'analytics', color: 'warn', action: () => this.generateSystemReport() }
        ];
        break;
      
      case 7: // Officer in Charge
        this.quickActions = [
          { id: 'hologram-register', label: 'Hologram Register', icon: 'book', color: 'primary', action: () => this.navigateToSection('hologram-register') },
          { id: 'daily-entry', label: 'Daily Entry', icon: 'today', color: 'accent', action: () => this.navigateToSection('hologram-daily-entry') },
          { id: 'stock-check', label: 'Stock Inventory', icon: 'inventory', color: 'warn', action: () => this.navigateToSection('stock-inventory') }
        ];
        break;
      
      case 6: // IT Cell
        this.quickActions = [
          { id: 'system-monitor', label: 'System Monitor', icon: 'monitor', color: 'primary', action: () => this.navigateToSection('system-monitoring') },
          { id: 'user-management', label: 'User Management', icon: 'people', color: 'accent', action: () => this.manageUsers() },
          { id: 'backup-system', label: 'System Backup', icon: 'backup', color: 'warn', action: () => this.initiateBackup() }
        ];
        break;
    }
  }

  getQuickActions(): any[] {
    return this.quickActions;
  }

  executeQuickAction(action: any): void {
    if (action.action && typeof action.action === 'function') {
      action.action();
    }
  }

  // Custom Statistics based on role
  initializeCustomStats(): void {
    const roleId = this.currentUser?.roleId;
    this.customStats = [];

    switch (roleId) {
      case 2: // Licensee
        this.customStats = [
          {
            id: 'wallet-balance',
            label: 'Wallet Balance',
            value: '₹25,000',
            icon: 'account_balance_wallet',
            colorClass: 'purple-bg',
            trend: 5,
            subInfo: 'Available for payments',
            actionText: 'Recharge'
          },
          {
            id: 'active-permits',
            label: 'Active Permits',
            value: '12',
            icon: 'verified',
            colorClass: 'indigo-bg',
            trend: 8,
            subInfo: 'Valid permits',
            actionText: 'View Details'
          }
        ];
        break;
      
      case 5: // Permit Section
        this.customStats = [
          {
            id: 'processing-time',
            label: 'Avg Processing Time',
            value: '3.2 days',
            icon: 'schedule',
            colorClass: 'orange-bg',
            trend: -12,
            subInfo: 'Improved efficiency',
            actionText: 'View Metrics'
          }
        ];
        break;
      
      case 10: // Commissioner
        this.customStats = [
          {
            id: 'revenue-generated',
            label: 'Revenue Generated',
            value: '₹2.5M',
            icon: 'monetization_on',
            colorClass: 'green-bg',
            trend: 15,
            subInfo: 'This month',
            actionText: 'View Report'
          },
          {
            id: 'compliance-rate',
            label: 'Compliance Rate',
            value: '94.5%',
            icon: 'verified_user',
            colorClass: 'blue-bg',
            trend: 3,
            subInfo: 'System wide',
            actionText: 'View Details'
          }
        ];
        break;
      
      case 7: // Officer in Charge
        this.customStats = [
          {
            id: 'hologram-stock',
            label: 'Hologram Stock',
            value: '1,250',
            icon: 'inventory_2',
            colorClass: 'teal-bg',
            trend: -5,
            subInfo: 'Units available',
            actionText: 'Manage Stock'
          }
        ];
        break;
    }
  }

  getCustomStats(): any[] {
    return this.customStats;
  }

  handleCustomStatClick(stat: any): void {
    switch (stat.id) {
      case 'wallet-balance':
        this.openWallet();
        break;
      case 'active-permits':
        this.showTable('approved');
        break;
      case 'processing-time':
        this.generateReport();
        break;
      case 'revenue-generated':
        this.generateSystemReport();
        break;
      case 'compliance-rate':
        this.viewComplianceDetails();
        break;
      case 'hologram-stock':
        this.navigateToSection('stock-inventory');
        break;
      default:
        console.log('Custom stat clicked:', stat);
    }
  }

  // Statistics display logic
  shouldShowStatCard(type: string): boolean {
    const roleId = this.currentUser?.roleId;
    
    // All roles can see basic stats
    if (['applied', 'pending', 'objection', 'approved', 'rejected', 'awaitingPayment'].includes(type)) {
      return true;
    }
    
    return false;
  }

  getStatTrend(type: string): number {
    // Mock trend data - in real app, this would come from backend
    const trends: { [key: string]: number } = {
      applied: 12,
      pending: -8,
      awaitingPayment: 0,
      objection: 6,
      approved: 15,
      rejected: -5
    };
    
    return trends[type] || 0;
  }

  getStatSubInfo(type: string): string {
    const roleId = this.currentUser?.roleId;
    
    switch (type) {
      case 'applied':
        return 'New submissions';
      case 'pending':
        return roleId === 10 ? 'Awaiting your review' : 'Under review';
      case 'awaitingPayment':
        return 'Fees pending';
      case 'objection':
        return 'Needs correction';
      case 'approved':
        return 'Successfully processed';
      case 'rejected':
        return 'Require attention';
      default:
        return '';
    }
  }

  getAwaitingPaymentBreakdownText(): string {
    if (this.selectedChartModule === 'requisition') {
      return 'Requisition';
    }
    if (this.selectedChartModule === 'hologram') {
      return 'Hologram';
    }

    const parts: string[] = [];
    if (this.awaitingPaymentBreakdown.newLicense > 0) {
      parts.push('New License');
    }
    if (this.awaitingPaymentBreakdown.licenseRenewal > 0) {
      parts.push('Renewal');
    }
    if (this.awaitingPaymentBreakdown.salesmanBarman > 0) {
      parts.push('Salesman/Barman');
    }
    if (this.awaitingPaymentBreakdown.companyRegistration > 0) {
      parts.push('Company Reg');
    }
    if (this.awaitingPaymentBreakdown.companyCollaboration > 0) {
      parts.push('Company Collab');
    }
    if ((this.awaitingPaymentBreakdown as any).specialPermit > 0) {
      parts.push('Dry Day Permit');
    }

    // Add supply chain modules awaiting payment to the "All Modules" list
    if (this.selectedChartModule === 'all') {
      if ((this.supplyChainModuleCounts['requisition']?.awaitingPayment || 0) > 0) {
        parts.push('Requisition');
      }
      if ((this.supplyChainModuleCounts['hologram']?.awaitingPayment || 0) > 0) {
        parts.push('Hologram');
      }
    }

    return parts.length > 0 ? parts.join(', ') : 'Fees pending';
  }

  // Performance Metrics
  shouldShowPerformanceMetrics(): boolean {
    const roleId = this.currentUser?.roleId;
    // Show for admin roles
    return roleId ? [1, 3, 4, 5, 6, 7, 8, 9, 10, 11].includes(roleId) : false;
  }

  loadPerformanceMetrics(): void {
    // Mock performance data - in real app, this would come from backend
    const roleId = this.currentUser?.roleId;
    
    this.performanceMetrics = [
      {
        label: 'Applications Processed',
        value: '156',
        icon: 'assignment_turned_in',
        color: '#4CAF50',
        change: 12
      },
      {
        label: 'Average Processing Time',
        value: '2.3 days',
        icon: 'schedule',
        color: '#FF9800',
        change: -8
      },
      {
        label: 'Success Rate',
        value: '94.2%',
        icon: 'trending_up',
        color: '#2196F3',
        change: 3
      },
      {
        label: 'User Satisfaction',
        value: '4.7/5',
        icon: 'star',
        color: '#9C27B0',
        change: 5
      }
    ];

    // Customize based on role
    if (roleId === 10) { // Commissioner
      this.performanceMetrics.push({
        label: 'Revenue Generated',
        value: '₹2.5M',
        icon: 'monetization_on',
        color: '#4CAF50',
        change: 18
      });
    }
  }

  getPerformanceMetrics(): any[] {
    return this.performanceMetrics;
  }

  onMetricsPeriodChange(): void {
    this.loadPerformanceMetrics();
  }

  // Recent Activities
  loadRecentActivities(): void {
    // Mock activity data - in real app, this would come from backend
    const roleId = this.currentUser?.roleId;
    
    this.recentActivities = [
      {
        id: 1,
        type: 'approval',
        icon: 'check_circle',
        title: 'Application Approved',
        description: 'Transit permit TP001/2024 has been approved',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        user: 'Commissioner Office',
        actions: [
          { id: 'view', icon: 'visibility', label: 'View' }
        ]
      },
      {
        id: 2,
        type: 'submission',
        icon: 'send',
        title: 'New Application Submitted',
        description: 'Requisition REQ003/2024 submitted for review',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        user: 'ABC Distillery',
        actions: [
          { id: 'review', icon: 'rate_review', label: 'Review' }
        ]
      },
      {
        id: 3,
        type: 'payment',
        icon: 'payment',
        title: 'Payment Received',
        description: 'Payment of ₹15,000 received for application NL002/2024',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        user: 'XYZ Licensee'
      },
      {
        id: 4,
        type: 'rejection',
        icon: 'cancel',
        title: 'Application Rejected',
        description: 'Hologram request HR001/2024 rejected due to incomplete documents',
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
        user: 'Permit Section',
        actions: [
          { id: 'details', icon: 'info', label: 'Details' }
        ]
      }
    ];

    // Filter activities based on role permissions
    if (roleId && [2, 16].includes(roleId)) { // Licensee role
      this.recentActivities = this.recentActivities.filter(activity => 
        ['approval', 'rejection', 'payment'].includes(activity.type)
      );
    }
  }

  getRecentActivities(): any[] {
    return this.recentActivities;
  }

  executeActivityAction(action: any, activity: any): void {
    switch (action.id) {
      case 'view':
      case 'details':
        this.viewActivityDetails(activity);
        break;
      case 'review':
        this.reviewApplication(activity);
        break;
      default:
        console.log('Activity action:', action, activity);
    }
  }

  viewAllActivities(): void {
    // Navigate to full activity log
    console.log('Navigate to full activity log');
  }

  openDashboardSection(section: string): void {
    if (section === 'hologram-overview' && this.currentUser?.roleId === 7) {
      this.router.navigate(['/dashboard/hologram-overview']);
      return;
    }
    this.router.navigate(['/dashboard'], { queryParams: { section } });
  }

  // Helper methods for actions
  private navigateToSection(section: string): void {
    this.router.navigate(['/dashboard'], { queryParams: { section } });
  }

  private generateReport(): void {
    console.log('Generate report functionality');
    // Implement report generation
  }

  private generateSystemReport(): void {
    console.log('Generate system report functionality');
    // Implement system report generation
  }

  private manageUsers(): void {
    console.log('User management functionality');
    // Navigate to user management
  }

  private initiateBackup(): void {
    console.log('System backup functionality');
    // Implement backup functionality
  }

  private viewComplianceDetails(): void {
    console.log('View compliance details');
    // Navigate to compliance dashboard
  }

  private viewActivityDetails(activity: any): void {
    console.log('View activity details:', activity);
    // Show activity details modal or navigate
  }

  private reviewApplication(activity: any): void {
    console.log('Review application:', activity);
    // Navigate to application review
  }

  // Add Math to component for template access
  Math = Math;
}
