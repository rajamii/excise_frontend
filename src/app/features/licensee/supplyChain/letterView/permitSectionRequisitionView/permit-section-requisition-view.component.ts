import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

interface RequisitionData {
  referenceNo: string;
  submissionDate: Date;
  distilleryName: string;
  status: string;
  amount: number;
}

@Component({
  selector: 'app-permit-section-requisition-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './permit-section-requisition-view.component.html',
  styleUrls: ['./permit-section-requisition-view.component.scss']
})
export class PermitSectionRequisitionViewComponent implements OnInit {
  data?: RequisitionData;

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    const ref = this.route.snapshot.paramMap.get('ref');
    if (!ref) {
      this.router.navigate(['/app-permit-section']);
      return;
    }
    this.loadData(ref);
  }

  loadData(ref: string): void {
    // TODO: Replace with API call
    const samples: RequisitionData[] = [
      {
        referenceNo: 'IBPS/02/EXCISE',
        submissionDate: new Date('2025-09-22'),
        distilleryName: 'Sikkim Distilleries Ltd',
        status: 'FORWARDED TO PERMIT SECTION',
        amount: 8.0
      },
      {
        referenceNo: 'IBPS/03/EXCISE',
        submissionDate: new Date('2025-09-05'),
        distilleryName: 'Darjeeling Artisan Pvt Ltd',
        status: 'FORWARDED TO PERMIT SECTION',
        amount: 8.0
      }
    ];
    this.data = samples.find(s => s.referenceNo === ref);
    if (!this.data) {
      this.router.navigate(['/app-permit-section']);
    }
  }

  backToList(): void {
    this.router.navigate(['/app-permit-section']);
  }
}


