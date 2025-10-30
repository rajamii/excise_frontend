import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, ActivatedRoute } from "@angular/router";

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

  constructor(
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    // Get data from query parameters or route state
    this.route.queryParams.subscribe((params) => {
      if (params["ref"]) {
        this.loadForwardingLetterData(params["ref"]);
      }
    });

    // Load sample data for now
    this.loadSampleData();
  }

  private loadForwardingLetterData(referenceNo: string): void {
    // TODO: Replace with actual API call
    console.log("Loading forwarding letter data for:", referenceNo);
  }

  private loadSampleData(): void {
    // Sample data - replace with actual API data
    this.letterData = {
      letterNo: "EXC/2024/001",
      letterDate: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
      liftedFromState: "West Bengal",
      permitFrom: "IP/2024/001, IP/2024/002",
      permitDate: "15/01/2024",
      issuedTo: "Sikkim Distilleries Ltd",
    };

    this.secondLetterData = {
      letterNo: "EXC/2024/002",
      letterDate: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
      liftedFromDistilleryName: "Mount Distilleries Ltd",
      liftedFrom: "Kalimpong",
      state: "West Bengal",
      requisitionNumberOfPermits: "IP/2024/003, IP/2024/004",
      permitDated: "20/01/2024",
      issuedTo: "Sikkim Distilleries Ltd",
      stateName: "West Bengal",
    };

    this.thirdLetterData = {
      letterNo: "EXC/2024/003",
      letterDate: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
      permitFrom: "IP/2024/005, IP/2024/006",
      permitDated: "25/01/2024",
      issuedTo: "Sikkim Distilleries Ltd",
      importTo: "500",
      strength: "96.5%",
      strengthValue: "Extra Neutral Alcohol",
      importFrom: "West Bengal",
    };

    this.permitData = {
      letterNo: "EXC/2024/004",
      letterDate: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
      branchName: "Sikkim Distilleries Ltd",
      branchAddress: "Rangpo, East Sikkim",
      importDistilleryName: "Mount Distilleries Ltd",
      importDistilleryAddress: "Kalimpong",
      importFrom: "West Bengal",
      branchAddress1: "Rangpo Check Post",
      branchPurpose: "Manufacturing of IMFL",
      displayTotalENA: "500",
      strengthFrom: "95",
      strengthTo: "96.5",
      importPassFee: "25000",
      brNumber: "BR/2024/001/15-01-2024",
      route: "Siliguri-Rangpo",
      branchAddress2: "Rangpo Check Post",
      branchOfficer: "Excise Inspector, Rangpo",
      numberOfPermits: 3, // This will generate 12 total copies (3 permits × 4 copies each)
    };
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
    this.router.navigate(["/dev-commissioner-dashboard"]);
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
        const currentRefNo = permitNumber === 0 ? baseRefNo : this.incrementReferenceNumber(baseRefNo, permitNumber);
        
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

  private incrementReferenceNumber(baseRefNo: string, increment: number): string {
    if (!baseRefNo) return baseRefNo;

    const refNo = baseRefNo.replace("/Excise", "");
    const match = refNo.match(/(\d+)(\D*)$/);

    if (!match) return refNo;

    const number = parseInt(match[1], 10);
    const suffix = match[2];
    const prefix = refNo.substring(0, refNo.length - match[0].length);
    const paddingLength = match[1].length;

    return prefix + (number + increment).toString().padStart(paddingLength, "0") + suffix;
  }
}
