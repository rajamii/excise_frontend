import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ChartData, ChartDataset } from '../../../../../core/models/dashboard.models';

@Component({
  selector: 'app-chart-widget',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule
  ],
  templateUrl: './chart-widget.component.html',
  styleUrls: ['./chart-widget.component.scss']
})
export class ChartWidgetComponent implements OnInit, OnChanges {
  @Input() data: ChartData | null = null;
  @Input() loading = false;
  @Input() title = 'Chart';
  @Input() subtitle?: string;
  @Input() chartType: 'bar' | 'line' | 'pie' | 'doughnut' = 'bar';
  @Input() showTitle = true;
  @Input() showLegend = true;
  @Input() height = '300px';
  @Output() refreshRequested = new EventEmitter<void>();
  @Output() fullscreenRequested = new EventEmitter<void>();

  chartOptions: any = {};

  ngOnInit() {
    this.setupChartOptions();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['chartType'] || changes['data']) {
      this.setupChartOptions();
    }
  }

  private setupChartOptions() {
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: this.showLegend,
          position: 'top' as const,
          labels: {
            font: {
              size: 12,
              weight: 'normal'
            },
            color: '#333',
            padding: 16,
            usePointStyle: true
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: '#333',
          borderWidth: 1,
          padding: 12,
          displayColors: true,
          callbacks: {
            label: (context: any) => {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              const value = context.parsed.y ?? context.parsed ?? 0;
              label += this.formatValue(value);
              return label;
            }
          }
        }
      },
      animation: {
        duration: 800,
        easing: 'easeInOutQuart'
      }
    };

    switch (this.chartType) {
      case 'bar':
        this.chartOptions = {
          ...baseOptions,
          scales: {
            x: {
              grid: {
                display: false
              },
              ticks: {
                font: {
                  size: 11
                },
                color: '#666'
              }
            },
            y: {
              beginAtZero: true,
              ticks: {
                font: {
                  size: 11
                },
                color: '#666',
                callback: (value: any) => this.formatValue(value)
              },
              grid: {
                color: 'rgba(0, 0, 0, 0.1)'
              }
            }
          }
        };
        break;

      case 'line':
        this.chartOptions = {
          ...baseOptions,
          scales: {
            x: {
              grid: {
                color: 'rgba(0, 0, 0, 0.1)'
              },
              ticks: {
                font: {
                  size: 11
                },
                color: '#666'
              }
            },
            y: {
              beginAtZero: true,
              ticks: {
                font: {
                  size: 11
                },
                color: '#666',
                callback: (value: any) => this.formatValue(value)
              },
              grid: {
                color: 'rgba(0, 0, 0, 0.1)'
              }
            }
          },
          elements: {
            line: {
              tension: 0.4
            },
            point: {
              radius: 4,
              hoverRadius: 6
            }
          }
        };
        break;

      case 'pie':
      case 'doughnut':
        this.chartOptions = {
          ...baseOptions,
          plugins: {
            ...baseOptions.plugins,
            legend: {
              ...baseOptions.plugins.legend,
              position: 'right' as const
            }
          }
        };
        break;
    }
  }

  onRefresh() {
    this.refreshRequested.emit();
  }

  onFullscreen() {
    this.fullscreenRequested.emit();
  }

  private formatValue(value: number): string {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    } else if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return value.toString();
  }

  hasData(): boolean {
    return !!(this.data && this.data.datasets && this.data.datasets.length > 0);
  }
}