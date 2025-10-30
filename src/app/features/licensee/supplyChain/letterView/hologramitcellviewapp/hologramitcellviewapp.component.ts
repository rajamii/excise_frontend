import { Component, Inject, PLATFORM_ID, OnInit } from "@angular/core";
import { CommonModule, isPlatformBrowser } from "@angular/common";
import { ActivatedRoute, Router } from "@angular/router";

interface HologramData {
  refNo: string;
  date: string;
  companyName: string;
  localQtyLakh: number;
  exportQtyLakh: number;
  defenceQtyLakh: number;
  status: string;
  submittedDate?: string;
  reviewedBy?: string;
  reviewedDate?: string;
  remarks?: string;
  uploadedFile?: File;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  businessAddress?: string;
  licenseNumber?: string;
  gstNumber?: string;
  panNumber?: string;
}

@Component({
  selector: 'app-hologramitcellviewapp',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hologramitcellviewapp.component.html',
  styleUrls: ['./hologramitcellviewapp.component.scss']
})
export class HologramitcellviewappComponent implements OnInit {
  hologramData?: HologramData;
  private isBrowser = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      const ref = this.route.snapshot.queryParamMap.get("ref");
      if (ref) {
        this.loadHologramData(ref);
      } else {
        this.router.navigate(["/dev-itcell"]);
      }
    }
  }

  private loadHologramData(refNo: string): void {
    // Load from localStorage first
    if (this.isBrowser) {
      const list: any[] = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
      let found = list.find(r => r.refNo === refNo);

      if (!found) {
        // If not found in localStorage, create sample data for demonstration
        found = this.createSampleHologramData(refNo);
      }

      this.hologramData = found;
    }
  }

  private createSampleHologramData(refNo: string): HologramData {
    // Create sample data for demonstration purposes
    const sampleData: { [key: string]: HologramData } = {
      'YB/1/BREW/24': {
        refNo: 'YB/1/BREW/24',
        date: '2025-01-13',
        companyName: 'Yuksom Breweries Ltd.',
        localQtyLakh: 15,
        exportQtyLakh: 0,
        defenceQtyLakh: 0,
        status: 'Approved',
        submittedDate: '2025-01-13',
        reviewedBy: 'IT Cell Officer',
        reviewedDate: '2025-01-13',
        remarks: 'Application reviewed and approved by IT Cell',
        contactPerson: 'Mr. Rajesh Kumar',
        contactEmail: 'rajesh@yuksom.com',
        contactPhone: '+91 9876543210',
        businessAddress: 'Industrial Area, Rangpo, Sikkim - 737132',
        licenseNumber: 'BREW/SKM/2024/001',
        gstNumber: '11ABCDE1234F1Z5',
        panNumber: 'ABCDE1234F'
      },
      'YB/2/BREW/24': {
        refNo: 'YB/2/BREW/24',
        date: '2025-01-13',
        companyName: 'Yuksom Breweries Ltd.',
        localQtyLakh: 10,
        exportQtyLakh: 2,
        defenceQtyLakh: 0,
        status: 'Approved',
        submittedDate: '2025-01-13',
        reviewedBy: 'IT Cell Officer',
        reviewedDate: '2025-01-13',
        remarks: 'Application reviewed and approved by IT Cell',
        contactPerson: 'Ms. Priya Sharma',
        contactEmail: 'priya@yuksom.com',
        contactPhone: '+91 9876543211',
        businessAddress: 'Industrial Area, Rangpo, Sikkim - 737132',
        licenseNumber: 'BREW/SKM/2024/001',
        gstNumber: '11ABCDE1234F1Z5',
        panNumber: 'ABCDE1234F'
      },
      'YB/1/BREW/25': {
        refNo: 'YB/1/BREW/25',
        date: '2025-01-30',
        companyName: 'Yuksom Breweries Ltd.',
        localQtyLakh: 25,
        exportQtyLakh: 5,
        defenceQtyLakh: 2,
        status: 'Approved',
        submittedDate: '2025-01-30',
        reviewedBy: 'IT Cell Officer',
        reviewedDate: '2025-01-30',
        remarks: 'Application reviewed and approved by IT Cell for hologram requisition',
        contactPerson: 'Mr. Rajesh Kumar',
        contactEmail: 'rajesh@yuksom.com',
        contactPhone: '+91 9876543210',
        businessAddress: 'Industrial Area, Rangpo, Sikkim - 737132',
        licenseNumber: 'BREW/SKM/2025/001',
        gstNumber: '11ABCDE1234F1Z5',
        panNumber: 'ABCDE1234F'
      }
    };

    return sampleData[refNo] || {
      refNo: refNo,
      date: new Date().toISOString().split('T')[0],
      companyName: 'Sikkim Distilleries Ltd',
      localQtyLakh: 25,
      exportQtyLakh: 5,
      defenceQtyLakh: 2,
      status: 'Approved',
      submittedDate: new Date().toISOString().split('T')[0],
      reviewedBy: 'IT Cell Officer',
      reviewedDate: new Date().toISOString().split('T')[0],
      remarks: 'Application reviewed and approved by IT Cell',
      contactPerson: 'Mr. Default Contact',
      contactEmail: 'contact@company.com',
      contactPhone: '+91 9876543210',
      businessAddress: 'Default Address, Sikkim',
      licenseNumber: 'BREW/SKM/2025/DEFAULT',
      gstNumber: '11DEFAULT123F1Z5',
      panNumber: 'DEFAULT123F'
    };
  }

  goBack(): void {
    this.router.navigate(["/dev-itcell"]);
  }

  getTotalQuantity(): number {
    if (!this.hologramData) return 0;
    return (this.hologramData.localQtyLakh || 0) +
      (this.hologramData.exportQtyLakh || 0) +
      (this.hologramData.defenceQtyLakh || 0);
  }

  printLetter(): void {
    if (this.isBrowser) {
      window.print();
    }
  }
}
