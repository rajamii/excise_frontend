import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface HologramRecord {
  id: number;
  date: string;
  fromSerial: string;
  toSerial: string;
  numberOfHolograms: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedBy: string;
  submissionDate: string;
}

@Component({
  selector: 'app-hologramdetails',
  imports: [CommonModule, FormsModule],
  templateUrl: './hologramdetails.component.html',
  styleUrl: './hologramdetails.component.scss'
})
export class HologramdetailsComponent implements OnInit {
  hologramRecords: HologramRecord[] = [];
  filteredRecords: HologramRecord[] = [];
  
  // Filter properties
  selectedDate: string = '';
  selectedStatus: string = '';
  
  ngOnInit() {
    this.loadHologramRecords();
  }
  
  loadHologramRecords() {
    // Sample data - replace with actual API call
    this.hologramRecords = [
      {
        id: 1,
        date: '2024-11-01',
        fromSerial: 'HG001001',
        toSerial: 'HG001500',
        numberOfHolograms: 500,
        status: 'PENDING',
        submittedBy: 'Distillery Manager',
        submissionDate: '2024-11-01'
      },
      {
        id: 2,
        date: '2024-10-28',
        fromSerial: 'HG000501',
        toSerial: 'HG001000',
        numberOfHolograms: 500,
        status: 'APPROVED',
        submittedBy: 'Distillery Manager',
        submissionDate: '2024-10-28'
      },
      {
        id: 3,
        date: '2024-10-25',
        fromSerial: 'HG000001',
        toSerial: 'HG000500',
        numberOfHolograms: 500,
        status: 'APPROVED',
        submittedBy: 'Distillery Manager',
        submissionDate: '2024-10-25'
      }
    ];
    
    this.filteredRecords = [...this.hologramRecords];
  }
  
  applyFilters() {
    this.filteredRecords = this.hologramRecords.filter(record => {
      const dateMatch = !this.selectedDate || record.date === this.selectedDate;
      const statusMatch = !this.selectedStatus || record.status === this.selectedStatus;
      return dateMatch && statusMatch;
    });
  }
  
  clearFilters() {
    this.selectedDate = '';
    this.selectedStatus = '';
    this.filteredRecords = [...this.hologramRecords];
  }
  
  approveRecord(record: HologramRecord) {
    record.status = 'APPROVED';
    // Add API call here
    console.log('Approved record:', record);
  }
  
  rejectRecord(record: HologramRecord) {
    record.status = 'REJECTED';
    // Add API call here
    console.log('Rejected record:', record);
  }
  
  getStatusClass(status: string): string {
    switch (status) {
      case 'PENDING': return 'bg-warning text-dark';
      case 'APPROVED': return 'bg-success';
      case 'REJECTED': return 'bg-danger';
      default: return 'bg-secondary';
    }
  }
  
  getStatusIcon(status: string): string {
    switch (status) {
      case 'PENDING': return 'bi-clock';
      case 'APPROVED': return 'bi-check-circle';
      case 'REJECTED': return 'bi-x-circle';
      default: return 'bi-question-circle';
    }
  }
  
  getTotalHolograms(): number {
    return this.filteredRecords.reduce((total, record) => total + record.numberOfHolograms, 0);
  }
  
  getStatusCount(status: string): number {
    return this.filteredRecords.filter(record => record.status === status).length;
  }
}
