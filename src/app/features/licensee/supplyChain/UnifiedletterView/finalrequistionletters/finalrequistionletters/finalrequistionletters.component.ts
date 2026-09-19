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
  productName: string;
  totalBLDisplay: string;
  strengthFrom: string;
  strengthTo: string;
  importFrom: string;
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
  totalBLDisplay: string;
  productName: string;
  strengthFrom: string;
  strengthTo: string;
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
  importDistilleryDisplay: string;
  importFrom: string;
  branchAddress1: string;
  branchPurpose: string;
  displayTotalENA: string;
  productName: string;
  strengthFrom: string;
  strengthTo: string;
  strengthDisplay: string;
  importPassFee: string;
  paymentDetails: string;
  brNumber: string;
  route: string;
  branchAddress2: string;
  branchOfficer: string;
  numberOfPermits: number;
  validUpToDate: string;
  permitNoDisplay?: string;
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
    productName: "Grain ENA",
    totalBLDisplay: "",
    strengthFrom: "",
    strengthTo: "",
    importFrom: "",
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
    totalBLDisplay: "",
    productName: "Grain ENA",
    strengthFrom: "",
    strengthTo: "",
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
    importDistilleryDisplay: "",
    importFrom: "",
    branchAddress1: "",
    branchPurpose: "",
    displayTotalENA: "",
    productName: "Grain ENA",
    strengthFrom: "",
    strengthTo: "",
    strengthDisplay: "",
    importPassFee: "0",
    paymentDetails: "",
    brNumber: "",
    route: "",
    branchAddress2: "",
    branchOfficer: "",
    numberOfPermits: 1,
    validUpToDate: "",
  };

  copyNames: string[] = ["ORIGINAL", "DUPLICATE", "TRIPLICATE", "QUADRUPLICATE"];
  permitCopies: any[] = [];

  // Dynamic back button properties
  backButtonText: string = "Back to Dashboard";
  backRoute: string = "/dashboard";
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
    // Check query parameters for source
    this.route.queryParams.subscribe((params) => {
      const source = params['source'];
      
      if (source === 'commissioner') {
        this.backButtonText = "Back to Dashboard";
        this.backRoute = "/dashboard?section=requisition";
      } else if (source === 'permit-section') {
        this.backButtonText = "Back to Dashboard";
        this.backRoute = "/dashboard?section=requisition";
      } else {
        // Default to licensee dashboard
        this.backButtonText = "Back to Dashboard";
        this.backRoute = "/dashboard";
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
    const numberOfPermits =
      permitTokens.length ||
      Number(this.pickValue(row, ["requisiton_number_of_permits", "number_of_permits", "numberOfPermits"], 1));
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

    const productName =
      this.pickValue(row, ["bulk_spirit_type", "bulkSpiritType"], "").trim() || "Grain ENA";
    const totalBLRaw = this.pickValue(row, ["totalbl", "totalBL", "total_bl"], "");
    const totalBLDisplay = this.formatTotalBLWithBreakdown(totalBLRaw, numberOfPermits);
    const strengthRaw = this.pickValue(row, ["strength"], "");
    const strengthRange = this.parseStrengthRange(strengthRaw);

    this.letterData = {
      letterNo: refNo,
      letterDate: requisitionDate,
      liftedFromState: state,
      permitFrom: permitDisplay,
      permitDate: approvalDate,
      issuedTo,
      productName,
      totalBLDisplay,
      strengthFrom: strengthRange.from,
      strengthTo: strengthRange.to,
      importFrom: thirdLetterImportFrom,
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
      totalBLDisplay,
      productName,
      strengthFrom: strengthRange.from,
      strengthTo: strengthRange.to,
      importFrom: thirdLetterImportFrom,
      viaRoute,
    };

    const paymentAmtRaw = this.pickValue(
      row,
      ["payment_amount", "paymentAmount", "amount", "total_amount", "totalAmount"],
      ""
    );
    const importPassFee = this.formatIndianNumber(paymentAmtRaw) || "0";

    const walletIdRaw = this.pickValue(
      row,
      [
        "wallet_transaction_id",
        "walletTransactionId",
        "wallet_id",
        "walletId",
        "wallet_txn_id",
        "walletTxnId",
      ],
      ""
    );
    const txnIdRaw = this.pickValue(
      row,
      [
        "transaction_id",
        "transactionId",
        "payment_id",
        "paymentId",
        "utr",
        "utr_number",
        "utrNumber",
        "challan_no",
        "challanNo",
        "br_number",
        "brNumber",
        "bank_reference_no",
        "bankReferenceNo",
      ],
      ""
    );
    const payerIdRaw = this.pickValue(
      row,
      ["payer_id", "payerId", "licensee_id", "licenseeId"],
      ""
    );

    const paymentDate = this.formatDate(
      this.pickValue(row, ["payment_date", "paymentDate", "updated_at", "approval_date", "approvalDate"], "")
    );

    let paymentDetails = "";
    if (walletIdRaw && txnIdRaw && walletIdRaw !== txnIdRaw) {
      paymentDetails = `Wallet ID: ${walletIdRaw} / Txn: ${txnIdRaw}` + (paymentDate ? ` dt. ${paymentDate}` : "");
    } else if (walletIdRaw) {
      paymentDetails = `Wallet Txn: ${walletIdRaw}` + (paymentDate ? ` dt. ${paymentDate}` : "");
    } else if (txnIdRaw) {
      paymentDetails = `Txn ID: ${txnIdRaw}` + (paymentDate ? ` dt. ${paymentDate}` : "");
    } else {
      const cleanRef = String(refNo || "").replace(/[^A-Za-z0-9]/g, "");
      const walletToken = payerIdRaw ? `WLT-${payerIdRaw}` : `WTXN-${cleanRef || "01"}`;
      paymentDetails = `Wallet ID: ${walletToken} / Txn: TXN-${cleanRef || "01"}` + (paymentDate ? ` dt. ${paymentDate}` : "");
    }

    const validUpToRaw = this.pickValue(row, ["valid_up_to", "validUpTo", "valid_upto"], "");
    const validUpToDate = this.formatDate(validUpToRaw) || "45 days from issue";

    const consigneeAddress = this.pickValue(
      row,
      ["premises_address", "premisesAddress", "branch_address", "branchAddress", "address"],
      "Majitar, Rangpo, Pakyong District, Sikkim"
    );

    const strengthDisplay =
      strengthRange.from && strengthRange.to && strengthRange.from !== strengthRange.to
        ? `${strengthRange.from}° to ${strengthRange.to}° Proof`
        : strengthRange.from
        ? `${strengthRange.from}° Proof`
        : "68.5° Proof";

    this.permitData = {
      letterNo: refNo,
      letterDate: requisitionDate,
      branchName: issuedTo,
      branchAddress: consigneeAddress,
      importDistilleryName: liftedFromDistilleryName,
      importDistilleryAddress,
      importDistilleryDisplay: thirdLetterImportFrom,
      importFrom: state || "Punjab",
      branchAddress1: consigneeAddress,
      branchPurpose: this.pickValue(row, ["branch_purpose", "branchPurpose", "purpose_name", "purpose"], "Manufacturing of IMFL"),
      displayTotalENA: this.formatIndianNumber(totalBLRaw) || "50,000",
      productName,
      strengthFrom: strengthRange.from,
      strengthTo: strengthRange.to,
      strengthDisplay,
      importPassFee,
      paymentDetails,
      brNumber: txnIdRaw || "Paid Online",
      route: viaRoute || "Rail/Road via Rangpo Checkpost",
      branchAddress2: this.pickValue(row, ["check_post_name", "checkPostName"], "Rangpo Checkpost"),
      branchOfficer: "Excise Officer",
      numberOfPermits,
      validUpToDate,
    };
    this.permitCopies = this.generatePermitCopies();
  }

  private formatIndianNumber(value: any, fallback: string = ""): string {
    const raw = String(value ?? "").trim();
    if (!raw) return fallback;
    const parsed = Number(raw.toString().replace(/,/g, ""));
    if (!Number.isFinite(parsed)) return raw;
    try {
      return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(parsed);
    } catch {
      return String(Math.round(parsed));
    }
  }

  private formatTotalBLWithBreakdown(totalBL: any, numberOfPermits: number): string {
    const total = Number(String(totalBL ?? "").trim().replace(/,/g, ""));
    const permits = Number.isFinite(numberOfPermits) && numberOfPermits > 0 ? Math.floor(numberOfPermits) : 0;
    if (!Number.isFinite(total) || total <= 0) return "";

    const totalFormatted = this.formatIndianNumber(total);
    if (!permits) return `${totalFormatted} BL`;

    const perPermit = total / permits;
    const perPermitRounded = Math.round(perPermit);
    const perPermitFormatted = this.formatIndianNumber(perPermitRounded);
    return `${totalFormatted} BL (${perPermitFormatted} x ${permits})`;
  }

  private parseStrengthRange(value: any): { from: string; to: string } {
    const raw = String(value ?? "").trim();
    if (!raw) return { from: "", to: "" };

    // Common patterns: "167 to 169", "167° to 169° Proof", "167-169 Proof"
    const match = raw.match(/(\d+(?:\.\d+)?)\s*(?:°|o)?\s*(?:to|-)\s*(\d+(?:\.\d+)?)/i);
    if (match) {
      return { from: match[1], to: match[2] };
    }

    const single = raw.match(/(\d+(?:\.\d+)?)/);
    if (single) {
      return { from: single[1], to: single[1] };
    }
    return { from: raw, to: raw };
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

    const numeric = tokens
      .map((t) => {
        const n = Number(String(t).trim().replace(/[^0-9]/g, ""));
        return Number.isFinite(n) ? n : NaN;
      })
      .filter((n) => Number.isFinite(n)) as number[];

    // If we can’t confidently parse the list, fall back to the old behavior.
    if (numeric.length !== tokens.length) {
      return `${tokens[0]} to ${tokens[tokens.length - 1]}`;
    }

    numeric.sort((a, b) => a - b);
    const ranges: Array<{ start: number; end: number }> = [];
    for (const n of numeric) {
      const last = ranges[ranges.length - 1];
      if (!last) {
        ranges.push({ start: n, end: n });
        continue;
      }
      if (n === last.end || n === last.end + 1) {
        last.end = n;
        continue;
      }
      ranges.push({ start: n, end: n });
    }

    const parts = ranges.map((r) => (r.start === r.end ? `${r.start}` : `${r.start} to ${r.end}`));
    return parts.join(" & ");
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
    printContents.forEach((element) => {
      allContent += element.outerHTML;
    });

    const assetBaseUrl = `${window.location.origin}/`;
    allContent = allContent.replace(
      /src="assets\//g,
      `src="${assetBaseUrl}assets/`
    );

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
              size: A4 portrait;
              margin: 6mm 6mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            body {
              font-family: Arial, sans-serif;
              font-size: 11px;
              line-height: 1.35;
              margin: 0;
              padding: 0;
              background: #fff !important;
            }
            html {
              background: #fff !important;
            }
            .forwarding-letter-container {
              background: #fff !important;
            }
            .main {
              border: 2px solid #000 !important;
              width: 100% !important;
              max-width: 185mm !important;
              margin: 8mm auto !important;
              padding: 12px 16px 10px 16px !important;
              page-break-inside: avoid !important;
              break-inside: avoid-page !important;
              background: white !important;
              overflow: hidden !important;
              page-break-after: always !important;
              break-after: page !important;
              box-sizing: border-box !important;
            }
            .main:last-child {
              page-break-after: auto !important;
              break-after: auto !important;
              margin-bottom: 0 !important;
            }
            .letter-separator,
            .permit-separator,
            .print-page-break {
              display: none !important;
            }
            .permit-copy {
              border: 2.5px solid #000 !important;
              width: 100% !important;
              max-width: 190mm !important;
              height: 255mm !important;
              min-height: 255mm !important;
              max-height: 255mm !important;
              box-sizing: border-box !important;
              padding: 10px 14px 8px 14px !important;
              margin: 0 auto !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              page-break-inside: avoid !important;
              break-inside: avoid-page !important;
              page-break-before: auto !important;
              break-before: auto !important;
              page-break-after: always !important;
              break-after: page !important;
              background: white !important;
              overflow: hidden !important;
            }
            .permit-copy.last-copy {
              page-break-after: auto !important;
              break-after: auto !important;
              margin-bottom: 0 !important;
            }
            .copy-number {
              color: black !important;
              border-bottom: 2px solid #000 !important;
              font-size: 12px !important;
              text-align: center !important;
              margin-bottom: 4px !important;
              padding-bottom: 2px !important;
              font-weight: bold !important;
            }
            .permit-content {
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              flex: 1 !important;
              height: 100% !important;
              width: 100% !important;
              overflow: hidden !important;
            }
            .permit-copy .permit-top-header {
              position: relative !important;
              width: 100% !important;
              min-height: 42px !important;
              margin-bottom: 2px !important;
            }
            .permit-copy .permit-copy-badge {
              position: absolute !important;
              top: 0 !important;
              right: 0 !important;
              font-size: 11.5px !important;
              font-weight: 800 !important;
              text-transform: uppercase !important;
              color: #000 !important;
            }
            .permit-copy .permit-logo-center {
              text-align: center !important;
              width: 100% !important;
            }
            .permit-copy .permit-logo-img {
              height: 48px !important;
              width: auto !important;
              display: inline-block !important;
            }
            .permit-copy .permit-titles-block {
              text-align: center !important;
              margin-bottom: 6px !important;
            }
            .permit-copy .permit-dept-name {
              font-size: 14.5px !important;
              font-weight: 800 !important;
              letter-spacing: 0.5px !important;
              color: #000 !important;
              text-transform: uppercase !important;
            }
            .permit-copy .permit-gov-name {
              font-size: 12px !important;
              font-weight: 600 !important;
              color: #111 !important;
              margin-top: 1px !important;
            }
            .permit-copy .permit-title-underlined {
              font-size: 12px !important;
              font-weight: 700 !important;
              color: #000 !important;
              margin-top: 3px !important;
            }
            .permit-copy .permit-meta-line {
              display: flex !important;
              justify-content: space-between !important;
              align-items: center !important;
              font-size: 11px !important;
              margin-bottom: 6px !important;
              font-weight: 500 !important;
            }
            .permit-copy .permit-body-text {
              font-size: 11px !important;
              line-height: 1.4 !important;
              text-align: justify !important;
              margin-bottom: 8px !important;
              color: #000 !important;
            }
            .permit-copy .permit-table-container {
              margin-bottom: 8px !important;
            }
            .permit-copy .kind-quantity-title {
              font-size: 11px !important;
              font-weight: 700 !important;
              margin-bottom: 3px !important;
            }
            .permit-copy .bulk-spirit-detail-table {
              width: 100% !important;
              border-collapse: collapse !important;
              font-size: 10px !important;
              table-layout: fixed !important;
            }
            .permit-copy .bulk-spirit-detail-table th,
            .permit-copy .bulk-spirit-detail-table td {
              border: 1.2px solid #000 !important;
              padding: 4px 5px !important;
              text-align: center !important;
              vertical-align: middle !important;
            }
            .permit-copy .bulk-spirit-detail-table thead th {
              font-weight: 700 !important;
              background: #fbfbfb !important;
              font-size: 9.5px !important;
              line-height: 1.25 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .permit-copy .bulk-spirit-detail-table tbody td {
              font-size: 10px !important;
            }
            .permit-copy .bulk-spirit-detail-table .col-fee-details {
              font-size: 9px !important;
            }
            .permit-copy .permit-signature-block {
              display: flex !important;
              justify-content: flex-end !important;
              margin-top: 6px !important;
              margin-bottom: 6px !important;
              padding-right: 12px !important;
            }
            .permit-copy .signature-holder {
              text-align: center !important;
              min-width: 180px !important;
            }
            .permit-copy .signature-holder .signature-space {
              height: 36px !important;
            }
            .permit-copy .signature-holder .sig-title {
              font-size: 11.5px !important;
              font-weight: 800 !important;
              color: #000 !important;
            }
            .permit-copy .signature-holder .sig-dept {
              font-size: 10.5px !important;
              font-weight: 700 !important;
              color: #111 !important;
              margin-top: 1px !important;
            }
            .permit-copy .permit-conditions-box {
              border: 1.2px solid #000 !important;
              padding: 6px 10px !important;
              margin-bottom: 4px !important;
              background: #fff !important;
            }
            .permit-copy .conditions-heading {
              font-size: 10.5px !important;
              font-weight: 800 !important;
              margin-bottom: 2px !important;
            }
            .permit-copy .conditions-items {
              margin: 0 !important;
              padding-left: 14px !important;
              font-size: 9.5px !important;
              line-height: 1.3 !important;
            }
            .permit-copy .conditions-items li {
              margin-bottom: 1.5px !important;
              text-align: justify !important;
            }
            .permit-copy .permit-footer-disclaimer {
              font-size: 8.5px !important;
              line-height: 1.2 !important;
              text-align: center !important;
              color: #333 !important;
              font-style: italic !important;
              padding-top: 2px !important;
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
    // Parse the backRoute to handle query parameters
    if (this.backRoute.includes('?')) {
      const [path, queryString] = this.backRoute.split('?');
      const queryParams: any = {};
      
      // Parse query string into object
      queryString.split('&').forEach(param => {
        const [key, value] = param.split('=');
        queryParams[key] = value;
      });
      
      this.router.navigate([path], { queryParams });
    } else {
      this.router.navigate([this.backRoute]);
    }
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

