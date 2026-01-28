export default class SyncManager {
    constructor() {
        if (SyncManager.instance) return SyncManager.instance;
        SyncManager.instance = this;

        this.isOnline = navigator.onLine;
        this.queue = this.loadQueue();
        this.statusListeners = [];

        this.init();
    }

    static getInstance() {
        if (!SyncManager.instance) SyncManager.instance = new SyncManager();
        return SyncManager.instance;
    }

    init() {
        window.addEventListener('online', () => this.handleStatusChange(true));
        window.addEventListener('offline', () => this.handleStatusChange(false));

        // Initial Check
        this.handleStatusChange(navigator.onLine, true);
    }

    handleStatusChange(status, silent = false) {
        this.isOnline = status;
        console.log(`[SyncManager] Status: ${status ? 'ONLINE' : 'OFFLINE'}`);

        if (this.isOnline) {
            this.processQueue();
            if(!silent) this.showToast("Connection Restored. Syncing...");
        } else {
            if(!silent) this.showToast("Connection Lost. Offline Mode Active.");
        }

        this.updateIndicators();
        this.notifyListeners();
    }

    loadQueue() {
        try {
            return JSON.parse(localStorage.getItem('sync_queue')) || [];
        } catch (e) {
            return [];
        }
    }

    saveQueue() {
        localStorage.setItem('sync_queue', JSON.stringify(this.queue));
    }

    enqueue(actionType, payload) {
        if (this.isOnline) {
            // If online, process immediately (mock)
            console.log(`[SyncManager] Direct Process: ${actionType}`, payload);
            return true;
        } else {
            // Offline: Queue it
            this.queue.push({ type: actionType, payload, timestamp: Date.now() });
            this.saveQueue();
            console.log(`[SyncManager] Queued: ${actionType}`);
            this.updateIndicators();
            return false;
        }
    }

    processQueue() {
        if (this.queue.length === 0) return;

        console.log(`[SyncManager] Processing ${this.queue.length} items...`);

        // Simulate async upload
        setTimeout(() => {
            this.queue = [];
            this.saveQueue();
            this.showToast("Cloud Sync Complete.");
            this.updateIndicators();
        }, 1500);
    }

    // --- UI Helpers ---

    addStatusListener(callback) {
        this.statusListeners.push(callback);
    }

    notifyListeners() {
        this.statusListeners.forEach(cb => cb(this.isOnline));
    }

    updateIndicators() {
        // Update any DOM elements with class 'sync-status-indicator'
        const els = document.querySelectorAll('.sync-status-indicator');
        els.forEach(el => {
            if (this.isOnline) {
                if (this.queue.length > 0) {
                     el.innerHTML = '<i class="fas fa-sync fa-spin text-yellow-500"></i>';
                     el.title = "Syncing...";
                } else {
                     el.innerHTML = '<i class="fas fa-check-circle text-green-500"></i>';
                     el.title = "Online & Synced";
                }
            } else {
                el.innerHTML = `<i class="fas fa-cloud-showers-heavy text-gray-500"></i> <span class="text-xs font-bold text-red-400">${this.queue.length}</span>`;
                el.title = "Offline - Changes Queued";
            }
        });

        // Global HUD warning
        const hudWarn = document.getElementById('offline-warning');
        if (hudWarn) {
            if (this.isOnline) hudWarn.classList.add('hidden');
            else hudWarn.classList.remove('hidden');
        }
    }

    showToast(msg) {
        if (window.miniGameHub && window.miniGameHub.showToast) {
            window.miniGameHub.showToast(msg);
        }
    }
}
