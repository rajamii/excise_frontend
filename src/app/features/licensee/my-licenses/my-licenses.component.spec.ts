import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { MyLicensesComponent } from './my-licenses.component';
import { UnifiedDashboardService } from '../../../core/services/unified-dashboard.service';
import { of, throwError } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('MyLicensesComponent', () => {
  let component: MyLicensesComponent;
  let fixture: ComponentFixture<MyLicensesComponent>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<MyLicensesComponent>>;
  let mockDashboardService: jasmine.SpyObj<UnifiedDashboardService>;

  beforeEach(async () => {
    // Create mock services
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    mockDashboardService = jasmine.createSpyObj('UnifiedDashboardService', [
      'getUnifiedApplicationsByStatus',
      'getApplicationDetail',
      'renewLicense'
    ]);

    await TestBed.configureTestingModule({
      imports: [MyLicensesComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: UnifiedDashboardService, useValue: mockDashboardService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MyLicensesComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load licenses on init', () => {
    const mockData = {
      applied: [],
      pending: [],
      approved: [
        {
          type: 'license-renewal',
          applicationId: 'LIC/001/2024-25/0001',
          currentStage: 'approved',
          currentStageName: 'Approved',
          isApproved: true,
          establishmentName: 'Test Bar',
          applicantFullName: 'John Doe',
          mobileNumber: '1234567890',
          email: 'test@example.com',
          licenseCategoryName: 'FL-2',
          siteDistrictName: 'East',
          transactions: [],
          raw: {}
        }
      ],
      rejected: [],
      awaitingPayment: []
    };

    mockDashboardService.getUnifiedApplicationsByStatus.and.returnValue(of(mockData as any));

    component.ngOnInit();

    expect(mockDashboardService.getUnifiedApplicationsByStatus).toHaveBeenCalled();
    expect(component.dataSource.data.length).toBe(1);
    expect(component.isLoading).toBe(false);
  });

  it('should handle error when loading licenses', () => {
    mockDashboardService.getUnifiedApplicationsByStatus.and.returnValue(
      throwError(() => new Error('Network error'))
    );

    component.ngOnInit();

    expect(component.isLoading).toBe(false);
    expect(component.dataSource.data.length).toBe(0);
  });

  it('should format approval date correctly', () => {
    const mockApplication = {
      type: 'license-renewal',
      applicationId: 'LIC/001/2024-25/0001',
      transactions: [
        {
          timestamp: '2024-01-15T10:30:00Z'
        }
      ]
    } as any;

    const formattedDate = component.formatApprovalDate(mockApplication);

    // Check that date is formatted (exact format depends on locale)
    expect(formattedDate).toContain('2024');
  });

  it('should return correct type label', () => {
    expect(component.getTypeLabel({ type: 'license-renewal' } as any)).toBe('License Renewal');
    expect(component.getTypeLabel({ type: 'new-license' } as any)).toBe('New License');
    expect(component.getTypeLabel({ type: 'salesman-barman' } as any)).toBe('Salesman/Barman');
    expect(component.getTypeLabel({ type: 'unknown' } as any)).toBe('unknown');
  });

  it('should close dialog when closeDialog is called', () => {
    component.closeDialog();
    expect(mockDialogRef.close).toHaveBeenCalled();
  });

  it('should return true when data exists', () => {
    component.dataSource.data = [{} as any];
    expect(component.hasData()).toBe(true);
  });

  it('should return false when no data exists', () => {
    component.dataSource.data = [];
    expect(component.hasData()).toBe(false);
  });

  it('should load licenses and filter out LRA/ and RSBM/ applications', () => {
    const mockData = {
      applied: [],
      pending: [],
      approved: [
        {
          type: 'new-license',
          applicationId: 'NLI/001/2024-25/0001',
          transactions: [],
          raw: {}
        },
        {
          type: 'license-renewal',
          applicationId: 'LRA/001/2024-25/0002',
          transactions: [],
          raw: {}
        },
        {
          type: 'license-renewal',
          applicationId: 'RSBM/001/2024-25/0003',
          transactions: [],
          raw: {}
        },
        {
          type: 'salesman-barman',
          applicationId: 'SBM/001/2024-25/0004',
          transactions: [],
          raw: {}
        }
      ],
      rejected: [],
      awaitingPayment: []
    };

    mockDashboardService.getUnifiedApplicationsByStatus.and.returnValue(of(mockData as any));

    component.ngOnInit();

    expect(mockDashboardService.getUnifiedApplicationsByStatus).toHaveBeenCalled();
    expect(component.dataSource.data.length).toBe(2);
    expect(component.dataSource.data[0].applicationId).toBe('NLI/001/2024-25/0001');
    expect(component.dataSource.data[1].applicationId).toBe('SBM/001/2024-25/0004');
  });

  it('should get display name from establishment name', () => {
    const app = {
      establishmentName: 'Test Establishment',
      applicantFullName: 'John Doe'
    } as any;

    expect(component.getDisplayName(app)).toBe('Test Establishment');
  });

  it('should get display name from applicant name if no establishment', () => {
    const app = {
      establishmentName: null,
      applicantFullName: 'John Doe'
    } as any;

    expect(component.getDisplayName(app)).toBe('John Doe');
  });

  it('should return N/A if no names available', () => {
    const app = {
      establishmentName: null,
      applicantFullName: null
    } as any;

    expect(component.getDisplayName(app)).toBe('N/A');
  });
});