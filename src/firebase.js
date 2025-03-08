import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDs1jA15rRuk7RXsj8EVYOXpN9HEHsaE0k",
  authDomain: "my-nps-platform.firebaseapp.com",
  projectId: "my-nps-platform",
  storageBucket: "my-nps-platform.firebasestorage.app",
  messagingSenderId: "518214168122",
  appId: "1:518214168122:web:a4678652b24c3d03dd8f03",
  measurementId: "G-R02QDLFHSF"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);