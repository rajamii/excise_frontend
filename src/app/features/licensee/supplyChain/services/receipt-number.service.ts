import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ReceiptNumberService {
  
  /**
   * Generate or retrieve a receipt number for a given reference number
   * This ensures the same receipt number is used across all views
   */
  getReceiptNumber(refNo: string, type: string = 'HOLOGRAM'): string {
    const storageKey = `receipt_${refNo}_${type}`;
    
    // Check if receipt number already exists in localStorage
    const existingReceipt = localStorage.getItem(storageKey);
    if (existingReceipt) {
      return existingReceipt;
    }
    
    // Generate new receipt number
    const receiptNo = this.generateReceiptNumber(refNo, type);
    
    // Store it for future use
    localStorage.setItem(storageKey, receiptNo);
    
    return receiptNo;
  }
  
  /**
   * Generate a new receipt number based on reference number and type
   */
  private generateReceiptNumber(refNo: string, type: string): string {
    // Format: TXN-{REF_NO}-{TIMESTAMP}
    // Example: TXN-YB-25-BREW-25-1763700291034
    const cleanRefNo = refNo.replace(/\//g, '-');
    const timestamp = Date.now();
    return `TXN-${cleanRefNo}-${timestamp}`;
  }
  
  /**
   * Clear receipt number (useful for testing or if payment fails)
   */
  clearReceiptNumber(refNo: string, type: string = 'HOLOGRAM'): void {
    const storageKey = `receipt_${refNo}_${type}`;
    localStorage.removeItem(storageKey);
  }
  
  /**
   * Get all receipt numbers for a reference (useful when multiple types exist)
   */
  getAllReceiptsForRef(refNo: string): { [key: string]: string } {
    const receipts: { [key: string]: string } = {};
    const types = ['HOLOGRAM', 'REQUISITION', 'REVALIDATION', 'CANCELLATION', 'TRANSIT'];
    
    types.forEach(type => {
      const storageKey = `receipt_${refNo}_${type}`;
      const receipt = localStorage.getItem(storageKey);
      if (receipt) {
        receipts[type] = receipt;
      }
    });
    
    return receipts;
  }
}
