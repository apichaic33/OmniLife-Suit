import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Calendar, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Tag, 
  MoreVertical,
  ChevronRight,
  Search,
  Filter,
  Trash2,
  RefreshCcw,
  Zap
} from 'lucide-react';
import { cn } from '../lib/utils';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';

interface Task {
  id: string;
  title: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  due: string;
  completed: boolean;
  uid: string;
  createdAt: any;
}

interface Routine {
  id: string;
  title: string;
  frequency: 'daily' | 'weekly';
  time: string;
  completedToday: boolean;
  lastCompleted: string;
  uid: string;
  createdAt: any;
}

export default function Tasks() {
  const [activeTab, setActiveTab] = useState<'all' | 'today' | 'upcoming' | 'completed' | 'routines'>('all');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingRoutine, setIsAddingRoutine] = useState(false);
  const [newRoutine, setNewRoutine] = useState({ title: '', frequency: 'daily' as const, time: '08:00' });

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const qTasks = query(
      collection(db, 'tasks'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const qRoutines = query(
      collection(db, 'routines'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeTasks = onSnapshot(qTasks, (snapshot) => {
      const taskList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Task[];
      setTasks(taskList);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tasks');
    });

    const unsubscribeRoutines = onSnapshot(qRoutines, (snapshot) => {
      const routineList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Routine[];
      setRoutines(routineList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'routines');
    });

    return () => {
      unsubscribeTasks();
      unsubscribeRoutines();
    };
  }, []);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !auth.currentUser) return;

    try {
      await addDoc(collection(db, 'tasks'), {
        title: newTaskTitle,
        category: (window as any).tempCategory || 'Personal',
        priority: (window as any).tempPriority || 'medium',
        due: 'Today',
        completed: false,
        uid: auth.currentUser.uid,
        createdAt: new Date().toISOString()
      });
      setNewTaskTitle('');
      setIsAdding(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'tasks');
    }
  };

  const handleAddRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoutine.title.trim() || !auth.currentUser) return;

    try {
      await addDoc(collection(db, 'routines'), {
        ...newRoutine,
        completedToday: false,
        lastCompleted: '',
        uid: auth.currentUser.uid,
        createdAt: new Date().toISOString()
      });
      setNewRoutine({ title: '', frequency: 'daily', time: '08:00' });
      setIsAddingRoutine(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'routines');
    }
  };

  const toggleRoutine = async (routine: Routine) => {
    try {
      const now = new Date().toISOString();
      await updateDoc(doc(db, 'routines', routine.id), {
        completedToday: !routine.completedToday,
        lastCompleted: !routine.completedToday ? now : routine.lastCompleted
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `routines/${routine.id}`);
    }
  };

  const toggleTask = async (task: Task) => {
    try {
      await updateDoc(doc(db, 'tasks', task.id), {
        completed: !task.completed
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tasks/${task.id}`);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tasks/${id}`);
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (activeTab === 'completed') return task.completed;
    if (activeTab === 'all') return true;
    // Simplified filtering for demo
    if (activeTab === 'today') return !task.completed && task.due.includes('Today');
    if (activeTab === 'upcoming') return !task.completed && !task.due.includes('Today');
    return true;
  });

  const tabs = [
    { id: 'all', label: 'All Tasks' },
    { id: 'today', label: 'Today' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'completed', label: 'Completed' },
    { id: 'routines', label: 'Routines' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Tasks & Habits</h1>
          <p className="text-gray-500 mt-1">Manage your daily routines and long-term goals.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsAddingRoutine(true)}
            className="flex items-center gap-2 bg-white text-black border border-gray-200 px-6 py-3 rounded-full font-semibold hover:bg-gray-50 transition-all"
          >
            <RefreshCcw className="w-5 h-5" />
            <span>New Routine</span>
          </button>
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-full font-semibold hover:bg-gray-800 transition-all shadow-lg shadow-black/10"
          >
            <Plus className="w-5 h-5" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Add Task Form */}
      {isAdding && (
        <form onSubmit={handleAddTask} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm animate-in slide-in-from-top-4 duration-200">
          <input 
            autoFocus
            type="text" 
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="What needs to be done?" 
            className="w-full text-xl font-semibold border-none focus:ring-0 p-0 mb-4"
          />
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Category</p>
              <select 
                className="bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-black/5"
                onChange={(e) => {
                  (window as any).tempCategory = e.target.value;
                }}
              >
                <option>Personal</option>
                <option>Work</option>
                <option>Fitness</option>
                <option>Finance</option>
                <option>Agriculture</option>
                <option>Habit</option>
              </select>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Priority</p>
              <select 
                className="bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-black/5"
                onChange={(e) => {
                  (window as any).tempPriority = e.target.value;
                }}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button 
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 text-sm font-semibold text-gray-400 hover:text-black transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-6 py-2 bg-black text-white rounded-full text-sm font-semibold hover:bg-gray-800 transition-all"
            >
              Add Task
            </button>
          </div>
        </form>
      )}

      {/* Add Routine Form */}
      {isAddingRoutine && (
        <form onSubmit={handleAddRoutine} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm animate-in slide-in-from-top-4 duration-200">
          <input 
            autoFocus
            type="text" 
            value={newRoutine.title}
            onChange={(e) => setNewRoutine({...newRoutine, title: e.target.value})}
            placeholder="Routine name (e.g. Morning Meditation)" 
            className="w-full text-xl font-semibold border-none focus:ring-0 p-0 mb-4"
          />
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Frequency</p>
              <select 
                value={newRoutine.frequency}
                onChange={(e) => setNewRoutine({...newRoutine, frequency: e.target.value as any})}
                className="bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-black/5"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Time</p>
              <input 
                type="time"
                value={newRoutine.time}
                onChange={(e) => setNewRoutine({...newRoutine, time: e.target.value})}
                className="bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-black/5"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button 
              type="button"
              onClick={() => setIsAddingRoutine(false)}
              className="px-4 py-2 text-sm font-semibold text-gray-400 hover:text-black transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-6 py-2 bg-black text-white rounded-full text-sm font-semibold hover:bg-gray-800 transition-all"
            >
              Add Routine
            </button>
          </div>
        </form>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Tasks', value: tasks.length, color: 'bg-blue-50 text-blue-600' },
          { label: 'Completed', value: tasks.filter(t => t.completed).length, color: 'bg-green-50 text-green-600' },
          { label: 'In Progress', value: tasks.filter(t => !t.completed).length, color: 'bg-amber-50 text-amber-600' },
          { label: 'Habit Streak', value: '12 Days', color: 'bg-purple-50 text-purple-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{stat.label}</p>
            <p className={cn("text-2xl font-bold mt-2", stat.color.split(' ')[1])}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filter & Search */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                activeTab === tab.id 
                  ? "bg-black text-white" 
                  : "text-gray-500 hover:bg-gray-100 hover:text-black"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search tasks..." 
              className="pl-10 pr-4 py-2 bg-gray-50 border-none rounded-full text-sm w-full md:w-48 focus:ring-2 focus:ring-black/5 transition-all"
            />
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <Filter className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-12 text-center">
            <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-sm text-gray-400">Loading tasks...</p>
          </div>
        ) : activeTab === 'routines' ? (
          routines.length === 0 ? (
            <div className="py-12 text-center bg-white rounded-3xl border border-dashed border-gray-200">
              <RefreshCcw className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <p className="text-sm text-gray-400">No routines set up yet.</p>
            </div>
          ) : (
            routines.map((routine) => (
              <div 
                key={routine.id} 
                className={cn(
                  "group bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between transition-all hover:shadow-md hover:border-gray-200",
                  routine.completedToday && "bg-green-50/30 border-green-100"
                )}
              >
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => toggleRoutine(routine)}
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                      routine.completedToday 
                        ? "bg-green-500 text-white shadow-lg shadow-green-200" 
                        : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                    )}
                  >
                    {routine.completedToday ? <CheckCircle2 className="w-6 h-6" /> : <Zap className="w-5 h-5" />}
                  </button>
                  <div>
                    <h3 className={cn("font-bold text-gray-900", routine.completedToday && "text-green-700")}>{routine.title}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        <RefreshCcw className="w-3 h-3" />
                        {routine.frequency}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        <Clock className="w-3 h-3" />
                        {routine.time}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {routine.completedToday && (
                    <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest bg-green-100 px-2 py-1 rounded-lg">Done Today</span>
                  )}
                  <button className="p-2 hover:bg-gray-100 rounded-full transition-colors opacity-0 group-hover:opacity-100">
                    <MoreVertical className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>
            ))
          )
        ) : filteredTasks.length === 0 ? (
          <div className="py-12 text-center bg-white rounded-3xl border border-dashed border-gray-200">
            <CheckCircle2 className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-sm text-gray-400">No tasks found in this category.</p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div 
              key={task.id} 
              className={cn(
                "group bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between transition-all hover:shadow-md hover:border-gray-200",
                task.completed && "opacity-60"
              )}
            >
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => toggleTask(task)}
                  className="text-gray-400 hover:text-black transition-colors"
                >
                  {task.completed ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  ) : (
                    <Circle className="w-6 h-6" />
                  )}
                </button>
                <div>
                  <h3 className={cn("font-semibold text-gray-900", task.completed && "line-through")}>{task.title}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      <Tag className="w-3 h-3" />
                      {task.category}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      <Clock className="w-3 h-3" />
                      {task.due}
                    </span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider",
                      task.priority === 'high' ? "bg-rose-50 text-rose-500" : 
                      task.priority === 'medium' ? "bg-amber-50 text-amber-500" : "bg-blue-50 text-blue-500"
                    )}>
                      {task.priority}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => deleteTask(task.id)}
                  className="p-2 hover:bg-rose-50 text-gray-400 hover:text-rose-500 rounded-full transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <MoreVertical className="w-4 h-4 text-gray-400" />
                </button>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
