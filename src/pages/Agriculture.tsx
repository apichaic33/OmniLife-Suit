import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Leaf, 
  Droplets, 
  Thermometer, 
  Sun, 
  Wind, 
  History, 
  ChevronRight,
  MoreVertical,
  Search,
  Filter,
  Sprout,
  FlaskConical,
  Home,
  Trash2,
  Package,
  CheckCircle2,
  Circle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  orderBy
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';

interface Plant {
  id: string;
  name: string;
  method: string;
  status: string;
  health: number;
  planted: string;
  harvest: string;
  uid: string;
  createdAt: any;
}

export default function Agriculture() {
  const [activeTab, setActiveTab] = useState<'real' | 'experimental' | 'assets' | 'tasks'>('real');
  const [plants, setPlants] = useState<Plant[]>([]);
  const [farmAssets, setFarmAssets] = useState<any[]>([]);
  const [farmTasks, setFarmTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingPlant, setIsAddingPlant] = useState(false);
  const [newPlant, setNewPlant] = useState({ name: '', method: 'Hydroponics', planted: '', harvest: '' });

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Plants Query
    const q = query(
      collection(db, 'plants'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    // Farm Assets Query (Assets with category 'Farm' or 'Agriculture')
    const assetsQ = query(
      collection(db, 'assets'),
      where('uid', '==', user.uid),
      where('category', 'in', ['Farm', 'Agriculture', 'Livestock']),
      orderBy('createdAt', 'desc')
    );

    // Farm Tasks Query (Tasks with category 'Agriculture')
    const tasksQ = query(
      collection(db, 'tasks'),
      where('uid', '==', user.uid),
      where('category', '==', 'Agriculture'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribePlants = onSnapshot(q, (snapshot) => {
      const plantList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Plant[];
      setPlants(plantList);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'plants');
    });

    const unsubscribeAssets = onSnapshot(assetsQ, (snapshot) => {
      setFarmAssets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubscribeTasks = onSnapshot(tasksQ, (snapshot) => {
      setFarmTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribePlants();
      unsubscribeAssets();
      unsubscribeTasks();
    };
  }, []);

  const handleAddPlant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlant.name.trim() || !auth.currentUser) return;

    try {
      await addDoc(collection(db, 'plants'), {
        ...newPlant,
        status: 'Growing',
        health: 100,
        uid: auth.currentUser.uid,
        createdAt: new Date().toISOString()
      });
      setNewPlant({ name: '', method: 'Hydroponics', planted: '', harvest: '' });
      setIsAddingPlant(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'plants');
    }
  };

  const deletePlant = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'plants', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `plants/${id}`);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Agriculture Management</h1>
          <p className="text-gray-500 mt-1">Monitor your crops, hydroponics, and greenhouse experiments.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 bg-white text-black border border-gray-200 px-6 py-3 rounded-full font-semibold hover:bg-gray-50 transition-all">
            <FlaskConical className="w-5 h-5" />
            <span>Experiments</span>
          </button>
          <button 
            onClick={() => setIsAddingPlant(true)}
            className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-full font-semibold hover:bg-gray-800 transition-all shadow-lg shadow-black/10"
          >
            <Plus className="w-5 h-5" />
            <span>Add Plant</span>
          </button>
        </div>
      </div>

      {/* Add Plant Form */}
      {isAddingPlant && (
        <form onSubmit={handleAddPlant} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm animate-in slide-in-from-top-4 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <input 
              type="text" 
              placeholder="Plant Name" 
              value={newPlant.name}
              onChange={(e) => setNewPlant({...newPlant, name: e.target.value})}
              className="px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-black/5"
            />
            <select 
              value={newPlant.method}
              onChange={(e) => setNewPlant({...newPlant, method: e.target.value})}
              className="px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-black/5"
            >
              <option>Hydroponics</option>
              <option>Soil</option>
              <option>Greenhouse</option>
              <option>Aquaponics</option>
              <option>Livestock</option>
              <option>Experimental</option>
            </select>
            <input 
              type="date" 
              placeholder="Planted Date"
              value={newPlant.planted}
              onChange={(e) => setNewPlant({...newPlant, planted: e.target.value})}
              className="px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-black/5"
            />
            <input 
              type="date" 
              placeholder="Est. Harvest"
              value={newPlant.harvest}
              onChange={(e) => setNewPlant({...newPlant, harvest: e.target.value})}
              className="px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-black/5"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button 
              type="button"
              onClick={() => setIsAddingPlant(false)}
              className="px-4 py-2 text-sm font-semibold text-gray-400 hover:text-black transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-6 py-2 bg-black text-white rounded-full text-sm font-semibold hover:bg-gray-800 transition-all"
            >
              Save Plant
            </button>
          </div>
        </form>
      )}

      {/* Environment Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Temperature', value: '24.5°C', icon: <Thermometer className="w-4 h-4" />, color: 'text-rose-500' },
          { label: 'Humidity', value: '65%', icon: <Droplets className="w-4 h-4" />, color: 'text-blue-500' },
          { label: 'Light Intensity', value: '850 PAR', icon: <Sun className="w-4 h-4" />, color: 'text-amber-500' },
          { label: 'CO2 Level', value: '420 PPM', icon: <Wind className="w-4 h-4" />, color: 'text-emerald-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
              {stat.icon}
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{stat.label}</p>
              <p className={cn("text-lg font-bold mt-0.5", stat.color)}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center gap-6 border-b border-gray-100 pb-4 overflow-x-auto no-scrollbar">
            <button 
              onClick={() => setActiveTab('real')}
              className={cn(
                "text-sm font-bold uppercase tracking-widest transition-all pb-4 -mb-4.5 border-b-2 whitespace-nowrap",
                activeTab === 'real' ? "text-black border-black" : "text-gray-400 border-transparent hover:text-black"
              )}
            >
              Crops & Livestock
            </button>
            <button 
              onClick={() => setActiveTab('assets')}
              className={cn(
                "text-sm font-bold uppercase tracking-widest transition-all pb-4 -mb-4.5 border-b-2 whitespace-nowrap",
                activeTab === 'assets' ? "text-black border-black" : "text-gray-400 border-transparent hover:text-black"
              )}
            >
              Farm Assets
            </button>
            <button 
              onClick={() => setActiveTab('tasks')}
              className={cn(
                "text-sm font-bold uppercase tracking-widest transition-all pb-4 -mb-4.5 border-b-2 whitespace-nowrap",
                activeTab === 'tasks' ? "text-black border-black" : "text-gray-400 border-transparent hover:text-black"
              )}
            >
              Farm Tasks
            </button>
            <button 
              onClick={() => setActiveTab('experimental')}
              className={cn(
                "text-sm font-bold uppercase tracking-widest transition-all pb-4 -mb-4.5 border-b-2 whitespace-nowrap",
                activeTab === 'experimental' ? "text-black border-black" : "text-gray-400 border-transparent hover:text-black"
              )}
            >
              Experimental
            </button>
          </div>

          <div className="space-y-4">
            {activeTab === 'real' ? (
              loading ? (
                <div className="py-12 text-center">
                  <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-sm text-gray-400">Loading plants...</p>
                </div>
              ) : plants.length === 0 ? (
                <div className="py-12 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                  <p className="text-sm text-gray-400">No plants or livestock tracked yet.</p>
                </div>
              ) : (
                plants.map((plant) => (
                  <div key={plant.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-gray-200 transition-all">
                    <div className="flex items-center gap-6">
                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center transition-all",
                        plant.method === 'Livestock' ? "bg-amber-50 text-amber-500 group-hover:bg-amber-500 group-hover:text-white" : "bg-emerald-50 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white"
                      )}>
                        {plant.method === 'Livestock' ? <Home className="w-7 h-7" /> : <Sprout className="w-7 h-7" />}
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-gray-900">{plant.name}</h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                            <Home className="w-3 h-3" />
                            {plant.method}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Planted: {plant.planted}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-xs font-bold text-gray-900">Health: {plant.health}%</p>
                        <div className="h-1.5 w-24 bg-gray-50 rounded-full mt-1.5 overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${plant.health}%` }}></div>
                        </div>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Est. Harvest</p>
                        <p className="text-sm font-bold text-gray-900 mt-0.5">{plant.harvest}</p>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => deletePlant(plant.id)}
                          className="p-2 hover:bg-rose-50 text-gray-400 hover:text-rose-500 rounded-full transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )
            ) : activeTab === 'assets' ? (
              <div className="space-y-4">
                {farmAssets.length === 0 ? (
                  <div className="py-12 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                    <p className="text-sm text-gray-400">No agricultural assets found. Add them in the Assets section with category "Farm".</p>
                  </div>
                ) : (
                  farmAssets.map((asset) => (
                    <div key={asset.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                          <Package className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900">{asset.name}</h4>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{asset.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">${asset.value.toLocaleString()}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : activeTab === 'tasks' ? (
              <div className="space-y-4">
                {farmTasks.length === 0 ? (
                  <div className="py-12 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                    <p className="text-sm text-gray-400">No agricultural tasks found. Add them in the Tasks section with category "Agriculture".</p>
                  </div>
                ) : (
                  farmTasks.map((task) => (
                    <div key={task.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center",
                          task.completed ? "bg-emerald-50 text-emerald-500" : "bg-gray-50 text-gray-400"
                        )}>
                          {task.completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                        </div>
                        <div>
                          <h4 className={cn("font-bold text-gray-900", task.completed && "line-through")}>{task.title}</h4>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{task.due}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="py-12 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                <p className="text-sm text-gray-400">Experimental mode is currently in planning.</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Area */}
        <div className="space-y-8">
          <div className="bg-emerald-600 text-white p-8 rounded-3xl shadow-xl shadow-emerald-900/20">
            <h3 className="font-bold text-lg mb-4">Farm Tip</h3>
            <p className="text-sm text-emerald-100 leading-relaxed">
              Check the pH level of your hydroponic solution daily. Ideal range for lettuce is 5.5 to 6.5.
            </p>
            <button className="mt-6 text-xs font-bold uppercase tracking-widest border-b border-white/30 pb-1 hover:border-white transition-all">
              View Guide
            </button>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-lg mb-6">Recent Activities</h3>
            <div className="space-y-6">
              {[
                { title: 'Nutrient Refill', date: '2 hours ago', icon: <Droplets className="w-4 h-4" /> },
                { title: 'Pruning Session', date: 'Yesterday', icon: <Leaf className="w-4 h-4" /> },
                { title: 'System Check', date: '2 days ago', icon: <History className="w-4 h-4" /> },
              ].map((act, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400">
                    {act.icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{act.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{act.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Why group with Assets?</h4>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              In modern farm management, your crops, livestock, and machinery are your primary capital assets. Tracking them together ensures a holistic view of your farm's value and operational efficiency.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
