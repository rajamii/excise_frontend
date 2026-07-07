import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../../shared/material.module';
import { MasterService } from '../../../../../../core/services/master.service';
import { AdminService } from '../../../../admin.service';
import { EnaBulkSpiritType } from '../../../../../../core/models/ena-bulk-spirit.model';
import { ManageComponent } from '../manage/manage.component';
import { ActiveLicense } from '../../../../../../core/models/active-license.model';
import { DetailsDialogComponent } from './details-dialog.component';

export interface GroupedLicenseBulkSpirit {
  licenseId: string | null;
  licenseName: string;
  spiritCount: number;
  spiritsList: string;
  spirits: EnaBulkSpiritType[];
}

@Component({
  selector: 'app-ena-bulk-spirit-list',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss',
})
export class ListComponent implements OnInit {
  displayedColumns: string[] = ['licenseName', 'licenseId', 'spiritsList', 'actions'];
  rows: EnaBulkSpiritType[] = [];
  groupedRows: GroupedLicenseBulkSpirit[] = [];
  licenseNameMap = new Map<string, string>();

  constructor(
    private masterService: MasterService,
    private adminService: AdminService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadLicenseNames();
    this.loadRows();
  }

  private loadLicenseNames(): void {
    this.adminService.getActiveLicenses().subscribe({
      next: (licenses: ActiveLicense[]) => {
        this.licenseNameMap.clear();
        (Array.isArray(licenses) ? licenses : []).forEach(l => {
          const id = String(l.id || l.licenseeId || '').trim();
          if (id) this.licenseNameMap.set(id, l.establishmentName || id);
          const lid = String(l.licenseeId || '').trim();
          if (lid && lid !== id) this.licenseNameMap.set(lid, l.establishmentName || lid);
        });
        // Reload rows to update mapped grouped license names
        this.loadRows();
      },
      error: () => {},
    });
  }

  getLicenseName(licenseId?: string | null): string {
    if (!licenseId) return 'Unassigned';
    return this.licenseNameMap.get(licenseId.trim()) || licenseId;
  }

  loadRows(): void {
    this.masterService.getEnaBulkSpiritTypes().subscribe({
      next: (response: any) => {
        const data = Array.isArray(response) ? response : response?.data || [];
        this.rows = (data || []).map((item: any) => ({
          spritId: item?.spritId ?? item?.sprit_id,
          bulkSpiritKindType: String(item?.bulkSpiritKindType ?? item?.bulk_spirit_kind_type ?? '').trim(),
          strength: String(item?.strength ?? '').trim(),
          priceBl: Number(item?.priceBl ?? item?.price_bl ?? 0),
          licenseId: String(item?.licenseId ?? item?.license_id ?? '').trim() || null,
          createdAt: item?.createdAt ?? item?.created_at,
          updatedAt: item?.updatedAt ?? item?.updated_at,
        }));

        // Group by licenseId
        const groups = new Map<string | null, EnaBulkSpiritType[]>();
        this.rows.forEach(r => {
          const lid = r.licenseId || null;
          if (!groups.has(lid)) {
            groups.set(lid, []);
          }
          groups.get(lid)!.push(r);
        });

        this.groupedRows = [];
        groups.forEach((spirits, lid) => {
          const licenseName = this.getLicenseName(lid);
          const uniqueKinds = Array.from(new Set(spirits.map(s => s.bulkSpiritKindType)));
          this.groupedRows.push({
            licenseId: lid,
            licenseName: licenseName,
            spiritCount: spirits.length,
            spiritsList: uniqueKinds.join(', '),
            spirits: spirits
          });
        });

        this.groupedRows.sort((a, b) => a.licenseName.localeCompare(b.licenseName));
      },
      error: () => Swal.fire('Error', 'Failed to load ENA bulk spirit types.', 'error'),
    });
  }

  onAdd(): void {
    const dialogRef = this.dialog.open(ManageComponent, { width: '650px' });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.loadRows();
    });
  }

  onViewDetails(group: GroupedLicenseBulkSpirit): void {
    const dialogRef = this.dialog.open(DetailsDialogComponent, {
      width: '650px',
      data: {
        licenseName: group.licenseName,
        licenseId: group.licenseId,
        spirits: group.spirits
      }
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.loadRows();
    });
  }
}

