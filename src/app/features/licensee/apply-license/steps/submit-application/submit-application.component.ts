import { ChangeDetectorRef, Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { MaterialModule } from '../../../../../shared/material.module';
import { Router, RouterModule } from '@angular/router';
import { LicenseApplication } from '../../../../../core/models/license-application.model';
import Swal from 'sweetalert2';
import { Subscription } from 'rxjs';
import { LicenseApplicationService } from '../../../../../core/services/license-application.service';

@Component({
  selector: 'app-submit-application',
  standalone: true,
  imports: [MaterialModule, RouterModule],
  templateUrl: './submit-application.component.html',
  styleUrl: './submit-application.component.scss'
})
export class SubmitApplicationComponent implements OnInit, OnDestroy {
  @Output() back = new EventEmitter<void>();

  passPhotoUrl: string | null = null;
  private photoSub?: Subscription;

  constructor(
    private licenseAppService: LicenseApplicationService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.photoSub = this.licenseAppService.getPassPhotoObservable().subscribe((file: File | null) => {
      if (this.passPhotoUrl) URL.revokeObjectURL(this.passPhotoUrl);

      this.passPhotoUrl = file ? URL.createObjectURL(file) : null;

      setTimeout(() => {
        this.passPhotoUrl = file ? URL.createObjectURL(file) : null;
        this.cdr.detectChanges();
      });
    });
  }

  ngOnDestroy(): void {
    if (this.passPhotoUrl) URL.revokeObjectURL(this.passPhotoUrl);
    this.photoSub?.unsubscribe();
  }

  readonly licenseApplicationLabels: Partial<Record<keyof LicenseApplication, string>> = {
    excise_district: 'Excise District',
    license_category: 'License Category',
    excise_subdivision: 'Excise Sub Division',
    license: 'License',
    license_type: 'License Type',
    establishment_name: 'Establishment Name',
    mobile_number: 'Mobile Number',
    email: 'Email Id',
    license_no: 'License No.',
    initial_grant_date: 'Initial Grant Date',
    renewed_from: 'Renewed From',
    valid_up_to: 'Valid Up To',
    yearly_license_fee: 'Yearly License Fee',
    license_nature: 'License Nature',
    functioning_status: 'Functioning Status',
    mode_of_operation: 'Mode of Operation',
    site_subdivision: 'Site Sub Division',
    police_station: 'Police Station',
    location_category: 'Location Category',
    location_name: 'Location Name',
    ward_name: 'Ward Name',
    business_address: 'Business Address',
    road_name: 'Road Name',
    pin_code: 'PIN Code',
    latitude: 'Latitude',
    longitude: 'Longitude',
    company_name: 'Company Name',
    company_address: 'Company Address',
    company_pan: 'Company PAN',
    company_cin: 'Company CIN',
    incorporation_date: 'Incorporation Date',
    company_phone_number: 'Company Phone Number',
    company_email: 'Company Email Id',
    status: 'Status',
    member_name: 'Member Name',
    father_husband_name: 'Father/Husband Name',
    nationality: 'Nationality',
    gender: 'Gender',
    pan: 'PAN',
    member_mobile_number: 'Member Mobile Number',
    member_email: 'Member Email Id',
    photo: 'Photo'
  };

  get licenseType(): number | null {
    const data = this.getParsedSession<Partial<LicenseApplication>>('keyInfoData');
    return data?.license_type ? Number(data.license_type) : null;
  }

  get selectLicenseData(): { key: string; value: any }[] {
    return this.getDataForView('selectLicenseData');
  }

  get keyInfoData(): { key: string; value: any }[] {
    return this.getDataForView('keyInfoData');
  }

  get addressData(): { key: string; value: any }[] {
    return this.getDataForView('addressData');
  }

  get unitDetailsData(): { key: string; value: any }[] {
    return this.getDataForView('unitDetailsData');
  }

  get memberDetailsData(): { key: string; value: any }[] {
    return this.getDataForView('memberDetailsData');
  }

  get displaySections(): Array<{
    title: string;
    data: { key: string; value: any }[];
    condition?: () => boolean;
  }> {
    return [
      { title: 'License Details', data: this.selectLicenseData },
      { title: 'Key Info', data: this.keyInfoData },
      {
        title: 'Unit Details',
        data: this.unitDetailsData,
        condition: () => this.licenseType === 2
      },
      { title: 'Address Details', data: this.addressData },
      { title: 'Member Details', data: this.memberDetailsData }
    ];
  }

  private getParsedSession<T>(key: string): T | null {
    try {
      const data = sessionStorage.getItem(key);
      return data ? JSON.parse(data) as T : null;
    } catch (e) {
      console.error(`❌ Failed to parse session key ${key}:`, e);
      return null;
    }
  }

  private getSafeLabel(key: string): string {
    return (key in this.licenseApplicationLabels)
      ? this.licenseApplicationLabels[key as keyof LicenseApplication]!
      : key;
  }

  private getDataForView(key: string): { key: string; value: any }[] {
    const data = this.getParsedSession<Partial<LicenseApplication>>(key);
    if (!data) return [];

    return Object.entries(data)
      .filter(([k]) => !k.endsWith('_code'))
      .map(([k, v]) => {
        const label = this.getSafeLabel(k);
        let displayValue = v;

        if (k === 'excise_district' || k === 'license_category' || k === 'excise_subdivision' ||
          k === 'license_type' || k === 'site_subdivision' || k === 'police_station') {
          displayValue = this.getDisplayName(k, v);
        }

        return { key: label, value: displayValue };
      });
  }

  private getDisplayName(fieldName: string, id: any): string {
    if (!id) return '';

    try {
      let masterData: any[] = [];

      switch (fieldName) {
        case 'excise_district':
          masterData = JSON.parse(sessionStorage.getItem('districts') || '[]');
          const district = masterData.find(d => d.id === id);
          return district?.district || id.toString();

        case 'license_category':
          masterData = JSON.parse(sessionStorage.getItem('licenseCategories') || '[]');
          const category = masterData.find(d => d.id === id);
          return category?.licenseCategory || id.toString();

        case 'excise_subdivision':
        case 'site_subdivision':
          masterData = JSON.parse(sessionStorage.getItem('subdivisions') || '[]');
          const subdivision = masterData.find(d => d.id === id);
          return subdivision?.subdivision || id.toString();

        case 'license_type':
          masterData = JSON.parse(sessionStorage.getItem('licenseTypes') || '[]');
          const licenseType = masterData.find(d => d.id === id);
          return licenseType?.licenseType || id.toString();

        case 'police_station':
          masterData = JSON.parse(sessionStorage.getItem('policeStations') || '[]');
          const station = masterData.find(d => d.id === id);
          return station?.policeStation || id.toString();

        default:
          return id.toString();
      }
    } catch (e) {
      console.error(`Failed to get display name for ${fieldName}:`, e);
      return id.toString();
    }
  }

  goBack(): void {
    this.back.emit();
  }

  /**
   * 🔍 DEBUG: Check sessionStorage before submission
   */
  private debugSessionStorage(): void {
    console.group('🔍 DEBUG: SessionStorage Contents Before Submission');

    const keys = [
      'selectLicenseData',
      'keyInfoData',
      'addressData',
      'unitDetailsData',
      'memberDetailsData'
    ];

    keys.forEach(key => {
      const data = sessionStorage.getItem(key);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          console.group(`📄 ${key}`);
          console.log('Raw JSON:', data);
          console.table(parsed);
          console.groupEnd();
        } catch (e) {
          console.error(`❌ Failed to parse ${key}:`, e);
        }
      } else {
        console.warn(`⚠️ ${key} is EMPTY`);
      }
    });

    // Check master data
    console.group('📊 Master Data in Session');
    ['districts', 'subdivisions', 'policeStations', 'licenseCategories', 'licenseTypes'].forEach(key => {
      const data = sessionStorage.getItem(key);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          console.log(`${key}: ${parsed.length} items`);
        } catch (e) {
          console.error(`❌ Failed to parse ${key}`);
        }
      } else {
        console.warn(`⚠️ ${key} is MISSING`);
      }
    });
    console.groupEnd();

    const photoFile = this.licenseAppService.getPassPhoto();
    console.log('📷 Photo file:', photoFile ? `${photoFile.name} (${photoFile.size} bytes)` : '❌ MISSING');

    console.groupEnd();
  }

  /**
   * ✅ FINAL SUBMIT
   */
  async submit(): Promise<void> {
    const confirm = await Swal.fire({
      title: 'Are you sure?',
      text: 'Do you want to submit this application?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Submit',
      cancelButtonText: 'Cancel',
    });

    if (!confirm.isConfirmed) return;

    try {
      // 🔍 DEBUG: Show what we have
      this.debugSessionStorage();

      // Check photo
      const photoFile = this.licenseAppService.getPassPhoto();
      if (!photoFile) {
        Swal.fire('Error', 'Please upload a photo to continue.', 'error');
        return;
      }

      // ✅ Prepare FormData
      const formData = this.licenseAppService.prepareOldLicenseFormData();

      // 📋 Log what's being sent
      console.group('📦 FINAL FORMDATA BEING SENT');
      const formDataArray: any[] = [];
      formData.forEach((value: FormDataEntryValue, key: string) => {
        formDataArray.push([
          key, 
          value instanceof File ? `[File: ${value.name}, ${value.size} bytes]` : value
        ]);
      });
      console.table(formDataArray);
      console.groupEnd();

      // ✅ Submit
      this.licenseAppService.submitOldLicenseApplication(formData).subscribe({
        next: (response: any) => {
          console.log('✅ Application submitted successfully:', response);
          Swal.fire({
            icon: 'success',
            title: 'Submitted!',
            text: 'Application submitted successfully!',
            confirmButtonText: 'OK'
          }).then(() => {
            sessionStorage.clear();
            this.licenseAppService.clearAllDocuments();
            this.router.navigate(['/licensee/dashboard']);
          });
        },

        error: (err: any) => {
          console.error('❌ Submission error:', err);
          console.log('Full error object:', err);

          let errorMessage = 'Failed to submit application.';

          if (err?.error) {
            if (typeof err.error === 'object') {
              const errors = Object.entries(err.error)
                .map(([key, value]) => {
                  if (Array.isArray(value)) {
                    return `${key}: ${value.join(', ')}`;
                  } else if (typeof value === 'object') {
                    return `${key}: ${JSON.stringify(value, null, 2)}`;
                  }
                  return `${key}: ${value}`;
                })
                .join('\n');
              errorMessage = errors || errorMessage;
            } else if (typeof err.error === 'string') {
              errorMessage = err.error;
            }
          } else if (err?.statusText) {
            errorMessage = err.statusText;
          }

          Swal.fire({
            icon: 'error',
            title: 'Submission Failed',
            html: `<pre style="text-align: left; max-height: 400px; overflow-y: auto; white-space: pre-wrap;">${errorMessage}</pre>`,
            confirmButtonText: 'OK',
            width: 600
          });
        }
      });

    } catch (error) {
      console.error('❌ Unexpected error:', error);
      Swal.fire('Error', 'An unexpected error occurred.', 'error');
    }
  }
}