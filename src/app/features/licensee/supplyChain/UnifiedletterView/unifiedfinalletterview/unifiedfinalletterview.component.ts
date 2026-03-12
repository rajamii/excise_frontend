import { Component, Inject, PLATFORM_ID, OnInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { SupplyChainService } from '../../services/supplychain.service';
import { environment } from '../../../../../../environments/environment';

interface CancellationFinalLetterData {
  id: string;
  letterNumber: string;
  letterDate: Date;
  referenceNo: string;
  referenceDate: Date;
  distilleryName: string;
  distilleryAddress: string;
  exciseOfficerName: string;
  permitNumbers: string[];
  originalPermitDate: Date;
  cancellationReason: string;
  approvedBy: string;
  approvedDate: Date;
  fileNumber: string;
  commissionerName: string;
  commissionerDesignation: string;
  commissionerLocation: string;
  sealImagePath: string;
  signatureImagePath: string;
  status: string;
}

@Component({
  selector: 'app-unifiedfinalletterview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './unifiedfinalletterview.component.html',
  styleUrl: './unifiedfinalletterview.component.scss'
})
export class UnifiedfinalletterviewComponent implements OnInit {
  cancellationLetterData?: CancellationFinalLetterData;
  private isBrowser = false;
  isLoading = false;
  errorMessage = '';
  letterType: 'cancellation' | 'revalidation' = 'cancellation'; // Default to cancellation

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private supplyChainService: SupplyChainService,
    private http: HttpClient,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      // Detect letter type from URL path
      const urlPath = this.router.url;
      if (urlPath.includes('/revalidation')) {
        this.letterType = 'revalidation';
        console.log('📝 Letter type detected: REVALIDATION');
      } else if (urlPath.includes('/cancellation')) {
        this.letterType = 'cancellation';
        console.log('📝 Letter type detected: CANCELLATION');
      }
      
      // Get cancellation ID from route parameters
      let cancellationId = this.route.snapshot.paramMap.get('id');
      if (!cancellationId) {
        cancellationId = this.route.snapshot.queryParamMap.get('id');
      }
      
      // Get additional parameters
      const approvedFlag = this.route.snapshot.queryParamMap.get('approved');
      const passedStatus = this.route.snapshot.queryParamMap.get('status');
      const source = this.route.snapshot.queryParamMap.get('source');
      
      console.log('Final letter view parameters:', {
        id: cancellationId,
        approved: approvedFlag,
        status: passedStatus,
        source: source,
        letterType: this.letterType
      });
      
      if (cancellationId) {
        // If explicitly marked as approved, skip API validation and load sample data
        if (approvedFlag === 'true' && source === 'commissioner-dashboard') {
          console.log('Loading final letter for just-approved application');
          this.loadSampleFinalLetterData(cancellationId);
        } else {
          // Load data based on letter type
          if (this.letterType === 'revalidation') {
            this.loadRevalidationFinalLetterData(cancellationId);
          } else {
            this.loadCancellationFinalLetterData(cancellationId);
          }
        }
      } else {
        this.errorMessage = `${this.letterType === 'revalidation' ? 'Revalidation' : 'Cancellation'} ID not provided`;
      }
    }
  }

  private loadCancellationFinalLetterData(cancellationId: string): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    console.log('Loading cancellation final letter data for ID:', cancellationId);
    
    // Get cancellation data from API
    this.supplyChainService.getCancellations().subscribe({
      next: (data) => {
        console.log('Cancellation data received:', data);
        
        // Find the specific cancellation by ID
        const foundItem = data.find(item => 
          item.id?.toString() === cancellationId ||
          item.pk?.toString() === cancellationId
        );
        
        if (foundItem) {
          console.log('Found cancellation item:', foundItem);
          
          // Validate that the cancellation is approved
          const status = foundItem.status?.toUpperCase();
          console.log('Checking status for final letter generation:', status);
          
          // More flexible status checking - allow various approved statuses
          const isApproved = status?.includes('APPROVED') || 
                           status === 'APPROVEDCANCELLATIONBYCOMMISSIONER' ||
                           status === 'APPROVED' ||
                           // Also allow if we're coming from commissioner dashboard (they just approved it)
                           this.route.snapshot.queryParamMap.get('source') === 'commissioner-dashboard';
          
          if (!isApproved) {
            console.warn('Status validation failed:', {
              status: foundItem.status,
              statusUpper: status,
              source: this.route.snapshot.queryParamMap.get('source')
            });
            
            // If coming from commissioner dashboard, assume it was just approved
            if (this.route.snapshot.queryParamMap.get('source') === 'commissioner-dashboard') {
              console.log('Allowing final letter generation from commissioner dashboard');
              foundItem.status = 'ApprovedCancellationByCommissioner'; // Update status locally
            } else {
              this.errorMessage = `Cannot generate final letter: Cancellation status is "${foundItem.status}". Only approved cancellations can generate final letters.`;
              this.isLoading = false;
              return;
            }
          }
          
          this.mapApiDataToFinalLetter(foundItem);
          this.isLoading = false;
        } else {
          console.warn('Cancellation not found for ID:', cancellationId);
          
          // If coming from commissioner dashboard, load sample data (they just approved it)
          const source = this.route.snapshot.queryParamMap.get('source');
          if (source === 'commissioner-dashboard') {
            console.log('Loading sample data for commissioner dashboard');
            this.loadSampleFinalLetterData(cancellationId);
          } else {
            this.errorMessage = `Cancellation not found for ID: ${cancellationId}`;
            this.isLoading = false;
            
            // Fallback to sample data for development
            this.loadSampleFinalLetterData(cancellationId);
          }
        }
      },
      error: (error) => {
        console.error('Error loading cancellation data:', error);
        
        // If coming from commissioner dashboard, load sample data (they just approved it)
        const source = this.route.snapshot.queryParamMap.get('source');
        if (source === 'commissioner-dashboard') {
          console.log('API error but loading sample data for commissioner dashboard');
          this.loadSampleFinalLetterData(cancellationId);
        } else {
          this.errorMessage = 'Failed to load cancellation data. Please try again.';
          this.isLoading = false;
          
          // Fallback to sample data for development
          this.loadSampleFinalLetterData(cancellationId);
        }
      }
    });
  }

  private loadRevalidationFinalLetterData(revalidationId: string): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    console.log('Loading revalidation final letter data for ID:', revalidationId);
    
    // Get revalidation data from API
    this.supplyChainService.getRevalidationData().subscribe({
      next: (data) => {
        console.log('Revalidation data received:', data);
        
        // Find the specific revalidation by ID
        const foundItem = data.find(item => 
          item.id?.toString() === revalidationId ||
          item.pk?.toString() === revalidationId
        );
        
        if (foundItem) {
          console.log('Found revalidation item:', foundItem);
          
          // Validate that the revalidation is approved
          const status = foundItem.status?.toUpperCase();
          console.log('Checking status for final letter generation:', status);
          
          // More flexible status checking - allow various approved statuses
          const isApproved = status?.includes('APPROVED') || 
                           status === 'APPROVEDREVALIDATIONBYCOMMISSIONER' ||
                           status === 'APPROVED' ||
                           // Also allow if we're coming from commissioner dashboard (they just approved it)
                           this.route.snapshot.queryParamMap.get('source') === 'commissioner-dashboard';
          
          if (!isApproved) {
            console.warn('Status validation failed:', {
              status: foundItem.status,
              statusUpper: status,
              source: this.route.snapshot.queryParamMap.get('source')
            });
            
            // If coming from commissioner dashboard, assume it was just approved
            if (this.route.snapshot.queryParamMap.get('source') === 'commissioner-dashboard') {
              console.log('Allowing final letter generation from commissioner dashboard');
              foundItem.status = 'ApprovedRevalidationByCommissioner'; // Update status locally
            } else {
              this.errorMessage = `Cannot generate final letter: Revalidation status is "${foundItem.status}". Only approved revalidations can generate final letters.`;
              this.isLoading = false;
              return;
            }
          }
          
          const resolvedRefNo = String(
            this.route.snapshot.queryParamMap.get('refNo') ||
            foundItem.ourRefNo ||
            foundItem.our_ref_no ||
            foundItem.referenceNo ||
            foundItem.ref_no ||
            ''
          ).trim();

          if (this.resolvePermitNumbers(foundItem).length > 0 || !resolvedRefNo) {
            this.mapApiDataToFinalLetter(foundItem);
            this.isLoading = false;
            return;
          }

          this.fetchPermitNumbersFromRequisition(resolvedRefNo).subscribe({
            next: (permitNumbers) => {
              if (permitNumbers.length > 0) {
                foundItem.details_permits_number = permitNumbers.join(',');
              }
              this.mapApiDataToFinalLetter(foundItem);
              this.isLoading = false;
            },
            error: () => {
              this.mapApiDataToFinalLetter(foundItem);
              this.isLoading = false;
            }
          });
        } else {
          console.warn('Revalidation not found for ID:', revalidationId);
          
          // If coming from commissioner dashboard, load sample data (they just approved it)
          const source = this.route.snapshot.queryParamMap.get('source');
          if (source === 'commissioner-dashboard') {
            console.log('Loading sample data for commissioner dashboard');
            this.loadSampleFinalLetterData(revalidationId);
          } else {
            this.errorMessage = `Revalidation not found for ID: ${revalidationId}`;
            this.isLoading = false;
            
            // Fallback to sample data for development
            this.loadSampleFinalLetterData(revalidationId);
          }
        }
      },
      error: (error) => {
        console.error('Error loading revalidation data:', error);
        
        // If coming from commissioner dashboard, load sample data (they just approved it)
        const source = this.route.snapshot.queryParamMap.get('source');
        if (source === 'commissioner-dashboard') {
          console.log('API error but loading sample data for commissioner dashboard');
          this.loadSampleFinalLetterData(revalidationId);
        } else {
          this.errorMessage = 'Failed to load revalidation data. Please try again.';
          this.isLoading = false;
          
          // Fallback to sample data for development
          this.loadSampleFinalLetterData(revalidationId);
        }
      }
    });
  }

  private mapApiDataToFinalLetter(apiData: any): void {
    // Generate letter number
    const letterNumber = this.generateLetterNumber();
    
    // Get URL parameters for additional context
    const passedRefNo = this.route.snapshot.queryParamMap.get('refNo');
    const passedDistillery = this.route.snapshot.queryParamMap.get('distillery');
    
    // Use establishment_name from API if available, otherwise fall back to distillery_name or URL params
    const establishmentName = apiData.establishment_name || 
                             apiData.establishmentName ||
                             apiData.distilleryName || 
                             apiData.distillery_name || 
                             apiData.branchName || 
                             apiData.branch_name ||
                             (passedDistillery ? decodeURIComponent(passedDistillery) : 'M/s Mount Distilleries Ltd');
    
    const referenceNo = passedRefNo ? decodeURIComponent(passedRefNo) : 
                       (apiData.ourRefNo || apiData.our_ref_no || 'CAN/001/2025');
    
    const permitNumbers = this.resolvePermitNumbers(apiData);
    const originalPermitDate = this.resolveOriginalPermitDate(apiData);
    const revalidatedUpToDate = this.resolveRevalidationValidUpToDate(apiData, originalPermitDate);
    
    console.log('📋 Mapping API data to final letter:', {
      establishment_name: apiData.establishment_name,
      distillery_name: apiData.distillery_name,
      branch_name: apiData.branch_name,
      details_permits_number: apiData.details_permits_number,
      resolved_establishment: establishmentName,
      resolved_permits: permitNumbers
    });
    
    this.cancellationLetterData = {
      id: apiData.id || apiData.pk || '',
      letterNumber: letterNumber,
      letterDate: new Date(),
      referenceNo: referenceNo,
      referenceDate: new Date(apiData.cancellationDate || apiData.cancellation_date || apiData.revalidationDate || apiData.revalidation_date || apiData.requisitionDate || apiData.requisition_date || Date.now()),
      distilleryName: establishmentName,
      distilleryAddress: this.generateDistilleryAddress(establishmentName),
      exciseOfficerName: 'The Excise Officer-in-Charge',
      permitNumbers: permitNumbers,
      originalPermitDate: originalPermitDate,
      cancellationReason: apiData.reasonForCancellation || apiData.reason_for_cancellation || 'As per your request',
      approvedBy: '',
      approvedDate: revalidatedUpToDate,
      fileNumber: '',
      commissionerName: '',
      commissionerDesignation: '',
      commissionerLocation: '',
      sealImagePath: 'assets/images/header/excise_seal.png',
      signatureImagePath: 'assets/images/signatures/commissioner_signature.png',
      status: apiData.status || (this.letterType === 'revalidation' ? 'ApprovedRevalidationByCommissioner' : 'ApprovedCancellationByCommissioner')
    };
  }

  private parsePermitNumbersFromDetails(detailsPermits: string): string[] {
    console.log('🔍 parsePermitNumbersFromDetails called with:', detailsPermits, 'Type:', typeof detailsPermits);
    
    if (!detailsPermits) {
      console.log('⚠️ detailsPermits is empty');
      return []; // Return empty array instead of generating dynamic numbers
    }
    
    // Parse comma-separated permit numbers like "1,2,3,4" or "5,6,7,8,9,10,11"
    // Keep them exactly as stored in the database (no padding)
    const permits = detailsPermits.split(',').map(num => num.trim()).filter(num => num.length > 0);
    
    console.log('✅ Parsed permits:', permits);
    return permits;
  }

  private resolvePermitNumbers(apiData: any): string[] {
    const cancellationPermitSources = [
      apiData?.cancelledPermitNumbers,
      apiData?.cancelled_permit_numbers,
      apiData?.cancelledPermitNumber,
      apiData?.cancelled_permit_number
    ];

    const generalPermitSources = [
      apiData?.details_permits_number,
      apiData?.detailsPermitsNumber,
      apiData?.permit_numbers,
      apiData?.permitNumbers,
      apiData?.requisition?.details_permits_number,
      apiData?.requisition?.detailsPermitsNumber,
      apiData?.requisition?.permit_numbers,
      apiData?.requisition?.permitNumbers
    ];

    const permitSources = this.letterType === 'cancellation'
      ? [...cancellationPermitSources, ...generalPermitSources]
      : generalPermitSources;

    for (const source of permitSources) {
      const parsed = this.parsePermitNumbersFromDetails(String(source || ''));
      if (parsed.length > 0) {
        console.log('✅ Using permit numbers from dynamic source:', source, '→', parsed);
        return parsed;
      }
    }

    if (this.letterType === 'cancellation') {
      console.log('❌ No cancelled permit number data found in cancellation payload');
      return [];
    }

    const permitCount = Number(
      apiData?.requisiton_number_of_permits ??
      apiData?.requisition_number_of_permits ??
      apiData?.number_of_permits ??
      apiData?.numberOfPermits ??
      apiData?.requisition?.requisiton_number_of_permits ??
      apiData?.requisition?.requisition_number_of_permits ??
      apiData?.requisition?.number_of_permits ??
      apiData?.requisition?.numberOfPermits ??
      0
    );

    if (permitCount > 0) {
      const generated = Array.from({ length: permitCount }, (_, index) => String(index + 1));
      console.log('⚠️ Permit numbers missing, generated from permit count:', permitCount, '→', generated);
      return generated;
    }

    console.log('❌ No permit number data found in revalidation/requisition payload');
    return [];
  }

  private fetchPermitNumbersFromRequisition(referenceNo: string) {
    const url = `${environment.apiBaseUrl}/transactional/supply_chain/ena-requisitions/`;
    return this.http.get<any>(url, {
      params: { our_ref_no: referenceNo }
    }).pipe(
      map((response: any) => {
        const rows = Array.isArray(response)
          ? response
          : (Array.isArray(response?.results) ? response.results : []);
        const matched = rows.find((row: any) => {
          const ref = String(
            row?.our_ref_no ||
            row?.ourRefNo ||
            row?.referenceNo ||
            row?.ref_no ||
            ''
          ).trim().toUpperCase();
          return ref === String(referenceNo || '').trim().toUpperCase();
        }) || rows[0];

        if (!matched) {
          return [];
        }

        return this.resolvePermitNumbers(matched);
      }),
      catchError((error) => {
        console.error('Error fetching requisition permit numbers:', error);
        return of([]);
      })
    );
  }

  private resolveOriginalPermitDate(apiData: any): Date {
    return new Date(
      apiData?.requisitionDate ||
      apiData?.requisition_date ||
      apiData?.approvalDate ||
      apiData?.approval_date ||
      apiData?.revalidationDate ||
      apiData?.revalidation_date ||
      Date.now()
    );
  }

  private resolveRevalidationValidUpToDate(apiData: any, baseDate: Date): Date {
    const explicitDate = new Date(
      apiData?.expiryDate ||
      apiData?.expiry_date ||
      apiData?.validTo ||
      apiData?.valid_to ||
      apiData?.validityDate ||
      apiData?.validity_date ||
      ''
    );

    if (!Number.isNaN(explicitDate.getTime())) {
      return explicitDate;
    }

    const validUpTo = new Date(baseDate);
    validUpTo.setDate(validUpTo.getDate() + 45);
    return validUpTo;
  }

  private loadSampleFinalLetterData(cancellationId: string): void {
    console.log('Loading sample final letter data for:', cancellationId);
    
    const letterNumber = this.generateLetterNumber();
    
    // Get current date for realistic data
    const currentDate = new Date();
    const referenceDate = new Date();
    referenceDate.setDate(currentDate.getDate() - 7); // 7 days ago
    
    const originalPermitDate = new Date();
    originalPermitDate.setMonth(currentDate.getMonth() - 3); // 3 months ago
    
    // Get passed parameters for more realistic data
    const passedRefNo = this.route.snapshot.queryParamMap.get('refNo') || 'CAN/001/2025';
    const passedDistillery = this.route.snapshot.queryParamMap.get('distillery') || 'M/s Sikkim Distilleries Ltd';
    const passedStatus = this.route.snapshot.queryParamMap.get('status') || 'ApprovedCancellationByCommissioner';
    const passedReason = this.route.snapshot.queryParamMap.get('reason') || 'As per your request for business closure';
    const passedLicenseType = this.route.snapshot.queryParamMap.get('licenseType') || 'Import Permit';
    
    // Extract permit numbers from reference number or use dynamic generation
    const permitNumbers = this.extractPermitNumbersFromReference(passedRefNo);
    
    // Decode URL-encoded parameters
    const decodedDistillery = decodeURIComponent(passedDistillery);
    const decodedRefNo = decodeURIComponent(passedRefNo);
    const decodedReason = decodeURIComponent(passedReason);
    
    this.cancellationLetterData = {
      id: cancellationId,
      letterNumber: letterNumber,
      letterDate: currentDate,
      referenceNo: decodedRefNo,
      referenceDate: referenceDate,
      distilleryName: decodedDistillery,
      distilleryAddress: this.generateDistilleryAddress(decodedDistillery),
      exciseOfficerName: 'The Excise Officer-in-Charge',
      permitNumbers: permitNumbers,
      originalPermitDate: originalPermitDate,
      cancellationReason: decodedReason,
      approvedBy: '',
      approvedDate: currentDate,
      fileNumber: '',
      commissionerName: '',
      commissionerDesignation: '',
      commissionerLocation: '',
      sealImagePath: 'assets/images/header/excise_seal.png',
      signatureImagePath: 'assets/images/signatures/commissioner_signature.png',
      status: passedStatus
    };
    
    this.isLoading = false;
    this.errorMessage = '';
    console.log('Sample final letter data loaded successfully:', this.cancellationLetterData);
  }

  private parsePermitNumbers(permitNumberString: string): string[] {
    if (!permitNumberString) {
      // Generate dynamic permit numbers based on current data
      return this.generateDynamicPermitNumbers();
    }
    
    // Handle comma-separated permit numbers
    return permitNumberString.split(',').map(num => num.trim()).filter(num => num.length > 0);
  }

  private extractPermitNumbersFromReference(refNo: string): string[] {
    // Extract permit numbers from reference number like "IBPS/01/EXCISE"
    if (refNo && refNo.includes('/')) {
      const parts = refNo.split('/');
      if (parts.length >= 2) {
        const baseNumber = parts[1] || '01';
        const num1 = parseInt(baseNumber, 10);
        const num2 = num1 + 1;
        // Return without padding - just the numbers as they are
        return [num1.toString(), num2.toString()];
      }
    }
    
    // Fallback to dynamic generation
    return this.generateDynamicPermitNumbers();
  }

  private generateDynamicPermitNumbers(): string[] {
    // Generate permit numbers based on current date/time for uniqueness
    const now = new Date();
    const base = now.getDate() * 10 + now.getHours();
    return [
      (base + 600).toString(),
      (base + 601).toString()
    ];
  }

  private generateDistilleryAddress(distilleryName: string): string {
    // Generate appropriate address based on distillery name
    if (distilleryName.toLowerCase().includes('bcl')) {
      return 'Majhitar, East Sikkim - 737132';
    } else if (distilleryName.toLowerCase().includes('sikkim')) {
      return 'Gangtok, Sikkim - 737101';
    } else if (distilleryName.toLowerCase().includes('darjeeling')) {
      return 'Darjeeling, West Bengal - 734101';
    } else {
      return 'Majhitar, East Sikkim - 737132';
    }
  }

  private generateLetterNumber(): string {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    return `${random}/Excise`;
  }

  private generateFileNumber(): string {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    return `GOS/${random}/Ex/HQ ${year}-25`;
  }

  goBack(): void {
    // Check source parameter for navigation
    const source = this.route.snapshot.queryParamMap.get('source');
    
    if (source === 'commissioner') {
      // Navigate to commissioner dashboard with appropriate section
      const section = this.letterType === 'revalidation' ? 'revalidation' : 'cancellation';
      this.router.navigate(['/dashboard'], { queryParams: { section } });
    } else if (source === 'licensee') {
      // Navigate to licensee dashboard with appropriate section
      const section = this.letterType === 'revalidation' ? 'revalidation' : 'cancellation';
      this.router.navigate(['/dashboard'], { queryParams: { section } });
    } else if (source === 'permit-section') {
      this.router.navigate(['/app-permit-section']);
    } else {
      // Default: go back to dashboard
      this.router.navigate(['/dashboard']);
    }
  }

  getBackButtonText(): string {
    const source = this.route.snapshot.queryParamMap.get('source');
    
    if (source === 'commissioner') {
      return 'Back to Comm. Dashboard';
    } else if (source === 'licensee') {
      return 'Back to Dashboard';
    } else if (source === 'permit-section') {
      return 'Back to Permit Section';
    } else {
      return 'Back to Dashboard';
    }
  }

  printFinalLetter(): void {
    if (!this.isBrowser) {
      console.warn('Print functionality not available in server-side rendering');
      return;
    }

    const printSection = document.getElementById('cancellationFinalLetterPrintSection');
    if (!printSection) {
      console.error('Print section not found');
      alert('Print section not found. Please try again.');
      return;
    }

    // Clone the print section to modify image paths
    const clonedSection = printSection.cloneNode(true) as HTMLElement;
    
    // Get the base URL for absolute paths
    const baseUrl = window.location.origin;
    
    // Update all image src attributes to use absolute URLs
    const images = clonedSection.querySelectorAll('img');
    images.forEach(img => {
      const src = img.getAttribute('src');
      if (src && !src.startsWith('http')) {
        img.setAttribute('src', `${baseUrl}/${src}`);
      }
    });

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      alert('Please allow popups to print');
      return;
    }

    const letterNumber = this.cancellationLetterData?.letterNumber || 'Unknown';
    const letterTitle = this.letterType === 'revalidation' ? 'Revalidation Final Letter' : 'Cancellation Final Letter';

    const styles = `
      <style>
        @page {
          size: A4 portrait;
          margin: 4mm;
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: 'Times New Roman', serif;
          font-size: 13px;
          line-height: 1.45;
          color: #000;
          background: #fff;
        }
        .letter-container {
          display: flex;
          justify-content: center;
          align-items: flex-start;
          background: #fff;
        }
        .final-letter-container {
          width: 198mm;
          height: auto;
          min-height: 0;
          margin: 0 auto;
          padding: 9mm 11mm;
          position: relative;
          overflow: hidden;
          border: 1.5px solid #555;
          background: #fff;
          page-break-inside: avoid;
        }
        .print-watermark {
          position: absolute;
          inset: 3mm;
          display: grid !important;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          grid-auto-rows: minmax(6px, 1fr);
          align-items: center;
          justify-items: center;
          column-gap: 0.25mm;
          row-gap: 0.25mm;
          pointer-events: none;
          user-select: none;
          z-index: 0;
          overflow: hidden;
        }
        .print-watermark span {
          display: block !important;
          width: 100%;
          text-align: center;
          font-family: Arial, sans-serif;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0;
          line-height: 1;
          white-space: nowrap;
          color: rgba(22, 88, 58, 0.11);
        }
        .letter-header,
        .letter-meta,
        .addressee-section,
        .subject-section,
        .letter-body {
          position: relative;
          z-index: 1;
        }
        .letter-header {
          text-align: center;
          margin-bottom: 14px;
          padding-bottom: 10px;
          border-bottom: 3px double #000;
        }
        .seal-container {
          margin-bottom: 10px;
        }
        .govt-seal {
          height: 52px;
          width: auto;
          filter: invert(1) brightness(0.2);
          display: block;
          margin: 0 auto;
        }
        .dept-title {
          font-size: 15px;
          font-weight: bold;
          margin: 5px 0 4px 0;
          letter-spacing: 1px;
        }
        .dept-subtitle {
          font-size: 13px;
          font-weight: bold;
          margin: 4px 0;
        }
        .dept-address {
          font-size: 10px;
          margin: 4px 0;
        }
        .dept-contact {
          font-size: 9px;
          margin-top: 4px;
        }
        .dept-contact div {
          display: inline;
          margin: 0 5px;
        }
        .letter-meta {
          display: flex;
          justify-content: space-between;
          margin: 14px 0;
          font-size: 12px;
        }
        .letter-number, .letter-date {
          font-weight: bold;
        }
        .addressee-section {
          margin: 14px 0;
        }
        .to-line {
          margin-bottom: 8px;
          font-weight: bold;
        }
        .addressee-details {
          margin-left: 20px;
          line-height: 1.55;
        }
        .addressee-name, .company-name {
          font-weight: bold;
        }
        .addressee-name, .company-name, .company-address {
          font-size: 12px;
          margin: 4px 0;
        }
        .subject-section {
          margin: 14px 0;
        }
        .subject-line {
          font-weight: bold;
          text-decoration: underline;
          font-size: 12px;
          line-height: 1.5;
        }
        .letter-body {
          margin: 14px 0 0 0;
          text-align: justify;
          line-height: 1.55;
        }
        .body-text {
          font-size: 12px;
          text-indent: 28px;
        }
        .no-print {
          display: none !important;
        }
      </style>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${letterTitle} - ${letterNumber}</title>
          <meta charset="utf-8">
          ${styles}
        </head>
        <body>
          ${clonedSection.outerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, 500);
  }

  downloadFinalLetter(): void {
    // This would integrate with a PDF generation service
    alert('PDF download functionality will be implemented with backend integration.');
  }

  getFormattedPermitNumbers(): string {
    if (!this.cancellationLetterData?.permitNumbers || this.cancellationLetterData.permitNumbers.length === 0) {
      return '[No permit data available]';
    }
    
    const permits = this.cancellationLetterData.permitNumbers;
    if (permits.length === 1) {
      return `${permits[0]}/Excise`;
    } else if (permits.length === 2) {
      return `${permits[0]} & ${permits[1]}/Excise`;
    } else {
      return `${permits.slice(0, -1).join(', ')} & ${permits[permits.length - 1]}/Excise`;
    }
  }
}
