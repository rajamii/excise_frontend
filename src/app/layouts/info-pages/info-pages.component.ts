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
import { HttpClient } from '@angular/common/http';

export interface Commissioner {
  slNo: number;
  name: string;
  fromDate: string;
  toDate: string;
}

const COMMISSIONER_DATA: Commissioner[] = [
  { slNo: 1, name: 'Shri T. P. Sharma', fromDate: '26/09/1974', toDate: '19/03/1975' },
  { slNo: 2, name: 'Shri P. K. Pradhan, IAS', fromDate: '13/03/1975', toDate: '08/08/1977' },
  { slNo: 3, name: 'Shri R. B. Mukhia, IAS', fromDate: '09/08/1977', toDate: '23/05/1980' },
  { slNo: 4, name: 'Shri C. D. Rai, IAS', fromDate: '24/05/1980', toDate: '31/03/1983' },
  { slNo: 5, name: 'Shri R. Narayan, IAS', fromDate: '01/04/1983', toDate: '07/04/1985' },
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

  commissionerColumns: string[] = ['slNo', 'name', 'fromDate', 'toDate'];
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

  hods = [
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

  }
