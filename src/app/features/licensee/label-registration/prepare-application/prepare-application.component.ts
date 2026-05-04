import { Component, OnInit } from '@angular/core';
import { MaterialModule } from '../../../../shared/material.module';
import { AccountService } from '../../../../core/services/account.service';
import { LabelRegistrationLicenseeDetailsComponent } from './steps/licensee-details/licensee-details.component';
import { LabelRegistrationProductDetailsComponent } from './steps/product-details/product-details.component';
import { LabelRegistrationPackagingDetailsComponent } from './steps/packaging-details/packaging-details.component';
import { LabelRegistrationSubmitApplicationComponent } from './steps/submit-application/submit-application.component';

@Component({
  selector: 'app-label-registration-prepare-application',
  standalone: true,
  imports: [
    MaterialModule,
    LabelRegistrationLicenseeDetailsComponent,
    LabelRegistrationProductDetailsComponent,
    LabelRegistrationPackagingDetailsComponent,
    LabelRegistrationSubmitApplicationComponent
  ],
  templateUrl: './prepare-application.component.html',
  styleUrl: './prepare-application.component.scss'
})
export class LabelRegistrationPrepareApplicationComponent implements OnInit {
  private readonly maintenanceBypassStorageKey = 'label-registration.maintenance.bypass';
  readonly maintenanceModeEnabled = true;
  maintenanceBypassEnabled = false;

  constructor(private accountService: AccountService) { }

  ngOnInit(): void {
    this.loadMaintenanceBypassState();

    const userProfile = this.accountService.getUserProfileSync();
    if (!userProfile) {
      this.accountService.identity(true).subscribe({
        error: (error) => console.error('Failed to load user profile for label registration:', error)
      });
    }
  }

  get showMaintenanceOverlay(): boolean {
    return this.maintenanceModeEnabled && !this.maintenanceBypassEnabled;
  }

  activateMaintenanceBypass(): void {
    this.maintenanceBypassEnabled = true;
    this.persistMaintenanceBypassState();
  }

  private loadMaintenanceBypassState(): void {
    if (typeof window === 'undefined') return;
    this.maintenanceBypassEnabled = window.localStorage.getItem(this.maintenanceBypassStorageKey) === '1';
  }

  private persistMaintenanceBypassState(): void {
    if (typeof window === 'undefined') return;
    if (this.maintenanceBypassEnabled) {
      window.localStorage.setItem(this.maintenanceBypassStorageKey, '1');
    } else {
      window.localStorage.removeItem(this.maintenanceBypassStorageKey);
    }
  }
}
