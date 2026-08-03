import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { DashboardWidget, DashboardConfig } from '../models/dashboard.models';
import { secureRandomToken } from '../utils/secure-random';

interface CustomDashboardLayout {
  userId: number;
  roleId: number;
  widgets: CustomWidget[];
  theme: DashboardTheme;
  lastModified: Date;
}

interface CustomWidget extends DashboardWidget {
  isCustom?: boolean;
  isHidden?: boolean;
  customPosition?: { row: number; col: number; colspan?: number; rowspan?: number };
  customSize?: { width: string; height: string };
  customConfig?: any;
}

interface DashboardTheme {
  name: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  cardBackground: string;
  textColor: string;
  isDark: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardCustomizationService {
  private customLayoutSubject = new BehaviorSubject<CustomDashboardLayout | null>(null);
  public customLayout$ = this.customLayoutSubject.asObservable();

  private readonly STORAGE_KEY = 'dashboard_customization';
  
  // Predefined themes
  private readonly THEMES: DashboardTheme[] = [
    {
      name: 'Default',
      primaryColor: '#1976d2',
      accentColor: '#ff4081',
      backgroundColor: '#f5f5f5',
      cardBackground: '#ffffff',
      textColor: '#333333',
      isDark: false
    },
    {
      name: 'Dark',
      primaryColor: '#bb86fc',
      accentColor: '#03dac6',
      backgroundColor: '#121212',
      cardBackground: '#1e1e1e',
      textColor: '#ffffff',
      isDark: true
    },
    {
      name: 'Blue',
      primaryColor: '#2196f3',
      accentColor: '#ffc107',
      backgroundColor: '#e3f2fd',
      cardBackground: '#ffffff',
      textColor: '#1565c0',
      isDark: false
    },
    {
      name: 'Green',
      primaryColor: '#4caf50',
      accentColor: '#ff9800',
      backgroundColor: '#e8f5e8',
      cardBackground: '#ffffff',
      textColor: '#2e7d32',
      isDark: false
    }
  ];

  constructor() {
    this.loadCustomLayout();
  }

  // Layout Management
  saveCustomLayout(layout: CustomDashboardLayout): void {
    layout.lastModified = new Date();
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(layout));
    this.customLayoutSubject.next(layout);
  }

  loadCustomLayout(): CustomDashboardLayout | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const layout = JSON.parse(stored) as CustomDashboardLayout;
        this.customLayoutSubject.next(layout);
        return layout;
      }
    } catch (error) {
      console.error('Error loading custom dashboard layout:', error);
    }
    return null;
  }

  resetToDefault(userId: number, roleId: number): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.customLayoutSubject.next(null);
  }

  // Widget Customization
  updateWidgetPosition(widgetId: string, position: { row: number; col: number; colspan?: number; rowspan?: number }): void {
    const currentLayout = this.customLayoutSubject.value;
    if (!currentLayout) return;

    const widget = currentLayout.widgets.find(w => w.id === widgetId);
    if (widget) {
      widget.customPosition = position;
      this.saveCustomLayout(currentLayout);
    }
  }

  updateWidgetSize(widgetId: string, size: { width: string; height: string }): void {
    const currentLayout = this.customLayoutSubject.value;
    if (!currentLayout) return;

    const widget = currentLayout.widgets.find(w => w.id === widgetId);
    if (widget) {
      widget.customSize = size;
      this.saveCustomLayout(currentLayout);
    }
  }

  toggleWidgetVisibility(widgetId: string): void {
    const currentLayout = this.customLayoutSubject.value;
    if (!currentLayout) return;

    const widget = currentLayout.widgets.find(w => w.id === widgetId);
    if (widget) {
      widget.isHidden = !widget.isHidden;
      this.saveCustomLayout(currentLayout);
    }
  }

  updateWidgetConfig(widgetId: string, config: any): void {
    const currentLayout = this.customLayoutSubject.value;
    if (!currentLayout) return;

    const widget = currentLayout.widgets.find(w => w.id === widgetId);
    if (widget) {
      widget.customConfig = { ...widget.customConfig, ...config };
      this.saveCustomLayout(currentLayout);
    }
  }

  // Custom Widget Creation
  addCustomWidget(widget: CustomWidget): void {
    const currentLayout = this.customLayoutSubject.value;
    if (!currentLayout) return;

    widget.isCustom = true;
    widget.id = `custom_${secureRandomToken(12)}`;
    currentLayout.widgets.push(widget);
    this.saveCustomLayout(currentLayout);
  }

  removeCustomWidget(widgetId: string): void {
    const currentLayout = this.customLayoutSubject.value;
    if (!currentLayout) return;

    const widgetIndex = currentLayout.widgets.findIndex(w => w.id === widgetId && w.isCustom);
    if (widgetIndex > -1) {
      currentLayout.widgets.splice(widgetIndex, 1);
      this.saveCustomLayout(currentLayout);
    }
  }

  // Theme Management
  getAvailableThemes(): DashboardTheme[] {
    return [...this.THEMES];
  }

  getCurrentTheme(): DashboardTheme {
    const currentLayout = this.customLayoutSubject.value;
    return currentLayout?.theme || this.THEMES[0];
  }

  setTheme(theme: DashboardTheme): void {
    const currentLayout = this.customLayoutSubject.value;
    if (currentLayout) {
      currentLayout.theme = theme;
      this.saveCustomLayout(currentLayout);
    }

    // Apply theme to document
    this.applyThemeToDocument(theme);
  }

  private applyThemeToDocument(theme: DashboardTheme): void {
    const root = document.documentElement;
    root.style.setProperty('--dashboard-primary-color', theme.primaryColor);
    root.style.setProperty('--dashboard-accent-color', theme.accentColor);
    root.style.setProperty('--dashboard-background-color', theme.backgroundColor);
    root.style.setProperty('--dashboard-card-background', theme.cardBackground);
    root.style.setProperty('--dashboard-text-color', theme.textColor);
    
    if (theme.isDark) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }

  // Layout Templates
  getLayoutTemplates(): { name: string; description: string; layout: Partial<CustomDashboardLayout> }[] {
    return [
      {
        name: 'Analytics Focus',
        description: 'Emphasizes charts and statistics',
        layout: {
          widgets: [] // Would contain predefined widget arrangements
        }
      },
      {
        name: 'Operations Focus',
        description: 'Emphasizes tables and operational data',
        layout: {
          widgets: [] // Would contain predefined widget arrangements
        }
      },
      {
        name: 'Executive Summary',
        description: 'High-level overview with key metrics',
        layout: {
          widgets: [] // Would contain predefined widget arrangements
        }
      }
    ];
  }

  applyLayoutTemplate(templateName: string, userId: number, roleId: number): void {
    const template = this.getLayoutTemplates().find(t => t.name === templateName);
    if (!template) return;

    const newLayout: CustomDashboardLayout = {
      userId,
      roleId,
      widgets: template.layout.widgets || [],
      theme: this.THEMES[0],
      lastModified: new Date()
    };

    this.saveCustomLayout(newLayout);
  }

  // Widget Library
  getAvailableWidgets(): { id: string; name: string; description: string; type: string; preview?: string }[] {
    return [
      {
        id: 'stats-overview',
        name: 'Statistics Overview',
        description: 'Display key statistics in card format',
        type: 'stats-overview'
      },
      {
        id: 'application-stats',
        name: 'Application Statistics',
        description: 'Detailed application statistics with trends',
        type: 'application-stats'
      },
      {
        id: 'chart-widget',
        name: 'Chart Widget',
        description: 'Display data in various chart formats',
        type: 'chart-widget'
      },
      {
        id: 'table-widget',
        name: 'Data Table',
        description: 'Display tabular data with sorting and filtering',
        type: 'table-widget'
      }
    ];
  }

  // Export/Import Configuration
  exportConfiguration(): string {
    const currentLayout = this.customLayoutSubject.value;
    if (!currentLayout) return '';

    return JSON.stringify(currentLayout, null, 2);
  }

  importConfiguration(configJson: string): boolean {
    try {
      const config = JSON.parse(configJson) as CustomDashboardLayout;
      
      // Validate configuration structure
      if (this.validateConfiguration(config)) {
        this.saveCustomLayout(config);
        return true;
      }
    } catch (error) {
      console.error('Error importing configuration:', error);
    }
    return false;
  }

  private validateConfiguration(config: any): config is CustomDashboardLayout {
    return (
      config &&
      typeof config.userId === 'number' &&
      typeof config.roleId === 'number' &&
      Array.isArray(config.widgets) &&
      config.theme &&
      typeof config.theme.name === 'string'
    );
  }

  // Dashboard Analytics
  getUsageAnalytics(): {
    mostUsedWidgets: { widgetId: string; usage: number }[];
    averageSessionTime: number;
    customizationRate: number;
  } {
    // This would typically come from analytics service
    return {
      mostUsedWidgets: [
        { widgetId: 'stats-overview', usage: 85 },
        { widgetId: 'application-stats', usage: 72 },
        { widgetId: 'table-widget', usage: 68 }
      ],
      averageSessionTime: 1200, // seconds
      customizationRate: 0.45 // 45% of users customize their dashboard
    };
  }

  // Responsive Layout Helpers
  getResponsiveLayout(screenSize: 'mobile' | 'tablet' | 'desktop'): Partial<CustomDashboardLayout> {
    const currentLayout = this.customLayoutSubject.value;
    if (!currentLayout) return {};

    // Adjust widget positions and sizes based on screen size
    const responsiveWidgets = currentLayout.widgets.map(widget => {
      const responsiveWidget = { ...widget };
      
      switch (screenSize) {
        case 'mobile':
          responsiveWidget.customPosition = { row: widget.position.row, col: 1, colspan: 1 };
          responsiveWidget.customSize = { width: 'full', height: 'medium' };
          break;
        case 'tablet':
          responsiveWidget.customPosition = { 
            row: widget.position.row, 
            col: Math.min(widget.position.col, 2), 
            colspan: Math.min(widget.position.colspan || 1, 2) 
          };
          break;
        case 'desktop':
          // Use original layout
          break;
      }
      
      return responsiveWidget;
    });

    return { ...currentLayout, widgets: responsiveWidgets };
  }
}
