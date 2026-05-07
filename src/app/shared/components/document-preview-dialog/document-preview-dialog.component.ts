import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface DocumentPreviewDialogData {
  url: string;
}

@Component({
  selector: 'app-document-preview-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './document-preview-dialog.component.html',
  styleUrls: ['./document-preview-dialog.component.scss']
})
export class DocumentPreviewDialogComponent {
  readonly url: string;
  readonly isImage: boolean;

  constructor(
    private dialogRef: MatDialogRef<DocumentPreviewDialogComponent>,
    @Inject(MAT_DIALOG_DATA) data: DocumentPreviewDialogData
  ) {
    this.url = String(data?.url || '').trim();
    this.isImage = this.detectIsImage(this.url);
  }

  close(): void {
    this.dialogRef.close();
  }

  openInNewTab(): void {
    if (!this.url) return;
    window.open(this.url, '_blank', 'noopener');
  }

  private detectIsImage(url: string): boolean {
    const lower = String(url || '').toLowerCase();
    return lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp');
  }
}
