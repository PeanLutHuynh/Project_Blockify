import { authManager } from './src/core/services/AuthManager.js';
import { loadConfig } from './src/core/config/env.js';

class App {
    constructor() {
        this.initialize();
    }

    private async initialize(): Promise<void> {
        
        await loadConfig();
        
        await authManager.initialize();
        
        this.setupRouting();
        this.initializeGlobalFeatures();
        
    }

    private setupRouting(): void {
        // Simple routing cho MPA (Multi-page Application)
        const currentPath = window.location.pathname;        
        // Auto-verify authentication on protected pages
        if (this.isProtectedPage(currentPath)) {
            this.verifyAuthentication();
        }
        
        // Auto-verify admin access on admin page
        if (this.isAdminPage(currentPath)) {
            this.verifyAdminAccess();
        }
    }

    private initializeGlobalFeatures(): void {
        // Thiết lập các tính năng global
        this.setupErrorHandling();
        this.setupNavigationHelpers();
    }

    private isProtectedPage(path: string): boolean {
        const protectedPages = [
            'Account.html',
            'CartPage.html',
            'OrderPage.html',
            'OrderConfirmation.html'
        ];
        
        return protectedPages.some(page => path.includes(page));
    }

    private isAdminPage(path: string): boolean {
        return path.includes('Admin.html');
    }

    private async verifyAuthentication(): Promise<void> {
        if (!authManager.isAuthenticated()) {
            console.warn('[App] Not authenticated, redirecting to signin');
            window.location.href = '/src/pages/SigninPage.html';
            return;
        }
    }

    private async verifyAdminAccess(): Promise<void> {
        // Use AuthManager's guard
        authManager.requireAdmin();
    }

    private setupErrorHandling(): void {
        // Global error handler
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
        });

        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
        });
    }

    private setupNavigationHelpers(): void {
        (window as any).navigateTo = (path: string) => {
            window.location.href = path;
        };

        (window as any).logout = async () => {
            await authManager.signOut();
            window.location.href = '/src/pages/SigninPage.html';
        };
    }

    public static initialize(): void {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                new App();
            });
        } else {
            new App();
        }
    }
}

export { App };

if (typeof window !== 'undefined') {
    App.initialize();
}