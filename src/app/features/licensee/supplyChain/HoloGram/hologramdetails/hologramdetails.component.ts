import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface HologramRecord {
  id: number;
  date: string;
  fromSerial: string;
  toSerial: string;
  numberOfHolograms: number;
  previousStock: number;
  newArrival: number;
  totalStock: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  entryType: 'NEW_ARRIVAL' | 'EXISTING';
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
  selectedMonth: string = '';
  selectedYear: string = '';
  selectedStatus: string = '';
  
  // Add new record properties
  showAddForm: boolean = false;
  newRecord: Partial<HologramRecord> = {};
  
  // Date filter options
  months = [
    { value: '', label: 'All Months' },
    { value: '01', label: 'January' }, { value: '02', label: 'February' }, { value: '03', label: 'March' },
    { value: '04', label: 'April' }, { value: '05', label: 'May' }, { value: '06', label: 'June' },
    { value: '07', label: 'July' }, { value: '08', label: 'August' }, { value: '09', label: 'September' },
    { value: '10', label: 'October' }, { value: '11', label: 'November' }, { value: '12', label: 'December' }
  ];
  
  years = Array.from({ length: 10 }, (_, i) => {
    const year = (new Date().getFullYear() - 5 + i).toString();
    return { value: year, label: year };
  });
  
  constructor() {
    this.selectedMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
    this.selectedYear = new Date().getFullYear().toString();
  }
  
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
        previousStock: 1000,
        newArrival: 500,
        totalStock: 1500,
        status: 'PENDING',
        entryType: 'NEW_ARRIVAL'
      },
      {
        id: 2,
        date: '2024-10-28',
        fromSerial: 'HG000501',
        toSerial: 'HG001000',
        numberOfHolograms: 500,
        previousStock: 500,
        newArrival: 500,
        totalStock: 1000,
        status: 'APPROVED',
        entryType: 'NEW_ARRIVAL'
      },
      {
        id: 3,
        date: '2024-10-25',
        fromSerial: 'HG000001',
        toSerial: 'HG000500',
        numberOfHolograms: 500,
        previousStock: 0,
        newArrival: 500,
        totalStock: 500,
        status: 'APPROVED',
        entryType: 'NEW_ARRIVAL'
      }
    ];
    
    this.applyFilters();
  }
  
  applyFilters() {
    this.filteredRecords = this.hologramRecords.filter(record => {
      const recordDate = new Date(record.date);
      
      // Specific date filter
      const dateMatch = !this.selectedDate || record.date === this.selectedDate;
      
      // Month filter
      const monthMatch = !this.selectedMonth || 
        (recordDate.getMonth() + 1).toString().padStart(2, '0') === this.selectedMonth;
      
      // Year filter
      const yearMatch = !this.selectedYear || 
        recordDate.getFullYear().toString() === this.selectedYear;
      
      // Status filter
      const statusMatch = !this.selectedStatus || record.status === this.selectedStatus;
      
      return dateMatch && monthMatch && yearMatch && statusMatch;
    });
  }
  
  clearFilters() {
    this.selectedDate = '';
    this.selectedMonth = '';
    this.selectedYear = '';
    this.selectedStatus = '';
    this.applyFilters();
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
  
  getTotalNewArrivals(): number {
    return this.filteredRecords.reduce((total, record) => total + record.newArrival, 0);
  }
  
  getTotalPreviousStock(): number {
    return this.filteredRecords.reduce((total, record) => total + record.previousStock, 0);
  }
  
  getCurrentTotalStock(): number {
    return this.filteredRecords.reduce((total, record) => total + record.totalStock, 0);
  }
  
  getStatusCount(status: string): number {
    return this.filteredRecords.filter(record => record.status === status).length;
  }
  
  // Add new record methods
  showAddNewRecord() {
    this.showAddForm = true;
    this.newRecord = {
      date: new Date().toISOString().split('T')[0],
      fromSerial: '',
      toSerial: '',
      numberOfHolograms: 0,
      previousStock: this.getLatestTotalStock(),
      newArrival: 0,
      totalStock: 0,
      status: 'PENDING',
      entryType: 'NEW_ARRIVAL'
    };
  }
  
  hideAddForm() {
    this.showAddForm = false;
    this.newRecord = {};
  }
  
  calculateHologramCount() {
    if (this.newRecord.fromSerial && this.newRecord.toSerial) {
      const fromNum = this.extractSerialNumber(this.newRecord.fromSerial);
      const toNum = this.extractSerialNumber(this.newRecord.toSerial);
      
      if (fromNum && toNum && toNum >= fromNum) {
        this.newRecord.numberOfHolograms = toNum - fromNum + 1;
        this.newRecord.newArrival = this.newRecord.numberOfHolograms;
        this.calculateTotalStock();
      }
    }
  }
  
  calculateTotalStock() {
    this.newRecord.totalStock = (this.newRecord.previousStock || 0) + (this.newRecord.newArrival || 0);
  }
  
  extractSerialNumber(serial: string): number | null {
    const match = serial.match(/\d+/);
    return match ? parseInt(match[0]) : null;
  }
  
  getLatestTotalStock(): number {
    if (this.hologramRecords.length === 0) return 0;
    const sortedRecords = [...this.hologramRecords].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return sortedRecords[0]?.totalStock || 0;
  }
  
  saveNewRecord() {
    if (this.validateNewRecord()) {
      const newId = Math.max(...this.hologramRecords.map(r => r.id), 0) + 1;
      const recordToAdd: HologramRecord = {
        id: newId,
        date: this.newRecord.date!,
        fromSerial: this.newRecord.fromSerial!,
        toSerial: this.newRecord.toSerial!,
        numberOfHolograms: this.newRecord.numberOfHolograms!,
        previousStock: this.newRecord.previousStock!,
        newArrival: this.newRecord.newArrival!,
        totalStock: this.newRecord.totalStock!,
        status: 'PENDING',
        entryType: 'NEW_ARRIVAL'
      };
      
      this.hologramRecords.unshift(recordToAdd);
      this.applyFilters();
      this.hideAddForm();
      
      console.log('New hologram record added:', recordToAdd);
    }
  }
  
  validateNewRecord(): boolean {
    if (!this.newRecord.date || !this.newRecord.fromSerial || !this.newRecord.toSerial) {
      alert('Please fill in all required fields');
      return false;
    }
    
    if (!this.newRecord.numberOfHolograms || this.newRecord.numberOfHolograms <= 0) {
      alert('Number of holograms must be greater than 0');
      return false;
    }
    
    return true;
  }
}
