/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

const DB_NAME = 'InfiniteHeroesDB';
const STORE_NAME = 'game_states';
const DB_VERSION = 1;

export const db = {
  save: async (key: string, data: any): Promise<void> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => {
          console.error("IndexedDB error", request.error);
          reject(request.error);
      };

      request.onupgradeneeded = (e) => {
        const database = (e.target as IDBOpenDBRequest).result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => {
        const database = request.result;
        try {
            const tx = database.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const putRequest = store.put(data, key);
            
            putRequest.onsuccess = () => resolve();
            putRequest.onerror = () => reject(putRequest.error);
        } catch (err) {
            reject(err);
        }
      };
    });
  },

  load: async (key: string): Promise<any> => {
     return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => reject(request.error);

      request.onupgradeneeded = (e) => {
         const database = (e.target as IDBOpenDBRequest).result;
         if (!database.objectStoreNames.contains(STORE_NAME)) {
             database.createObjectStore(STORE_NAME);
         }
      };

      request.onsuccess = () => {
        const database = request.result;
        try {
            const tx = database.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const getRequest = store.get(key);
            
            getRequest.onsuccess = () => resolve(getRequest.result);
            getRequest.onerror = () => reject(getRequest.error);
        } catch (err) {
            reject(err);
        }
      };
    });
  }
};