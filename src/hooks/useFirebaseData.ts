import { useState, useEffect } from 'react';
import { collection, getDocs, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { DayEntry, UserSettings } from '../types';

const COLLECTIONS = {
  ENTRIES: 'dayEntries',
  SETTINGS: 'settings'
};

export const useFirebaseData = () => {
  const [entries, setEntries] = useState<DayEntry[]>([]);
  const [settings, setSettings] = useState<UserSettings>({
    password: '',
    netWorth: 10000,
    startingBalance: 10000
  });
  const [loading, setLoading] = useState(true);

  // Load all data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading data from Firebase...');
      
      // Load entries
      const entriesSnapshot = await getDocs(collection(db, COLLECTIONS.ENTRIES));
      const loadedEntries: DayEntry[] = [];
      entriesSnapshot.forEach((doc) => {
        loadedEntries.push(doc.data() as DayEntry);
      });
      console.log('✅ Loaded entries:', loadedEntries.length, loadedEntries);
      setEntries(loadedEntries);

      // Load settings
      const settingsSnapshot = await getDocs(collection(db, COLLECTIONS.SETTINGS));
      if (!settingsSnapshot.empty) {
        const settingsDoc = settingsSnapshot.docs[0];
        console.log('✅ Loaded settings:', settingsDoc.data());
        setSettings(settingsDoc.data() as UserSettings);
      } else {
        console.log('⚠️ No settings found in Firebase');
      }
      
      console.log('✅ Data loading complete!');
    } catch (error) {
      console.error('❌ Error loading data:', error);
      console.error('Please check your Firebase configuration and internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const saveEntry = async (entry: DayEntry) => {
    try {
      await setDoc(doc(db, COLLECTIONS.ENTRIES, entry.id), entry);
      setEntries(prev => {
        const filtered = prev.filter(e => e.id !== entry.id);
        return [...filtered, entry];
      });
    } catch (error) {
      console.error('Error saving entry:', error);
      throw error;
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.ENTRIES, id));
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch (error) {
      console.error('Error deleting entry:', error);
      throw error;
    }
  };

  const saveSettings = async (newSettings: UserSettings) => {
    try {
      await setDoc(doc(db, COLLECTIONS.SETTINGS, 'user'), newSettings);
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  };

  return {
    entries,
    settings,
    loading,
    saveEntry,
    deleteEntry,
    saveSettings,
    refreshData: loadData
  };
};

