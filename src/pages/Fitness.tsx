import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Dumbbell, 
  Utensils, 
  Activity, 
  TrendingUp, 
  Calendar, 
  ChevronRight,
  MoreVertical,
  Flame,
  Target,
  Clock,
  Trash2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  orderBy,
  limit
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';

interface FitnessLog {
  id: string;
  type: 'workout' | 'diet' | 'weight';
  title: string;
  value: string | number;
  unit?: string;
  category: string;
  time: string;
  uid: string;
  createdAt: any;
}

interface FitnessGoal {
  id: string;
  type: 'muscle' | 'fat_loss' | 'maintenance';
  targetWeight: number;
  currentWeight: number;
  startDate: string;
  endDate: string;
  uid: string;
  createdAt: any;
}

export default function Fitness() {
  const [activeTab, setActiveTab] = useState<'workout' | 'diet' | 'goals'>('workout');
  const [logs, setLogs] = useState<FitnessLog[]>([]);
  const [goals, setGoals] = useState<FitnessGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newLog, setNewLog] = useState({ title: '', value: '', category: '' });
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({ type: 'muscle' as any, targetWeight: '', endDate: '' });

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const qLogs = query(
      collection(db, 'fitness_logs'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const qGoals = query(
      collection(db, 'fitness_goals'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeLogs = onSnapshot(qLogs, (snapshot) => {
      const logList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FitnessLog[];
      setLogs(logList);
      setLoading(false);
    });

    const unsubscribeGoals = onSnapshot(qGoals, (snapshot) => {
      const goalList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FitnessGoal[];
      setGoals(goalList);
    });

    return () => {
      unsubscribeLogs();
      unsubscribeGoals();
    };
  }, []);

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLog.title.trim() || !auth.currentUser) return;

    try {
      await addDoc(collection(db, 'fitness_logs'), {
        ...newLog,
        type: activeTab === 'goals' ? 'weight' : activeTab,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        uid: auth.currentUser.uid,
        createdAt: new Date().toISOString()
      });
      setNewLog({ title: '', value: '', category: '' });
      setIsAdding(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'fitness_logs');
    }
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      const currentWeightLog = logs.find(l => l.type === 'weight');
      const currentWeight = currentWeightLog ? Number(currentWeightLog.value) : 70;

      await addDoc(collection(db, 'fitness_goals'), {
        ...newGoal,
        targetWeight: Number(newGoal.targetWeight),
        currentWeight,
        startDate: new Date().toISOString().split('T')[0],
        uid: auth.currentUser.uid,
        createdAt: new Date().toISOString()
      });
      setNewGoal({ type: 'muscle', targetWeight: '', endDate: '' });
      setIsAddingGoal(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'fitness_goals');
    }
  };

  const deleteGoal = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'fitness_goals', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `fitness_goals/${id}`);
    }
  };

  const deleteLog = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'fitness_logs', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `fitness_logs/${id}`);
    }
  };

  const weightData = logs
    .filter(l => l.type === 'weight')
    .reverse()
    .map(l => ({ name: l.time, weight: Number(l.value) }));

  const displayWeightData = weightData.length > 0 ? weightData : [
    { name: 'Mon', weight: 72.5 },
    { name: 'Tue', weight: 72.8 },
    { name: 'Wed', weight: 72.4 },
    { name: 'Thu', weight: 72.6 },
    { name: 'Fri', weight: 72.2 },
    { name: 'Sat', weight: 72.1 },
    { name: 'Sun', weight: 71.9 },
  ];

  const filteredLogs = logs.filter(l => l.type === activeTab);

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Fitness & Diet</h1>
          <p className="text-gray-500 mt-1">Track your muscle-building progress and nutrition.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 bg-white text-black border border-gray-200 px-6 py-3 rounded-full font-semibold hover:bg-gray-50 transition-all">
            <TrendingUp className="w-5 h-5" />
            <span>Progress</span>
          </button>
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-full font-semibold hover:bg-gray-800 transition-all shadow-lg shadow-black/10"
          >
            <Plus className="w-5 h-5" />
            <span>Log Activity</span>
          </button>
        </div>
      </div>

      {/* Add Goal Form */}
      {isAddingGoal && (
        <form onSubmit={handleAddGoal} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm animate-in slide-in-from-top-4 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <select 
              value={newGoal.type}
              onChange={(e) => setNewGoal({...newGoal, type: e.target.value as any})}
              className="px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-black/5"
            >
              <option value="muscle">Muscle Gain</option>
              <option value="fat_loss">Fat Loss</option>
              <option value="maintenance">Maintenance</option>
            </select>
            <input 
              type="number" 
              placeholder="Target Weight (kg)" 
              value={newGoal.targetWeight}
              onChange={(e) => setNewGoal({...newGoal, targetWeight: e.target.value})}
              className="px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-black/5"
            />
            <input 
              type="date" 
              value={newGoal.endDate}
              onChange={(e) => setNewGoal({...newGoal, endDate: e.target.value})}
              className="px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-black/5"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button 
              type="button"
              onClick={() => setIsAddingGoal(false)}
              className="px-4 py-2 text-sm font-semibold text-gray-400 hover:text-black transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-6 py-2 bg-black text-white rounded-full text-sm font-semibold hover:bg-gray-800 transition-all"
            >
              Set Goal
            </button>
          </div>
        </form>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Calories Burned</p>
            <p className="text-2xl font-bold mt-1 text-gray-900">1,840 <span className="text-xs text-gray-400 font-medium">kcal</span></p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Protein Intake</p>
            <p className="text-2xl font-bold mt-1 text-gray-900">125 <span className="text-xs text-gray-400 font-medium">/ 160g</span></p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Workouts Done</p>
            <p className="text-2xl font-bold mt-1 text-gray-900">{logs.filter(l => l.type === 'workout').length} <span className="text-xs text-gray-400 font-medium">this week</span></p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
          {/* Weight Progress Chart */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-bold text-lg">Weight Progress</h3>
              <select className="text-xs font-semibold bg-gray-50 border-none rounded-lg px-3 py-1.5 focus:ring-0">
                <option>Last 7 Days</option>
                <option>Last 30 Days</option>
              </select>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={displayWeightData}>
                  <defs>
                    <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#000" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#000" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F1F1" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fill: '#9CA3AF'}}
                    dy={10}
                  />
                  <YAxis 
                    hide 
                    domain={['dataMin - 1', 'dataMax + 1']}
                  />
                  <Tooltip 
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="weight" 
                    stroke="#000" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorWeight)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabs Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
              <button 
                onClick={() => setActiveTab('workout')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all",
                  activeTab === 'workout' ? "bg-black text-white" : "text-gray-400 hover:text-black"
                )}
              >
                <Dumbbell className="w-4 h-4" />
                Workouts
              </button>
              <button 
                onClick={() => setActiveTab('diet')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all",
                  activeTab === 'diet' ? "bg-black text-white" : "text-gray-400 hover:text-black"
                )}
              >
                <Utensils className="w-4 h-4" />
                Diet Plan
              </button>
              <button 
                onClick={() => setActiveTab('goals')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all",
                  activeTab === 'goals' ? "bg-black text-white" : "text-gray-400 hover:text-black"
                )}
              >
                <Target className="w-4 h-4" />
                Goals
              </button>
            </div>

            <div className="space-y-3">
              {activeTab === 'goals' ? (
                <div className="space-y-6">
                  {goals.length === 0 ? (
                    <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-gray-200">
                      <p className="text-sm text-gray-400 mb-4">No goals set yet.</p>
                      <button 
                        onClick={() => setIsAddingGoal(true)}
                        className="text-xs font-bold uppercase tracking-widest text-black border-b border-black pb-1"
                      >
                        Set Your First Goal
                      </button>
                    </div>
                  ) : (
                    goals.map((goal) => {
                      const isGain = goal.type === 'muscle';
                      const isLoss = goal.type === 'fat_loss';
                      const diff = Math.abs(goal.currentWeight - goal.targetWeight);
                      const totalDiff = Math.abs(goal.startDate === goal.endDate ? 1 : 10); // Placeholder for total range
                      const progress = Math.min(100, Math.max(0, (1 - (diff / 5)) * 100)); // Simplified progress for demo

                      return (
                        <div key={goal.id} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6 group relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-full -mr-16 -mt-16 -z-10"></div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className={cn(
                                "w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm",
                                isGain ? "bg-black text-white" : isLoss ? "bg-rose-500 text-white" : "bg-blue-500 text-white"
                              )}>
                                <Target className="w-7 h-7" />
                              </div>
                              <div>
                                <h4 className="text-xl font-bold text-gray-900 capitalize">{goal.type.replace('_', ' ')}</h4>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Target: {goal.targetWeight}kg</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-right mr-4">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Deadline</p>
                                <p className="text-xs font-bold text-gray-900">{goal.endDate}</p>
                              </div>
                              <button 
                                onClick={() => deleteGoal(goal.id)}
                                className="p-2 hover:bg-rose-50 text-gray-300 hover:text-rose-500 rounded-full transition-colors"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4 border-y border-gray-50">
                            <div>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Current</p>
                              <p className="text-xl font-bold text-gray-900">{goal.currentWeight}kg</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Remaining</p>
                              <p className="text-xl font-bold text-rose-500">{diff.toFixed(1)}kg</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Recommended Protein</p>
                              <p className="text-xl font-bold text-emerald-500">{(goal.currentWeight * (isGain ? 2 : 1.6)).toFixed(0)}g/day</p>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-gray-400">
                              <span>Overall Progress</span>
                              <span>{progress.toFixed(0)}%</span>
                            </div>
                            <div className="h-3 w-full bg-gray-50 rounded-full overflow-hidden">
                              <div 
                                className={cn(
                                  "h-full rounded-full transition-all duration-1000",
                                  isGain ? "bg-black" : isLoss ? "bg-rose-500" : "bg-blue-500"
                                )}
                                style={{ width: `${progress}%` }}
                              ></div>
                            </div>
                          </div>

                          <div className="bg-gray-50 p-4 rounded-2xl">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                              <Activity className="w-3 h-3" />
                              Daily Strategy
                            </p>
                            <p className="text-xs text-gray-600 leading-relaxed">
                              {isGain 
                                ? "Focus on compound lifts (squats, deadlifts) and maintain a slight calorie surplus of 200-300 kcal."
                                : isLoss 
                                ? "Prioritize high-intensity interval training (HIIT) and maintain a calorie deficit of 500 kcal."
                                : "Focus on maintenance calories and consistent strength training to improve body composition."}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : loading ? (
                <div className="py-12 text-center">
                  <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-xs text-gray-400">Loading logs...</p>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-gray-200">
                  <p className="text-sm text-gray-400">No logs found for this category.</p>
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <div key={log.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-gray-200 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        activeTab === 'workout' ? "bg-purple-50 text-purple-500" : "bg-orange-50 text-orange-500"
                      )}>
                        {activeTab === 'workout' ? <Dumbbell className="w-5 h-5" /> : <Utensils className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{log.title}</h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{log.category}</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {log.time}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider bg-blue-50 text-blue-500">
                        {log.value}
                      </span>
                      <button 
                        onClick={() => deleteLog(log.id)}
                        className="p-2 hover:bg-rose-50 text-gray-400 hover:text-rose-500 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded-full transition-colors opacity-0 group-hover:opacity-100">
                        <MoreVertical className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Info Area */}
        <div className="space-y-8">
          <div className="bg-black text-white p-8 rounded-3xl shadow-xl shadow-black/20">
            <h3 className="font-bold text-lg mb-4">Muscle Building Tip</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Ensure you're getting at least 1.6g of protein per kg of body weight. Consistency in progressive overload is key.
            </p>
            <button className="mt-6 text-xs font-bold uppercase tracking-widest border-b border-white/30 pb-1 hover:border-white transition-all">
              Read More
            </button>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-lg mb-6">Upcoming Events</h3>
            <div className="space-y-6">
              {[
                { title: 'Body Measurement', date: 'Tomorrow, 8 AM', icon: <Activity className="w-4 h-4" /> },
                { title: 'Meal Prep Session', date: 'Sunday, 2 PM', icon: <Calendar className="w-4 h-4" /> },
              ].map((event, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400">
                    {event.icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{event.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{event.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
