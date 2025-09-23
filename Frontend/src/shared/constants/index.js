// index.js - Shared Constants
// DDD Architecture: Shared Constants Layer

// API Endpoints
export const API_ENDPOINTS = {
    // Base URL
    BASE_URL: 'http://localhost:3001/api',
    
    // Auth endpoints
    AUTH: {
        LOGIN: '/auth/login',
        REGISTER: '/auth/register',
        LOGOUT: '/auth/logout',
        REFRESH: '/auth/refresh',
        VERIFY_EMAIL: '/auth/verify-email',
        FORGOT_PASSWORD: '/auth/forgot-password',
        RESET_PASSWORD: '/auth/reset-password',
        SEND_VERIFICATION: '/auth/send-verification'
    },
    
    // User endpoints
    USER: {
        PROFILE: '/users/profile',
        AVATAR: '/users/avatar',
        CHANGE_PASSWORD: '/users/change-password',
        ADDRESSES: '/users/addresses',
        SEND_VERIFICATION: '/users/send-verification'
    },
    
    // Order endpoints
    ORDERS: {
        BASE: '/orders',
        DETAILS: (id) => `/orders/${id}`,
        CANCEL: (id) => `/orders/${id}/cancel`,
        TRACKING: (id) => `/orders/${id}/tracking`
    },
    
    // Product endpoints
    PRODUCTS: {
        BASE: '/products',
        DETAILS: (id) => `/products/${id}`,
        SEARCH: '/products/search',
        WISHLIST: '/products/wishlist',
        ADD_TO_WISHLIST: (id) => `/products/wishlist/${id}`,
        REMOVE_FROM_WISHLIST: (id) => `/products/wishlist/${id}`
    }
};

// Validation Rules
export const VALIDATION_RULES = {
    // User validation
    USER: {
        firstName: {
            minLength: 2,
            maxLength: 50,
            required: true
        },
        lastName: {
            minLength: 2,
            maxLength: 50,
            required: true
        },
        username: {
            minLength: 3,
            maxLength: 30,
            required: true,
            pattern: /^[a-zA-Z0-9_]+$/
        },
        email: {
            required: true,
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        },
        phone: {
            pattern: /^[\+]?[0-9\s\-\(\)]{10,15}$/,
            required: false
        },
        password: {
            minLength: 6,
            maxLength: 128,
            required: true,
            pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]/
        }
    },
    
    // File validation
    FILE: {
        avatar: {
            maxSize: 5 * 1024 * 1024, // 5MB
            allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
            allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp']
        }
    },
    
    // Address validation
    ADDRESS: {
        street: {
            minLength: 5,
            maxLength: 255,
            required: true
        },
        city: {
            minLength: 2,
            maxLength: 100,
            required: true
        },
        state: {
            minLength: 2,
            maxLength: 100,
            required: true
        },
        zipCode: {
            pattern: /^\d{5}(-\d{4})?$/,
            required: true
        },
        country: {
            minLength: 2,
            maxLength: 100,
            required: true
        }
    }
};

// Error Messages
export const ERROR_MESSAGES = {
    // General errors
    NETWORK_ERROR: 'Không thể kết nối đến máy chủ. Vui lòng thử lại.',
    TIMEOUT_ERROR: 'Yêu cầu đã hết thời gian. Vui lòng thử lại.',
    UNKNOWN_ERROR: 'Có lỗi không xác định xảy ra. Vui lòng thử lại.',
    
    // Auth errors
    AUTH: {
        INVALID_CREDENTIALS: 'Email hoặc mật khẩu không đúng.',
        TOKEN_EXPIRED: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
        UNAUTHORIZED: 'Bạn không có quyền truy cập.',
        EMAIL_NOT_VERIFIED: 'Email chưa được xác minh.',
        ACCOUNT_LOCKED: 'Tài khoản đã bị khóa.',
        WEAK_PASSWORD: 'Mật khẩu quá yếu. Vui lòng chọn mật khẩu mạnh hơn.'
    },
    
    // Validation errors
    VALIDATION: {
        REQUIRED_FIELD: (field) => `${field} là bắt buộc.`,
        MIN_LENGTH: (field, min) => `${field} phải có ít nhất ${min} ký tự.`,
        MAX_LENGTH: (field, max) => `${field} không được vượt quá ${max} ký tự.`,
        INVALID_EMAIL: 'Địa chỉ email không hợp lệ.',
        INVALID_PHONE: 'Số điện thoại không hợp lệ.',
        INVALID_PASSWORD: 'Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số.',
        PASSWORD_MISMATCH: 'Mật khẩu xác nhận không khớp.',
        INVALID_FILE_TYPE: 'Định dạng file không được hỗ trợ.',
        FILE_TOO_LARGE: (size) => `File quá lớn. Kích thước tối đa là ${size}MB.`,
        INVALID_DATE: 'Ngày tháng không hợp lệ.'
    },
    
    // User errors
    USER: {
        NOT_FOUND: 'Không tìm thấy người dùng.',
        EMAIL_EXISTS: 'Email đã được sử dụng.',
        USERNAME_EXISTS: 'Tên đăng nhập đã được sử dụng.',
        PROFILE_UPDATE_FAILED: 'Không thể cập nhật thông tin.',
        AVATAR_UPLOAD_FAILED: 'Không thể tải lên ảnh đại diện.',
        PASSWORD_CHANGE_FAILED: 'Không thể đổi mật khẩu.',
        CURRENT_PASSWORD_INCORRECT: 'Mật khẩu hiện tại không đúng.'
    },
    
    // Order errors
    ORDER: {
        NOT_FOUND: 'Không tìm thấy đơn hàng.',
        CANNOT_CANCEL: 'Không thể hủy đơn hàng này.',
        ALREADY_CANCELLED: 'Đơn hàng đã được hủy.',
        PAYMENT_FAILED: 'Thanh toán thất bại.',
        INSUFFICIENT_STOCK: 'Không đủ hàng trong kho.'
    },
    
    // Product errors
    PRODUCT: {
        NOT_FOUND: 'Không tìm thấy sản phẩm.',
        OUT_OF_STOCK: 'Sản phẩm đã hết hàng.',
        WISHLIST_ADD_FAILED: 'Không thể thêm vào danh sách yêu thích.',
        WISHLIST_REMOVE_FAILED: 'Không thể xóa khỏi danh sách yêu thích.'
    }
};

// Success Messages
export const SUCCESS_MESSAGES = {
    // Auth messages
    AUTH: {
        LOGIN_SUCCESS: 'Đăng nhập thành công!',
        LOGOUT_SUCCESS: 'Đăng xuất thành công!',
        REGISTER_SUCCESS: 'Đăng ký tài khoản thành công!',
        PASSWORD_RESET_SENT: 'Email đặt lại mật khẩu đã được gửi.',
        PASSWORD_RESET_SUCCESS: 'Đặt lại mật khẩu thành công.',
        EMAIL_VERIFIED: 'Email đã được xác minh thành công.'
    },
    
    // User messages
    USER: {
        PROFILE_UPDATED: 'Cập nhật thông tin thành công!',
        AVATAR_UPDATED: 'Cập nhật ảnh đại diện thành công!',
        PASSWORD_CHANGED: 'Đổi mật khẩu thành công!',
        ADDRESS_ADDED: 'Thêm địa chỉ thành công!',
        ADDRESS_UPDATED: 'Cập nhật địa chỉ thành công!',
        ADDRESS_DELETED: 'Xóa địa chỉ thành công!',
        VERIFICATION_SENT: 'Mã xác minh đã được gửi!'
    },
    
    // Order messages
    ORDER: {
        CREATED: 'Đặt hàng thành công!',
        CANCELLED: 'Hủy đơn hàng thành công!',
        UPDATED: 'Cập nhật đơn hàng thành công!'
    },
    
    // Product messages
    PRODUCT: {
        ADDED_TO_WISHLIST: 'Đã thêm vào danh sách yêu thích!',
        REMOVED_FROM_WISHLIST: 'Đã xóa khỏi danh sách yêu thích!',
        ADDED_TO_CART: 'Đã thêm vào giỏ hàng!'
    }
};

// App Constants
export const APP_CONSTANTS = {
    // Pagination
    PAGINATION: {
        DEFAULT_PAGE_SIZE: 20,
        MAX_PAGE_SIZE: 100
    },
    
    // File upload
    FILE_UPLOAD: {
        MAX_SIZE: 5 * 1024 * 1024, // 5MB
        CHUNK_SIZE: 1024 * 1024 // 1MB
    },
    
    // Cache settings
    CACHE: {
        TTL: 5 * 60 * 1000, // 5 minutes
        MAX_ENTRIES: 100
    },
    
    // Request timeout
    TIMEOUT: {
        DEFAULT: 10000, // 10 seconds
        UPLOAD: 60000, // 60 seconds
        DOWNLOAD: 30000 // 30 seconds
    },
    
    // Local storage keys
    STORAGE_KEYS: {
        AUTH_TOKEN: 'auth_token',
        REFRESH_TOKEN: 'refresh_token',
        USER: 'user',
        CART: 'cart',
        PREFERENCES: 'preferences',
        THEME: 'theme'
    },
    
    // Date formats
    DATE_FORMATS: {
        DISPLAY: 'DD/MM/YYYY',
        API: 'YYYY-MM-DD',
        DATETIME: 'DD/MM/YYYY HH:mm',
        TIME: 'HH:mm'
    },
    
    // Order status
    ORDER_STATUS: {
        PENDING: 'pending',
        CONFIRMED: 'confirmed',
        PROCESSING: 'processing',
        SHIPPED: 'shipped',
        DELIVERED: 'delivered',
        CANCELLED: 'cancelled',
        RETURNED: 'returned'
    },
    
    // Payment methods
    PAYMENT_METHODS: {
        CREDIT_CARD: 'credit_card',
        DEBIT_CARD: 'debit_card',
        PAYPAL: 'paypal',
        BANK_TRANSFER: 'bank_transfer',
        CASH_ON_DELIVERY: 'cod'
    },
    
    // User roles
    USER_ROLES: {
        ADMIN: 'admin',
        USER: 'user',
        MODERATOR: 'moderator'
    },
    
    // Product categories
    PRODUCT_CATEGORIES: {
        ELECTRONICS: 'electronics',
        CLOTHING: 'clothing',
        BOOKS: 'books',
        HOME: 'home',
        SPORTS: 'sports',
        BEAUTY: 'beauty'
    }
};

// Theme Constants
export const THEME_CONSTANTS = {
    COLORS: {
        PRIMARY: '#007bff',
        SECONDARY: '#6c757d',
        SUCCESS: '#28a745',
        DANGER: '#dc3545',
        WARNING: '#ffc107',
        INFO: '#17a2b8',
        LIGHT: '#f8f9fa',
        DARK: '#343a40'
    },
    
    BREAKPOINTS: {
        XS: 576,
        SM: 768,
        MD: 992,
        LG: 1200,
        XL: 1400
    },
    
    ANIMATIONS: {
        FAST: 200,
        NORMAL: 300,
        SLOW: 500
    }
};

// Export all constants
export const CONSTANTS = {
    API_ENDPOINTS,
    VALIDATION_RULES,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    APP_CONSTANTS,
    THEME_CONSTANTS
};

// Also make available globally for HTML scripts
if (typeof window !== 'undefined') {
    window.API_ENDPOINTS = API_ENDPOINTS;
    window.VALIDATION_RULES = VALIDATION_RULES;
    window.ERROR_MESSAGES = ERROR_MESSAGES;
    window.SUCCESS_MESSAGES = SUCCESS_MESSAGES;
    window.APP_CONSTANTS = APP_CONSTANTS;
    window.THEME_CONSTANTS = THEME_CONSTANTS;
    window.CONSTANTS = CONSTANTS;
}

export default CONSTANTS;