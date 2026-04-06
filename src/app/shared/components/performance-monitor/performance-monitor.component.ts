import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil, interval } from 'rxjs';
import { PerformanceService } from '../../../core/services/performance.service';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  apiResponseTime: number;
  memoryUsage: number;
  networkRequests: number;
}

type PerformanceMetricKey = keyof PerformanceMetrics;

@Component({
  selector: 'app-performance-monitor',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './performance-monitor.component.html',
  styleUrls: ['./performance-monitor.component.scss']
})
export class PerformanceMonitorComponent implements OnInit, OnDestroy {
  @Input() showInProduction = false;
  @Input() position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' = 'bottom-right';
  @Input() minimized = true;

  private destroy$ = new Subject<void>();
  
  metrics: PerformanceMetrics = {
    loadTime: 0,
    renderTime: 0,
    apiResponseTime: 0,
    memoryUsage: 0,
    networkRequests: 0
  };

  recommendations: string[] = [];
  isVisible = false;

  constructor(private performanceService: PerformanceService) {}

  ngOnInit(): void {
    // Only show in development or when explicitly enabled
    this.isVisible = !this.isProduction() || this.showInProduction;
    
    if (this.isVisible) {
      this.subscribeToMetrics();
      this.startPeriodicUpdates();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private subscribeToMetrics(): void {
    this.performanceService.metrics$
      .pipe(takeUntil(this.destroy$))
      .subscribe(metrics => {
        this.metrics = metrics;
        this.recommendations = this.performanceService.getPerformanceRecommendations();
      });
  }

  private startPeriodicUpdates(): void {
    // Update metrics every 5 seconds
    interval(5000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.performanceService.detectMemoryLeaks();
      });
  }

  private isProduction(): boolean {
    return typeof window !== 'undefined' && 
           window.location.hostname !== 'localhost' && 
           !window.location.hostname.includes('dev');
  }

  toggleMinimized(): void {
    this.minimized = !this.minimized;
  }

  exportMetrics(): void {
    const metrics = this.performanceService.exportMetrics();
    const dataStr = JSON.stringify(metrics, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `performance-metrics-${new Date().toISOString()}.json`;
    link.click();
  }

  resetMetrics(): void {
    this.performanceService.resetMetrics();
  }

  analyzeBundleSize(): void {
    this.performanceService.analyzeBundleSize();
  }

  getMetricColor(metricName: string, value: number): string {
    switch (metricName) {
      case 'loadTime':
        return value > 3000 ? '#f44336' : value > 1500 ? '#ff9800' : '#4caf50';
      case 'renderTime':
        return value > 100 ? '#f44336' : value > 50 ? '#ff9800' : '#4caf50';
      case 'apiResponseTime':
        return value > 2000 ? '#f44336' : value > 1000 ? '#ff9800' : '#4caf50';
      case 'memoryUsage':
        return value > 0.8 ? '#f44336' : value > 0.6 ? '#ff9800' : '#4caf50';
      default:
        return '#666';
    }
  }

  formatMetricValue(metricName: string, value: number): string {
    switch (metricName) {
      case 'loadTime':
      case 'renderTime':
      case 'apiResponseTime':
        return `${value.toFixed(0)}ms`;
      case 'memoryUsage':
        return `${(value * 100).toFixed(1)}%`;
      case 'networkRequests':
        return value.toString();
      default:
        return value.toString();
    }
  }

  getMetricLabel(metricName: string): string {
    switch (metricName) {
      case 'loadTime':
        return 'Load Time';
      case 'renderTime':
        return 'Render Time';
      case 'apiResponseTime':
        return 'API Response';
      case 'memoryUsage':
        return 'Memory Usage';
      case 'networkRequests':
        return 'Network Requests';
      default:
        return metricName;
    }
  }

  readonly metricKeys: PerformanceMetricKey[] = [
    'loadTime',
    'renderTime',
    'apiResponseTime',
    'memoryUsage',
    'networkRequests',
  ];

  getPerformanceScore(): number {
    const { loadTime, renderTime, apiResponseTime, memoryUsage } = this.metrics;
    
    let score = 100;
    
    // Deduct points for poor performance
    if (loadTime > 3000) score -= 30;
    else if (loadTime > 1500) score -= 15;
    
    if (renderTime > 100) score -= 20;
    else if (renderTime > 50) score -= 10;
    
    if (apiResponseTime > 2000) score -= 25;
    else if (apiResponseTime > 1000) score -= 12;
    
    if (memoryUsage > 0.8) score -= 25;
    else if (memoryUsage > 0.6) score -= 12;
    
    return Math.max(0, score);
  }

  getScoreColor(): string {
    const score = this.getPerformanceScore();
    if (score >= 80) return '#4caf50';
    if (score >= 60) return '#ff9800';
    return '#f44336';
  }

  getScoreLabel(): string {
    const score = this.getPerformanceScore();
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  }
}
