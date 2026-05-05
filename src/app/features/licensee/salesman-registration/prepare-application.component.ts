import { Component, OnInit } from '@angular/core';
import { MaterialModule } from '../../../shared/material.module';
import { LicenseComponent } from './steps/license/license.component';
import { DetailsComponent } from './steps/details/details.component';
import { SubmitApplicationComponent } from "./steps/submit-application/submit-application.component";
import { AccountService } from '../../../core/services/account.service';

@Component({
  selector: 'app-salesman-registration',
  standalone: true,
  imports: [
    MaterialModule, 
    LicenseComponent, 
    DetailsComponent, 
    SubmitApplicationComponent
  ],
  templateUrl: './prepare-application.component.html',
  styleUrl: './prepare-application.component.scss'
})
export class PrepareApplicationComponent implements OnInit {
  
  constructor(private accountService: AccountService) {}

  ngOnInit(): void {
    // ✅ Ensure user profile is loaded when starting salesman/barman registration
    this.ensureUserProfileLoaded();
  }

  /**
   * ✅ Ensure user profile is loaded before starting the registration
   */
  private ensureUserProfileLoaded(): void {
    const userProfile = this.accountService.getUserProfileSync();
    
    if (!userProfile) {
      console.log('📡 Loading user profile for salesman/barman registration...');
      this.accountService.identity(true).subscribe({
        next: (profile) => {
          if (profile) {
            console.log('✅ User profile loaded successfully');
          }
        },
        error: (err) => {
          console.error('❌ Failed to load user profile:', err);
        }
      });
    } else {
      console.log('✅ User profile already loaded for salesman/barman registration');
    }
  }

  // Getter to retrieve the role from sessionStorage
  get role() {
    const storedData = sessionStorage.getItem('licenseDetails');
    return storedData ? JSON.parse(storedData).role : null;
  }
}