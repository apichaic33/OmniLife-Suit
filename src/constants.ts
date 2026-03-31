import { Category } from "./types";

export const CATEGORIES: { id: Category; label: string; icon: string; color: string }[] = [
  { id: 'tasks', label: 'Tasks & Habits', icon: 'CheckSquare', color: 'blue' },
  { id: 'fitness', label: 'Fitness & Diet', icon: 'Dumbbell', color: 'green' },
  { id: 'assets', label: 'Assets & Trade', icon: 'Wallet', color: 'amber' },
  { id: 'projects', label: 'Projects', icon: 'Layout', color: 'purple' },
  { id: 'agriculture', label: 'Agriculture', icon: 'Leaf', color: 'emerald' },
  { id: 'finance', label: 'Finance & Cashflow', icon: 'TrendingUp', color: 'rose' },
];
