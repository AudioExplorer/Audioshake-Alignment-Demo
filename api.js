// AudioShake API Client
class AudioShakeAPI {
    constructor() {
        this.baseURL = 'https://api.audioshake.ai';
        this.apiKey = null;
        this.dbName = 'audioshake_alignment_demo';
        this.storeName = 'credentials';
        this.db = null;
        this.listeners = {};
        this.dbReady = this.initDB();
    }

    // IndexedDB Setup
    async initDB() {
        // Check if IndexedDB is available
        if (!window.indexedDB) {
            console.warn('IndexedDB not available - API key will not persist');
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            let isUpgradeNeeded = false;

            const request = indexedDB.open(this.dbName, 1);

            request.onerror = (event) => {
                console.error('IndexedDB error:', event.target.error);
                // Don't reject - allow the app to work without persistence
                this.db = null;
                resolve();
            };

            request.onblocked = () => {
                console.warn('IndexedDB blocked - close other tabs using this database');
            };

            request.onsuccess = async (event) => {
                this.db = request.result;

                // Handle unexpected close
                this.db.onversionchange = () => {
                    this.db.close();
                    console.warn('Database version changed - please reload the page');
                };

                this.db.onerror = (event) => {
                    console.error('Database error:', event.target.error);
                };

                // If we just upgraded, wait for transaction to complete
                if (isUpgradeNeeded) {
                    // Wait for upgrade transaction to complete
                    await new Promise(r => setTimeout(r, 100));
                }

                // Now load the stored key
                await this.loadStoredKey();
                resolve();
            };

            request.onupgradeneeded = (event) => {
                isUpgradeNeeded = true;
                const db = event.target.result;

                // Create object store if it doesn't exist
                if (!db.objectStoreNames.contains(this.storeName)) {
                    try {
                        db.createObjectStore(this.storeName);
                    } catch (err) {
                        console.error('Error creating object store:', err);
                    }
                }
            };
        });
    }

    async loadStoredKey() {
        try {
            const key = await this.getFromDB('apiKey');
            if (key) {
                this.apiKey = key;
                this.emit('keyLoaded', key);
            }
        } catch (err) {
            console.error('Error loading stored key:', err);
            // Don't throw - allow the app to continue without stored key
        }
    }

    async getFromDB(key) {
        await this.dbReady;

        if (!this.db) {
            return null; // Return null if DB not available
        }

        return new Promise((resolve) => {
            try {
                const tx = this.db.transaction([this.storeName], 'readonly');
                const store = tx.objectStore(this.storeName);
                const request = store.get(key);

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => {
                    console.error('Error reading from DB:', request.error);
                    resolve(null); // Return null on error instead of rejecting
                };

                tx.onerror = () => {
                    console.error('Transaction error:', tx.error);
                    resolve(null);
                };
            } catch (err) {
                console.error('Error accessing DB:', err);
                resolve(null);
            }
        });
    }

    async saveToDB(key, value) {
        await this.dbReady;

        if (!this.db) {
            console.warn('Database not available - value will not persist');
            return; // Gracefully handle missing DB
        }

        return new Promise((resolve) => {
            try {
                const tx = this.db.transaction([this.storeName], 'readwrite');
                const store = tx.objectStore(this.storeName);
                const request = store.put(value, key);

                request.onsuccess = () => resolve();
                request.onerror = () => {
                    console.error('Error saving to DB:', request.error);
                    resolve(); // Don't reject - allow operation to continue
                };

                tx.onerror = () => {
                    console.error('Transaction error:', tx.error);
                    resolve();
                };
            } catch (err) {
                console.error('Error accessing DB:', err);
                resolve();
            }
        });
    }

    async setAPIKey(key) {
        this.apiKey = key;
        await this.saveToDB('apiKey', key);
        this.emit('keyUpdated', key);
    }

    getAPIKey() {
        return this.apiKey;
    }

    hasAPIKey() {
        return !!this.apiKey;
    }

    async clearAPIKey() {
        await this.dbReady;
        this.apiKey = null;

        if (this.db) {
            try {
                const tx = this.db.transaction([this.storeName], 'readwrite');
                const store = tx.objectStore(this.storeName);
                const request = store.delete('apiKey');

                await new Promise((resolve) => {
                    request.onsuccess = () => resolve();
                    request.onerror = () => {
                        console.error('Error deleting from DB:', request.error);
                        resolve(); // Don't fail the operation
                    };
                    tx.onerror = () => {
                        console.error('Transaction error:', tx.error);
                        resolve();
                    };
                });
            } catch (err) {
                console.error('Error clearing key from DB:', err);
            }
        }

        this.emit('keyCleared');
    }

    // Event Emitter
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => cb(data));
        }
    }

    // API Requests
    async request(endpoint, options = {}) {
        if (!this.apiKey) {
            throw new Error('API key not set. Please authorize first.');
        }

        const url = `${this.baseURL}${endpoint}`;
        const config = {
            ...options,
            headers: {
                'x-api-key': this.apiKey,
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, config);

            // Handle non-JSON responses
            const contentType = response.headers.get('content-type');
            let data;

            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                data = { message: text, status: response.status };
            }

            if (!response.ok) {
                throw new Error(data.message || data.error || `API Error: ${response.status}`);
            }

            return data;
        } catch (err) {
            if (err.message.includes('Failed to fetch')) {
                throw new Error('Network error. Please check your connection.');
            }
            throw err;
        }
    }

    // Create Task with targets
    async createTask(url, targets, callbackUrl = null) {
        const payload = {
            url,
            targets,
            ...(callbackUrl && { callbackUrl })
        };

        return await this.request('/tasks', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }

    // Create Alignment Task (helper method)
    async createAlignmentTask(url, formats = ['json'], language = 'en') {
        return await this.createTask(url, [
            {
                model: 'alignment',
                formats,
                language
            }
        ]);
    }

    // Get Task by ID
    async getTask(taskId) {
        return await this.request(`/tasks/${taskId}`);
    }

    // List Tasks
    async listTasks(params = {}) {
        const queryParams = new URLSearchParams(params).toString();
        const endpoint = queryParams ? `/tasks?${queryParams}` : '/tasks';
        return await this.request(endpoint);
    }

    // Get Task Statistics
    async getTaskStatistics(name = 'usage') {
        return await this.request(`/tasks/statistics?name=${name}`);
    }

    // Poll Task Status
    async pollTask(taskId, onUpdate, maxAttempts = 60, interval = 2000) {
        let attempts = 0;

        return new Promise((resolve, reject) => {
            const poll = async () => {
                try {
                    attempts++;
                    const task = await this.getTask(taskId);

                    if (onUpdate) {
                        onUpdate(task);
                    }

                    if (task.status === 'completed') {
                        resolve(task);
                    } else if (task.status === 'failed') {
                        reject(new Error(task.error || 'Task failed'));
                    } else if (attempts >= maxAttempts) {
                        reject(new Error('Polling timeout - task still processing'));
                    } else {
                        setTimeout(poll, interval);
                    }
                } catch (err) {
                    reject(err);
                }
            };

            poll();
        });
    }

    // Fetch Alignment JSON
    async fetchAlignment(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch alignment: ${response.status}`);
            }
            return await response.json();
        } catch (err) {
            throw new Error(`Error fetching alignment data: ${err.message}`);
        }
    }

    // Validate API Key
    async validateKey() {
        try {
            await this.listTasks({ limit: 1 });
            return true;
        } catch (err) {
            return false;
        }
    }
}

// Export singleton instance
const api = new AudioShakeAPI();