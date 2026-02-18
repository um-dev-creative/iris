export interface ApiConfig {
  baseUrl: string;
  apiKey: string;
  authType: 'bearer' | 'apikey' | 'none';
}

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  title?: string;
  timestamp: Date;
  read: boolean;
}

export interface KpiCard {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: string;
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
}
