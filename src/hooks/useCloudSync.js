import { useState, useEffect } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';

export function useCloudSync(collectionName, defaultData) {
  const [data, setData] = useState(() => {
    const local = localStorage.getItem(`coslife_${collectionName}`);
    return local ? JSON.parse(local) : defaultData;
  });

  const currentUser = auth.currentUser;

  // Listen to Firestore real-time updates when logged in
  useEffect(() => {
    if (!currentUser) return;

    const docRef = doc(db, 'users', currentUser.uid, 'user_data', collectionName);

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const cloudData = docSnap.data().content;
        setData(cloudData);
        localStorage.setItem(`coslife_${collectionName}`, JSON.stringify(cloudData));
      } else {
        // Initialize user document in cloud if first time
        setDoc(docRef, { content: defaultData });
      }
    }, (error) => {
      console.error(`Firestore error on ${collectionName}:`, error);
    });

    return () => unsubscribe();
  }, [currentUser, collectionName, defaultData]);

  // Save changes to both Cloud and LocalStorage
  const updateData = async (newData) => {
    setData(newData);
    localStorage.setItem(`coslife_${collectionName}`, JSON.stringify(newData));

    if (currentUser) {
      try {
        const docRef = doc(db, 'users', currentUser.uid, 'user_data', collectionName);
        await setDoc(docRef, { content: newData });
      } catch (err) {
        console.error(`Failed to push ${collectionName} to cloud:`, err);
      }
    }
  };

  return [data, updateData];
}