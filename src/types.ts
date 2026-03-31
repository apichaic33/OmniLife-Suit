export type Category = 'tasks' | 'fitness' | 'assets' | 'projects' | 'agriculture' | 'finance';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
  read: boolean;
  category?: Category;
}

export interface UserSettings {
  notifications: {
    toast: boolean;
    browserPush: boolean;
    sound: boolean;
    quietHours: {
      enabled: boolean;
      start: string; // HH:mm
      end: string; // HH:mm
    };
    preReminderMinutes: number;
  };
}
