import { Injectable } from '@angular/core';

export interface SingleWindowSearchState {
  searchQuery: string;
  searchMode: 'registry' | 'payment';
  hasSearched: boolean;
  searchResults: any[];
  latestUsers: any[];
  latestRecords: any[];
  latestDeactivatedUsers: any[];
  latestUsersCount: number;
  latestRecordsCount: number;
  latestDeactivatedUsersCount: number;
  activeLatestTab: string;
  selectedTab: string;
  adminPageIndex: number;
  licensePageIndex: number;
  deactivatedPageIndex: number;
  showAdvancedFilters: boolean;
  filterDay: string;
  filterMonth: string;
  filterYear: string;
  filterCategory: string;
  filterRole: string;
  filterModule: string;
}

@Injectable({
  providedIn: 'root'
})
export class SingleWindowSearchStateService {
  private state: SingleWindowSearchState | null = null;

  save(state: SingleWindowSearchState): void {
    this.state = { ...state };
  }

  restore(): SingleWindowSearchState | null {
    return this.state;
  }

  clear(): void {
    this.state = null;
  }

  hasState(): boolean {
    return this.state !== null && this.state.hasSearched;
  }
}
