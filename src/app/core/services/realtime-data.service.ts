import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject, interval, fromEvent } from 'rxjs';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { takeUntil, retry, catchError, switchMap, filter } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';

interface RealtimeMessage {
  type: 'dashboard_update' | 'notification' | 'system_alert' | 'user_activity';
  payload: any;
  timestamp: number;
  userId?: number;
  roleId?: number;
}

interface ConnectionStatus {
  isConnected: boolean;
  lastConnected?: Date;
  reconnectAttempts: number;
  latency: number;
}

@Injectable({
  providedIn: 'root'
})
export class RealtimeDataService implements OnDestroy {
  private destroy$ = new Subject<void>();
  private socket$: WebSocketSubject<RealtimeMessage> | null = null;
  
  private connectionStatusSubject = new BehaviorSubject<ConnectionStatus>({
    isConnected: false,
    reconnectAttempts: 0,
    latency: 0
  });
  
  private dashboardUpdatesSubject = new BehaviorSubject<any>(null);
  private notificationsSubject = new BehaviorSubject<any[]>([]);
  private systemAlertsSubject = new BehaviorSubject<any[]>([]);
  
  public connectionStatus$ = this.connectionStatusSubject.asObservable();
  public dashboardUpdates$ = this.dashboardUpdatesSubject.asObservable();
  public notifications$ = this.notificationsSubject.asObservable();
  public systemAlerts$ = this.systemAlertsSubject.asObservable();

  private readonly WS_ENDPOINT = 'ws://localhost:8080/ws'; // Configure based on environment
  private readonly RECONNECT_INTERVAL = 5000;
  private readonly MAX_RECONNECT_ATTEMPTS = 10;
  private readonly HEARTBEAT_INTERVAL = 30000;

  private heartbeatTimer: any;
  private reconnectTimer: any;

  constructor(private http: HttpClient) {
    this.initializeConnection();
    this.setupHeartbeat();
    this.setupVisibilityChangeHandler();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.disconnect();
  }

  private initializeConnection(): void {
    if (typeof WebSocket === 'undefined') {
      console.warn('WebSocket not supported, falling back to polling');
      this.setupPolling();
      return;
    }

    try {
      this.socket$ = webSocket({
        url: this.WS_ENDPOINT,
        openObserver: {
          next: () => {
            console.log('✅ WebSocket connected');
            this.updateConnectionStatus({ 
              isConnected: true, 
              lastConnected: new Date(),
              reconnectAttempts: 0 
            });
          }
        },
        closeObserver: {
          next: () => {
            console.log('❌ WebSocket disconnected');
            this.updateConnectionStatus({ isConnected: false });
            this.scheduleReconnect();
          }
        }
      });

      this.socket$
        .pipe(
          takeUntil(this.destroy$),
          retry({
            count: this.MAX_RECONNECT_ATTEMPTS,
            delay: this.RECONNECT_INTERVAL
          }),
          catchError(error => {
            console.error('WebSocket error:', error);
            this.setupPolling();
            return [];
          })
        )
        .subscribe(message => this.handleMessage(message));

    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      this.setupPolling();
    }
  }

  private handleMessage(message: RealtimeMessage): void {
    console.log('📨 Received message:', message);

    switch (message.type) {
      case 'dashboard_update':
        this.dashboardUpdatesSubject.next(message.payload);
        break;
      
      case 'notification':
        const currentNotifications = this.notificationsSubject.value;
        this.notificationsSubject.next([message.payload, ...currentNotifications]);
        break;
      
      case 'system_alert':
        const currentAlerts = this.systemAlertsSubject.value;
        this.systemAlertsSubject.next([message.payload, ...currentAlerts]);
        break;
      
      case 'user_activity':
        // Handle user activity updates
        break;
    }
  }

  private setupPolling(): void {
    console.log('🔄 Setting up polling fallback');
    
    // Poll for dashboard updates every 30 seconds
    interval(30000)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => this.http.get('/api/dashboard/updates'))
      )
      .subscribe({
        next: (data) => this.dashboardUpdatesSubject.next(data),
        error: (error) => console.error('Polling error:', error)
      });

    // Poll for notifications every 60 seconds
    interval(60000)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => this.http.get('/api/notifications/recent'))
      )
      .subscribe({
        next: (data: any) => this.notificationsSubject.next(data),
        error: (error) => console.error('Notification polling error:', error)
      });
  }

  private setupHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.socket$ && this.connectionStatusSubject.value.isConnected) {
        const startTime = Date.now();
        
        this.socket$.next({
          type: 'system_alert',
          payload: { type: 'heartbeat' },
          timestamp: startTime
        });

        // Measure latency (simplified)
        setTimeout(() => {
          const latency = Date.now() - startTime;
          this.updateConnectionStatus({ latency });
        }, 100);
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  private setupVisibilityChangeHandler(): void {
    if (typeof document !== 'undefined') {
      fromEvent(document, 'visibilitychange')
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          if (document.hidden) {
            // Page is hidden, reduce update frequency
            this.pauseRealtimeUpdates();
          } else {
            // Page is visible, resume normal updates
            this.resumeRealtimeUpdates();
          }
        });
    }
  }

  private scheduleReconnect(): void {
    const currentStatus = this.connectionStatusSubject.value;
    
    if (currentStatus.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      console.log(`🔄 Attempting to reconnect (${currentStatus.reconnectAttempts + 1}/${this.MAX_RECONNECT_ATTEMPTS})`);
      
      this.updateConnectionStatus({ 
        reconnectAttempts: currentStatus.reconnectAttempts + 1 
      });
      
      this.initializeConnection();
    }, this.RECONNECT_INTERVAL);
  }

  private updateConnectionStatus(updates: Partial<ConnectionStatus>): void {
    const currentStatus = this.connectionStatusSubject.value;
    this.connectionStatusSubject.next({ ...currentStatus, ...updates });
  }

  // Public Methods
  sendMessage(message: Omit<RealtimeMessage, 'timestamp'>): void {
    if (this.socket$ && this.connectionStatusSubject.value.isConnected) {
      this.socket$.next({
        ...message,
        timestamp: Date.now()
      });
    } else {
      console.warn('Cannot send message: WebSocket not connected');
    }
  }

  subscribeToWidgetUpdates(widgetId: string): Observable<any> {
    return this.dashboardUpdates$.pipe(
      filter(update => update && update.widgetId === widgetId)
    );
  }

  subscribeToRoleUpdates(roleId: number): Observable<any> {
    return this.dashboardUpdates$.pipe(
      filter(update => update && (update.roleId === roleId || update.roleId === 'all'))
    );
  }

  requestDashboardRefresh(widgetIds?: string[]): void {
    this.sendMessage({
      type: 'dashboard_update',
      payload: {
        action: 'refresh',
        widgetIds: widgetIds || 'all'
      }
    });
  }

  markNotificationAsRead(notificationId: string): void {
    const currentNotifications = this.notificationsSubject.value;
    const updatedNotifications = currentNotifications.map(notification =>
      notification.id === notificationId 
        ? { ...notification, isRead: true }
        : notification
    );
    this.notificationsSubject.next(updatedNotifications);

    // Send to server
    this.sendMessage({
      type: 'notification',
      payload: {
        action: 'mark_read',
        notificationId
      }
    });
  }

  dismissSystemAlert(alertId: string): void {
    const currentAlerts = this.systemAlertsSubject.value;
    const updatedAlerts = currentAlerts.filter(alert => alert.id !== alertId);
    this.systemAlertsSubject.next(updatedAlerts);

    // Send to server
    this.sendMessage({
      type: 'system_alert',
      payload: {
        action: 'dismiss',
        alertId
      }
    });
  }

  pauseRealtimeUpdates(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
  }

  resumeRealtimeUpdates(): void {
    this.setupHeartbeat();
    
    // Request fresh data when resuming
    this.requestDashboardRefresh();
  }

  disconnect(): void {
    if (this.socket$) {
      this.socket$.complete();
      this.socket$ = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.updateConnectionStatus({ isConnected: false });
  }

  reconnect(): void {
    this.disconnect();
    setTimeout(() => this.initializeConnection(), 1000);
  }

  // Statistics and Monitoring
  getConnectionStats(): {
    isConnected: boolean;
    uptime: number;
    messagesReceived: number;
    messagesSent: number;
    averageLatency: number;
  } {
    const status = this.connectionStatusSubject.value;
    
    return {
      isConnected: status.isConnected,
      uptime: status.lastConnected ? Date.now() - status.lastConnected.getTime() : 0,
      messagesReceived: 0, // Would track in real implementation
      messagesSent: 0, // Would track in real implementation
      averageLatency: status.latency
    };
  }

  // Health Check
  performHealthCheck(): Observable<boolean> {
    return new Observable(observer => {
      if (!this.socket$ || !this.connectionStatusSubject.value.isConnected) {
        observer.next(false);
        observer.complete();
        return;
      }

      const startTime = Date.now();
      const timeout = setTimeout(() => {
        observer.next(false);
        observer.complete();
      }, 5000);

      // Send health check message
      this.sendMessage({
        type: 'system_alert',
        payload: { type: 'health_check', timestamp: startTime }
      });

      // Listen for response (simplified)
      const subscription = this.systemAlerts$.subscribe(alerts => {
        const healthResponse = alerts.find(alert => 
          alert.type === 'health_check_response' && 
          alert.timestamp === startTime
        );

        if (healthResponse) {
          clearTimeout(timeout);
          observer.next(true);
          observer.complete();
          subscription.unsubscribe();
        }
      });
    });
  }
}