import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// StrictMode disabled: Firestore onSnapshot listeners fail with INTERNAL ASSERTION
// when React double-mounts components in development (known Firestore SDK bug).
createRoot(document.getElementById('root')!).render(<App />);
