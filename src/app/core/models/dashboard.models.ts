// Re-export User from role models for convenience
export type { User } from './role.models';

export interface DashboardConfig {
  roleId: number;
  roleName: string;
  layout: 'admin' | 'licensee' | 'permit-section' | 'commissioner';
  widgets: DashboardWidget[];
  navigation: NavigationItem[];
  theme?: DashboardTheme;
  permissions: string[];
}

export interface DashboardWidget {
  id: string;
  type: 'stats-overview' | 'chart-widget' | 'table-widget' | 'application-stats' | 'custom';
  title: string;
  subtitle?: string;
  position: WidgetPosition;
  size: WidgetSize;
  permissions: string[];
  data: WidgetData;
  config?: WidgetConfig;
  isVisible?: boolean;
  isLoading?: boolean;
}

export interface WidgetPosition {
  row: number;
  col: number;
  colspan?: number;
  rowspan?: number;
}

export interface WidgetSize {
  width: 'small' | 'medium' | 'large' | 'full';
  height: 'small' | 'medium' | 'large' | 'auto';
}

export interface WidgetData {
  endpoint?: string;
  staticData?: any;
  refreshInterval?: number; // in seconds
  filters?: WidgetFilter[];
}

export interface WidgetFilter {
  key: string;
  label: string;
  type: 'select' | 'date' | 'daterange' | 'text';
  options?: FilterOption[];
  defaultValue?: any;
}

export interface FilterOption {
  value: any;
  label: string;
}

export interface WidgetConfig {
  showHeader?: boolean;
  showRefresh?: boolean;
  showFullscreen?: boolean;
  showExport?: boolean;
  customActions?: WidgetAction[];
}

export interface WidgetAction {
  id: string;
  label: string;
  icon: string;
  action: string;
  permissions?: string[];
}

export interface NavigationItem {
  label: string;
  route: string;
  icon: string;
  permissions?: string[];
  children?: NavigationItem[];
  badge?: NavigationBadge;
}

export interface NavigationBadge {
  value: string | number;
  color: 'primary' | 'accent' | 'warn';
}

export interface DashboardTheme {
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  cardBackground: string;
}

export interface StatCard {
  type: string;
  value: number | string;
  label: string;
  icon: string;
  colorClass: string;
  route?: string;
  permissions?: string[];
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
}

export interface TableColumn {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'status' | 'action';
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
}

export interface DashboardData {
  stats?: any;
  chartData?: ChartData;
  tableData?: any[];
  filters?: any;
  metadata?: any;
}