import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { StatsOverviewComponent } from './stats-overview.component';

describe('StatsOverviewComponent', () => {
  let component: StatsOverviewComponent;
  let fixture: ComponentFixture<StatsOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StatsOverviewComponent],
      imports: [
        MatCardModule,
        MatIconModule,
        MatButtonModule,
        MatTooltipModule
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StatsOverviewComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Data Processing', () => {
    it('should process stats data correctly', () => {
      const mockData = {
        applied: 50,
        pending: 25,
        approved: 75,
        rejected: 10
      };

      component.data = mockData;
      component.ngOnInit();

      expect(component.statsData.length).toBe(4);
      expect(component.statsData[0].value).toBe(50);
      expect(component.statsData[0].type).toBe('applied');
      expect(component.statsData[1].value).toBe(25);
      expect(component.statsData[1].type).toBe('pending');
    });

    it('should handle empty data', () => {
      component.data = null;
      component.ngOnInit();

      expect(component.statsData.length).toBe(0);
    });

    it('should include executed stat when available', () => {
      const mockData = {
        applied: 50,
        pending: 25,
        approved: 75,
        rejected: 10,
        executed: 60
      };

      component.data = mockData;
      component.ngOnInit();

      expect(component.statsData.length).toBe(5);
      expect(component.statsData.find(s => s.type === 'executed')).toBeTruthy();
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      const mockData = {
        applied: 50,
        pending: 25,
        approved: 75,
        rejected: 10
      };

      component.data = mockData;
      component.cardClickable = true;
      fixture.detectChanges();
    });

    it('should emit stat clicked event', () => {
      spyOn(component.statClicked, 'emit');

      const statCard = fixture.debugElement.query(By.css('.stat-card'));
      statCard.nativeElement.click();

      expect(component.statClicked.emit).toHaveBeenCalled();
    });

    it('should emit refresh requested event', () => {
      spyOn(component.refreshRequested, 'emit');

      const refreshButton = fixture.debugElement.query(By.css('.refresh-btn'));
      refreshButton.nativeElement.click();

      expect(component.refreshRequested.emit).toHaveBeenCalled();
    });

    it('should not emit click event when cards are not clickable', () => {
      component.cardClickable = false;
      fixture.detectChanges();

      spyOn(component.statClicked, 'emit');

      const statCard = fixture.debugElement.query(By.css('.stat-card'));
      statCard.nativeElement.click();

      expect(component.statClicked.emit).not.toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('should show loading overlay when loading', () => {
      component.loading = true;
      fixture.detectChanges();

      const loadingOverlay = fixture.debugElement.query(By.css('.loading-overlay'));
      expect(loadingOverlay).toBeTruthy();
    });

    it('should hide loading overlay when not loading', () => {
      component.loading = false;
      fixture.detectChanges();

      const loadingOverlay = fixture.debugElement.query(By.css('.loading-overlay'));
      expect(loadingOverlay).toBeFalsy();
    });

    it('should disable refresh button when loading', () => {
      component.loading = true;
      fixture.detectChanges();

      const refreshButton = fixture.debugElement.query(By.css('.refresh-btn'));
      expect(refreshButton.nativeElement.disabled).toBeTruthy();
    });
  });

  describe('Value Formatting', () => {
    it('should format large numbers correctly', () => {
      expect(component.formatValue(1500)).toBe('1.5K');
      expect(component.formatValue(1500000)).toBe('1.5M');
      expect(component.formatValue(500)).toBe('500');
    });

    it('should handle string values', () => {
      expect(component.formatValue('test')).toBe('test');
    });
  });

  describe('Template Rendering', () => {
    beforeEach(() => {
      const mockData = {
        applied: 50,
        pending: 25,
        approved: 75,
        rejected: 10
      };

      component.data = mockData;
      component.title = 'Test Statistics';
      fixture.detectChanges();
    });

    it('should display title when showTitle is true', () => {
      component.showTitle = true;
      fixture.detectChanges();

      const title = fixture.debugElement.query(By.css('.widget-title'));
      expect(title.nativeElement.textContent.trim()).toBe('Test Statistics');
    });

    it('should hide title when showTitle is false', () => {
      component.showTitle = false;
      fixture.detectChanges();

      const title = fixture.debugElement.query(By.css('.widget-title'));
      expect(title).toBeFalsy();
    });

    it('should render correct number of stat cards', () => {
      const statCards = fixture.debugElement.queryAll(By.css('.stat-card'));
      expect(statCards.length).toBe(4);
    });

    it('should display empty state when no data', () => {
      component.data = null;
      component.loading = false;
      fixture.detectChanges();

      const emptyState = fixture.debugElement.query(By.css('.empty-state'));
      expect(emptyState).toBeTruthy();
    });
  });
});