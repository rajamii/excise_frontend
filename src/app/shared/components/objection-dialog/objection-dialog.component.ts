import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { environment } from '../../../../environments/environment';
import { DocumentPreviewDialogComponent } from '../document-preview-dialog/document-preview-dialog.component';

export interface ObjectionDialogResult {
  objections: Array<{ field: string; remarks: string }>;
  generalRemarks?: string;
}

export interface ObjectionCandidate {
  originalIndex: number;
  field: string;
  label: string;
  value: string;
  section: string;
  sectionIcon: string;
  sectionOrder: number;
  isUpload: boolean;
}

export interface ObjectionSectionGroup {
  id: string;
  name: string;
  icon: string;
  order: number;
  candidates: ObjectionCandidate[];
  isExpanded: boolean;
  selectedCount: number;
}

@Component({
  selector: 'app-objection-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './objection-dialog.component.html',
  styleUrls: ['./objection-dialog.component.scss']
})
export class ObjectionDialogComponent implements OnInit {
  allCandidates: ObjectionCandidate[] = [];
  form!: FormGroup;
  searchQuery: string = '';
  activeSectionFilter: string = 'ALL';

  get rows(): FormArray {
    return this.form.get('rows') as FormArray;
  }

  rowGroup(index: number): FormGroup {
    return this.rows.at(index) as FormGroup;
  }

  constructor(
    private fb: FormBuilder,
    private dialog: MatDialog,
    private dialogRef: MatDialogRef<ObjectionDialogComponent, ObjectionDialogResult | null>,
    @Inject(MAT_DIALOG_DATA) public data: { application: any; title?: string }
  ) { }

  ngOnInit(): void {
    this.allCandidates = this.buildCandidates(this.data?.application);

    this.form = this.fb.group({
      generalRemarks: new FormControl<string>('', { nonNullable: true }),
      rows: this.fb.array(this.allCandidates.map(() => this.buildRow()))
    });

    if (this.allCandidates.length === 0) {
      this.form.get('generalRemarks')?.addValidators([Validators.required]);
      this.form.get('generalRemarks')?.updateValueAndValidity({ emitEvent: false });
    }
  }

  private buildRow(): FormGroup {
    return this.fb.group({
      selected: new FormControl<boolean>(false, { nonNullable: true }),
      remarks: new FormControl<string>('', { nonNullable: true })
    });
  }

  get totalSelectedCount(): number {
    if (!this.rows) return 0;
    let count = 0;
    for (let i = 0; i < this.rows.length; i++) {
      if (this.rows.at(i)?.get('selected')?.value) {
        count++;
      }
    }
    return count;
  }

  get sectionsSummary(): Array<{ id: string; name: string; icon: string; count: number; selectedCount: number }> {
    const summaryMap = new Map<string, { id: string; name: string; icon: string; order: number; count: number; selectedCount: number }>();

    for (const c of this.allCandidates) {
      const isSelected = !!this.rows?.at(c.originalIndex)?.get('selected')?.value;
      if (!summaryMap.has(c.section)) {
        summaryMap.set(c.section, {
          id: c.section,
          name: c.section,
          icon: c.sectionIcon,
          order: c.sectionOrder,
          count: 1,
          selectedCount: isSelected ? 1 : 0
        });
      } else {
        const existing = summaryMap.get(c.section)!;
        existing.count++;
        if (isSelected) existing.selectedCount++;
      }
    }

    const list = Array.from(summaryMap.values()).sort((a, b) => a.order - b.order);
    return [
      {
        id: 'ALL',
        name: 'All Steps',
        icon: 'dashboard',
        count: this.allCandidates.length,
        selectedCount: this.totalSelectedCount
      },
      ...list
    ];
  }

  get groupedCandidates(): ObjectionSectionGroup[] {
    const query = this.searchQuery.trim().toLowerCase();
    const groupMap = new Map<string, ObjectionSectionGroup>();

    for (const c of this.allCandidates) {
      if (this.activeSectionFilter !== 'ALL' && c.section !== this.activeSectionFilter) {
        continue;
      }

      if (query) {
        const matchesLabel = c.label.toLowerCase().includes(query);
        const matchesField = c.field.toLowerCase().includes(query);
        const matchesValue = String(c.value).toLowerCase().includes(query);
        const matchesSection = c.section.toLowerCase().includes(query);
        if (!matchesLabel && !matchesField && !matchesValue && !matchesSection) {
          continue;
        }
      }

      const isSelected = !!this.rows?.at(c.originalIndex)?.get('selected')?.value;

      if (!groupMap.has(c.section)) {
        groupMap.set(c.section, {
          id: c.section,
          name: c.section,
          icon: c.sectionIcon,
          order: c.sectionOrder,
          candidates: [c],
          isExpanded: true,
          selectedCount: isSelected ? 1 : 0
        });
      } else {
        const group = groupMap.get(c.section)!;
        group.candidates.push(c);
        if (isSelected) {
          group.selectedCount++;
        }
      }
    }

    return Array.from(groupMap.values()).sort((a, b) => a.order - b.order);
  }

  get totalVisibleCount(): number {
    return this.groupedCandidates.reduce((acc, g) => acc + g.candidates.length, 0);
  }

  setSectionFilter(sectionId: string): void {
    this.activeSectionFilter = sectionId;
  }

  clearSearch(): void {
    this.searchQuery = '';
  }

  toggleSection(group: ObjectionSectionGroup): void {
    group.isExpanded = !group.isExpanded;
  }

  toggleSelectAllInGroup(group: ObjectionSectionGroup, select: boolean): void {
    group.candidates.forEach(c => {
      const row = this.rows.at(c.originalIndex) as FormGroup;
      row.get('selected')?.setValue(select);
    });
  }

  isGroupAllSelected(group: ObjectionSectionGroup): boolean {
    if (group.candidates.length === 0) return false;
    return group.candidates.every(c => !!this.rows.at(c.originalIndex)?.get('selected')?.value);
  }

  onCheckboxChange(index: number): void {
    const row = this.rows.at(index) as FormGroup;
    const isSelected = row.get('selected')?.value;
    if (!isSelected) {
      // Keep remarks or leave as is
    }
  }

  onRemarksInput(index: number): void {
    const row = this.rows.at(index) as FormGroup;
    const remarks = String(row.get('remarks')?.value || '').trim();
    if (remarks.length > 0 && !row.get('selected')?.value) {
      row.get('selected')?.setValue(true);
    }
  }

  private formatFieldLabel(key: string): string {
    const knownLabels: Record<string, string> = {
      businessaddress: 'Business Address',
      coircss: 'COI / RC / SS Category',
      coircssdocumenttype: 'COI / RC / SS Document Type',
      constructiontype: 'Construction Type',
      pan: 'PAN Number',
      aadhaar: 'Aadhaar Number',
      dob: 'Date of Birth',
      dateofbirth: 'Date of Birth',
      gender: 'Gender',
      nationality: 'Nationality',
      maritalstatus: 'Marital Status',
      residentialstatus: 'Residential Status',
      applicantmobilenumber: 'Applicant Mobile Number',
      email: 'Email Address',
      emailid: 'Email Address',
      presentaddress: 'Present Address',
      permanentaddress: 'Permanent Address',
      fatherhusbandname: 'Father / Husband Name',
      modeofoperation: 'Mode of Operation',
      hassikkimcertificate: 'Has Sikkim Certificate (COI / RC / SS)',
      hasexciselicense: 'Existing Excise License Held',
      existinglicenseno: 'Existing License Number',
      existinglicensecategoryid: 'Existing License Category',
      familyexciselicense: 'Family Member Excise License Held',
      familylicenseno: 'Family License Number',
      familylicensecategoryid: 'Family License Category',
      criminalconviction: 'Criminal Conviction Declaration',
      criminalcasedetails: 'Criminal Case Details',
      sikkimsubject: 'Sikkim Subject Certificate',
      licensetype: 'License Type',
      licensecategory: 'License Category',
      licensesubcategory: 'License Sub-Category',
      establishmentname: 'Establishment / Unit Name',
      sitetype: 'Site Type',
      pachwai: 'Pachwai Included',
      draughtbeer: 'Draught Beer Included',
      minibar: 'Mini Bar Included',
      minibarquantity: 'Mini Bar Quantity',
      existingsitelicense: 'Existing Site License',
      sitedistrict: 'Site District',
      sitesubdivision: 'Site Sub-Division',
      policestation: 'Police Station',
      locationcategory: 'Location Category',
      locationsubcategory: 'Location Sub-Category',
      block: 'Block',
      ward: 'Ward',
      roadname: 'Road / Street Name',
      pincode: 'PIN Code',
      length: 'Premises Length',
      breadth: 'Premises Breadth',
      siteowned: 'Site Ownership Status',
      nocobtained: 'NOC Obtained',
      tradelicensecovered: 'Trade License Covered',
      tradelicenseno: 'Trade License Number',
      boundarynorth: 'Boundary (North)',
      boundarysouth: 'Boundary (South)',
      boundaryeast: 'Boundary (East)',
      boundarywest: 'Boundary (West)',
      storagecapacity: 'Storage Capacity',
      premisestype: 'Premises Type',
      floorarea: 'Floor Area',
      nearestschool: 'Nearest School Distance',
      nearesthospital: 'Nearest Hospital Distance',
      nearesttemple: 'Nearest Religious Place Distance',
      siteaddress: 'Site Address',
      landdetails: 'Land / Property Details',
      dagnumber: 'Dag / Plot Number',
      khatiyannumber: 'Khatiyan / Parcha Number',
      parchanumber: 'Parcha Number',
      ownershiptype: 'Ownership Type',
      companyname: 'Company / Firm Name',
      companyaddress: 'Company Registered Address',
      companygst: 'Company GST Number',
      companyphonenumber: 'Company Phone Number',
      companyemail: 'Company Email Address',
      companypan: 'Company PAN',
      companycin: 'Company CIN',
      natureofbusiness: 'Nature of Business',
      registeredaddress: 'Registered Office Address',
      factoryaddress: 'Factory / Godown Address',
      unitname: 'Unit Name',
      unitaddress: 'Unit Address',
      gstnumber: 'GST Number',
      gstin: 'GSTIN',
      leaseperiod: 'Lease Period',
      incorporationdate: 'Incorporation Date'
    };

    const cleanKey = key.toLowerCase().replace(/[_\-\s]/g, '');
    if (knownLabels[cleanKey]) {
      return knownLabels[cleanKey];
    }

    let formatted = key
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .replace(/[_\-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const acronyms = new Set(['COI', 'RC', 'SS', 'PAN', 'GST', 'GSTIN', 'CIN', 'PIN', 'RCC', 'NOC', 'BL', 'ENA', 'IMFL', 'ID', 'DOB', 'URL', 'PDF', 'GPS']);
    return formatted
      .split(' ')
      .map(word => {
        const upper = word.toUpperCase();
        if (acronyms.has(upper)) return upper;
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  }

  private resolveSection(key: string, value: any, isUpload: boolean): { section: string; icon: string; order: number } | null {
    if (isUpload) {
      return { section: 'Uploaded Documents', icon: 'folder_open', order: 6 };
    }

    const keyLower = key.toLowerCase();

    // 1. Strictly exclude system/fee/payment/status/audit fields
    if (
      keyLower.includes('fee') ||
      keyLower.includes('charge') ||
      keyLower.includes('amount') ||
      keyLower.includes('payment') ||
      keyLower.includes('transaction') ||
      keyLower.includes('tax') ||
      keyLower.includes('cess') ||
      keyLower.includes('duty') ||
      keyLower.includes('challan') ||
      keyLower.includes('receipt') ||
      keyLower.includes('order_id') ||
      keyLower.includes('orderid') ||
      keyLower.includes('gateway') ||
      keyLower.includes('status') ||
      keyLower.includes('stage') ||
      keyLower.includes('workflow') ||
      keyLower.startsWith('is_') ||
      /^is[A-Z]/.test(key)
    ) {
      return null;
    }

    // 2. Application & License Info (Step 1 & 2)
    if (
      keyLower === 'licensetype' || keyLower === 'license_type' ||
      keyLower === 'applicationtype' || keyLower === 'application_type' ||
      keyLower === 'licensecategory' || keyLower === 'license_category' ||
      keyLower === 'licensecategoryname' || keyLower === 'license_category_name' ||
      keyLower === 'licensesubcategory' || keyLower === 'license_sub_category' ||
      keyLower === 'establishmentname' || keyLower === 'establishment_name' ||
      keyLower === 'sitetype' || keyLower === 'site_type' ||
      keyLower === 'pachwai' || keyLower === 'pachwai_flag' || keyLower === 'pachwai_selected' ||
      keyLower === 'draughtbeer' || keyLower === 'draught_beer' ||
      keyLower === 'minibar' || keyLower === 'mini_bar' ||
      keyLower === 'minibarquantity' || keyLower === 'mini_bar_quantity' ||
      keyLower === 'existingsitelicense' || keyLower === 'existing_site_license' ||
      keyLower === 'brandname' || keyLower === 'brand_name' ||
      keyLower === 'spirittype' || keyLower === 'spirit_type' ||
      keyLower === 'bottlingtype' || keyLower === 'bottling_type' ||
      keyLower === 'packagetype' || keyLower === 'package_type' ||
      keyLower === 'strength'
    ) {
      return { section: 'Application & License Info', icon: 'assignment', order: 1 };
    }

    // 3. Member Details (Step 4/5)
    if (key.startsWith('members::') || keyLower.startsWith('member_') || keyLower.startsWith('member')) {
      return { section: 'Member Details', icon: 'groups', order: 4 };
    }

    // 4. Applicant Details (Step 3)
    if (
      keyLower === 'firstname' || keyLower === 'first_name' ||
      keyLower === 'middlename' || keyLower === 'middle_name' ||
      keyLower === 'lastname' || keyLower === 'last_name' ||
      keyLower === 'fatherhusbandname' || keyLower === 'father_husband_name' ||
      keyLower === 'fathername' || keyLower === 'father_name' ||
      keyLower === 'husbandname' || keyLower === 'husband_name' ||
      keyLower === 'dob' || keyLower === 'dateofbirth' || keyLower === 'date_of_birth' ||
      keyLower === 'gender' || keyLower === 'nationality' ||
      keyLower === 'maritalstatus' || keyLower === 'marital_status' ||
      keyLower === 'residentialstatus' || keyLower === 'residential_status' ||
      keyLower === 'applicantmobilenumber' || keyLower === 'applicant_mobile_number' ||
      keyLower === 'mobilenumber' || keyLower === 'mobile_number' ||
      keyLower === 'mobile' || keyLower === 'phone' ||
      keyLower === 'email' || keyLower === 'emailid' || keyLower === 'email_id' ||
      keyLower === 'presentaddress' || keyLower === 'present_address' ||
      keyLower === 'permanentaddress' || keyLower === 'permanent_address' ||
      keyLower === 'pan' || keyLower === 'pannumber' || keyLower === 'pan_number' ||
      keyLower === 'aadhaar' || keyLower === 'aadhaarnumber' || keyLower === 'aadhaar_number' ||
      keyLower === 'coircss' || keyLower === 'coi_rc_ss' ||
      keyLower === 'coircssdocumenttype' || keyLower === 'coi_rc_ss_document_type' ||
      keyLower === 'hassikkimcertificate' || keyLower === 'has_sikkim_certificate' ||
      keyLower === 'sikkimsubject' || keyLower === 'sikkim_subject' ||
      keyLower === 'modeofoperation' || keyLower === 'mode_of_operation' ||
      keyLower === 'hasexciselicense' || keyLower === 'has_excise_license' ||
      keyLower === 'existinglicenseno' || keyLower === 'existing_license_no' ||
      keyLower === 'familyexciselicense' || keyLower === 'family_excise_license' ||
      keyLower === 'familylicenseno' || keyLower === 'family_license_no' ||
      keyLower === 'criminalconviction' || keyLower === 'criminal_conviction' ||
      keyLower === 'criminalcasedetails' || keyLower === 'criminal_case_details' ||
      keyLower === 'educationalqualification' || keyLower === 'educational_qualification' ||
      keyLower === 'occupation' || keyLower === 'profession'
    ) {
      return { section: 'Applicant Details', icon: 'person', order: 2 };
    }

    // 5. Company & Unit Details (Step 4)
    if (
      keyLower === 'companyname' || keyLower === 'company_name' ||
      keyLower === 'companyaddress' || keyLower === 'company_address' ||
      keyLower === 'companygst' || keyLower === 'company_gst' ||
      keyLower === 'companyphonenumber' || keyLower === 'company_phone_number' ||
      keyLower === 'companyemail' || keyLower === 'company_email' ||
      keyLower === 'companypan' || keyLower === 'company_pan' ||
      keyLower === 'companycin' || keyLower === 'company_cin' || keyLower === 'cin' ||
      keyLower === 'natureofbusiness' || keyLower === 'nature_of_business' ||
      keyLower === 'businesstype' || keyLower === 'business_type' ||
      keyLower === 'constitutiontype' || keyLower === 'constitution_type' ||
      keyLower === 'registeredaddress' || keyLower === 'registered_address' ||
      keyLower === 'factoryaddress' || keyLower === 'factory_address' ||
      keyLower === 'unitname' || keyLower === 'unit_name' ||
      keyLower === 'unitaddress' || keyLower === 'unit_address' ||
      keyLower === 'gstnumber' || keyLower === 'gst_number' || keyLower === 'gstin' ||
      keyLower === 'leaseperiod' || keyLower === 'lease_period' ||
      keyLower === 'incorporationdate' || keyLower === 'incorporation_date'
    ) {
      return { section: 'Company & Unit Details', icon: 'apartment', order: 3 };
    }

    // 6. Site Details (Step 5)
    if (
      keyLower === 'sitedistrict' || keyLower === 'site_district' || keyLower === 'district' ||
      keyLower === 'sitesubdivision' || keyLower === 'site_subdivision' || keyLower === 'subdivision' ||
      keyLower === 'policestation' || keyLower === 'police_station' ||
      keyLower === 'locationcategory' || keyLower === 'location_category' ||
      keyLower === 'locationsubcategory' || keyLower === 'location_subcategory' ||
      keyLower === 'block' || keyLower === 'ward' || keyLower === 'revenueblock' || keyLower === 'revenue_block' ||
      keyLower === 'businessaddress' || keyLower === 'business_address' ||
      keyLower === 'siteaddress' || keyLower === 'site_address' ||
      keyLower === 'roadname' || keyLower === 'road_name' || keyLower === 'road' || keyLower === 'street' ||
      keyLower === 'pincode' || keyLower === 'pin_code' || keyLower === 'postalcode' || keyLower === 'postal_code' ||
      keyLower === 'constructiontype' || keyLower === 'construction_type' ||
      keyLower === 'length' || keyLower === 'breadth' ||
      keyLower === 'floorarea' || keyLower === 'floor_area' || keyLower === 'totalarea' || keyLower === 'total_area' || keyLower === 'area' ||
      keyLower === 'siteowned' || keyLower === 'site_owned' ||
      keyLower === 'ownershiptype' || keyLower === 'ownership_type' ||
      keyLower === 'premisesownership' || keyLower === 'premises_ownership' ||
      keyLower === 'nocobtained' || keyLower === 'noc_obtained' ||
      keyLower === 'tradelicensecovered' || keyLower === 'trade_license_covered' ||
      keyLower === 'tradelicenseno' || keyLower === 'trade_license_no' ||
      keyLower === 'boundarynorth' || keyLower === 'boundary_north' ||
      keyLower === 'boundarysouth' || keyLower === 'boundary_south' ||
      keyLower === 'boundaryeast' || keyLower === 'boundary_east' ||
      keyLower === 'boundarywest' || keyLower === 'boundary_west' ||
      keyLower === 'storagecapacity' || keyLower === 'storage_capacity' ||
      keyLower === 'godowncapacity' || keyLower === 'godown_capacity' ||
      keyLower === 'premisestype' || keyLower === 'premises_type' ||
      keyLower === 'nearestschool' || keyLower === 'nearest_school' ||
      keyLower === 'nearesthospital' || keyLower === 'nearest_hospital' ||
      keyLower === 'nearesttemple' || keyLower === 'nearest_temple' ||
      keyLower === 'landdetails' || keyLower === 'land_details' ||
      keyLower === 'dagnumber' || keyLower === 'dag_number' ||
      keyLower === 'khatiyannumber' || keyLower === 'khatiyan_number' ||
      keyLower === 'parchanumber' || keyLower === 'parcha_number' ||
      keyLower === 'latitude' || keyLower === 'longitude'
    ) {
      return { section: 'Site Details', icon: 'location_on', order: 5 };
    }

    // Reject anything not from the user stepper
    return null;
  }

  private stringifyValue(value: any): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'object') {
      for (const key of ['name', 'label', 'district', 'licenseCategory', 'license_category', 'id']) {
        if (value && typeof value[key] !== 'undefined' && value[key] !== null) {
          const v = this.stringifyValue(value[key]);
          if (v) return v;
        }
      }
      return '';
    }
    return String(value);
  }

  hasText(value: unknown): boolean {
    if (value === null || value === undefined) return false;
    return String(value).trim().length > 0;
  }

  isFilePath(value: unknown): boolean {
    if (!this.hasText(value)) return false;
    const valueStr = String(value).toLowerCase();
    return (
      valueStr.includes('/media/') ||
      valueStr.endsWith('.pdf') ||
      valueStr.endsWith('.jpg') ||
      valueStr.endsWith('.jpeg') ||
      valueStr.endsWith('.png') ||
      valueStr.endsWith('.webp') ||
      valueStr.endsWith('.doc') ||
      valueStr.endsWith('.docx')
    );
  }

  getFileUrl(value: unknown): string {
    if (!this.hasText(value)) return '#';
    const valueStr = String(value).trim();

    if (valueStr.startsWith('http://') || valueStr.startsWith('https://')) {
      return valueStr;
    }

    const base = String(environment.apiBaseUrl || '').replace(/\/+$/, '');
    const cleaned = valueStr.replace(/^\/+/, '');
    const alreadyMedia = cleaned.toLowerCase().startsWith('media/');
    const path = `/${alreadyMedia ? cleaned : `media/${cleaned}`}`;
    return `${base}${path}`;
  }

  openPreview(value: unknown): void {
    const url = this.getFileUrl(value);
    if (!url || url === '#') return;

    this.dialog.open(DocumentPreviewDialogComponent, {
      width: 'min(980px, 95vw)',
      maxWidth: '95vw',
      data: { url }
    });
  }

  private buildCandidates(application: any): ObjectionCandidate[] {
    const source = application?.raw && typeof application.raw === 'object' ? application.raw : application;
    if (!source || typeof source !== 'object') return [];

    const excluded = new Set<string>([
      'id', 'pk',
      'workflow', 'workflow_id', 'workflowId',
      'current_stage', 'currentStage',
      'current_stage_id', 'currentStageId',
      'current_stage_name', 'currentStageName',
      'transactions', 'allowedActions', 'allowed_actions', 'allowedActionConfigs', 'allowed_action_configs',
      'objections', 'rejections',
      'created_at', 'updated_at', 'createdAt', 'updatedAt',
      'application_id', 'applicationId', 'applicationID',
      'referenceNo', 'reference_no',
      'applicationYear', 'application_year', 'ApplicationYear',
      'brAmount', 'br_amount', 'BrAmount',
      'applicantFullName', 'applicant_full_name',
      'applicantUsername', 'applicant_username',
      'applicantName', 'applicant_name',
      'license', 'licenseId', 'license_id',
      'licenseIdDisplay', 'license_id_display',
      'licenseCategory', 'license_category',
      'licenseCategoryName', 'license_category_name',
      'licenseCategoryId', 'license_category_id',
      'isPrintFeePaid', 'is_print_fee_paid',
      'printCount', 'print_count',
      'isApproved', 'is_approved',
      'submissionDate', 'submission_date',
      'submittedOn', 'submitted_on',
      'approvedDate', 'approved_date',
      'rejectedDate', 'rejected_date',
      'newLicenseApplication', 'new_license_application',
      'newLicenseApplicationId', 'new_license_application_id',
      'renewalOf', 'renewal_of',
      'renewalOfLicenseId', 'renewal_of_license_id',
      'applicationFeePaymentStatus', 'application_fee_payment_status',
      'applicationFeePaymentStatusDisplay', 'application_fee_payment_status_display',
    ]);

    const rawCandidates: Array<{ field: string; label: string; value: string; section: string; sectionIcon: string; sectionOrder: number; isUpload: boolean }> = [];

    for (const key of Object.keys(source)) {
      if (excluded.has(key)) continue;
      const value = source[key];

      if (Array.isArray(value)) {
        if (key === 'members' || key === 'memberList' || key === 'membersList') {
          value.forEach((m: any, idx: number) => {
            const name = m.name || m.memberName || m.member_name || '';
            const desig = m.designation || m.memberDesignation || m.member_designation || '';
            
            const identParts = [];
            if (name) identParts.push(name);
            if (desig && desig.toLowerCase() !== name.toLowerCase()) {
              identParts.push(`(${desig})`);
            }
            const ident = identParts.length > 0 ? identParts.join(' ') : `Member ${idx + 1}`;

            const fieldsToCheck = [
              { prop: 'name', alias: ['name', 'memberName', 'member_name'], label: 'Name' },
              { prop: 'designation', alias: ['designation', 'memberDesignation', 'member_designation'], label: 'Designation' },
              { prop: 'mobile', alias: ['mobile', 'mobileNumber', 'memberMobileNumber', 'member_mobile_number'], label: 'Mobile' },
              { prop: 'email', alias: ['email', 'emailId', 'memberEmailId', 'member_email_id'], label: 'Email' },
              { prop: 'address', alias: ['address', 'memberAddress', 'member_address'], label: 'Address' }
            ];

            fieldsToCheck.forEach(f => {
              let fieldVal = '';
              for (const a of f.alias) {
                if (m[a] !== undefined && m[a] !== null) {
                  fieldVal = String(m[a]).trim();
                  break;
                }
              }
              if (fieldVal) {
                const fieldKey = `${key}::${idx}::${f.prop}`;
                const label = `Member [${idx + 1}] - ${f.label} (${ident})`;
                const isUpload = this.isFilePath(fieldVal);
                const sectionInfo = this.resolveSection(fieldKey, fieldVal, isUpload);
                if (sectionInfo) {
                  rawCandidates.push({
                    field: fieldKey,
                    label,
                    value: fieldVal,
                    section: sectionInfo.section,
                    sectionIcon: sectionInfo.icon,
                    sectionOrder: sectionInfo.order,
                    isUpload
                  });
                }
              }
            });
          });
        }
        continue;
      }

      const isUpload = this.isFilePath(value);

      if (value && typeof value === 'object') {
        const display = this.stringifyValue(value);
        if (!display) continue;
        const sectionInfo = this.resolveSection(key, display, isUpload);
        if (sectionInfo) {
          rawCandidates.push({
            field: key,
            label: this.formatFieldLabel(key),
            value: display,
            section: sectionInfo.section,
            sectionIcon: sectionInfo.icon,
            sectionOrder: sectionInfo.order,
            isUpload
          });
        }
        continue;
      }

      const display = this.stringifyValue(value);
      if (!display) continue;
      const sectionInfo = this.resolveSection(key, display, isUpload);
      if (sectionInfo) {
        rawCandidates.push({
          field: key,
          label: this.formatFieldLabel(key),
          value: display,
          section: sectionInfo.section,
          sectionIcon: sectionInfo.icon,
          sectionOrder: sectionInfo.order,
          isUpload
        });
      }
    }

    // Sort by section order first, then label alphabetically
    rawCandidates.sort((a, b) => {
      if (a.sectionOrder !== b.sectionOrder) {
        return a.sectionOrder - b.sectionOrder;
      }
      return a.label.localeCompare(b.label);
    });

    // Assign fixed global originalIndex
    return rawCandidates.map((c, index) => ({
      ...c,
      originalIndex: index
    }));
  }

  get canSubmit(): boolean {
    if (this.allCandidates.length === 0) {
      return false;
    }

    let hasValidRow = false;

    for (let idx = 0; idx < this.allCandidates.length; idx++) {
      const row = this.rows.at(idx) as FormGroup;
      const selected = !!row.get('selected')?.value;
      const remarks = String(row.get('remarks')?.value || '').trim();

      // Incomplete: remark entered but checkbox not ticked
      if (!selected && remarks.length > 0) {
        return false;
      }

      // Incomplete: checkbox ticked but no remark
      if (selected && remarks.length === 0) {
        return false;
      }

      if (selected && remarks.length > 0) {
        hasValidRow = true;
      }
    }

    return hasValidRow;
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onSubmit(): void {
    const objections: Array<{ field: string; remarks: string }> = [];

    this.allCandidates.forEach((c) => {
      const row = this.rows.at(c.originalIndex) as FormGroup;
      const selected = !!row.get('selected')?.value;
      const remarks = String(row.get('remarks')?.value || '').trim();
      if (!selected || !remarks) return;
      objections.push({ field: c.field, remarks });
    });

    if (objections.length === 0) return;

    this.dialogRef.close({ objections });
  }
}
