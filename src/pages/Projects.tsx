import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Layout, 
  CheckCircle2, 
  Clock, 
  Users, 
  MoreVertical, 
  ChevronRight,
  Search,
  Filter,
  Calendar,
  Layers,
  ArrowRight,
  Trash2
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

interface Project {
  id: string;
  title: string;
  category: string;
  progress: number;
  tasks: number;
  completedTasks: number;
  due: string;
  status: string;
  uid: string;
  createdAt: any;
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProject, setNewProject] = useState({ title: '', category: 'Development', due: '' });

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, 'projects'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Project[];
      setProjects(projectList);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'projects');
    });

    return () => unsubscribe();
  }, []);

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.title.trim() || !auth.currentUser) return;

    try {
      await addDoc(collection(db, 'projects'), {
        ...newProject,
        progress: 0,
        tasks: 0,
        completedTasks: 0,
        status: 'Planning',
        uid: auth.currentUser.uid,
        createdAt: new Date().toISOString()
      });
      setNewProject({ title: '', category: 'Development', due: '' });
      setIsAddingProject(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'projects');
    }
  };

  const deleteProject = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'projects', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `projects/${id}`);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Project Management</h1>
          <p className="text-gray-500 mt-1">Organize complex projects and track their sub-tasks.</p>
        </div>
        <button 
          onClick={() => setIsAddingProject(true)}
          className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-full font-semibold hover:bg-gray-800 transition-all shadow-lg shadow-black/10"
        >
          <Plus className="w-5 h-5" />
          <span>New Project</span>
        </button>
      </div>

      {/* Add Project Form */}
      {isAddingProject && (
        <form onSubmit={handleAddProject} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm animate-in slide-in-from-top-4 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <input 
              type="text" 
              placeholder="Project Title" 
              value={newProject.title}
              onChange={(e) => setNewProject({...newProject, title: e.target.value})}
              className="px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-black/5"
            />
            <select 
              value={newProject.category}
              onChange={(e) => setNewProject({...newProject, category: e.target.value})}
              className="px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-black/5"
            >
              <option>Development</option>
              <option>Personal</option>
              <option>Fitness</option>
              <option>Finance</option>
              <option>Agriculture</option>
            </select>
            <input 
              type="date" 
              value={newProject.due}
              onChange={(e) => setNewProject({...newProject, due: e.target.value})}
              className="px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-black/5"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button 
              type="button"
              onClick={() => setIsAddingProject(false)}
              className="px-4 py-2 text-sm font-semibold text-gray-400 hover:text-black transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-6 py-2 bg-black text-white rounded-full text-sm font-semibold hover:bg-gray-800 transition-all"
            >
              Create Project
            </button>
          </div>
        </form>
      )}

      {/* Project Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center">
            <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-sm text-gray-400">Loading projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white rounded-3xl border border-dashed border-gray-200">
            <p className="text-sm text-gray-400">No projects found. Create one to get started!</p>
          </div>
        ) : (
          projects.map((project) => (
            <div key={project.id} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between group hover:border-gray-200 transition-all hover:shadow-md">
              <div className="space-y-6">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-black group-hover:text-white transition-all">
                    <Layers className="w-6 h-6" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      project.status === 'In Progress' ? "bg-blue-50 text-blue-600" : 
                      project.status === 'Near Completion' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                    )}>
                      {project.status}
                    </span>
                    <button 
                      onClick={() => deleteProject(project.id)}
                      className="p-1 hover:bg-rose-50 text-gray-400 hover:text-rose-500 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                      <MoreVertical className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-black transition-colors">{project.title}</h3>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mt-1">{project.category}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-gray-400">Progress</span>
                    <span className="text-gray-900">{project.progress}%</span>
                  </div>
                  <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden">
                    <div className="h-full bg-black rounded-full transition-all duration-1000" style={{ width: `${project.progress}%` }}></div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-50">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-bold text-gray-900">{project.completedTasks}/{project.tasks}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-bold text-gray-900">{project.due || 'No date'}</span>
                  </div>
                </div>
                <button className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-all">
                  View Tasks
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Task List Preview (Static for now, could be connected to a sub-tasks collection) */}
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <h3 className="font-bold text-lg">Recent Sub-tasks</h3>
          <button className="text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-all">View All</button>
        </div>
        <div className="space-y-4">
          {[
            { title: 'Design system implementation', project: 'OmniLife App Redesign', status: 'Done', date: 'Today' },
            { title: 'Buy soil and nutrients', project: 'Home Garden Setup', status: 'Pending', date: 'Tomorrow' },
            { title: 'Finalize workout schedule', project: 'Muscle Building Program', status: 'In Review', date: 'Today' },
          ].map((task, i) => (
            <div key={i} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-colors cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  task.status === 'Done' ? "bg-emerald-500" : 
                  task.status === 'Pending' ? "bg-amber-500" : "bg-blue-500"
                )}></div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{task.title}</p>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mt-0.5">{task.project}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <span className="text-xs font-bold text-gray-400">{task.date}</span>
                <ChevronRight className="w-4 h-4 text-gray-200 group-hover:text-gray-400 transition-colors" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
