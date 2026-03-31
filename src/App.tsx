import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, loginWithGoogle } from './firebase';
import Layout from './components/Layout';
import Tasks from './pages/Tasks';
import Fitness from './pages/Fitness';
import Assets from './pages/Assets';
import Projects from './pages/Projects';
import Agriculture from './pages/Agriculture';
import Finance from './pages/Finance';
import { Category } from './types';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LogIn } from 'lucide-react';

export default function App() {
  const [activeCategory, setActiveCategory] = useState<Category>('tasks');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Simulate a notification on mount
  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        toast.success(`Welcome back, ${user.displayName}!`, {
          description: 'Your all-in-one personal management dashboard is ready.',
          duration: 5000,
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const renderContent = () => {
    switch (activeCategory) {
      case 'tasks':
        return <Tasks />;
      case 'fitness':
        return <Fitness />;
      case 'assets':
        return <Assets />;
      case 'projects':
        return <Projects />;
      case 'agriculture':
        return <Agriculture />;
      case 'finance':
        return <Finance />;
      default:
        return <Tasks />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5]">
        <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5] p-4">
        <div className="max-w-md w-full bg-white p-10 rounded-[40px] shadow-2xl shadow-black/5 border border-gray-100 text-center animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-black rounded-3xl flex items-center justify-center text-white font-bold text-4xl mx-auto mb-8 shadow-xl shadow-black/20">O</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4 tracking-tight">OmniLife Suit</h1>
          <p className="text-gray-500 mb-10 leading-relaxed">
            Manage your tasks, fitness, assets, and more in one beautiful place.
          </p>
          <button
            onClick={loginWithGoogle}
            className="w-full bg-black text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-gray-800 transition-all shadow-lg shadow-black/10 group"
          >
            <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            <span>Login with Google</span>
          </button>
          <p className="mt-8 text-[10px] text-gray-400 uppercase tracking-widest font-bold">
            Secure & Encrypted Dashboard
          </p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Toaster position="top-right" expand={false} richColors />
      <Layout activeCategory={activeCategory} setActiveCategory={setActiveCategory}>
        {renderContent()}
      </Layout>
    </ErrorBoundary>
  );
}
