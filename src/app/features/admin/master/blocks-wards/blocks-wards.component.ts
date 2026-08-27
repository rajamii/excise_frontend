import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../shared/material.module';
import { MasterService } from '../../../../core/services/master.service';
import { AdminService } from '../../admin.service';

import { Block } from '../../../../core/models/block.model';
import { Ward } from '../../../../core/models/ward.model';
import { RuralWard } from '../../../../core/models/rural-ward.model';
import { MasterLocation } from '../../../../core/models/master-location.model';

import { BlockManageDialogComponent } from './dialogs/block-manage-dialog.component';
import { UrbanWardManageDialogComponent } from './dialogs/urban-ward-manage-dialog.component';
import { RuralWardManageDialogComponent } from './dialogs/rural-ward-manage-dialog.component';

@Component({
  selector: 'app-blocks-wards',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './blocks-wards.component.html',
  styleUrl: './blocks-wards.component.scss'
})
export class BlocksWardsComponent implements OnInit {

  // ── Blocks ──────────────────────────────────────────────────────────────
  blockColumns: string[] = ['sno', 'blockName', 'subcategory', 'actions'];
  blocks: Block[] = [];

  // ── Urban Wards ──────────────────────────────────────────────────────────
  urbanColumns: string[] = ['sno', 'wardName', 'wardNumber', 'locationCode', 'actions'];
  urbanWards: Ward[] = [];

  // Location lookup map: locationCode → locationDescription
  locationMap = new Map<number, string>();

  // ── Rural Wards ──────────────────────────────────────────────────────────
  ruralColumns: string[] = ['sno', 'wardName', 'wardNumber', 'block', 'actions'];
  ruralWards: RuralWard[] = [];

  constructor(
    private masterService: MasterService,
    private adminService: AdminService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadLocations();
    this.loadBlocks();
    this.loadUrbanWards();
    this.loadRuralWards();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LOCATIONS (lookup map)
  // ══════════════════════════════════════════════════════════════════════════

  loadLocations(): void {
    this.masterService.getLocations().subscribe({
      next: (data: any) => {
        const list: MasterLocation[] = Array.isArray(data) ? data : [];
        this.locationMap = new Map(list.map(l => [l.locationCode, l.locationDescription]));
      },
      error: () => {} // non-critical — table falls back to code
    });
  }

  getLocationName(code: number): string {
    return this.locationMap.get(code) ?? String(code);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BLOCKS
  // ══════════════════════════════════════════════════════════════════════════

  loadBlocks(): void {
    this.masterService.getBlocks().subscribe({
      next: (data: any) => {
        const list = Array.isArray(data) ? data : [];
        this.blocks = list.map((item: any) => {
          const name = item.blockName || item.block_name || item.gpuName || item.gpu_name || '';
          return {
            ...item,
            blockName: name,
            gpuName: name,
            subcategoryName: item.subcategoryName || item.subcategory_name || ''
          };
        }).sort((a: any, b: any) => (a.blockName || '').localeCompare(b.blockName || ''));
      },
      error: () => Swal.fire('Error', 'Failed to load blocks.', 'error')
    });
  }

  onAddBlock(): void {
    this.dialog.open(BlockManageDialogComponent, { width: '480px' })
      .afterClosed().subscribe(saved => { if (saved) this.loadBlocks(); });
  }

  onEditBlock(block: Block): void {
    this.dialog.open(BlockManageDialogComponent, { width: '480px', data: { ...block } })
      .afterClosed().subscribe(saved => { if (saved) this.loadBlocks(); });
  }

  onDeleteBlock(block: Block): void {
    if (block?.id === undefined) return;
    Swal.fire({
      title: 'Delete Block?',
      text: `"${block.blockName}" will be removed permanently.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Delete'
    }).then(r => {
      if (!r.isConfirmed) return;
      this.adminService.deleteBlock(block.id!).subscribe({
        next: () => { Swal.fire('Deleted!', 'Block removed.', 'success'); this.loadBlocks(); },
        error: () => Swal.fire('Error', 'Failed to delete block.', 'error')
      });
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // URBAN WARDS
  // ══════════════════════════════════════════════════════════════════════════

  loadUrbanWards(): void {
    this.masterService.getWards().subscribe({
      next: (data: any) => {
        const list = Array.isArray(data) ? data : [];
        this.urbanWards = [...list].sort((a, b) => (a.wardNumber ?? 0) - (b.wardNumber ?? 0));
      },
      error: () => Swal.fire('Error', 'Failed to load urban wards.', 'error')
    });
  }

  onAddUrbanWard(): void {
    this.dialog.open(UrbanWardManageDialogComponent, { width: '480px' })
      .afterClosed().subscribe(saved => { if (saved) this.loadUrbanWards(); });
  }

  onEditUrbanWard(ward: Ward): void {
    this.dialog.open(UrbanWardManageDialogComponent, { width: '480px', data: { ...ward } })
      .afterClosed().subscribe(saved => { if (saved) this.loadUrbanWards(); });
  }

  onDeleteUrbanWard(ward: Ward): void {
    if (ward?.id === undefined) return;
    Swal.fire({
      title: 'Delete Urban Ward?',
      text: `"${ward.wardName}" will be removed permanently.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Delete'
    }).then(r => {
      if (!r.isConfirmed) return;
      this.adminService.deleteWard(ward.id!).subscribe({
        next: () => { Swal.fire('Deleted!', 'Urban ward removed.', 'success'); this.loadUrbanWards(); },
        error: () => Swal.fire('Error', 'Failed to delete urban ward.', 'error')
      });
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RURAL WARDS
  // ══════════════════════════════════════════════════════════════════════════

  loadRuralWards(): void {
    this.masterService.getRuralWards().subscribe({
      next: (data: any) => {
        const list = Array.isArray(data) ? data : [];
        this.ruralWards = [...list].sort((a, b) => (a.wardNumber ?? 0) - (b.wardNumber ?? 0));
      },
      error: () => Swal.fire('Error', 'Failed to load rural wards.', 'error')
    });
  }

  onAddRuralWard(): void {
    this.dialog.open(RuralWardManageDialogComponent, { width: '480px' })
      .afterClosed().subscribe(saved => { if (saved) this.loadRuralWards(); });
  }

  onEditRuralWard(ward: RuralWard): void {
    this.dialog.open(RuralWardManageDialogComponent, { width: '480px', data: { ...ward } })
      .afterClosed().subscribe(saved => { if (saved) this.loadRuralWards(); });
  }

  onDeleteRuralWard(ward: RuralWard): void {
    if (ward?.id === undefined) return;
    Swal.fire({
      title: 'Delete Rural Ward?',
      text: `"${ward.wardName}" will be removed permanently.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Delete'
    }).then(r => {
      if (!r.isConfirmed) return;
      this.adminService.deleteRuralWard(ward.id!).subscribe({
        next: () => { Swal.fire('Deleted!', 'Rural ward removed.', 'success'); this.loadRuralWards(); },
        error: () => Swal.fire('Error', 'Failed to delete rural ward.', 'error')
      });
    });
  }
}
