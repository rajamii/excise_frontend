import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface HologramRoll {
  id: number;
  cartoonNumber: string;
  type: 'LOCAL' | 'EXPORT' | 'DEFENCE';
  fromSerial: string;
  toSerial: string;
  totalCount: number;
  availableCount: number;
  usedCount: number;
  damagedCount: number;
  status: 'AVAILABLE' | 'IN_USE' | 'COMPLETED' | 'DAMAGED';
  receivedDate: string;
}

interface IssuedHologram {
  id: number;
  batchNumber: string;
  brandName: string;
  fromSerial: string;
  toSerial: string;
  quantity: number;
  issueDate: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  officer: string;
}

interface HologramHistory {
  id: number;
  issueDate: string;
  batchNumber: string;
  brandName: string;
  fromSerial: string;
  toSerial: string;
  quantity: number;
  status: 'COMPLETED' | 'CANCELLED';
  completionDate: string;
  officer: string;
}

interface AvailableHologram {
  id: number;
  cartoonNumber: string;
  type: 'LOCAL' | 'EXPORT' | 'DEFENCE';
  availableRange: string;
  availableCount: number;
  nextSerial: string;
  percentage: number;
  status: 'AVAILABLE' | 'LOW_STOCK' | 'CRITICAL';
}

@Component({
  selector: 'app-hologramoveriew',
  imports: [CommonModule, FormsModule],
  templateUrl: './hologramoveriew.component.html',
  styleUrl: './hologramoveriew.component.scss'
})
export class HologramoveriewComponent implements OnInit {
  activeTab: string = 'rolls';

  rollsData: HologramRoll[] = [];
  issuedData: IssuedHologram[] = [];
  historyData: HologramHistory[] = [];
  availableData: AvailableHologram[] = [];

  // Filter properties
  showAdvancedFilters: boolean = false;
  chartFilters = {
    specificDate: '',
    month: '',
    year: '',
    type: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    minQuantity: null as number | null,
    maxQuantity: null as number | null
  };

  // Date options
  months = [
    { value: '01', label: 'January' }, { value: '02', label: 'February' }, { value: '03', label: 'March' },
    { value: '04', label: 'April' }, { value: '05', label: 'May' }, { value: '06', label: 'June' },
    { value: '07', label: 'July' }, { value: '08', label: 'August' }, { value: '09', label: 'September' },
    { value: '10', label: 'October' }, { value: '11', label: 'November' }, { value: '12', label: 'December' }
  ];

  years = Array.from({ length: 10 }, (_, i) => {
    const year = (new Date().getFullYear() - 5 + i).toString();
    return { value: year, label: year };
  });

  ngOnInit() {
    this.loadRollsData();
    this.loadIssuedData();
    this.loadHistoryData();
    this.loadAvailableData();
    
    // Debug: Log the data to console
    console.log('Rolls Data:', this.rollsData);
    console.log('Available Data:', this.availableData);
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
    console.log('Active tab changed to:', tab);
    console.log('Current rolls data:', this.rollsData);
  }

  loadRollsData() {
    this.rollsData = [
      {
        id: 1,
        cartoonNumber: 'CTN001',
        type: 'LOCAL',
        fromSerial: 'HG001001',
        toSerial: 'HG001500',
        totalCount: 500,
        availableCount: 350,
        usedCount: 120,
        damagedCount: 30,
        status: 'IN_USE',
        receivedDate: '2024-11-01'
      },
      {
        id: 2,
        cartoonNumber: 'CTN002',
        type: 'EXPORT',
        fromSerial: 'HG002001',
        toSerial: 'HG002500',
        totalCount: 500,
        availableCount: 500,
        usedCount: 0,
        damagedCount: 0,
        status: 'AVAILABLE',
        receivedDate: '2024-10-28'
      },
      {
        id: 3,
        cartoonNumber: 'CTN003',
        type: 'DEFENCE',
        fromSerial: 'HG003001',
        toSerial: 'HG003300',
        totalCount: 300,
        availableCount: 0,
        usedCount: 280,
        damagedCount: 20,
        status: 'COMPLETED',
        receivedDate: '2024-10-15'
      },
      {
        id: 4,
        cartoonNumber: 'CTN004',
        type: 'LOCAL',
        fromSerial: 'HG004001',
        toSerial: 'HG004750',
        totalCount: 750,
        availableCount: 600,
        usedCount: 100,
        damagedCount: 50,
        status: 'IN_USE',
        receivedDate: '2024-10-20'
      },
      {
        id: 5,
        cartoonNumber: 'CTN005',
        type: 'EXPORT',
        fromSerial: 'HG005001',
        toSerial: 'HG005400',
        totalCount: 400,
        availableCount: 250,
        usedCount: 130,
        damagedCount: 20,
        status: 'IN_USE',
        receivedDate: '2024-10-25'
      }
    ];
  }

  loadIssuedData() {
    this.issuedData = [
      {
        id: 1,
        batchNumber: 'BATCH-001',
        brandName: 'Premium Whisky',
        fromSerial: 'HG001001',
        toSerial: 'HG001050',
        quantity: 50,
        issueDate: '2024-11-02T10:30:00',
        status: 'IN_PROGRESS',
        officer: 'Rajesh Kumar'
      },
      {
        id: 2,
        batchNumber: 'BATCH-002',
        brandName: 'Royal Rum',
        fromSerial: 'HG001051',
        toSerial: 'HG001120',
        quantity: 70,
        issueDate: '2024-11-03T14:15:00',
        status: 'IN_PROGRESS',
        officer: 'Priya Sharma'
      },
      {
        id: 3,
        batchNumber: 'BATCH-003',
        brandName: 'Export Vodka',
        fromSerial: 'HG005001',
        toSerial: 'HG005080',
        quantity: 80,
        issueDate: '2024-11-04T09:45:00',
        status: 'IN_PROGRESS',
        officer: 'Amit Singh'
      }
    ];
  }

  loadHistoryData() {
    this.historyData = [
      {
        id: 1,
        issueDate: '2024-10-28',
        batchNumber: 'BATCH-098',
        brandName: 'Classic Whisky',
        fromSerial: 'HG003001',
        toSerial: 'HG003100',
        quantity: 100,
        status: 'COMPLETED',
        completionDate: '2024-10-30',
        officer: 'Rajesh Kumar'
      },
      {
        id: 2,
        issueDate: '2024-10-25',
        batchNumber: 'BATCH-097',
        brandName: 'Premium Gin',
        fromSerial: 'HG003101',
        toSerial: 'HG003180',
        quantity: 80,
        status: 'COMPLETED',
        completionDate: '2024-10-27',
        officer: 'Priya Sharma'
      },
      {
        id: 3,
        issueDate: '2024-10-22',
        batchNumber: 'BATCH-096',
        brandName: 'Special Rum',
        fromSerial: 'HG003181',
        toSerial: 'HG003280',
        quantity: 100,
        status: 'COMPLETED',
        completionDate: '2024-10-24',
        officer: 'Amit Singh'
      },
      {
        id: 4,
        issueDate: '2024-10-20',
        batchNumber: 'BATCH-095',
        brandName: 'Export Beer',
        fromSerial: 'HG004001',
        toSerial: 'HG004100',
        quantity: 100,
        status: 'COMPLETED',
        completionDate: '2024-10-22',
        officer: 'Rajesh Kumar'
      },
      {
        id: 5,
        issueDate: '2024-10-18',
        batchNumber: 'BATCH-094',
        brandName: 'Defence Whisky',
        fromSerial: 'HG003281',
        toSerial: 'HG003300',
        quantity: 20,
        status: 'CANCELLED',
        completionDate: '2024-10-19',
        officer: 'Priya Sharma'
      }
    ];
  }

  loadAvailableData() {
    this.availableData = [
      {
        id: 1,
        cartoonNumber: 'CTN001',
        type: 'LOCAL',
        availableRange: 'HG001121 - HG001500',
        availableCount: 350,
        nextSerial: 'HG001121',
        percentage: 70,
        status: 'AVAILABLE'
      },
      {
        id: 2,
        cartoonNumber: 'CTN002',
        type: 'EXPORT',
        availableRange: 'HG002001 - HG002500',
        availableCount: 500,
        nextSerial: 'HG002001',
        percentage: 100,
        status: 'AVAILABLE'
      },
      {
        id: 3,
        cartoonNumber: 'CTN004',
        type: 'LOCAL',
        availableRange: 'HG004101 - HG004750',
        availableCount: 600,
        nextSerial: 'HG004101',
        percentage: 80,
        status: 'AVAILABLE'
      },
      {
        id: 4,
        cartoonNumber: 'CTN005',
        type: 'EXPORT',
        availableRange: 'HG005081 - HG005400',
        availableCount: 250,
        nextSerial: 'HG005081',
        percentage: 62.5,
        status: 'AVAILABLE'
      }
    ];
  }

  getTypeClass(type: string): string {
    switch (type) {
      case 'LOCAL':
        return 'bg-success text-white';
      case 'EXPORT':
        return 'bg-dark text-white';  // Changed from bg-info to bg-dark for better visibility
      case 'DEFENCE':
        return 'bg-warning text-dark';
      default:
        return 'bg-secondary text-white';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-success text-white';
      case 'IN_USE':
      case 'IN_PROGRESS':
        return 'bg-warning text-dark';
      case 'COMPLETED':
        return 'bg-dark text-white';  // Changed from bg-primary to bg-dark for better visibility
      case 'DAMAGED':
      case 'CANCELLED':
        return 'bg-danger text-white';
      case 'LOW_STOCK':
        return 'bg-warning text-dark';
      case 'CRITICAL':
        return 'bg-danger text-white';
      default:
        return 'bg-secondary text-white';
    }
  }

  getTotalAvailable(): number {
    return this.rollsData.reduce((total, roll) => total + roll.availableCount, 0);
  }

  getAvailableByType(type: 'LOCAL' | 'EXPORT' | 'DEFENCE'): number {
    return this.rollsData
      .filter(roll => roll.type === type)
      .reduce((total, roll) => total + roll.availableCount, 0);
  }

  // Filter methods
  applyChartFilters() {
    // This method will be called when filters are applied
    // In a real application, this would filter the chart data
    console.log('Applying chart filters:', this.chartFilters);
    
    // Here you would typically:
    // 1. Filter your data based on the selected criteria
    // 2. Update the chart with filtered data
    // 3. Refresh the analytics
  }

  clearChartFilters() {
    this.chartFilters = {
      specificDate: '',
      month: '',
      year: '',
      type: '',
      status: '',
      dateFrom: '',
      dateTo: '',
      minQuantity: null,
      maxQuantity: null
    };
    this.showAdvancedFilters = false;
    this.applyChartFilters();
  }

  getFilterSummary(): string {
    const filters = [];
    
    if (this.chartFilters.specificDate) {
      filters.push(`Date: ${this.chartFilters.specificDate}`);
    }
    
    if (this.chartFilters.month) {
      const monthName = this.months.find(m => m.value === this.chartFilters.month)?.label;
      filters.push(`Month: ${monthName}`);
    }
    
    if (this.chartFilters.year) {
      filters.push(`Year: ${this.chartFilters.year}`);
    }
    
    if (this.chartFilters.type) {
      filters.push(`Type: ${this.chartFilters.type}`);
    }
    
    if (this.chartFilters.status) {
      filters.push(`Status: ${this.chartFilters.status}`);
    }
    
    if (this.chartFilters.dateFrom && this.chartFilters.dateTo) {
      filters.push(`Range: ${this.chartFilters.dateFrom} to ${this.chartFilters.dateTo}`);
    }
    
    if (this.chartFilters.minQuantity !== null || this.chartFilters.maxQuantity !== null) {
      const min = this.chartFilters.minQuantity || 0;
      const max = this.chartFilters.maxQuantity || '∞';
      filters.push(`Quantity: ${min} - ${max}`);
    }
    
    return filters.length > 0 ? filters.join(', ') : 'All data (no filters applied)';
  }

  getFilteredDataCount(): number {
    // In a real application, this would return the count of filtered records
    // For now, return a mock count based on filters
    let baseCount = 1250000; // Total holograms
    
    if (this.chartFilters.type) baseCount = Math.floor(baseCount * 0.6);
    if (this.chartFilters.status) baseCount = Math.floor(baseCount * 0.8);
    if (this.chartFilters.month) baseCount = Math.floor(baseCount * 0.3);
    
    return baseCount;
  }

  refreshChartData() {
    console.log('Refreshing chart data with current filters');
    this.applyChartFilters();
  }

  exportChartData() {
    console.log('Exporting filtered chart data');
    // In a real application, this would export the filtered data
    alert('Chart data export functionality will be implemented here');
  }
}
