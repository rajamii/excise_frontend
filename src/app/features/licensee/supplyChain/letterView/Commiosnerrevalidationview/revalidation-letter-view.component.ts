import { Component, Inject, PLATFORM_ID, OnInit } from "@angular/core";
import { CommonModule, isPlatformBrowser } from "@angular/common";
import { ActivatedRoute, Router } from "@angular/router";

interface RevalidationData {
  id: string;
  referenceNo: string;
  submissionDate: Date;
  distilleryName: string;
  status: string;
  brAmount: number;
  revalidationAmount?: number;
  originalPermitNo?: string;
  originalPermitDate?: Date;
  expiryDate?: Date;
  reasonForRevalidation?: string;
  newQuantity?: number;
  newPurpose?: string;
}

@Component({
  selector: "app-revalidation-letter-view",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./revalidation-letter-view.component.html",
  styleUrls: ["./revalidation-letter-view.component.scss"],
})
export class RevalidationLetterViewComponent implements OnInit {
  revalidationData?: RevalidationData;
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
        // For now, we'll use sample data. In a real app, this would come from an API
        this.loadRevalidationData(ref);
      } else {
        // If no ref provided, redirect back to commissioner dashboard
        this.router.navigate(["/dev-commissioner-dashboard"]);
      }
    }
  }

  private loadRevalidationData(refNo: string): void {
    // Sample data - in a real application, this would be fetched from an API
    const sampleData: RevalidationData[] = [
      {
        id: "1",
        referenceNo: "REV/BF601",
        submissionDate: new Date("2025-09-18"),
        distilleryName: "Himalayan Distilleries Pvt Ltd",
        status: "PENDING REVIEW",
        brAmount: 50.0,
        revalidationAmount: 5.0,
        originalPermitNo: "BF501/EXCISE",
        originalPermitDate: new Date("2025-08-18"),
        expiryDate: new Date("2025-09-25"),
        reasonForRevalidation: "Extension of validity period due to urgent requirements",
        newQuantity: 1500,
        newPurpose: "Extended manufacturing for export orders",
      },
      {
        id: "2",
        referenceNo: "REV/BF602",
        submissionDate: new Date("2025-09-17"),
        distilleryName: "Royal Sikkim Brewery",
        status: "PENDING REVIEW",
        brAmount: 60.0,
        revalidationAmount: 7.5,
        originalPermitNo: "BF502/EXCISE",
        originalPermitDate: new Date("2025-08-17"),
        expiryDate: new Date("2025-09-20"),
        reasonForRevalidation: "Permit expired, need immediate revalidation",
        newQuantity: 2000,
        newPurpose: "Continued production for local market",
      },
      {
        id: "3",
        referenceNo: "REV/BF603",
        submissionDate: new Date("2025-09-16"),
        distilleryName: "Mountain View Distilleries",
        status: "APPROVED",
        brAmount: 45.0,
        revalidationAmount: 6.25,
        originalPermitNo: "BF503/EXCISE",
        originalPermitDate: new Date("2025-08-16"),
        expiryDate: new Date("2025-10-30"),
        reasonForRevalidation: "Extension for additional production capacity",
        newQuantity: 1800,
        newPurpose: "Increased manufacturing for seasonal demand",
      },
      {
        id: "4",
        referenceNo: "REV/BF604",
        submissionDate: new Date("2025-09-15"),
        distilleryName: "Sikkim Distilleries Ltd",
        status: "PENDING REVIEW",
        brAmount: 55.0,
        revalidationAmount: 8.0,
        originalPermitNo: "BF504/EXCISE",
        originalPermitDate: new Date("2025-08-15"),
        expiryDate: new Date("2025-09-28"),
        reasonForRevalidation: "Change in production requirements",
        newQuantity: 2200,
        newPurpose: "Modified blending process for premium products",
      },
      {
        id: "5",
        referenceNo: "REV/BF605",
        submissionDate: new Date("2025-09-14"),
        distilleryName: "Gangtok Premium Spirits",
        status: "REJECTED",
        brAmount: 40.0,
        revalidationAmount: 4.5,
        originalPermitNo: "BF505/EXCISE",
        originalPermitDate: new Date("2025-08-14"),
        expiryDate: new Date("2025-09-18"),
        reasonForRevalidation: "Late application for permit extension",
        newQuantity: 1200,
        newPurpose: "Delayed production schedule",
      },
      {
        id: "6",
        referenceNo: "REV/001/2025",
        submissionDate: new Date("2025-09-10"),
        distilleryName: "Sikkim Distilleries Ltd",
        status: "ForwardedRevalidationToCommissioner",
        brAmount: 50.0,
        revalidationAmount: 25.0,
        originalPermitNo: "IBPS/02/EXCISE",
        originalPermitDate: new Date("2025-08-15"),
        expiryDate: new Date("2025-10-15"),
        reasonForRevalidation: "Extension of validity period",
        newQuantity: 1200,
        newPurpose: "Extended manufacturing",
      },
      {
        id: "7",
        referenceNo: "REV/002/2025",
        submissionDate: new Date("2025-09-12"),
        distilleryName: "Mount Distilleries Ltd",
        status: "ApprovedRevalidationByCommissioner",
        brAmount: 60.0,
        revalidationAmount: 30.0,
        originalPermitNo: "IBPS/06/EXCISE",
        originalPermitDate: new Date("2025-08-20"),
        expiryDate: new Date("2025-11-20"),
        reasonForRevalidation: "Change in quantity requirements",
        newQuantity: 18000,
        newPurpose: "Modified blending",
      },
    ];

    const found = sampleData.find((r) => r.referenceNo === refNo);
    if (found) {
      this.revalidationData = found;
    } else {
      // If not found, redirect back to commissioner dashboard
      this.router.navigate(["/dev-commissioner-dashboard"]);
    }
  }

  goBack(): void {
    this.router.navigate(["/dev-commissioner-dashboard"]);
  }

  printApplication(): void {
    const printable = document.getElementById('revalidationPrintSection')?.innerHTML || '';
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(el => (el as HTMLElement).outerHTML)
      .join('');
    const win = window.open('', '_blank', 'width=900,height=1000');
    if (!win) return;
    win.document.open();
    const ref = this.revalidationData?.referenceNo || '';
    win.document.write(`<!doctype html>
      <html>
        <head>
          <title>Revalidation Application - ${ref}</title>
          ${styles}
          <style>
            @page { size: A4; margin: 12mm; }
            body { background: #fff; }
            .no-print { display:none !important; }
            .printable-content, .printable-content * { visibility: visible !important; }
          </style>
        </head>
        <body>
          ${printable}
        </body>
      </html>`);
    win.document.close();
    win.focus();
    win.print();
  }

  printLetter(): void {
    const printable =
      document.getElementById("revalidationPrintSection")?.innerHTML || "";
    const styles = Array.from(
      document.querySelectorAll('link[rel="stylesheet"], style'),
    )
      .map((el) => (el as HTMLElement).outerHTML)
      .join("");
    const win = window.open("", "_blank", "width=900,height=1000");
    if (!win) return;
    win.document.open();
    const ref = this.revalidationData?.referenceNo || "";
    win.document.write(`<!doctype html>
      <html>
        <head>
          <title>Revalidation Application - ${ref}</title>
          ${styles}
          <style>
            @page { size: A4; margin: 12mm; }
            body { background: #fff; }
            .no-print { display:none !important; }
            .printable-content, .printable-content * { visibility: visible !important; }
          </style>
        </head>
        <body>
          ${printable}
        </body>
      </html>`);
    win.document.close();
    win.onload = () => {
      win.focus();
      win.print();
      win.close();
    };
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case "ApprovedRevalidationByCommissioner":
        return "badge bg-success";
      case "ForwardedRevalidationToCommissioner":
        return "badge bg-warning";
      case "Pending":
        return "badge bg-info";
      default:
        return "badge bg-secondary";
    }
  }
}
