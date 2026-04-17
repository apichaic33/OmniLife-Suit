import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

const firebaseConfig = {
  apiKey:            'AIzaSyCH5Ajc7y8ooKnbelkw0QJoVj6Dnys3WhY',
  authDomain:        'omnilife-suit.firebaseapp.com',
  projectId:         'omnilife-suit',
  storageBucket:     'omnilife-suit.firebasestorage.app',
  messagingSenderId: '204744463282',
  appId:             '1:204744463282:web:1c84fe7d46914fd2ec0aab',
};

const app = initializeApp(firebaseConfig);
export const db   = getFirestore(app);
export const auth = getAuth(app);

// Sign in anonymously so Firestore auth rules are satisfied
signInAnonymously(auth).catch(() => {
  // If anonymous auth is disabled: Firebase Console → Authentication → Sign-in providers → Anonymous → Enable
});
