export class Notification {
  id?: number;
  subject!: string;
  category!: 'act' | 'rule' | 'circular';
  notificationDate!: string;
  notificationFile?: string | File | null;
  notificationFileUrl?: string | null;
  notificationFileDownloadUrl?: string | null;
  isActive!: boolean;
  status?: string;
}
