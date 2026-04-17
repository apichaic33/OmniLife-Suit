import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

const firebaseConfig = {
  projectId:         'gen-lang-client-0528383957',
  appId:             '1:77866909714:web:e1fc89b78830597b9958cb',
  apiKey:            'AIzaSyAeU8mYIVIeZnJMojedqOkmjmQGkvcTsQw',
  authDomain:        'gen-lang-client-0528383957.firebaseapp.com',
  databaseURL:       'ai-studio-7d1fc15a-b760-4cb1-a6a0-191752b4f2ac',
  storageBucket:     'gen-lang-client-0528383957.firebasestorage.app',
  messagingSenderId: '77866909714',
};

const app = initializeApp(firebaseConfig);
export const db   = getFirestore(app, 'ai-studio-7d1fc15a-b760-4cb1-a6a0-191752b4f2ac');
export const auth = getAuth(app);

// Sign in anonymously so Firestore auth rules are satisfied
signInAnonymously(auth).catch(() => {
  // If anonymous auth is disabled: Firebase Console → Authentication → Sign-in providers → Anonymous → Enable
});
