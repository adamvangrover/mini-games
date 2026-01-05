export default class ToastManager {
    static instance = null;

    static getInstance() {
        if (!ToastManager.instance) {
            ToastManager.instance = new ToastManager();
        }
        return ToastManager.instance;
    }

    constructor() {
        this.container = document.createElement('div');
        this.container.id = 'toast-container';
        this.container.className = 'fixed bottom-10 left-1/2 transform -translate-x-1/2 flex flex-col gap-2 pointer-events-none z-[100]';
        document.body.appendChild(this.container);
    }

    show(message, duration = 3000) {
        const toast = document.createElement('div');
        toast.className = 'bg-slate-800/90 text-white px-4 py-2 rounded shadow-lg border border-slate-600 text-sm font-bold animate-fade-in-up';
        toast.textContent = message;

        this.container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('opacity-0');
            setTimeout(() => toast.remove(), 500);
        }, duration);
    }
}
