import { Component, OnInit, OnDestroy, AfterViewInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, RouterModule } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import Swal from 'sweetalert2';

import { RoleService } from '../../../../core/services/role.service';
import { User } from '../../../../core/models/dashboard.models';
import { AccountService } from '../../../../core/services/account.service';

@Component({
  selector: 'app-unified-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule,
    MatExpansionModule,
    MatMenuModule
  ],
  templateUrl: './unified-layout.component.html',
  styleUrls: ['./unified-layout.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class UnifiedLayoutComponent implements OnInit, OnDestroy, AfterViewInit {
  private destroy$ = new Subject<void>();
  
  currentUser: User | null = null;
  userName = '';
  isSidenavOpen = false;
  loaded = true;
  user: any;

  constructor(
    private roleService: RoleService,
    private accountService: AccountService,
    private router: Router,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    console.log('🔍 UnifiedLayout ngOnInit - Initial currentUser:', this.currentUser);
    
    // Initialize user info first
    this.initializeUserAndAuth();
  }

  ngAfterViewInit() {
    // The sidebar state is already set via [opened] binding in template
    // No need for additional logic here
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeUserAndAuth() {
    // First, try to get user from role service (might be cached)
    const cachedUser = this.roleService.getCurrentUser();
    
    if (cachedUser) {
      console.log('✅ Found cached user in role service:', cachedUser);
      this.currentUser = cachedUser;
      this.setupInitialSidebarState();
      this.loaded = true;
    }

    // Always subscribe to authentication state for real-time updates
    this.accountService.getAuthenticationState().subscribe((acc) => {
      console.log('🔍 Authentication state changed:', acc);
      
      if (acc !== null) {
        this.user = acc;

        // Build username exactly like original
        this.userName = this.user.firstName!;

        // Append last name if it exists
        if (this.user.lastName !== null) {
          this.userName = this.userName + ' ' + this.user.lastName;
        }

        // IMPORTANT: Update the role service with the actual logged-in user
        this.updateRoleServiceWithActualUser(acc);
        this.setupInitialSidebarState();
        
        // Mark component as fully loaded
        this.loaded = true;
      } else {
        // Only redirect to login if we're sure there's no authentication
        // and we're not on the login page already
        const currentUrl = this.router.url;
        if (!currentUrl.includes('/login') && !currentUrl.includes('/') && this.loaded) {
          console.log('⚠️ No authentication found, redirecting to login');
          this.router.navigate(['/']);
        }
      }
    });
  }

  private setupInitialSidebarState() {
    // Set initial sidebar state based on user role
    const shouldBeOpen = !this.isLicenseeUser();
    this.isSidenavOpen = shouldBeOpen;
    console.log('🔍 Setup initial sidebar state - shouldBeOpen:', shouldBeOpen, 'isLicenseeUser:', this.isLicenseeUser());
  }

  private updateRoleServiceWithActualUser(accountUser: any) {
    // Use backend role id directly (no name-based mapping)
    const roleId = Number(accountUser?.role?.id) || 1;

    // Create the unified user object
    const unifiedUser: User = {
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

    // Update the role service with the actual user
    this.roleService.setCurrentUser(unifiedUser);
    this.currentUser = unifiedUser;

    console.log('✅ Updated role service with actual user:', {
      roleId: roleId,
      roleIdFromAccount: accountUser?.role?.id,
      displayName: unifiedUser.role?.displayName
    });
  }

  // Method to toggle the sidebar (sidenav) - Fixed to properly track state
  snavToggle(sidenav: any) {
    sidenav.toggle();
    // Update our state to match the actual sidenav state
    this.isSidenavOpen = sidenav.opened;
    console.log('🔍 Sidebar toggled - new state:', this.isSidenavOpen);
  }

  // Handle sidebar state changes (opened/closed)
  onSidenavStateChange(isOpen: boolean) {
    this.isSidenavOpen = isOpen;
    console.log('🔍 Sidebar state changed:', isOpen);
  }

  // Method to handle the "View Profile" button click - exactly like original
  viewProfile(): void {
    console.log('Button Clicked!');
    // TODO: Import and open UserProfileComponent dialog
    // const dialogRef = this.dialog.open(UserProfileComponent, {
    //   width: '500px',
    // });
  }

  // Method to open user profile dialog
  openUserProfile(): void {
    console.log('User profile clicked!');
    
    // Dynamically import the appropriate user profile component based on user role
    if (this.isLicenseeUser()) {
      // Import licensee user profile component
      import('../../../../features/licensee/licensee-home/user-profile/user-profile.component')
        .then(({ UserProfileComponent }) => {
          const dialogRef = this.dialog.open(UserProfileComponent, {
            width: '600px',
            maxWidth: '90vw',
            panelClass: 'user-profile-dialog'
          });
        })
        .catch(error => {
          console.error('Error loading licensee user profile component:', error);
          // Fallback to basic user info display
          this.showBasicUserInfo();
        });
    } else {
      // Import admin user profile component
      import('../../../../features/admin/home/user-profile/user-profile.component')
        .then(({ UserProfileComponent }) => {
          const dialogRef = this.dialog.open(UserProfileComponent, {
            width: '600px',
            maxWidth: '90vw',
            panelClass: 'user-profile-dialog'
          });
        })
        .catch(error => {
          console.error('Error loading admin user profile component:', error);
          // Fallback to basic user info display
          this.showBasicUserInfo();
        });
    }
  }

  // Fallback method to show basic user info if component loading fails
  private showBasicUserInfo(): void {
    const userInfo = this.user || this.currentUser;
    const displayName = this.userName || userInfo?.fullName || 'User';
    const role = this.getRoleDisplayName();
    const email = userInfo?.email || 'N/A';
    const username = userInfo?.username || userInfo?.login || 'N/A';

    Swal.fire({
      title: 'User Profile',
      html: `
        <div style="text-align: left; font-size: 14px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px; font-weight: bold;">Name:</td>
              <td style="padding: 8px;">${displayName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px; font-weight: bold;">Username:</td>
              <td style="padding: 8px;">${username}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px; font-weight: bold;">Email:</td>
              <td style="padding: 8px;">${email}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px; font-weight: bold;">Role:</td>
              <td style="padding: 8px;">${role}</td>
            </tr>
          </table>
        </div>
      `,
      confirmButtonText: 'Close',
      width: 500,
      padding: '1rem'
    });
  }

  // Supply Chain navigation - Navigate to unified dashboard with supply chain tab
  openSupplyChain(): void {
    // Instead of navigating to separate supply chain component,
    // navigate to dashboard and switch to supply chain tab
    this.router.navigate(['/dashboard'], { 
      queryParams: { tab: 'supply-chain' } 
    });
  }

  // Navigate to specific supply chain section
  navigateToSupplyChain(section: string): void {
    this.router.navigate(['/dashboard'], { 
      queryParams: { section: section } 
    });
  }

  // Navigate to role-specific sections
  navigateToSection(section: string): void {
    // For all officer roles, navigate to dashboard with section parameter
    // This keeps the unified layout and sidebar open
    
    if (section === 'itcell-hologram') {
      // For IT Cell hologram procurement, navigate with tab parameter to show the hologram tab
      this.router.navigate(['/dashboard'], { 
        queryParams: { section: section, tab: 'hologram' } 
      });
    } else {
      this.router.navigate(['/dashboard'], { 
        queryParams: { section: section } 
      });
    }
  }

  // Navigation method - exactly like original
  navigateTo(route: string): void {
    switch (route) {
      case 'transit-permit-register':
        this.router.navigate(['/dev-transit-permit-register']);
        break;
      case 'daily-record-register':
        this.router.navigate(['/dev-daily-record-register']);
        break;
      case 'daily-production-register':
        this.router.navigate(['/dev-daily-production-register']);
        break;
      case 'brands-details':
        this.router.navigate(['/dev-brands-details']);
        break;
      case 'yuksom-local-sales-register':
        this.router.navigate(['/dev-local-sales-register']);
        break;
      case 'beer-production-register':
        this.router.navigate(['/dev-beer-production-register']);
        break;
      case 'hologram-monthly-report':
        this.router.navigate(['/dev-hologram-monthly-report']);
        break;
      case 'dashboard':
        this.router.navigate(['/dev-supply-chain']);
        break;
      case 'payments':
        this.router.navigate(['/dev-payment-confirmation']);
        break;
      case 'payment-receipt':
        this.router.navigate(['/dev-payment-receipt']);
        break;
      default:
        this.router.navigate(['/dev-supply-chain']);
    }
  }

  // License info dialog - exactly like original
  openLicenseInfo(): void {
    Swal.fire({
      title: 'Apply for License',
      html: `
        <div style="text-align: left; font-size: 14px;">
          <h4>Eligibility Criteria</h4>
          <ul>
            <li>Must be at least 21 years old</li>
            <li>Resident of Sikkim or valid permission</li>
            <li>No criminal record under Excise laws</li>
          </ul>
          <h4>Required Documents</h4>
          <ul>
            <li>Certificate of Identification / Sikkim Subject / RC</li>
            <li>Proof of Age (e.g. Aadhaar)</li>
            <li>Landlord NOC (if rented)</li>
            <li>Trade License</li>
            <li>Photograph of site</li>
          </ul>
          <h4>Fees</h4>
          <p>License Fee: ₹13,500 - 20,000<br>Processing Fee: ₹500</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Start Application',
      cancelButtonText: 'Cancel',
      width: 700,
      padding: '1rem',
      customClass: {
        popup: 'swal-wide',
      },
    }).then((result) => {
      if (result.isConfirmed) {
        this.router.navigate(['/licensee/apply-license']);
      }
    });
  }

  // New License info dialog - exactly like original
  openNewLicenseInfo(): void {
    Swal.fire({
      title: 'Apply for License',
      html: `
        <div style="text-align: left; font-size: 14px;">
          <h4>Eligibility Criteria</h4>
          <ul>
            <li>Must be at least 21 years old</li>
            <li>Resident of Sikkim or valid permission</li>
            <li>No criminal record under Excise laws</li>
          </ul>
          <h4>Required Documents</h4>
          <ul>
            <li>Certificate of Identification / Sikkim Subject / RC</li>
            <li>Proof of Age (e.g. Aadhaar)</li>
            <li>Landlord NOC (if rented)</li>
            <li>Trade License</li>
            <li>Photograph of site</li>
          </ul>
          <h4>Fees</h4>
          <p>License Fee: ₹13,500 - 20,000<br>Processing Fee: ₹500</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Start Application',
      cancelButtonText: 'Cancel',
      width: 700,
      padding: '1rem',
      customClass: {
        popup: 'swal-wide',
      },
    }).then((result) => {
      if (result.isConfirmed) {
        this.router.navigate(['/licensee/apply-new-license']);
      }
    });
  }

  // Check if user is licensee/supply chain
  isLicenseeUser(): boolean {
    return this.currentUser?.roleId === 2;
  }

  isSiteAdminUser(): boolean {
    return this.currentUser?.roleId === 1;
  }

  // Check if user has active license
  hasActiveLicense(): boolean {
    return this.user?.hasActiveLicense || false;
  }

  // Get role display name for header
  getRoleDisplayName(): string {
    const roleId = this.currentUser?.roleId ?? this.user?.role?.id;
    return roleId ? `Role ID: ${roleId}` : 'Role ID: -';
  }
}
