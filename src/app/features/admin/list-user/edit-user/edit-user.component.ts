import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Subdivision } from '../../../../core/models/subdivision.model';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../shared/material.module';
import { Account } from '../../../../core/models/accounts';
import { District } from '../../../../core/models/district.model';
import { BaseComponent } from '../../../../base/base.components';
import { BaseDependency } from '../../../../base/dependency/base.dependency';

@Component({
  selector: 'app-edit-user',
  imports: [MaterialModule],
  templateUrl: './edit-user.component.html',
  styleUrl: './edit-user.component.scss'
})
export class EditUserComponent extends BaseComponent implements OnInit{

  constructor(
    deps: BaseDependency,
    public dialogRef: MatDialogRef<EditUserComponent>, // Dialog reference to manage the dialog box
    @Inject(MAT_DIALOG_DATA) public data: Account, // Injects the data passed to the dialog (subdivision data)
  ) {
    super(deps)
  }

  ngOnInit(): void {
    
  }
}
