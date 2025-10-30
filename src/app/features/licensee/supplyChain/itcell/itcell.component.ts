import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface HologramFormData {
  refNo: string;
  date: string;
  companyName: string;
  localQtyLakh: number | null;
  exportQtyLakh: number | null;
  defenceQtyLakh: number | null;
  status: 'Draft' | 'Submitted' | 'Under Review' | 'Approved' | 'Rejected';
  submittedDate?: string;
  reviewedBy?: string;
  reviewedDate?: string;
  remarks?: string;
  uploadedFile?: File;
}

interface UploadedDocument {
  id: string;
  fileName: string;
  fileSize: number;
  uploadDate: Date;
  fileType: string;
  status: 'Uploaded' | 'Processing' | 'Processed' | 'Error';
  description?: string;
  category: 'Hologram' | 'Permit' | 'License' | 'Other';
}

@Component({
  selector: 'app-itcell',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './itcell.component.html',
  styleUrl: './itcell.component.scss'
})
export class ITCELLComponent implements OnInit {
  selectedTabIndex = 0;
  
  // Hologram Management
  hologramData: HologramFormData[] = [];
  filteredHologramData: HologramFormData[] = [];
  displayedColumns: string[] = ['refNo', 'date', 'companyName', 'localQtyLakh', 'exportQtyLakh', 'defenceQtyLakh', 'status', 'actions'];
  
  // Modal state
  showHologramModal = false;
  selectedHologram: HologramFormData | null = null;
  
  // Filters
  selectedMonth: string = '';
  selectedYear: string = '';
  selectedDate: string = '';
  statusFilter: string = '';
  companyFilter: string = '';
  
  // Upload Documents
  uploadedDocuments: UploadedDocument[] = [];
  selectedFiles: File[] = [];
  uploadProgress: number = 0;
  isUploading: boolean = false;
  
  // Available options
  months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];
  
  years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  statusOptions = ['All', 'Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected'];
  documentCategories = ['Hologram', 'Permit', 'License', 'Other'];
  
  private isBrowser = false;

  constructor(@Inject(PLATFORM_ID) platformId: Object, private router: Router) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    this.loadHologramData();
    this.loadUploadedDocuments();
    this.applyFilters();
  }

  private loadHologramData(): void {
    if (!this.isBrowser) {
      this.hologramData = [];
      return;
    }
    
    const stored = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
    this.hologramData = stored.map((item: any) => ({
      ...item,
      status: item.status || 'Submitted',
      submittedDate: item.submittedDate || item.date,
      reviewedBy: item.reviewedBy || '',
      reviewedDate: item.reviewedDate || '',
      remarks: item.remarks || ''
    }));

    // Add sample data if none exists
    if (this.hologramData.length === 0) {
      this.hologramData = [
        {
          refNo: 'YB/1/BREW/24',
          date: '2024-01-15',
          companyName: 'Yuksom Breweries Ltd.',
          localQtyLakh: 15,
          exportQtyLakh: 0,
          defenceQtyLakh: 0,
          status: 'Under Review',
          submittedDate: '2024-01-15',
          reviewedBy: 'IT Cell',
          reviewedDate: '2024-01-16',
          remarks: 'File forwarded for processing'
        },
        {
          refNo: 'YB/2/BREW/24',
          date: '2024-01-20',
          companyName: 'Yuksom Breweries Ltd.',
          localQtyLakh: 10,
          exportQtyLakh: 2,
          defenceQtyLakh: 0,
          status: 'Approved',
          submittedDate: '2024-01-20',
          reviewedBy: 'Commissioner',
          reviewedDate: '2024-01-22',
          remarks: 'Approved and processed'
        },
        {
          refNo: 'YB/3/BREW/24',
          date: '2024-02-01',
          companyName: 'Yuksom Breweries Ltd.',
          localQtyLakh: 20,
          exportQtyLakh: 0,
          defenceQtyLakh: 1,
          status: 'Draft',
          submittedDate: '2024-02-01',
          reviewedBy: '',
          reviewedDate: '',
          remarks: ''
        }
      ];
    }
  }

  private loadUploadedDocuments(): void {
    if (!this.isBrowser) {
      this.uploadedDocuments = [];
      return;
    }
    
    const stored = JSON.parse(localStorage.getItem('uploadedDocuments') || '[]');
    this.uploadedDocuments = stored.map((item: any) => ({
      ...item,
      uploadDate: new Date(item.uploadDate)
    }));

    // Add sample data if none exists
    if (this.uploadedDocuments.length === 0) {
      this.uploadedDocuments = [
        {
          id: '1',
          fileName: 'hologram_requisition_001.pdf',
          fileSize: 245760,
          uploadDate: new Date('2024-01-15'),
          fileType: 'PDF',
          status: 'Processed',
          description: 'Hologram requisition form',
          category: 'Hologram'
        },
        {
          id: '2',
          fileName: 'permit_application_002.pdf',
          fileSize: 189440,
          uploadDate: new Date('2024-01-20'),
          fileType: 'PDF',
          status: 'Processing',
          description: 'Import permit application',
          category: 'Permit'
        }
      ];
    }
  }

  applyFilters(): void {
    let filtered = [...this.hologramData];

    if (this.selectedMonth) {
      filtered = filtered.filter(item => {
        const itemMonth = new Date(item.date).getMonth() + 1;
        return itemMonth.toString().padStart(2, '0') === this.selectedMonth;
      });
    }

    if (this.selectedYear) {
      filtered = filtered.filter(item => {
        const itemYear = new Date(item.date).getFullYear();
        return itemYear.toString() === this.selectedYear;
      });
    }

    if (this.selectedDate) {
      filtered = filtered.filter(item => item.date === this.selectedDate);
    }

    if (this.statusFilter && this.statusFilter !== 'All') {
      filtered = filtered.filter(item => item.status === this.statusFilter);
    }

    if (this.companyFilter) {
      filtered = filtered.filter(item => 
        item.companyName.toLowerCase().includes(this.companyFilter.toLowerCase())
      );
    }

    this.filteredHologramData = filtered;
  }

  clearFilters(): void {
    this.selectedMonth = '';
    this.selectedYear = '';
    this.selectedDate = '';
    this.statusFilter = '';
    this.companyFilter = '';
    this.applyFilters();
  }

  onFileSelected(event: any, hologram?: HologramFormData): void {
    if (hologram) {
      // File upload for specific hologram record
      const file = event.target.files[0];
      if (file) {
        hologram.uploadedFile = file;
        // Update the hologram data
        this.updateHologramInStorage(hologram);
      }
    } else {
      // General file selection (for bulk upload if needed)
      this.selectedFiles = Array.from(event.target.files);
    }
  }

  removeFile(hologram: HologramFormData): void {
    hologram.uploadedFile = undefined;
    this.updateHologramInStorage(hologram);
  }

  private updateHologramInStorage(hologram: HologramFormData): void {
    if (!this.isBrowser) return;
    
    // Update the hologram in the array
    const index = this.hologramData.findIndex(h => h.refNo === hologram.refNo);
    if (index !== -1) {
      this.hologramData[index] = hologram;
      localStorage.setItem('hologramRequests', JSON.stringify(this.hologramData));
    }
  }

  uploadFiles(): void {
    if (this.selectedFiles.length === 0) return;

    this.isUploading = true;
    this.uploadProgress = 0;

    // Simulate file upload progress
    const interval = setInterval(() => {
      this.uploadProgress += 10;
      if (this.uploadProgress >= 100) {
        clearInterval(interval);
        this.processUploadedFiles();
      }
    }, 200);
  }

  private processUploadedFiles(): void {
    this.selectedFiles.forEach(file => {
      const document: UploadedDocument = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        fileName: file.name,
        fileSize: file.size,
        uploadDate: new Date(),
        fileType: file.type.split('/')[1].toUpperCase(),
        status: 'Processed',
        description: '',
        category: 'Other'
      };

      this.uploadedDocuments.unshift(document);
    });

    if (this.isBrowser) {
      localStorage.setItem('uploadedDocuments', JSON.stringify(this.uploadedDocuments));
    }

    this.selectedFiles = [];
    this.isUploading = false;
    this.uploadProgress = 0;
  }

  downloadDocument(document: UploadedDocument): void {
    // Simulate file download
    console.log('Downloading:', document.fileName);
  }

  deleteDocument(document: UploadedDocument): void {
    this.uploadedDocuments = this.uploadedDocuments.filter(doc => doc.id !== document.id);
    if (this.isBrowser) {
      localStorage.setItem('uploadedDocuments', JSON.stringify(this.uploadedDocuments));
    }
  }

  updateHologramStatus(hologram: HologramFormData, status: string): void {
    hologram.status = status as any;
    hologram.reviewedBy = 'IT Cell';
    hologram.reviewedDate = new Date().toISOString().split('T')[0];
    
    if (status === 'Under Review') {
      hologram.remarks = 'File forwarded for processing';
    } else if (status === 'Approved') {
      hologram.remarks = 'Approved and processed';
    }

    if (this.isBrowser) {
      localStorage.setItem('hologramRequests', JSON.stringify(this.hologramData));
    }
    
    this.applyFilters();
  }

  getTotalHolograms(hologram: HologramFormData): number {
    return (hologram.localQtyLakh || 0) + (hologram.exportQtyLakh || 0) + (hologram.defenceQtyLakh || 0);
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'Draft': return 'warn';
      case 'Submitted': return 'primary';
      case 'Under Review': return 'accent';
      case 'Approved': return 'primary';
      case 'Rejected': return 'warn';
      default: return 'primary';
    }
  }

  viewHologramDetails(hologram: HologramFormData): void {
    this.selectedHologram = hologram;
    this.showHologramModal = true;
  }

  closeHologramDetails(): void {
    this.showHologramModal = false;
    this.selectedHologram = null;
  }

  viewUploadedFile(hologram: HologramFormData): void {
    if (!hologram.uploadedFile) {
      alert('No file uploaded for this hologram request.');
      return;
    }

    // Create a file URL for viewing
    const fileUrl = URL.createObjectURL(hologram.uploadedFile);
    
    // Open file in new tab/window
    const newWindow = window.open(fileUrl, '_blank');
    
    if (!newWindow) {
      alert('Please allow popups to view the file.');
    }
    
    // Clean up the URL after a delay
    setTimeout(() => {
      URL.revokeObjectURL(fileUrl);
    }, 10000);
  }

  downloadUploadedFile(hologram: HologramFormData): void {
    if (!hologram.uploadedFile) {
      alert('No file uploaded for this hologram request.');
      return;
    }

    // Create download link
    const link = document.createElement('a');
    link.href = URL.createObjectURL(hologram.uploadedFile);
    link.download = hologram.uploadedFile.name;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL
    URL.revokeObjectURL(link.href);
  }

  viewApplication(hologram: HologramFormData): void {
    // Navigate to hologram application view page
    const applicationUrl = `/dev-hologram-application-view?ref=${encodeURIComponent(hologram.refNo)}`;
    
    // Open in new tab/window
    window.open(applicationUrl, '_blank');
    
    console.log('Viewing application for:', hologram.refNo);
  }
}
