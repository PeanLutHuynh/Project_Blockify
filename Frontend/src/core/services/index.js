// index.js - Core Services Export
// DDD Architecture: Core Services Layer

// Import API services
import { 
    userService, 
    authService, 
    orderService, 
    productService, 
    authStore,
    httpClient 
} from '../api/services.js';

// Export all services for easy import
export {
    userService,
    authService, 
    orderService,
    productService,
    authStore,
    httpClient
};

// Create services object for grouped access
export const services = {
    user: userService,
    auth: authService,
    order: orderService,
    product: productService
};

// Export core API client
export { httpClient as apiClient };

// Default export
export default {
    userService,
    authService,
    orderService,
    productService,
    authStore,
    httpClient,
    services
};

// Also make available globally for HTML scripts
if (typeof window !== 'undefined') {
    window.services = services;
    window.userService = userService;
    window.authService = authService;
    window.orderService = orderService;
    window.productService = productService;
    window.authStore = authStore;
    window.httpClient = httpClient;
}