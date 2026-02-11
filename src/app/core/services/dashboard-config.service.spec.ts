import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DashboardConfigService } from './dashboard-config.service';
import { RoleService } from './role.service';
import { environment } from '../../../environments/environment';

describe('DashboardConfigService', () => {
  let service: DashboardConfigService;
  let roleService: jasmine.SpyObj<RoleService>;
  let httpMock: HttpTestingController;

  const baseUrl = `${environment.apiBaseUrl}/auth/roles/dashboard-config`;

  beforeEach(() => {
    const roleServiceSpy = jasmine.createSpyObj('RoleService', ['getCurrentUser']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        DashboardConfigService,
        { provide: RoleService, useValue: roleServiceSpy }
      ]
    });

    service = TestBed.inject(DashboardConfigService);
    roleService = TestBed.inject(RoleService) as jasmine.SpyObj<RoleService>;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should load config by role from API', (done) => {
    const mockConfig: any = {
      roleId: 7,
      roleName: 'Officer in Charge',
      layout: 'admin',
      widgets: [],
      navigation: [],
      permissions: []
    };

    service.getDashboardConfig(7).subscribe((config) => {
      expect(config.roleId).toBe(7);
      expect(config.roleName).toBe('Officer in Charge');
      done();
    });

    const req = httpMock.expectOne(`${baseUrl}/7/`);
    expect(req.request.method).toBe('GET');
    req.flush(mockConfig);
  });

  it('should load current user config from API', (done) => {
    roleService.getCurrentUser.and.returnValue({ roleId: 7 } as any);

    const mockConfig: any = {
      roleId: 7,
      roleName: 'Officer in Charge',
      layout: 'admin',
      widgets: [],
      navigation: [],
      permissions: []
    };

    service.getCurrentUserDashboardConfig().subscribe((config) => {
      expect(config.roleId).toBe(7);
      done();
    });

    const req = httpMock.expectOne(`${baseUrl}/current/`);
    expect(req.request.method).toBe('GET');
    req.flush(mockConfig);
  });

  it('should error when no current user exists', (done) => {
    roleService.getCurrentUser.and.returnValue(null);

    service.getCurrentUserDashboardConfig().subscribe({
      next: () => fail('Expected error'),
      error: () => done()
    });
  });
});
