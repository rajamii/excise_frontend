import { Component } from '@angular/core';
import { MaterialModule } from '../../../../shared/material.module';
import { MatDialogRef, MatDialog } from '@angular/material/dialog';
import { AccountService } from '../../../../core/services/account.service';
import { MyLicensesComponent } from '../../my-licenses/my-licenses.component';

@Component({
  selector: 'app-user-profile',
  imports: [MaterialModule],
  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.scss'
})
export class UserProfileComponent {
  user: any;
  loaded = true;

  constructor(
    public dialogRef: MatDialogRef<UserProfileComponent>,
    private accountService: AccountService,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.accountService.getAuthenticationState().subscribe(acc => {
      if (acc !== null) {
        this.user = acc;
      }
      this.loaded = true;
    });
  }

  closeDialog(): void {
    this.dialogRef.close();
  }

  openMyLicenses(): void {
    // Close current dialog first
    this.dialogRef.close();

    // Open My Licenses dialog
    const licensesDialogRef = this.dialog.open(MyLicensesComponent, {
      width: '90vw',
      maxWidth: '1200px',
      maxHeight: '90vh',
      panelClass: 'my-licenses-dialog'
    });

    // Handle what happens when licenses dialog closes
    licensesDialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        console.log('My Licenses dialog closed with refresh signal');
      }
    });
  }
}