import { useState } from 'react';
import { Toaster } from 'sonner';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import Dashboard from './pages/Dashboard';
import TradePage from './pages/TradePage';
import FinancePage from './pages/FinancePage';
import TasksPage from './pages/TasksPage';
import FitnessPage from './pages/FitnessPage';
import ProjectsPage from './pages/ProjectsPage';
import AgriculturePage from './pages/AgriculturePage';
import AssetsPage from './pages/AssetsPage';
import MiroFishPage from './pages/MiroFishPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ScannerPage from './pages/ScannerPage';

export type Page =
  | 'dashboard'
  | 'trade'
  | 'finance'
  | 'tasks'
  | 'fitness'
  | 'projects'
  | 'agriculture'
  | 'assets'
  | 'mirofish'
  | 'analytics'
  | 'scanner';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':    return <Dashboard onNavigate={setCurrentPage} />;
      case 'trade':        return <TradePage />;
      case 'finance':      return <FinancePage />;
      case 'tasks':        return <TasksPage />;
      case 'fitness':      return <FitnessPage />;
      case 'projects':     return <ProjectsPage />;
      case 'agriculture':  return <AgriculturePage />;
      case 'assets':       return <AssetsPage />;
      case 'mirofish':     return <MiroFishPage />;
      case 'analytics':    return <AnalyticsPage />;
      case 'scanner':      return <ScannerPage />;
      default:             return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  return (
    <>
      <Toaster position="top-right" theme="dark" richColors />
      <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
        <ErrorBoundary pageKey={currentPage}>
          {renderPage()}
        </ErrorBoundary>
      </Layout>
    </>
  );
}
