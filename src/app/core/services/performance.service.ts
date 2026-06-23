import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent } from 'rxjs';
import { debounceTime, throttleTime } from 'rxjs/operators';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  apiResponseTime: number;
  memoryUsage: number;
  networkRequests: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

@Injectable({
  providedIn: 'root'
})
export class PerformanceService {
  private metricsSubject = new BehaviorSubject<PerformanceMetrics>({
    loadTime: 0,
    renderTime: 0,
    apiResponseTime: 0,
    memoryUsage: 0,
    networkRequests: 0
  });

  public metrics$ = this.metricsSubject.asObservable();
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.initializePerformanceMonitoring();
  }

  private initializePerformanceMonitoring(): void {
    // Monitor page load performance
    if (typeof window !== 'undefined' && window.performance) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          const loadTime = navigation.loadEventEnd - navigation.fetchStart;
          
          this.updateMetrics({ loadTime });
        }, 0);
      });

      // Monitor memory usage (if available)
      if ('memory' in performance) {
        setInterval(() => {
          const memory = (performance as any).memory;
          const memoryUsage = memory.usedJSHeapSize / memory.totalJSHeapSize;
          this.updateMetrics({ memoryUsage });
        }, 30000); // Every 30 seconds
      }
    }
  }

  // Cache Management
  setCache<T>(key: string, data: T, duration: number = this.DEFAULT_CACHE_DURATION): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + duration
    };
    this.cache.set(key, entry);
  }

  getCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clearCache(pattern?: string): void {
    if (pattern) {
      const regex = new RegExp(pattern);
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  // Performance Measurement
  measureApiCall<T>(apiCall: Observable<T>, endpoint: string): Observable<T> {
    const startTime = performance.now();
    
    return new Observable(observer => {
      apiCall.subscribe({
        next: (data) => {
          const endTime = performance.now();
          const responseTime = endTime - startTime;
          
          this.updateMetrics({ 
            apiResponseTime: responseTime,
            networkRequests: this.metricsSubject.value.networkRequests + 1
          });
          
          observer.next(data);
        },
        error: (error) => {
          const endTime = performance.now();
          const responseTime = endTime - startTime;
          
          this.updateMetrics({ 
            apiResponseTime: responseTime,
            networkRequests: this.metricsSubject.value.networkRequests + 1
          });
          
          observer.error(error);
        },
        complete: () => observer.complete()
      });
    });
  }

  measureRenderTime(componentName: string, renderFunction: () => void): void {
    const startTime = performance.now();
    
    renderFunction();
    
    requestAnimationFrame(() => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      this.updateMetrics({ renderTime });
    });
  }

  // Debounced and Throttled Observables
  createDebouncedObservable<T>(source: Observable<T>, delay: number = 300): Observable<T> {
    return source.pipe(debounceTime(delay));
  }

  createThrottledObservable<T>(source: Observable<T>, delay: number = 1000): Observable<T> {
    return source.pipe(throttleTime(delay));
  }

  // Resize Observer for Responsive Components
  createResizeObserver(element: Element): Observable<ResizeObserverEntry[]> {
    return new Observable(observer => {
      if (typeof ResizeObserver === 'undefined') {
        // Fallback for browsers without ResizeObserver
        const resizeHandler = () => observer.next([]);
        window.addEventListener('resize', resizeHandler);
        return () => window.removeEventListener('resize', resizeHandler);
      }

      const resizeObserver = new ResizeObserver(entries => {
        observer.next(entries);
      });

      resizeObserver.observe(element);

      return () => resizeObserver.disconnect();
    });
  }

  // Intersection Observer for Lazy Loading
  createIntersectionObserver(
    element: Element, 
    options: IntersectionObserverInit = {}
  ): Observable<IntersectionObserverEntry[]> {
    return new Observable(observer => {
      const intersectionObserver = new IntersectionObserver(entries => {
        observer.next(entries);
      }, options);

      intersectionObserver.observe(element);

      return () => intersectionObserver.disconnect();
    });
  }

  // Image Lazy Loading
  lazyLoadImage(img: HTMLImageElement, src: string): void {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          img.src = src;
          img.classList.add('loaded');
          observer.unobserve(img);
        }
      });
    });

    observer.observe(img);
  }

  // Bundle Size Analysis
  analyzeBundleSize(): void {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const jsResources = resources.filter(resource => 
        resource.name.includes('.js') && !resource.name.includes('node_modules')
      );

      console.group('Bundle Analysis');
      jsResources.forEach(resource => {
        const size = resource.transferSize || resource.encodedBodySize;
      });
      console.groupEnd();
    }
  }

  // Memory Leak Detection
  detectMemoryLeaks(): void {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in performance) {
      const memory = (performance as any).memory;
      const threshold = 50 * 1024 * 1024; // 50MB

      if (memory.usedJSHeapSize > threshold) {
        console.warn('Potential memory leak detected:', {
          used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
          total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
          limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`
        });
      }
    }
  }

  // Performance Recommendations
  getPerformanceRecommendations(): string[] {
    const metrics = this.metricsSubject.value;
    const recommendations: string[] = [];

    if (metrics.loadTime > 3000) {
      recommendations.push('Consider implementing lazy loading for components');
      recommendations.push('Optimize bundle size by code splitting');
    }

    if (metrics.apiResponseTime > 2000) {
      recommendations.push('Implement API response caching');
      recommendations.push('Consider pagination for large datasets');
    }

    if (metrics.renderTime > 100) {
      recommendations.push('Use OnPush change detection strategy');
      recommendations.push('Implement virtual scrolling for large lists');
    }

    if (metrics.memoryUsage > 0.8) {
      recommendations.push('Check for memory leaks in subscriptions');
      recommendations.push('Implement proper component cleanup');
    }

    return recommendations;
  }

  private updateMetrics(updates: Partial<PerformanceMetrics>): void {
    const currentMetrics = this.metricsSubject.value;
    this.metricsSubject.next({ ...currentMetrics, ...updates });
  }

  // Export metrics for analysis
  exportMetrics(): PerformanceMetrics {
    return { ...this.metricsSubject.value };
  }

  // Reset metrics
  resetMetrics(): void {
    this.metricsSubject.next({
      loadTime: 0,
      renderTime: 0,
      apiResponseTime: 0,
      memoryUsage: 0,
      networkRequests: 0
    });
  }
}