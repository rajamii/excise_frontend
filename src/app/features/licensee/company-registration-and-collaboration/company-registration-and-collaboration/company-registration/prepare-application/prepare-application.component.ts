import { Component } from '@angular/core';
import { MaterialModule } from '../../../../../../shared/material.module';
import { CompanyDetailsComponent } from "./steps/company-details/company-details.component";
import { MemberDetailsComponent } from './steps/member-details/member-details.component';
import { UploadDocumentsComponent } from "./steps/upload-documents/upload-documents.component";
import { SubmitApplicationComponent } from './steps/submit-application/submit-application.component';

@Component({
  selector: 'app-prepare-application',
  standalone: true,
  imports: [MaterialModule, CompanyDetailsComponent, MemberDetailsComponent, UploadDocumentsComponent, SubmitApplicationComponent],
  templateUrl: './prepare-application.component.html',
  styleUrl: './prepare-application.component.scss'
})
export class PrepareApplicationComponent {

}
