
/**
 * Simple IndexedDB wrapper for storing File/Blob objects
 */
import { TagMetadata, BgHotspot } from '../types';

const DB_NAME = 'NeonPlayerDB';
const DB_VERSION = 6; // Incremented for BG Playlists
const STORES = {
  TRACKS: 'tracks',
  PLAYLISTS: 'playlists',
  BACKGROUND: 'background',
  BG_PLAYLISTS: 'bg_playlists', // New Store
  SFX: 'sfx',
  AMBIENCE: 'ambience'
};

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (_e: IDBVersionChangeEvent) => {
      const db = request.result;
      const transaction = request.transaction;
      
      if (!db.objectStoreNames.contains(STORES.TRACKS)) {
        const trackStore = db.createObjectStore(STORES.TRACKS, { keyPath: 'id' });
        trackStore.createIndex('playlistId', 'playlistId', { unique: false });
        trackStore.createIndex('order', 'order', { unique: false }); 
      } else {
        const trackStore = transaction?.objectStore(STORES.TRACKS);
        if (trackStore) {
            if (!trackStore.indexNames.contains('playlistId')) {
                trackStore.createIndex('playlistId', 'playlistId', { unique: false });
            }
            if (!trackStore.indexNames.contains('order')) {
                trackStore.createIndex('order', 'order', { unique: false });
            }
        }
      }

      if (!db.objectStoreNames.contains(STORES.PLAYLISTS)) {
        db.createObjectStore(STORES.PLAYLISTS, { keyPath: 'id' });
      }

      // BG MEDIA STORE
      if (!db.objectStoreNames.contains(STORES.BACKGROUND)) {
        const bgStore = db.createObjectStore(STORES.BACKGROUND, { keyPath: 'id' });
        bgStore.createIndex('playlistId', 'playlistId', { unique: false });
      } else {
        const bgStore = transaction?.objectStore(STORES.BACKGROUND);
        if (bgStore && !bgStore.indexNames.contains('playlistId')) {
            bgStore.createIndex('playlistId', 'playlistId', { unique: false });
        }
      }

      // BG PLAYLISTS STORE
      if (!db.objectStoreNames.contains(STORES.BG_PLAYLISTS)) {
        db.createObjectStore(STORES.BG_PLAYLISTS, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORES.SFX)) {
        db.createObjectStore(STORES.SFX, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.AMBIENCE)) {
        db.createObjectStore(STORES.AMBIENCE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// --- AUDIO PLAYLIST FUNCTIONS ---

export const savePlaylist = async (playlist: { id: string; name: string; order: number }) => {
    const db = await initDB();
    return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORES.PLAYLISTS, 'readwrite');
        const store = transaction.objectStore(STORES.PLAYLISTS);
        const request = store.put(playlist);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const getAllPlaylists = async (): Promise<{ id: string; name: string; order: number }[]> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.PLAYLISTS, 'readonly');
        const store = transaction.objectStore(STORES.PLAYLISTS);
        const request = store.getAll();
        request.onsuccess = () => {
            const results = request.result || [];
            results.sort((a, b) => a.order - b.order);
            resolve(results);
        };
        request.onerror = () => reject(request.error);
    });
};

export const deletePlaylistAndTracks = async (playlistId: string) => {
    const db = await initDB();
    return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([STORES.PLAYLISTS, STORES.TRACKS], 'readwrite');
        
        // Delete Playlist
        const plStore = transaction.objectStore(STORES.PLAYLISTS);
        plStore.delete(playlistId);

        // Delete Tracks associated with playlist
        const trackStore = transaction.objectStore(STORES.TRACKS);
        const index = trackStore.index('playlistId');
        const range = IDBKeyRange.only(playlistId);
        
        index.openCursor(range).onsuccess = (e) => {
            const cursor = (e.target as IDBRequest).result;
            if (cursor) {
                cursor.delete();
                cursor.continue();
            }
        };

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

// --- TRACK FUNCTIONS ---

export interface StoredTrack {
    id: string; 
    playlistId: string; 
    name: string; 
    file: File;
    order: number;
    tags?: TagMetadata;
    rating?: number; // NEW: Rating
}

export const saveTrack = async (track: StoredTrack) => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORES.TRACKS, 'readwrite');
    const store = transaction.objectStore(STORES.TRACKS);
    const request = store.put(track);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const saveTracksBulk = async (tracks: StoredTrack[]) => {
    const db = await initDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORES.TRACKS, 'readwrite');
      const store = transaction.objectStore(STORES.TRACKS);
      
      tracks.forEach(track => {
          store.put(track);
      });
  
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
};

export const getAllTracks = async (): Promise<StoredTrack[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.TRACKS, 'readonly');
    const store = transaction.objectStore(STORES.TRACKS);
    const request = store.getAll();
    request.onsuccess = () => {
        const results: StoredTrack[] = request.result || [];
        // Sort by order field if available, fallback to index
        results.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
};

export const clearTracksInPlaylist = async (playlistId: string) => {
    const db = await initDB();
    return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORES.TRACKS, 'readwrite');
        const store = transaction.objectStore(STORES.TRACKS);
        const index = store.index('playlistId');
        const range = IDBKeyRange.only(playlistId);
        
        index.openCursor(range).onsuccess = (e) => {
            const cursor = (e.target as IDBRequest).result;
            if (cursor) {
                cursor.delete();
                cursor.continue();
            }
        };
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

export const deleteTracksBulk = async (trackIds: string[]) => {
    const db = await initDB();
    return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORES.TRACKS, 'readwrite');
        const store = transaction.objectStore(STORES.TRACKS);
        
        trackIds.forEach(id => {
            store.delete(id);
        });

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};


// --- BACKGROUND FUNCTIONS ---

export interface StoredBackground {
    id: string;
    playlistId: string;
    type: 'image' | 'video';
    file: File;
    order?: number;
    hotspots?: BgHotspot[]; // NEW: Persist interactive points
}

export const saveBgPlaylist = async (playlist: { id: string; name: string; order: number }) => {
    const db = await initDB();
    return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORES.BG_PLAYLISTS, 'readwrite');
        const store = transaction.objectStore(STORES.BG_PLAYLISTS);
        const request = store.put(playlist);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const getAllBgPlaylists = async (): Promise<{ id: string; name: string; order: number }[]> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.BG_PLAYLISTS, 'readonly');
        const store = transaction.objectStore(STORES.BG_PLAYLISTS);
        const request = store.getAll();
        request.onsuccess = () => {
            const results = request.result || [];
            results.sort((a, b) => a.order - b.order);
            resolve(results);
        };
        request.onerror = () => reject(request.error);
    });
};

export const deleteBgPlaylistAndFiles = async (playlistId: string) => {
    const db = await initDB();
    return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([STORES.BG_PLAYLISTS, STORES.BACKGROUND], 'readwrite');
        
        // Delete Playlist
        const plStore = transaction.objectStore(STORES.BG_PLAYLISTS);
        plStore.delete(playlistId);

        // Delete Backgrounds associated with playlist
        const bgStore = transaction.objectStore(STORES.BACKGROUND);
        try {
            const index = bgStore.index('playlistId');
            const range = IDBKeyRange.only(playlistId);
            
            index.openCursor(range).onsuccess = (e) => {
                const cursor = (e.target as IDBRequest).result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                }
            };
        } catch (e) {
            console.warn("Index lookup failed, skipping file deletion", e);
        }

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

export const saveBackground = async (media: StoredBackground) => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORES.BACKGROUND, 'readwrite');
    const store = transaction.objectStore(STORES.BACKGROUND);
    const request = store.put(media);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const deleteBackground = async (id: string) => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORES.BACKGROUND, 'readwrite');
    const store = transaction.objectStore(STORES.BACKGROUND);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getAllBackgrounds = async (): Promise<StoredBackground[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.BACKGROUND, 'readonly');
    const store = transaction.objectStore(STORES.BACKGROUND);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

export const clearBackgrounds = async () => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORES.BACKGROUND, 'readwrite');
    const store = transaction.objectStore(STORES.BACKGROUND);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// --- SFX FUNCTIONS ---

export const saveSFX = async (sfx: { id: string; blob: Blob }) => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORES.SFX, 'readwrite');
    const store = transaction.objectStore(STORES.SFX);
    const request = store.put(sfx);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getAllSFX = async (): Promise<{ id: string; blob: Blob }[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.SFX, 'readonly');
    const store = transaction.objectStore(STORES.SFX);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

// --- AMBIENCE FUNCTIONS ---

export const saveAmbience = async (item: { id: string; name: string; file: File }) => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORES.AMBIENCE, 'readwrite');
    const store = transaction.objectStore(STORES.AMBIENCE);
    const request = store.put(item);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getAllAmbience = async (): Promise<{ id: string; name: string; file: File }[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.AMBIENCE, 'readonly');
    const store = transaction.objectStore(STORES.AMBIENCE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

export const deleteAmbience = async (id: string) => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORES.AMBIENCE, 'readwrite');
    const store = transaction.objectStore(STORES.AMBIENCE);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};
