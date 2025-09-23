// services.js - API Services for Account Management
// DDD Architecture: JavaScript API Services Layer

// Simple HTTP client for API communication
class SimpleHttpClient {
    constructor(baseURL = 'http://localhost:3001/api') {
        this.baseURL = baseURL;
    }

    getAuthToken() {
        return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    }

    getHeaders(customHeaders = {}) {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...customHeaders
        };
        
        const token = this.getAuthToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            method: 'GET',
            headers: this.getHeaders(options.headers),
            credentials: 'include',
            ...options
        };

        if (config.body && config.method !== 'GET') {
            if (config.body instanceof FormData) {
                // Don't set Content-Type for FormData
                delete config.headers['Content-Type'];
            } else {
                config.body = JSON.stringify(config.body);
            }
        }

        try {
            const response = await fetch(url, config);
            
            let data;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }

            if (!response.ok) {
                return {
                    success: false,
                    error: data.message || data.error || `HTTP ${response.status}`,
                    message: data.message || `Request failed with status ${response.status}`
                };
            }

            return {
                success: true,
                data: data.data || data,
                message: data.message
            };

        } catch (error) {
            console.error('API Request failed:', error);
            return {
                success: false,
                error: error.message || 'Network error',
                message: 'Failed to connect to server'
            };
        }
    }

    async get(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'GET' });
    }

    async post(endpoint, body = null, options = {}) {
        return this.request(endpoint, { ...options, method: 'POST', body });
    }

    async put(endpoint, body = null, options = {}) {
        return this.request(endpoint, { ...options, method: 'PUT', body });
    }

    async delete(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'DELETE' });
    }

    async uploadFile(endpoint, file, onProgress = null) {
        const formData = new FormData();
        formData.append('file', file);

        return this.request(endpoint, {
            method: 'POST',
            body: formData
        });
    }
}

// User Service
class UserService {
    constructor(httpClient) {
        this.httpClient = httpClient;
        this.baseEndpoint = '/users';
    }

    async getProfile() {
        try {
            const response = await this.httpClient.get(`${this.baseEndpoint}/profile`);
            return response;
        } catch (error) {
            return {
                success: false,
                message: 'Failed to fetch profile',
                error: error.message
            };
        }
    }

    async updateProfile(data) {
        try {
            const response = await this.httpClient.put(`${this.baseEndpoint}/profile`, data);
            return response;
        } catch (error) {
            return {
                success: false,
                message: 'Failed to update profile',
                error: error.message
            };
        }
    }

    async changePassword(data) {
        try {
            const response = await this.httpClient.post(`${this.baseEndpoint}/change-password`, data);
            return response;
        } catch (error) {
            return {
                success: false,
                message: 'Failed to change password',
                error: error.message
            };
        }
    }

    async uploadAvatar(file, onProgress = null) {
        try {
            const response = await this.httpClient.uploadFile(`${this.baseEndpoint}/avatar`, file, onProgress);
            return response;
        } catch (error) {
            return {
                success: false,
                message: 'Failed to upload avatar',
                error: error.message
            };
        }
    }

    async getAddresses() {
        try {
            const response = await this.httpClient.get(`${this.baseEndpoint}/addresses`);
            return response;
        } catch (error) {
            return {
                success: false,
                message: 'Failed to fetch addresses',
                error: error.message
            };
        }
    }

    async addAddress(address) {
        try {
            const response = await this.httpClient.post(`${this.baseEndpoint}/addresses`, address);
            return response;
        } catch (error) {
            return {
                success: false,
                message: 'Failed to add address',
                error: error.message
            };
        }
    }

    async updateAddress(addressId, address) {
        try {
            const response = await this.httpClient.put(`${this.baseEndpoint}/addresses/${addressId}`, address);
            return response;
        } catch (error) {
            return {
                success: false,
                message: 'Failed to update address',
                error: error.message
            };
        }
    }

    async deleteAddress(addressId) {
        try {
            const response = await this.httpClient.delete(`${this.baseEndpoint}/addresses/${addressId}`);
            return response;
        } catch (error) {
            return {
                success: false,
                message: 'Failed to delete address',
                error: error.message
            };
        }
    }

    async sendVerificationCode(email) {
        try {
            const response = await this.httpClient.post(`${this.baseEndpoint}/send-verification`, { email });
            return response;
        } catch (error) {
            return {
                success: false,
                message: 'Failed to send verification code',
                error: error.message
            };
        }
    }
}

// Auth Service
class AuthService {
    constructor(httpClient) {
        this.httpClient = httpClient;
        this.baseEndpoint = '/auth';
    }

    async login(credentials) {
        try {
            const response = await this.httpClient.post(`${this.baseEndpoint}/login`, credentials);
            
            if (response.success && response.data) {
                if (response.data.token) {
                    localStorage.setItem('auth_token', response.data.token);
                    if (response.data.refreshToken) {
                        localStorage.setItem('refresh_token', response.data.refreshToken);
                    }
                }
                
                if (response.data.user) {
                    localStorage.setItem('user', JSON.stringify(response.data.user));
                }
            }
            
            return response;
        } catch (error) {
            return {
                success: false,
                message: 'Login failed',
                error: error.message
            };
        }
    }

    async logout() {
        try {
            const response = await this.httpClient.post(`${this.baseEndpoint}/logout`);
            
            // Clear local storage
            localStorage.removeItem('auth_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
            sessionStorage.removeItem('auth_token');
            
            return response;
        } catch (error) {
            // Clear local storage even if API call fails
            localStorage.removeItem('auth_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
            sessionStorage.removeItem('auth_token');
            
            return {
                success: false,
                message: 'Logout failed',
                error: error.message
            };
        }
    }

    getCurrentUser() {
        try {
            const userStr = localStorage.getItem('user');
            return userStr ? JSON.parse(userStr) : null;
        } catch {
            return null;
        }
    }

    isAuthenticated() {
        return !!this.getAuthToken();
    }

    getAuthToken() {
        return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    }

    updateUser(userData) {
        try {
            const currentUser = this.getCurrentUser();
            const updatedUser = { ...currentUser, ...userData };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            return updatedUser;
        } catch (error) {
            console.error('Failed to update user data:', error);
            return null;
        }
    }
}

// Order Service
class OrderService {
    constructor(httpClient) {
        this.httpClient = httpClient;
        this.baseEndpoint = '/orders';
    }

    async getOrders(status = null) {
        try {
            const params = status ? `?status=${status}` : '';
            const response = await this.httpClient.get(`${this.baseEndpoint}${params}`);
            return response;
        } catch (error) {
            return {
                success: false,
                message: 'Failed to fetch orders',
                error: error.message
            };
        }
    }

    async getOrderDetails(orderId) {
        try {
            const response = await this.httpClient.get(`${this.baseEndpoint}/${orderId}`);
            return response;
        } catch (error) {
            return {
                success: false,
                message: 'Failed to fetch order details',
                error: error.message
            };
        }
    }

    async cancelOrder(orderId, reason = null) {
        try {
            const response = await this.httpClient.post(`${this.baseEndpoint}/${orderId}/cancel`, { reason });
            return response;
        } catch (error) {
            return {
                success: false,
                message: 'Failed to cancel order',
                error: error.message
            };
        }
    }

    async trackOrder(orderId) {
        try {
            const response = await this.httpClient.get(`${this.baseEndpoint}/${orderId}/tracking`);
            return response;
        } catch (error) {
            return {
                success: false,
                message: 'Failed to track order',
                error: error.message
            };
        }
    }
}

// Product Service
class ProductService {
    constructor(httpClient) {
        this.httpClient = httpClient;
        this.baseEndpoint = '/products';
    }

    async getWishlist() {
        try {
            const response = await this.httpClient.get(`${this.baseEndpoint}/wishlist`);
            return response;
        } catch (error) {
            return {
                success: false,
                message: 'Failed to fetch wishlist',
                error: error.message
            };
        }
    }

    async addToWishlist(productId) {
        try {
            const response = await this.httpClient.post(`${this.baseEndpoint}/wishlist/${productId}`);
            return response;
        } catch (error) {
            return {
                success: false,
                message: 'Failed to add to wishlist',
                error: error.message
            };
        }
    }

    async removeFromWishlist(productId) {
        try {
            const response = await this.httpClient.delete(`${this.baseEndpoint}/wishlist/${productId}`);
            return response;
        } catch (error) {
            return {
                success: false,
                message: 'Failed to remove from wishlist',
                error: error.message
            };
        }
    }
}

// Initialize services
const httpClient = new SimpleHttpClient();
const userService = new UserService(httpClient);
const authService = new AuthService(httpClient);
const orderService = new OrderService(httpClient);
const productService = new ProductService(httpClient);

// Auth Store - Simple authentication state management
const authStore = {
    getCurrentUser() {
        return authService.getCurrentUser();
    },

    isAuthenticated() {
        return authService.isAuthenticated();
    },

    updateUser(userData) {
        return authService.updateUser(userData);
    },

    async logout() {
        return await authService.logout();
    },

    getAuthToken() {
        return authService.getAuthToken();
    }
};

// Export for module use
export { 
    userService, 
    authService, 
    orderService, 
    productService, 
    authStore,
    httpClient 
};

// Also make available globally for HTML scripts
if (typeof window !== 'undefined') {
    window.userService = userService;
    window.authService = authService;
    window.orderService = orderService;
    window.productService = productService;
    window.authStore = authStore;
    window.httpClient = httpClient;
}