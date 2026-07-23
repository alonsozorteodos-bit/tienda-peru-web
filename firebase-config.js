// Importa las funciones necesarias de Firebase v10
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCfac-HDMwrLyOURWhQQ3cMnugkRB13Ufo",
  authDomain: "tienda-peru-constanza.firebaseapp.com",
  projectId: "tienda-peru-constanza",
  storageBucket: "tienda-peru-constanza.firebasestorage.app",
  messagingSenderId: "613245426769",
  appId: "1:613245426769:web:99df3dd599f240af2aac70",
  measurementId: "G-09XTFW0ETT"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
