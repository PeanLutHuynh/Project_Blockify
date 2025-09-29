import { authService } from './core/services/AuthService';

class App {
    constructor() {
        this.setupRouting();
        this.initializeGlobalFeatures();
    }

    private setupRouting(): void {
        // Simple routing cho MPA (Multi-page Application)
        const currentPath = window.location.pathname;
        
        console.log('App initialized for page:', currentPath);
        
        // Auto-verify authentication on protected pages
        if (this.isProtectedPage(currentPath)) {
            this.verifyAuthentication();
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
            'Admin.html',
            'CartPage.html'
        ];
        
        return protectedPages.some(page => path.includes(page));
    }

    private async verifyAuthentication(): Promise<void> {
        if (!authService.isAuthenticated()) {
            // Redirect to signin if not authenticated
            window.location.href = '/src/pages/SigninPage.html';
            return;
        }

        // Verify token is still valid
        const result = await authService.verifyToken();
        if (!result.success) {
            window.location.href = '/src/pages/SigninPage.html';
        }
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
        // Helper function để navigate giữa các trang
        (window as any).navigateTo = (path: string) => {
            window.location.href = path;
        };

        // Helper function để logout
        (window as any).logout = () => {
            authService.signOut();
            window.location.href = '/src/pages/SigninPage.html';
        };
    }

    public static initialize(): void {
        // Khởi tạo app khi DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                new App();
            });
        } else {
            new App();
        }
    }
}

// Export để sử dụng trong các page
export { App };

// Auto-initialize nếu được import trực tiếp
if (typeof window !== 'undefined') {
    App.initialize();
}