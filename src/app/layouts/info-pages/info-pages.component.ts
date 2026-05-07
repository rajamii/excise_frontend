import { Component, OnInit, OnChanges } from '@angular/core';
import { MaterialModule } from '../../shared/material.module';
import { ActivatedRoute } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import { InfoPagesService } from '../../core/services/info-pages.service';
import {
  DirectorateAndDistrictOfficials,
  GrievanceRedressalOfficer,
  NodalOfficer,
  PublicInformationOfficer
} from '../../core/models/contact-us.model';
import {
  ExciseSecretary,
  HeadOfOrganisation
} from '../../core/models/about-us.model';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface Commissioner {
  name: string;
  designation: string;
  email: string;
}

const COMMISSIONER_DATA: ExciseSecretary[] = [
  { name: 'Shri T. P. Sharma', designation: 'Excise Secretary', email: '-' },
  { name: 'Shri P. K. Pradhan, IAS', designation: 'Excise Secretary', email: '-' },
  { name: 'Shri R. B. Mukhia, IAS', designation: 'Excise Secretary', email: '-' },
  { name: 'Shri C. D. Rai, IAS', designation: 'Excise Secretary', email: '-' },
  { name: 'Shri R. Narayan, IAS', designation: 'Excise Secretary', email: '-' },
];

@Component({
  selector: 'app-info-pages',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './info-pages.component.html',
  styleUrl: './info-pages.component.scss'
})
export class InfoPagesComponent implements OnInit {
  contactsTab = 0;
  pioTab: number = 0;
  page: string | null = '';

  selectedOfficeLevel: string = '';
  selectedOfficeSubLevel: string = '';
  
  markdownContent: string = '';

  commissionerColumns: string[] = ['name', 'designation', 'email'];
  commissionerData = COMMISSIONER_DATA;

  nodalOfficer: NodalOfficer[] = [];

  directorateAndDistrictOfficialsColumns: string[] = ['name', 'designation', 'phoneNumber', 'email'];
  directorateAndDistrictOfficialsData = new MatTableDataSource<DirectorateAndDistrictOfficials>();

  grievanceRedressalOfficerColumns: string[] = [
    'officeLevel', 'officeSubLevel', 'name', 'designation', 'phoneNumber', 'email'
  ];
  grievanceRedressalOfficerFullData: GrievanceRedressalOfficer[] = [];
  grievanceRedressalOfficerData = new MatTableDataSource<GrievanceRedressalOfficer>();

  headquarterColumns: string[] = ['headquarter', 'name', 'designation', 'address', 'phoneNumber'];
  headquarterData: PublicInformationOfficer[] = [];

  districtColumns: string[] = ['district', 'name', 'designation', 'address', 'phoneNumber'];
  districtData: PublicInformationOfficer[] = [];

  hods: HeadOfOrganisation[] = [
    {
      name: 'Shri Om Prakash Mathur',
      title: 'Honorable Governor',
      image: 'assets/images/info-page/hods/governor.jpg',
    },
    {
      name: 'Shri Prem Singh Tamang',
      title: "Hon'ble Chief Minister",
      image: 'assets/images/info-page/hods/cm.jpg',
    },
    {
      name: 'Shri Bedu Singh Panth',
      title: "Hon'ble Advisor, Excise",
      image: 'assets/images/info-page/hods/advisor.jpg',
    },
    {
      name: 'Shri Milan Kumar Subba',
      title: 'Secretary',
      image: 'assets/images/info-page/hods/default.png',
    },
    {
      name: 'Smt Binita Chettri',
      title: 'Commissioner',
      image: 'assets/images/info-page/hods/default.png',
    },
  ];

    constructor(
      private route: ActivatedRoute, 
      private infoPagesService: InfoPagesService,
      private http: HttpClient
    ) {}

    ngOnInit(): void {
      this.route.paramMap.subscribe(params => {
        this.page = params.get('page');
        if (this.page) {
          this.loadMarkdown(this.page); // ✅ move here
        }
      });
      this.loadTableData();
    }

    loadTableData(): void {
      //Load Nodal Officers
      this.infoPagesService.getNodalOfficers().subscribe({
        next: (data) => {
          this.nodalOfficer = data;
        }
      });

      // Load Directorate and District Officials
      this.infoPagesService.getDirectorateAndDistrictOfficials().subscribe(data => {
        this.directorateAndDistrictOfficialsData.data = data;
      });

      // Load Grievance Redressal Officers
      this.infoPagesService.getGrievanceRedressalOfficers().subscribe(data => {
        this.grievanceRedressalOfficerFullData = data;
        this.applyFilters(); // Initialize filtered data
      });

      // Load Public Information Officers
      this.infoPagesService.getPublicInformationOfficers().subscribe({
        next: (officers: PublicInformationOfficer[]) => {
          this.headquarterData = officers.filter(o => o.locationType === 'Headquarter');
          this.districtData = officers.filter(o => o.locationType === 'District');
        },
        error: (err) => {
          console.error('Error fetching officers:', err);
        }
      });

      // Load Heads of Organisations
      this.infoPagesService.getHeadsOfOrganisations().subscribe({
        next: (data) => {
          if (data?.length) {
            this.hods = data;
          }
        }
      });

      // Load Excise Secretaries / Principal Secretaries
      this.infoPagesService.getExciseSecretaries().subscribe({
        next: (data) => {
          if (data?.length) {
            this.commissionerData = data;
          }
        }
      });
    }

    applyFilters(): void {
      this.grievanceRedressalOfficerData.data = this.grievanceRedressalOfficerFullData.filter(officer => {
        const matchesLevel = this.selectedOfficeLevel ? officer.officeLevel === this.selectedOfficeLevel : true;
        const matchesSubLevel = this.selectedOfficeSubLevel ? officer.officeSubLevel === this.selectedOfficeSubLevel : true;
        return matchesLevel && matchesSubLevel;
      });
    }

    loadMarkdown(page: string): void {
      this.http.get(`assets/content/${page}.md`, { responseType: 'text' })
        .subscribe({
          next: data => this.markdownContent = data,
          error: () => this.markdownContent = '*Content not available.*'
        });
    }

    getImageUrl(image: string | File): string {
      if (!image || (typeof File !== 'undefined' && image instanceof File)) {
        return '';
      }

      const imageUrl = String(image);

      if (imageUrl.startsWith('http') || imageUrl.startsWith('assets/')) {
        return imageUrl;
      }

      return imageUrl.startsWith('/')
        ? `${environment.apiBaseUrl}${imageUrl}`
        : `${environment.apiBaseUrl}/${imageUrl}`;
    }

  }
