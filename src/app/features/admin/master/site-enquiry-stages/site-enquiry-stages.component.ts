import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../shared/material.module';
import { District } from '../../../../core/models/district.model';
import { MasterService } from '../../../../core/services/master.service';
import { AdminService } from '../../admin.service';

@Component({
  selector: 'app-site-enquiry-stages',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MaterialModule,
    MatSlideToggleModule,
    MatTooltipModule,
    MatChipsModule
  ],
  templateUrl: './site-enquiry-stages.component.html',
  styleUrl: './site-enquiry-stages.component.scss'
})
export class SiteEnquiryStagesComponent implements OnInit {
  displayedColumns: string[] = [
    'slNo',
    'district',
    'districtCode',
    'siteEnquiryOfficers',
    'multipleSiteEnquiry',
    'status'
  ];
  districtDataSource: District[] = [];
  isLoading = false;
  updatingDistrictId: number | null = null;
  searchTerm = '';

  constructor(
    private masterService: MasterService,
    private adminService: AdminService
  ) {}

  ngOnInit(): void {
    this.loadDistricts();
  }

  loadDistricts(): void {
    this.isLoading = true;
    this.adminService.getSiteEnquiryStages().subscribe({
      next: (data: any[]) => {
        this.isLoading = false;
        const list = Array.isArray(data) ? data : [];
        this.districtDataSource = list.map((item: any) => {
          const officers = item.officers || item.site_enquiry_officers || [];
          const count = item.officers_count ?? item.site_enquiry_officers_count ?? officers.length;
          const distName = item.district_name || item.districtName || (typeof item.district === 'string' ? item.district : '');
          const distCode = item.district_code ?? item.districtCode ?? 0;
          const distId = typeof item.district_id === 'number' ? item.district_id : (typeof item.district === 'number' ? item.district : item.id);
          const isMultiple = !!(item.multiple_site_enquiry ?? item.multipleSiteEnquiry);

          return {
            id: distId,
            config_id: item.id,
            district: distName,
            district_name: distName,
            districtName: distName,
            districtCode: distCode,
            district_code: distCode,
            multiple_site_enquiry: isMultiple,
            multipleSiteEnquiry: isMultiple,
            site_enquiry_officers_count: count,
            siteEnquiryOfficersCount: count,
            officers_count: count,
            site_enquiry_officers: officers,
            siteEnquiryOfficers: officers,
            officers: officers,
            isActive: item.is_active ?? true,
            stateCode: 11,
            state: 'Sikkim'
          } as District;
        }).sort(
          (a, b) => (a.districtCode ?? 0) - (b.districtCode ?? 0)
        );
      },
      error: () => {
        // Fallback to getDistricts if stages endpoint fails
        this.masterService.getDistricts().subscribe({
          next: (data: any[]) => {
            this.isLoading = false;
            const list = Array.isArray(data) ? data : [];
            this.districtDataSource = list.map((item: any) => {
              const officers = item.site_enquiry_officers || item.officers || [];
              const count = item.site_enquiry_officers_count ?? item.officers_count ?? officers.length;
              const distName = item.district || item.district_name || '';
              const distCode = item.district_code ?? item.districtCode ?? 0;
              const isMultiple = !!(item.multiple_site_enquiry ?? item.multipleSiteEnquiry);

              return {
                id: item.id,
                district: distName,
                district_name: distName,
                districtName: distName,
                districtCode: distCode,
                district_code: distCode,
                multiple_site_enquiry: isMultiple,
                multipleSiteEnquiry: isMultiple,
                site_enquiry_officers_count: count,
                siteEnquiryOfficersCount: count,
                officers_count: count,
                site_enquiry_officers: officers,
                siteEnquiryOfficers: officers,
                officers: officers,
                isActive: item.is_active ?? true,
                stateCode: item.state_code ?? 11,
                state: item.state ?? 'Sikkim'
              } as District;
            }).sort(
              (a, b) => (a.districtCode ?? 0) - (b.districtCode ?? 0)
            );
          },
          error: () => {
            this.isLoading = false;
            Swal.fire('Error', 'Failed to load districts and site enquiry configurations.', 'error');
          }
        });
      }
    });
  }

  get filteredDistricts(): District[] {
    if (!this.searchTerm.trim()) {
      return this.districtDataSource;
    }
    const term = this.searchTerm.toLowerCase().trim();
    return this.districtDataSource.filter(
      d =>
        d.district?.toLowerCase().includes(term) ||
        (d as any).district_name?.toLowerCase().includes(term) ||
        String(d.districtCode || (d as any).district_code || '').includes(term)
    );
  }

  toggleMultipleSiteEnquiry(district: District, event: any): void {
    if (!district || district.id === undefined) return;

    const newValue = !!event.checked;
    const previousValue = !newValue;
    const districtName = district.district || (district as any).district_name || 'District';

    Swal.fire({
      title: newValue ? 'Enable Multiple Site Enquiry?' : 'Disable Multiple Site Enquiry?',
      text: newValue
        ? `District Users for ${districtName} will be required to choose a specific Site Enquiry Officer when approving new license applications.`
        : `New license applications for ${districtName} will be forwarded directly to the next available Site Enquiry Officer without prompt.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: newValue ? 'Yes, Enable' : 'Yes, Disable',
      cancelButtonText: 'Cancel',
      confirmButtonColor: newValue ? '#10b981' : '#f59e0b'
    }).then(result => {
      if (result.isConfirmed) {
        this.updatingDistrictId = district.id as number;
        this.adminService
          .updateSiteEnquiryStage(district.id as number, {
            multiple_site_enquiry: newValue
          })
          .subscribe({
            next: () => {
              this.updatingDistrictId = null;
              district.multiple_site_enquiry = newValue;
              district.multipleSiteEnquiry = newValue;
              Swal.fire({
                title: 'Success!',
                text: `Multiple Site Enquiry for ${districtName} has been ${newValue ? 'enabled' : 'disabled'}.`,
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
              });
            },
            error: (err: any) => {
              this.updatingDistrictId = null;
              // Revert toggle switch on error
              district.multiple_site_enquiry = previousValue;
              district.multipleSiteEnquiry = previousValue;
              event.source.checked = previousValue;
              const detail = err?.error?.detail || err?.error?.message || 'Failed to update district setting.';
              Swal.fire('Error', detail, 'error');
            }
          });
      } else {
        // User cancelled dialog, revert visual state
        district.multiple_site_enquiry = previousValue;
        district.multipleSiteEnquiry = previousValue;
        event.source.checked = previousValue;
      }
    });
  }
}
