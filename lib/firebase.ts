// lib/firebase.ts — inicialización Firebase client SDK
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0]!;
}

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

/**
 * Retorna el token JWT del usuario actual, refrescándolo si está por expirar.
 * Lanza si no hay usuario autenticado.
 */
export async function getCurrentUserToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('No hay usuario autenticado');
  return user.getIdToken();
}

export { signInWithPopup, signOut, onAuthStateChanged, type User };
