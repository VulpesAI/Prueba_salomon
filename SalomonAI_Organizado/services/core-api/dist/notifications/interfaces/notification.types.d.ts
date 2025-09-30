export type NotificationChannel = 'email' | 'push' | 'sms' | 'in_app';
export type NotificationSeverity = 'info' | 'warning' | 'critical';
export interface NotificationMetadata {
    [key: string]: any;
}
