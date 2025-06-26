import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { SiteAdminService } from '../../site-admin-service';
import { Subdivision } from '../../../../core/models/subdivision.model';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../shared/material.module';
import { Account } from '../../../../core/models/accounts';
import { District } from '../../../../core/models/district.model';

@Component({
  selector: 'app-edit-user',
  imports: [MaterialModule],
  templateUrl: './edit-user.component.html',
  styleUrl: './edit-user.component.scss'
})
export class EditUserComponent {

}
