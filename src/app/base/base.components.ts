import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { BaseDependency } from './dependency/base.dependency';
import { StateStorageService } from '../core/config/state-storage.service';
import { AccountService } from '../core/services/account.service';
import Swal from 'sweetalert2';
import { AuthService } from '../core/services/auth.service';
import { MasterService } from '../core/services/master.service';
import { UserService } from '../core/services/user.service';
import { LicenseApplicationService } from '../core/services/license-application.service';
import { InfoPagesService } from '../core/services/info-pages.service';
import { SalesmanBarmanRegistrationService } from '../core/services/salesman-barman-registration.service';
import { CompanyRegistrationService } from '../core/services/company-registration.service';
import { AdminService } from '../features/admin/admin.service';

@Component({
  template: '', // Base component has no template. Designed for inheritance.
})
export class BaseComponent implements OnDestroy {
  // Angular router and route for navigation and URL parameter handling
  protected route: ActivatedRoute;
  protected router: Router;

  // Service to manage session/local storage state
  protected stateStorgeService: StateStorageService;

  // Toast notification service for user feedback
  protected toastrService: ToastrService;

  // Manages account/user-related data
  protected accountService: AccountService;

  // Handles API requests across the app
  protected authService: AuthService;

  // SweetAlert instance for alert modals
  protected myswal: any;

  protected masterService: MasterService;
  protected userService: UserService;
  protected licenseAppService: LicenseApplicationService;
  protected infoPagesService: InfoPagesService;
  protected salesmanBarmanService: SalesmanBarmanRegistrationService;
  protected companyRegistrationService: CompanyRegistrationService;

  // Admin service
  protected adminService: AdminService;

  /**
   * Constructor injects a base dependency object that bundles all core services.
   * This allows shared services to be used by any component extending BaseComponent.
   */
  constructor(protected baseDependency: BaseDependency) {
    this.route = baseDependency.route;
    this.router = baseDependency.router;
    this.stateStorgeService = baseDependency.stateStorageService;
    this.toastrService = baseDependency.toastrService;
    this.accountService = baseDependency.accountService;
    this.myswal = Swal;
    this.authService = baseDependency.authService;

    this.masterService = baseDependency.masterService;
    this.userService = baseDependency.userService;
    this.licenseAppService = baseDependency.licenseAppService;
    this.infoPagesService = baseDependency.infoPagesService;
    this.salesmanBarmanService = baseDependency.salesmanBarmanService;
    this.companyRegistrationService = baseDependency.companyRegistrationService;

    this.adminService = baseDependency.adminService;
  }

  /**
   * Lifecycle hook called when the component is destroyed.
   * Can be overridden by child components to handle cleanup.
   */
  ngOnDestroy(): void {}
}
