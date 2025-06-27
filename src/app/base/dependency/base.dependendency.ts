import { Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AccountService } from '../../core/services/account.service';
import { StateStorageService } from '../../core/config/state-storage.service';
import { AuthService } from '../../core/services/auth.service';

/**
 * A shared service container that provides all core dependencies
 * used by components inheriting from BaseComponent.
 * 
 * Marked as 'providedIn: root' to make it a singleton throughout the app.
 */
@Injectable({ providedIn: 'root' })
export class BaseDependency {
  constructor(
    // ActivatedRoute gives access to the current route and its parameters
    public route: ActivatedRoute,

    // Router is used to navigate programmatically between views
    public router: Router,

    // Service to manage authenticated user data
    public accountService: AccountService,

    // Provides toast notifications for alerts, success, error, etc.
    public toastrService: ToastrService,

    // Shared service for making API calls to the backend
    public authService: AuthService,

    // Manages state in local or session storage
    public stateStorageService: StateStorageService
  ) {}
}
