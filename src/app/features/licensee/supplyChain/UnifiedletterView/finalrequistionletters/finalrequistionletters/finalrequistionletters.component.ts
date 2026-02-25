import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, ActivatedRoute } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../../../../../../environments/environment";
import { EnaRequisitionService } from "../../../../../../core/services/ena-requisition.service";
import { forkJoin, of, Observable } from "rxjs";
import { catchError, map, switchMap } from "rxjs/operators";

interface ForwardingLetterData {
  letterNo: string;
  letterDate: string;
  liftedFromState: string;
  permitFrom: string;
  permitDate: string;
  issuedTo: string;
}

interface SecondLetterData {
  letterNo: string;
  letterDate: string;
  liftedFromDistilleryName: string;
  liftedFrom: string;
  state: string;
  requisitionNumberOfPermits: string;
  permitDated: string;
  issuedTo: string;
  stateName: string;
}

interface ThirdLetterData {
  letterNo: string;
  letterDate: string;
  permitFrom: string;
  permitDated: string;
  issuedTo: string;
  importTo: string;
  strength: string;
  strengthValue: string;
  importFrom: string;
  viaRoute: string;
}

interface PermitData {
  letterNo: string;
  letterDate: string;
  branchName: string;
  branchAddress: string;
  importDistilleryName: string;
  importDistilleryAddress: string;
  importFrom: string;
  branchAddress1: string;
  branchPurpose: string;
  displayTotalENA: string;
  strengthFrom: string;
  strengthTo: string;
  importPassFee: string;
  brNumber: string;
  route: string;
  branchAddress2: string;
  branchOfficer: string;
  numberOfPermits: number;
}

interface LicenseMeRow {
  establishment_name?: string;
  establishmentName?: string;
}

@Component({
  selector: "app-finalrequistionletters",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./finalrequistionletters.component.html",
  styleUrl: "./finalrequistionletters.component.scss",
})
export class FinalrequistionlettersComponent implements OnInit {
  letterData: ForwardingLetterData = {
    letterNo: "_________",
    letterDate: "_________",
    liftedFromState: "",
    permitFrom: "",
    permitDate: "",
    issuedTo: "",
  };

  secondLetterData: SecondLetterData = {
    letterNo: "_________",
    letterDate: "_________",
    liftedFromDistilleryName: "",
    liftedFrom: "",
    state: "",
    requisitionNumberOfPermits: "",
    permitDated: "",
    issuedTo: "",
    stateName: "",
  };

  thirdLetterData: ThirdLetterData = {
    letterNo: "_________",
    letterDate: "_________",
    permitFrom: "",
    permitDated: "",
    issuedTo: "",
    importTo: "",
    strength: "",
    strengthValue: "",
    importFrom: "",
    viaRoute: "",
  };

  permitData: PermitData = {
    letterNo: "_________",
    letterDate: "_________",
    branchName: "",
    branchAddress: "",
    importDistilleryName: "",
    importDistilleryAddress: "",
    importFrom: "",
    branchAddress1: "",
    branchPurpose: "",
    displayTotalENA: "",
    strengthFrom: "",
    strengthTo: "",
    importPassFee: "",
    brNumber: "",
    route: "",
    branchAddress2: "",
    branchOfficer: "",
    numberOfPermits: 1,
  };

  copyNames: string[] = ["ORIGINAL", "DUPLICATE", "TRIPLICATE", "QUADRUPLICATE"];

  // Dynamic back button properties
  backButtonText: string = "Back to Permit Section Dashboard";
  backRoute: string = "/app-permit-section";
  isLoading: boolean = false;
  errorMessage: string = "";

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private enaRequisitionService: EnaRequisitionService,
  ) {}

  ngOnInit(): void {
    // Determine the source dashboard and set appropriate back button
    this.setBackButtonBasedOnSource();
    
    // Get data from query parameters or route state
    this.route.queryParams.subscribe((params) => {
      this.loadForwardingLetterData(params["ref"], params["id"]);
    });
  }

  private setBackButtonBasedOnSource(): void {
    // Check the current URL or referrer to determine source
    const currentUrl = window.location.href;
    const referrer = document.referrer;
    
    // Check query parameters for source
    this.route.queryParams.subscribe((params) => {
      const source = params['source'];
      
      if (source === 'commissioner' || referrer.includes('dev-commissioner-dashboard') || currentUrl.includes('source=commissioner')) {
        this.backButtonText = "Back to Commissioner Dashboard";
        this.backRoute = "/dev-commissioner-dashboard";
      } else {
        // Default to permit section dashboard
        this.backButtonText = "Back to Permit Section Dashboard";
        this.backRoute = "/app-permit-section";
      }
    });
  }

  private loadForwardingLetterData(referenceNo?: string, requisitionId?: string): void {
    this.isLoading = true;
    this.errorMessage = "";

    const requisition$ = requisitionId
      ? this.enaRequisitionService.getRequisitionById(String(requisitionId))
      : this.enaRequisitionService.getRequisitions();

    const establishmentName$ = this.http
      .get<LicenseMeRow[]>(`${environment.apiBaseUrl}/masters/license/me/`)
      .pipe(
        map((rows) => {
          const list = Array.isArray(rows) ? rows : [];
          const first = list[0] || {};
          return String(first.establishment_name || first.establishmentName || "").trim();
        }),
        catchError(() => of(""))
      );

    forkJoin({
      requisitionResponse: requisition$,
      establishmentName: establishmentName$,
    }).subscribe({
      next: ({ requisitionResponse, establishmentName }) => {
        const row = this.pickRequisitionRow(requisitionResponse, referenceNo, requisitionId);
        if (!row) {
          this.errorMessage = "No requisition data found for this letter.";
          this.isLoading = false;
          return;
        }

        this.resolveIssuedToName(row, establishmentName).subscribe({
          next: (issuedToName) => {
            this.mapRequisitionToLetter(row, issuedToName);
            this.isLoading = false;
          },
          error: () => {
            this.mapRequisitionToLetter(row, establishmentName || "-");
            this.isLoading = false;
          },
        });
      },
      error: () => {
        this.errorMessage = "Failed to load requisition letter data.";
        this.isLoading = false;
      },
    });
  }

  private pickRequisitionRow(response: any, referenceNo?: string, requisitionId?: string): any | null {
    const idValue = String(requisitionId || "").trim();
    if (idValue && response && typeof response === "object" && !Array.isArray(response)) {
      return response;
    }

    let list: any[] = [];
    if (Array.isArray(response)) {
      list = response;
    } else if (Array.isArray(response?.results)) {
      list = response.results;
    } else if (Array.isArray(response?.data)) {
      list = response.data;
    }

    if (!list.length) return null;

    const ref = String(referenceNo || "").trim().toUpperCase();
    if (ref) {
      return (
        list.find(
          (item) =>
            String(item?.our_ref_no || item?.ourRefNo || item?.referenceNo || item?.ref_no || "")
              .trim()
              .toUpperCase() === ref
        ) || null
      );
    }

    return list[0];
  }

  private mapRequisitionToLetter(row: any, establishmentName: string): void {
    const refNo = this.pickValue(row, ["our_ref_no", "ourRefNo", "referenceNo", "ref_no"], "_________");
    const requisitionDate = this.formatDate(
      this.pickValue(row, ["requisition_date", "requisitionDate", "created_at"], "")
    );
    const approvalDate = this.formatDate(this.pickValue(row, ["approval_date", "approvalDate"], ""));
    const state = this.pickValue(row, ["state"], "");
    const permitRaw = this.pickValue(row, ["details_permits_number", "detailsPermitsNumber"], "");
    const permitDisplay = this.formatPermitRange(permitRaw);
    const permitTokens = this.splitPermitTokens(permitRaw);
    const issuedTo = establishmentName || "-";
    const liftedFromDistilleryName = this.pickValue(
      row,
      ["lifted_from_distillery_name", "liftedFromDistilleryName"],
      ""
    );
    const liftedFrom = this.pickValue(row, ["lifted_from", "liftedFrom"], "");
    const liftedFromAddress = this.pickValue(row, ["via_route", "viaRoute", "lifted_from", "liftedFrom"], "");
    const viaRoute = this.pickValue(row, ["via_route", "viaRoute", "route"], "");
    const thirdLetterFromRaw = this.pickValue(
      row,
      [
        "from_party",
        "fromParty",
        "import_from",
        "importFrom",
        "lifted_from_address",
        "liftedFromAddress",
        "source_address",
        "sourceAddress",
        "lifted_from",
        "liftedFrom",
      ],
      ""
    );
    const thirdLetterImportFrom = this.composeFromText(
      liftedFromDistilleryName,
      thirdLetterFromRaw || liftedFrom,
      state
    );
    const importDistilleryAddress =
      liftedFromDistilleryName &&
      liftedFrom &&
      liftedFromDistilleryName.toLowerCase() === liftedFrom.toLowerCase()
        ? ""
        : liftedFrom;

    this.letterData = {
      letterNo: refNo,
      letterDate: requisitionDate,
      liftedFromState: state,
      permitFrom: permitDisplay,
      permitDate: approvalDate,
      issuedTo,
    };

    this.secondLetterData = {
      letterNo: refNo,
      letterDate: requisitionDate,
      liftedFromDistilleryName,
      liftedFrom:
        liftedFromAddress &&
        liftedFromDistilleryName &&
        liftedFromAddress.toLowerCase() === liftedFromDistilleryName.toLowerCase()
          ? ""
          : liftedFromAddress,
      state,
      requisitionNumberOfPermits: permitDisplay,
      permitDated: approvalDate,
      issuedTo,
      stateName: state,
    };

    this.thirdLetterData = {
      letterNo: refNo,
      letterDate: requisitionDate,
      permitFrom: permitDisplay,
      permitDated: approvalDate,
      issuedTo,
      importTo: this.pickValue(row, ["totalbl"], ""),
      strength: this.pickValue(row, ["strength"], ""),
      strengthValue: this.pickValue(row, ["bulk_spirit_type", "bulkSpiritType"], ""),
      importFrom: thirdLetterImportFrom,
      viaRoute,
    };

    this.permitData = {
      ...this.permitData,
      letterNo: refNo,
      letterDate: requisitionDate,
      branchName: issuedTo,
      importDistilleryName: liftedFromDistilleryName,
      importDistilleryAddress,
      importFrom: state,
      branchPurpose: this.pickValue(row, ["branch_purpose", "branchPurpose"], ""),
      displayTotalENA: this.pickValue(row, ["totalbl"], ""),
      strengthTo: this.pickValue(row, ["strength"], ""),
      route: this.pickValue(row, ["via_route", "viaRoute"], ""),
      branchAddress2: this.pickValue(row, ["check_post_name", "checkPostName"], ""),
      numberOfPermits:
        permitTokens.length ||
        Number(this.pickValue(row, ["requisiton_number_of_permits", "number_of_permits", "numberOfPermits"], 1)),
    };
  }

  private resolveIssuedToName(row: any, meEstablishmentName: string): Observable<string> {
    const direct = String(meEstablishmentName || "").trim();
    if (direct) {
      return of(direct);
    }

    const requisitionLicenseeId = this.pickValue(row, ["licensee_id", "licenseeId"], "");
    const candidates = this.buildLicenseIdCandidates(requisitionLicenseeId);
    if (!candidates.length) {
      return of("-");
    }

    return this.fetchEstablishmentByLicenseCandidates(candidates);
  }

  private fetchEstablishmentByLicenseCandidates(candidates: string[]): Observable<string> {
    const [current, ...rest] = candidates;
    if (!current) {
      return of("-");
    }

    const encoded = encodeURIComponent(current);
    return this.http
      .get<any>(`${environment.apiBaseUrl}/masters/license/detail/${encoded}/`)
      .pipe(
        map((resp) => this.extractEstablishmentFromLicenseDetail(resp)),
        switchMap((name) => {
          const resolved = String(name || "").trim();
          if (resolved.startsWith("__SOURCE_APP__:")) {
            const sourceApplicationId = resolved.replace("__SOURCE_APP__:", "").trim();
            return this.fetchFromSourceApplicationId(sourceApplicationId);
          }
          if (!resolved || resolved === "-") {
            if (!rest.length) {
              return of("-");
            }
            return this.fetchEstablishmentByLicenseCandidates(rest);
          }
          return of(resolved || "-");
        }),
        catchError(() => {
          if (!rest.length) {
            return of("-");
          }
          return this.fetchEstablishmentByLicenseCandidates(rest);
        })
      );
  }

  private fetchFromSourceApplicationId(sourceApplicationId: string): Observable<string> {
    const appId = String(sourceApplicationId || "").trim();
    if (!appId) {
      return of("-");
    }

    const encoded = encodeURIComponent(appId);
    return this.http
      .get<any>(`${environment.apiBaseUrl}/transactional/new_license_application/detail/${encoded}/`)
      .pipe(
        map((resp) => {
          const value =
            resp?.establishment_name ||
            resp?.establishmentName ||
            resp?.applicationData?.establishmentName ||
            resp?.application_data?.establishment_name ||
            "";
          return String(value || "").trim() || "-";
        }),
        catchError(() => {
          return of("-");
        })
      );
  }

  private extractEstablishmentFromLicenseDetail(resp: any): string {
    const appData = resp?.application_data || resp?.applicationData || {};
    const value =
      appData?.establishment_name ||
      appData?.establishmentName ||
      appData?.licensee_name ||
      appData?.licenseeName ||
      resp?.establishment_name ||
      resp?.establishmentName ||
      "";

    const direct = String(value || "").trim();
    if (direct) {
      return direct;
    }

    const sourceApplicationId =
      resp?.source_application_id ||
      resp?.sourceApplicationId ||
      "";

    // Return marker; caller can run the sourceApplicationId fallback request.
    return String(sourceApplicationId || "").trim()
      ? `__SOURCE_APP__:${String(sourceApplicationId).trim()}`
      : "-";
  }

  private buildLicenseIdCandidates(licenseId: string): string[] {
    const base = String(licenseId || "").trim();
    if (!base) return [];

    const out: string[] = [base];
    if (base.startsWith("NLI/")) {
      out.push(`NA/${base.slice(4)}`);
    } else if (base.startsWith("NA/")) {
      out.push(`NLI/${base.slice(3)}`);
    }
    return Array.from(new Set(out));
  }

  private pickValue(row: any, keys: string[], fallback: any = ""): any {
    for (const key of keys) {
      const value = row?.[key];
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        return String(value).trim();
      }
    }
    return fallback;
  }

  private formatDate(value: any): string {
    if (!value) return "";
    try {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return String(value);
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return String(value);
    }
  }

  private splitPermitTokens(value: string): string[] {
    return String(value || "")
      .split(",")
      .map((token) => token.trim())
      .filter((token) => token.length > 0);
  }

  private formatPermitRange(value: string): string {
    const tokens = this.splitPermitTokens(value);
    if (tokens.length === 0) return "";
    if (tokens.length === 1) return tokens[0];
    return `${tokens[0]} to ${tokens[tokens.length - 1]}`;
  }

  private composeFromText(name: string, address: string, fallbackState: string): string {
    const n = String(name || "").trim();
    const a = String(address || "").trim();
    const s = String(fallbackState || "").trim();

    if (n && a) {
      if (n.toLowerCase() === a.toLowerCase()) return n;
      return `${n}, ${a}`;
    }
    if (n) return n;
    if (a) return a;
    return s;
  }

  printLetter(): void {
    const printContents = document.querySelectorAll(".main, .permit-copy");

    if (!printContents || printContents.length === 0) {
      console.error("Print content not found");
      return;
    }

    const printWindow = window.open("", "", "height=600,width=800");

    if (!printWindow) {
      console.error("Unable to open print window");
      return;
    }

    // Combine all .main and .permit-copy elements content
    let allContent = "";
    printContents.forEach((element, index) => {
      allContent += element.outerHTML;
      // Add page break between letters except for the last one
      if (index < printContents.length - 1) {
        allContent += '<div style="page-break-after: always;"></div>';
      }
    });

    // Get styles from the current document
    const styles = Array.from(document.styleSheets)
      .map((styleSheet) => {
        try {
          return Array.from(styleSheet.cssRules)
            .map((rule) => rule.cssText)
            .join("");
        } catch (e) {
          console.log("Cannot access stylesheet", e);
          return "";
        }
      })
      .join("");

    const printHtml = `
      <html>
        <head>
          <title>Forwarding Letters</title>
          <style>
            @page {
              size: A4;
              margin: 20mm;
            }
            body {
              font-family: 'Arial', sans-serif;
              font-size: 14px;
              line-height: 1.6;
              margin: 0;
              padding: 0;
            }
            .letter-header {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              text-align: center;
              font-weight: bold;
              width: 90%;
              margin: 0 auto;
            }
            .sub-header {
              text-align: center;
              font-size: 12px;
              margin-top: 10px;
              margin-bottom: 15px;
            }
            .letter-content {
              margin-top: 20px;
              text-align: left;
            }
            .signature-section {
              margin-top: 50px;
              text-align: right;
              margin-right: 20px;
            }
            .main, .permit-copy {
              border: 2px solid black !important;
              padding: 15px;
              margin-bottom: 30px;
              page-break-inside: avoid;
              background: white;
            }
            .permit-copy {
              page-break-before: always;
            }
            .permit-copy.last-copy {
              page-break-after: auto;
            }
            .copy-number {
              font-size: 18px;
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 2px solid black;
              padding-bottom: 10px;
              font-weight: bold;
            }
            .permit-section {
              margin-top: 20px;
              font-size: 14px;
              line-height: 1.6;
              text-align: justify;
            }
            .permit-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
              font-size: 12px;
            }
            .permit-table td {
              border: 1px solid black;
              text-align: center;
              padding: 8px 5px;
              vertical-align: middle;
            }
            .permit-table tr:first-child td {
              font-weight: bold;
              background-color: #f5f5f5;
              text-align: center;
              font-size: 11px;
              padding: 10px 5px;
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
            }
            .permit-table td:first-child {
              text-align: left;
              width: 20%;
            }
            .logo {
              text-align: center;
              margin-bottom: 10px;
            }
            .logo img {
              height: 80px;
              display: block !important;
              margin: 0 auto !important;
            }
            .bold-text {
              font-weight: bold;
              color: black;
            }
            .underline {
              text-decoration: underline;
            }
            .flex {
              display: flex;
              justify-content: space-between;
              font-size: 12px;
              margin-top: 15px;
              margin-bottom: 10px;
            }
            a {
              color: inherit;
              text-decoration: none;
            }
            p {
              margin-bottom: 15px;
              text-align: justify;
            }
            strong {
              font-weight: bold;
            }
            ${styles}
          </style>
        </head>
        <body>
          ${allContent}
        </body>
      </html>
    `;

    printWindow.document.write(printHtml);
    printWindow.document.close();

    // Handle image loading
    const images = printWindow.document.getElementsByTagName("img");
    const totalImages = images.length;
    let loadedImages = 0;

    const checkImagesLoaded = () => {
      loadedImages++;
      if (loadedImages === totalImages) {
        printWindow.print();
        printWindow.close();
      }
    };

    if (totalImages === 0) {
      printWindow.print();
      printWindow.close();
    } else {
      Array.from(images).forEach((img) => {
        img.onload = checkImagesLoaded;
        img.onerror = checkImagesLoaded;
      });
    }
  }

  goBack(): void {
    this.router.navigate([this.backRoute]);
  }

  generatePermitCopies(): any[] {
    const permitCopies: any[] = [];
    const baseRefNo = this.permitData.letterNo;
    const numberOfPermits = this.permitData.numberOfPermits;

    // Generate copies by copy type first, then by permit number
    // For each copy type (ORIGINAL, DUPLICATE, TRIPLICATE, QUADRUPLICATE)
    for (let copyTypeIndex = 0; copyTypeIndex < 4; copyTypeIndex++) {
      // For each permit number (1, 2, 3, etc.)
      for (let permitNumber = 0; permitNumber < numberOfPermits; permitNumber++) {
        const currentRefNo = baseRefNo;
        
        permitCopies.push({
          ...this.permitData,
          letterNo: currentRefNo,
          copyType: this.copyNames[copyTypeIndex],
          copyNumber: copyTypeIndex + 1,
          permitNumber: permitNumber + 1,
          isMainPermit: copyTypeIndex === 0 && permitNumber === 0,
          isLastCopy: copyTypeIndex === 3 && permitNumber === numberOfPermits - 1,
        });
      }
    }

    return permitCopies;
  }
}

