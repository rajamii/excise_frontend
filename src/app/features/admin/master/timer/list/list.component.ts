import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import { TimerConfig, TimerService } from '../../../../../core/services/timer.service';

@Component({
  selector: 'app-timer-list',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class ListComponent implements OnInit {
  private timerService = inject(TimerService);
  private cdr = inject(ChangeDetectorRef);

  timers: TimerConfig[] = [];
  isLoading = false;
  searchQuery = '';

  // Modal State
  showModal = false;
  isEditMode = false;
  editingId: number | null = null;

  formCode = '';
  formDescription = '';
  formDelayValue: number = 10;
  formDelayUnit = 'minute';
  formIsActive = true;
  isSubmitting = false;

  unitOptions = [
    { value: 'second', label: 'Seconds' },
    { value: 'minute', label: 'Minutes' },
    { value: 'hour', label: 'Hours' },
    { value: 'day', label: 'Days' },
    { value: 'month', label: 'Months' },
    { value: 'year', label: 'Years' }
  ];

  ngOnInit(): void {
    this.loadTimers();
  }

  loadTimers(): void {
    this.isLoading = true;
    this.timerService.getTimers().subscribe({
      next: (data) => {
        this.isLoading = false;
        this.timers = (data || []).map((t: any) => {
          const val = t.delay_value ?? t.delayValue ?? t.delay_time ?? t.value ?? 0;
          const unit = t.delay_unit ?? t.delayUnit ?? t.unit ?? 'minute';
          const active = t.is_active ?? t.isActive ?? t.active ?? true;
          return {
            ...t,
            delay_value: Number(val),
            delayValue: Number(val),
            delay_unit: String(unit),
            delayUnit: String(unit),
            is_active: Boolean(active),
            isActive: Boolean(active)
          };
        });
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error loading timers:', err);
        Swal.fire('Error', 'Failed to load timer configurations.', 'error');
      }
    });
  }

  get filteredTimers(): TimerConfig[] {
    const hiddenCodes = ['LICENSE_RENEWAL_TIMER', 'LICENSE_RENEWAL_REMINDER_TIMER'];
    let list = this.timers.filter(t => !hiddenCodes.includes((t.code || '').toUpperCase()));
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(t =>
      (t.code || '').toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q) ||
      (t.delay_unit || '').toLowerCase().includes(q) ||
      this.formatDelayTime(t).toLowerCase().includes(q)
    );
  }

  getTimerIsActive(timer: any): boolean {
    if (!timer) return false;
    if (timer.is_active !== undefined) return Boolean(timer.is_active);
    if (timer.isActive !== undefined) return Boolean(timer.isActive);
    if (timer.active !== undefined) return Boolean(timer.active);
    return true;
  }

  formatDelayTime(timer: any): string {
    if (!timer) return '-';
    const val = timer.delay_value ?? timer.delayValue ?? timer.delay_time ?? timer.value;
    const unitRaw = timer.delay_unit ?? timer.delayUnit ?? timer.unit ?? 'minute';
    if (val === undefined || val === null || val === '') {
      return '-';
    }
    const unit = String(unitRaw).toLowerCase();
    const unitFormatted = Number(val) === 1 ? unit : (unit.endsWith('s') ? unit : unit + 's');
    let extra = '';
    if (String(timer.code || '').toUpperCase().includes('HOLOGRAM') && Number(val) === 1020) {
      extra = ' (5:00 PM)';
    }
    return `${val} ${unitFormatted}${extra}`;
  }

  openCreateModal(): void {
    this.isEditMode = false;
    this.editingId = null;
    this.formCode = '';
    this.formDescription = '';
    this.formDelayValue = 10;
    this.formDelayUnit = 'minute';
    this.formIsActive = true;
    this.showModal = true;
  }

  openEditModal(timer: any): void {
    this.isEditMode = true;
    this.editingId = timer.id || null;
    this.formCode = timer.code || '';
    this.formDescription = timer.description || '';
    this.formDelayValue = timer.delay_value ?? timer.delayValue ?? 10;
    this.formDelayUnit = timer.delay_unit ?? timer.delayUnit ?? 'minute';
    this.formIsActive = this.getTimerIsActive(timer);
    this.showModal = true;
  }

  closeModal(): void {
    if (this.isSubmitting) return;
    this.showModal = false;
  }

  saveTimer(): void {
    if (!this.formCode.trim()) {
      Swal.fire('Warning', 'Timer code is required.', 'warning');
      return;
    }

    const payload: Partial<TimerConfig> = {
      code: this.formCode.trim().toUpperCase(),
      description: this.formDescription.trim(),
      delay_value: Number(this.formDelayValue) || 0,
      delay_unit: this.formDelayUnit,
      is_active: this.formIsActive
    };

    this.isSubmitting = true;

    if (this.isEditMode && this.editingId) {
      this.timerService.updateTimer(this.editingId, payload).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.closeModal();
          Swal.fire('Success', 'Timer updated successfully.', 'success');
          this.loadTimers();
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Error updating timer:', err);
          Swal.fire('Error', 'Failed to update timer.', 'error');
        }
      });
    } else {
      this.timerService.createTimer(payload).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.closeModal();
          Swal.fire('Success', 'Timer created successfully.', 'success');
          this.loadTimers();
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Error creating timer:', err);
          Swal.fire('Error', 'Failed to create timer.', 'error');
        }
      });
    }
  }

  toggleActive(timer: TimerConfig): void {
    if (!timer.id) return;
    
    // Store original state
    const originalIsActive = timer.is_active;
    const originalIsActiveCamel = (timer as any).isActive;
    
    // Optimistically update UI
    timer.is_active = !originalIsActive;
    (timer as any).isActive = !originalIsActive;
    
    // Force change detection
    this.cdr.detectChanges();
    
    this.timerService.toggleActive(timer.id).subscribe({
      next: (updated) => {
        console.log('Toggle success response:', updated);
        // Confirm the update from backend
        timer.is_active = updated.is_active;
        (timer as any).isActive = updated.is_active;
        
        // Force change detection again
        this.cdr.detectChanges();
        
        // Show success message
        const newStatus = updated.is_active ? 'Active' : 'Inactive';
        Swal.fire({
          icon: 'success',
          title: 'Status Updated',
          text: `Timer is now ${newStatus}`,
          timer: 1500,
          showConfirmButton: false
        });
      },
      error: (err) => {
        console.error('Toggle error:', err);
        // Revert on error
        timer.is_active = originalIsActive;
        (timer as any).isActive = originalIsActiveCamel;
        
        // Force change detection
        this.cdr.detectChanges();
        
        Swal.fire('Error', 'Failed to update timer active state.', 'error');
      }
    });
  }

  deleteTimer(timer: TimerConfig): void {
    if (!timer.id) return;

    Swal.fire({
      title: 'Delete Timer Config?',
      text: `Are you sure you want to delete timer "${timer.code}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Yes, delete'
    }).then((res) => {
      if (res.isConfirmed) {
        this.timerService.deleteTimer(timer.id!).subscribe({
          next: () => {
            Swal.fire('Deleted!', 'Timer config has been deleted.', 'success');
            this.loadTimers();
          },
          error: (err) => {
            console.error('Error deleting timer:', err);
            Swal.fire('Error', 'Failed to delete timer config.', 'error');
          }
        });
      }
    });
  }
}
