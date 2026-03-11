import { StepperSelectionEvent } from '@angular/cdk/stepper';
import { Component, OnInit, ViewChild } from '@angular/core';
import { MatStepper } from '@angular/material/stepper';
import Swal from 'sweetalert2';
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
  @ViewChild('stepper') private stepper?: MatStepper;
  @ViewChild(LabelRegistrationSubmitApplicationComponent)
  private submitApplicationStep?: LabelRegistrationSubmitApplicationComponent;

  private isRevertingSelection = false;

  constructor(
    private accountService: AccountService
  ) {}

  ngOnInit(): void {
    const userProfile = this.accountService.getUserProfileSync();
    if (!userProfile) {
      this.accountService.identity(true).subscribe({
        error: (error) => console.error('Failed to load user profile for label registration:', error)
      });
    }
  }

  onStepSelectionChange(event: StepperSelectionEvent): void {
    if (this.isRevertingSelection || !this.stepper) {
      return;
    }

    if (event.selectedIndex <= event.previouslySelectedIndex) {
      return;
    }

    const maxAllowed = this.getMaxAllowedStepIndex();
    if (event.selectedIndex <= maxAllowed) {
      if (event.selectedIndex === 3) {
        setTimeout(() => this.submitApplicationStep?.refreshFromSessionStorage());
      }
      return;
    }

    const blockingStep = this.getStepLabel(maxAllowed);
    this.isRevertingSelection = true;
    setTimeout(() => {
      if (this.stepper) {
        this.stepper.selectedIndex = event.previouslySelectedIndex;
      }
      this.isRevertingSelection = false;
    });

    Swal.fire('Complete required steps', `Please complete "${blockingStep}" before proceeding.`, 'warning');
  }

  private getMaxAllowedStepIndex(): number {
    if (!this.isLicenseeComplete()) {
      return 0;
    }
    if (!this.isProductComplete()) {
      return 1;
    }
    if (!this.isPackagingComplete()) {
      return 2;
    }
    return 3;
  }

  private getStepLabel(stepIndex: number): string {
    switch (stepIndex) {
      case 0:
        return 'Applicant Details';
      case 1:
        return 'Manufacturer & Brand';
      case 2:
        return 'Package Details';
      case 3:
        return 'Submit Application';
      default:
        return 'Submit Application';
    }
  }

  private readSessionJson<T>(key: string): T | null {
    const raw = sessionStorage.getItem(key);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  private isLicenseeComplete(): boolean {
    const data = this.readSessionJson<any>('labelRegLicenseeDetails');
    return (
      !!String(data?.applicationYear || '').trim() &&
      !!String(data?.applicantType || '').trim() &&
      !!String(data?.liquorCategory || '').trim() &&
      !!String(data?.applicationDate || '').trim() &&
      !!String(data?.registrationValidFrom || '').trim() &&
      !!String(data?.registrationValidUpTo || '').trim()
    );
  }

  private isProductComplete(): boolean {
    const data = this.readSessionJson<any>('labelRegProductDetails');
    return !!String(data?.bottlerName || '').trim() && !!String(data?.brandName || '').trim();
  }

  private isPackagingComplete(): boolean {
    const data = this.readSessionJson<any>('labelRegPackagingDetails') || {};
    const rows = Array.isArray(data.packagingRows) ? data.packagingRows : [];
    const hasValidRow = rows.some((row: any) => {
      const measureValueMl = Number(row?.measureValueMl ?? row?.sizeMl);
      const bottlesPerCase = Number(row?.bottlesPerCase ?? row?.unitsPerCase);
      const edpPerCaseRaw = row?.edpPerCase;
      const edpPerCase = Number(edpPerCaseRaw);
      const mrpPerBottleRaw = row?.mrpPerBottle ?? row?.mrp;
      const mrpPerBottle = Number(mrpPerBottleRaw);
      const packageType = String(row?.packageType ?? row?.packagingType ?? '').trim();
      const purposeSale = String(row?.purposeSale ?? '').trim();

      return (
        measureValueMl >= 1 &&
        bottlesPerCase >= 1 &&
        edpPerCaseRaw !== null &&
        edpPerCaseRaw !== undefined &&
        String(edpPerCaseRaw).trim() !== '' &&
        edpPerCase >= 0 &&
        mrpPerBottleRaw !== null &&
        mrpPerBottleRaw !== undefined &&
        String(mrpPerBottleRaw).trim() !== '' &&
        mrpPerBottle >= 0 &&
        !!packageType &&
        !!purposeSale
      );
    });

    return hasValidRow;
  }
}
