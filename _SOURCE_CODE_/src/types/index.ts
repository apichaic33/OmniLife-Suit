// TypeScript types generated from firebase-blueprint.json

export interface Trade {
  id?: string;
  pair: string;
  type: 'Buy' | 'Sell';
  price: number;
  amount: number;
  date: string;
  status: 'Open' | 'Closed';
  closePrice?: number;
  closedAt?: string;
  pnl?: number;
  stopLoss?: number;
  takeProfit?: number;
  sentiment?: 'bullish' | 'bearish' | 'neutral';
  notes?: string;
  uid: string;
  createdAt: string;
}

export interface Transaction {
  id?: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  type: 'income' | 'expense';
  debtId?: string;
  businessId?: string;
  taxAmount?: number;
  isTaxDeductible?: boolean;
  uid: string;
  createdAt: string;
}

export interface Debt {
  id?: string;
  title: string;
  type: 'Mortgage' | 'Car Loan' | 'Credit Card' | 'Personal Loan' | 'Installment' | 'Other';
  totalAmount: number;
  remainingBalance: number;
  interestRate: number;
  monthlyPayment: number;
  dueDate: string;
  uid: string;
  createdAt: string;
}

export interface Business {
  id?: string;
  name: string;
  type: 'Rental' | 'E-commerce' | 'Service' | 'Investment' | 'Other';
  description?: string;
  status: 'Active' | 'Inactive';
  monthlyTarget?: number;
  uid: string;
  createdAt: string;
}

export interface Asset {
  id?: string;
  name: string;
  category: string;
  value: number;
  change: string;
  type: 'up' | 'down';
  uid: string;
  createdAt: string;
}

export interface Task {
  id?: string;
  title: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  due?: string;
  completed: boolean;
  uid: string;
  createdAt: string;
}

export interface Routine {
  id?: string;
  title: string;
  frequency: 'daily' | 'weekly';
  time?: string;
  completedToday: boolean;
  lastCompleted?: string;
  uid: string;
  createdAt: string;
}

export interface FitnessLog {
  id?: string;
  title: string;
  type?: string;
  duration?: string;
  intensity?: string;
  completed: boolean;
  calories?: number;
  protein?: string;
  uid: string;
  createdAt: string;
}

export interface FitnessGoal {
  id?: string;
  type: 'muscle' | 'fat_loss' | 'maintenance';
  targetWeight: number;
  currentWeight: number;
  startDate: string;
  endDate: string;
  uid: string;
  createdAt: string;
}

export interface Project {
  id?: string;
  title: string;
  category?: string;
  progress: number;
  tasks: number;
  completedTasks: number;
  due?: string;
  status: string;
  uid: string;
  createdAt: string;
}

export interface Plant {
  id?: string;
  name: string;
  method?: string;
  status: string;
  health: number;
  planted?: string;
  harvest?: string;
  projectId?: string;
  isExperimental: boolean;
  uid: string;
  createdAt: string;
}
