// Firebase integration for Brewo (بريو).
//
// Loaded as a `<script type="module">` from index.html. Exposes the API on
// `window.brewoFirebase` so the existing inline (non-module) app script can
// call into it without being rewritten as a module.
//
// Usage from the existing index.html script:
//   const fb = window.brewoFirebase;
//   await fb.ready;                                  // wait for init
//   await fb.signUp(email, password, profile);       // create account
//   await fb.signIn(email, password);                // log in
//   await fb.signOutUser();
//   fb.onAuthChanged(user => { ... });               // session listener
//   await fb.saveOrder(orderData);                   // writes to orders/
//   const list = await fb.getUserOrders();           // returns array
//
// Sessions: Firebase Auth uses `browserLocalPersistence`, so the user stays
// logged in across reloads until they explicitly sign out.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js';
import {
  getFirestore,
  doc,
  setDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyBatiGa0raplwaUXVnc4Yo-LGhfzxkiSNE',
  authDomain: 'brewo-cafe.firebaseapp.com',
  projectId: 'brewo-cafe',
  storageBucket: 'brewo-cafe.firebasestorage.app',
  messagingSenderId: '11954719976',
  appId: '1:11954719976:web:825d16cd7bff3ac1778d5d',
  measurementId: 'G-NP0S2E104J'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Surface init/auth failures so the app can show a one-time toast instead
// of silently dropping every Firestore write. `initError` is null while
// healthy and an Error instance when sign-in or persistence failed.
let initError = null;
function recordInitError(err, where) {
  initError = err instanceof Error ? err : new Error(String(err));
  initError.where = where;
  console.warn('[brewoFirebase] ' + where + ' failed', err);
}

// Persist the session in localStorage so reloads keep the user signed in,
// and auto-sign-in anonymously so every visitor has a uid we can attach to
// orders without requiring an email/password UI.
const ready = setPersistence(auth, browserLocalPersistence)
  .then(() => new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      if (user) resolve(user);
      else signInAnonymously(auth).then((c) => resolve(c.user)).catch((err) => {
        recordInitError(err, 'anonymous sign-in');
        resolve(null);
      });
    });
  }))
  .catch((err) => {
    recordInitError(err, 'init');
    return null;
  });

// --- Auth ---------------------------------------------------------------

async function signUp(email, password, profile) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const user = cred.user;
  // Mirror the auth user into Firestore so we can attach app-specific
  // fields (name, office, floor, phone) alongside the uid/email.
  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    email: user.email,
    name:  (profile && profile.name)  || '',
    office:(profile && profile.office)|| '',
    floor: (profile && profile.floor) || '',
    phone: (profile && profile.phone) || '',
    createdAt: serverTimestamp()
  }, { merge: true });
  return user;
}

async function signIn(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

function signOutUser() {
  return signOut(auth);
}

function onAuthChanged(cb) {
  return onAuthStateChanged(auth, cb);
}

function getCurrentUser() {
  return auth.currentUser;
}

// --- Orders -------------------------------------------------------------

async function saveOrder(orderData) {
  await ready;
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');
  const payload = Object.assign({}, orderData, {
    userId: user.uid,
    userEmail: user.email || null,
    createdAt: serverTimestamp()
  });
  // Use the app-side order id (e.g. "BRXXXX99") as the Firestore doc id so
  // the local cache and the remote doc stay in lock-step (idempotent retries
  // overwrite the same doc, and `_docId` always matches `id`).
  const docId = (orderData && orderData.id) ? String(orderData.id)
                                            : ('o_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8));
  await setDoc(doc(db, 'orders', docId), payload, { merge: true });
  return docId;
}

// Mirror the locally-collected profile (name/office/floor/phone) to
// users/{uid} so the auth user has a matching profile doc in Firestore.
async function saveUserProfile(profile) {
  await ready;
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');
  await setDoc(doc(db, 'users', user.uid), Object.assign({
    uid: user.uid,
    email: user.email || null,
    isAnonymous: !!user.isAnonymous,
    updatedAt: serverTimestamp()
  }, profile || {}), { merge: true });
}

async function getUserOrders() {
  await ready;
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');
  const q = query(
    collection(db, 'orders'),
    where('userId', '==', user.uid),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  // Preserve the app-side order id (e.g. "BRXXXX99") that lives in the doc
  // data; expose the Firestore doc id separately as `_docId`.
  return snap.docs.map((d) => Object.assign({ _docId: d.id }, d.data()));
}

// --- Public API ---------------------------------------------------------

window.brewoFirebase = {
  ready,
  signUp,
  signIn,
  signOutUser,
  onAuthChanged,
  getCurrentUser,
  saveOrder,
  saveUserProfile,
  getUserOrders,
  // Null when healthy, Error (with `.where`) when sign-in/init failed.
  // The app reads this to surface a one-time toast instead of silently
  // dropping every Firestore write.
  getInitError: () => initError
};
