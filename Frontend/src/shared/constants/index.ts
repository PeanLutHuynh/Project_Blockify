/**
 * Application configuration constants
 */
export const APP_CONFIG = {
  NAME: 'Blockify',
  VERSION: '1.0.0',
  ENVIRONMENT: 'development',
  DEBUG: true,
  
  // API Configuration
  API: {
    BASE_URL: typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:3001/api'
      : 'https://blockify-backend.onrender.com/api',
    TIMEOUT: 30000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000
  },

  // Authentication
  AUTH: {
    TOKEN_KEY: 'authToken',
    REFRESH_TOKEN_KEY: 'refreshToken',
    USER_KEY: 'user',
    SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
    REFRESH_THRESHOLD: 5 * 60 * 1000 // 5 minutes before expiry
  },

  // UI Configuration
  UI: {
    TOAST_DURATION: 5000,
    TOAST_MAX_COUNT: 5,
    DEBOUNCE_DELAY: 300,
    THROTTLE_DELAY: 100
  },

  // File Upload
  UPLOAD: {
    MAX_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  },

  // Pagination
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 10,
    MAX_PAGE_SIZE: 100,
    PAGE_SIZE_OPTIONS: [10, 25, 50, 100]
  }
} as const;

/**
 * HTTP Status Codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500
} as const;

/**
 * User roles and permissions
 */
export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  MODERATOR: 'moderator'
} as const;

export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  BANNED: 'banned',
  PENDING: 'pending'
} as const;

/**
 * Form validation rules
 */
export const VALIDATION_RULES = {
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    MESSAGE: 'Email không hợp lệ'
  },
  PASSWORD: {
    MIN_LENGTH: 6,
    MAX_LENGTH: 128,
    PATTERN: /(?=.*[a-zA-Z])(?=.*[0-9])/,
    MESSAGE: 'Mật khẩu phải có ít nhất 6 ký tự, bao gồm chữ và số'
  },
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 30,
    PATTERN: /^(?=[a-zA-ZÀ-ÿ])[a-zA-ZÀ-ÿ0-9]+(?:[_\-\\.][a-zA-ZÀ-ÿ0-9]+)*$/,
    MESSAGE: 'Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới'
  },
  PHONE: {
    PATTERN: /^\+?[1-9]\d{1,14}$/,
    MESSAGE: 'Số điện thoại không hợp lệ'
  }
} as const;

/**
 * Local storage keys
 */
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  REFRESH_TOKEN: 'refreshToken',
  USER_DATA: 'user',
  THEME: 'theme',
  LANGUAGE: 'language',
  CART: 'cart',
  FAVORITES: 'favorites',
  SEARCH_HISTORY: 'searchHistory'
} as const;

/**
 * Event types for application events
 */
export const EVENT_TYPES = {
  // Authentication
  AUTH_LOGIN_SUCCESS: 'auth:login:success',
  AUTH_LOGIN_FAILED: 'auth:login:failed',
  AUTH_LOGOUT: 'auth:logout',
  AUTH_TOKEN_REFRESH: 'auth:token:refresh',

  // User
  USER_PROFILE_UPDATED: 'user:profile:updated',
  USER_AVATAR_UPLOADED: 'user:avatar:uploaded',

  // UI
  TOAST_SHOW: 'ui:toast:show',
  TOAST_HIDE: 'ui:toast:hide',
  MODAL_OPEN: 'ui:modal:open',
  MODAL_CLOSE: 'ui:modal:close',

  // Theme
  THEME_CHANGED: 'theme:changed',
  LANGUAGE_CHANGED: 'language:changed'
} as const;

/**
 * Route paths
 */
export const ROUTES = {
  HOME: '/src/pages/HomePage.html',
  SIGN_IN: '/src/pages/SigninPage.html',
  ACCOUNT: '/src/pages/Account.html',
  ADMIN: '/src/pages/Admin.html',
  CART: '/src/pages/CartPage.html',
  INTRO: '/src/pages/IntroductionPage.html',
  ORDER: '/src/pages/OrderPage.html',
  PRODUCT_DETAIL: '/src/pages/ProductDetail.html'
} as const;

/**
 * Toast message types
 */
export const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
} as const;

/**
 * Modal sizes
 */
export const MODAL_SIZES = {
  SMALL: 'sm',
  MEDIUM: 'md',
  LARGE: 'lg',
  EXTRA_LARGE: 'xl'
} as const;

/**
 * Common CSS classes
 */
export const CSS_CLASSES = {
  // Bootstrap utility classes
  LOADING: 'spinner-border spinner-border-sm',
  HIDDEN: 'd-none',
  VISIBLE: 'd-block',
  DISABLED: 'disabled',
  
  // Custom classes
  FADE_IN: 'fade-in',
  FADE_OUT: 'fade-out',
  SLIDE_UP: 'slide-up',
  SLIDE_DOWN: 'slide-down'
} as const;

/**
 * API endpoints
 */
export const API_ENDPOINTS = {
  // Authentication
  AUTH_LOGIN: '/auth/login',
  AUTH_REGISTER: '/auth/register',
  AUTH_LOGOUT: '/auth/logout',
  AUTH_REFRESH: '/auth/refresh',
  AUTH_PROFILE: '/auth/profile',
  AUTH_CHANGE_PASSWORD: '/auth/change-password',
  AUTH_FORGOT_PASSWORD: '/auth/forgot-password',
  AUTH_RESET_PASSWORD: '/auth/reset-password',
  AUTH_VERIFY_EMAIL: '/auth/verify-email',

  // Users
  USERS: '/users',
  USER_BY_ID: (id: string) => `/users/${id}`,
  USER_SEARCH: '/users/search',
  USER_TOGGLE_STATUS: (id: string) => `/users/${id}/status`,

  // Upload
  UPLOAD_AVATAR: '/upload/avatar',
  UPLOAD_FILE: '/upload/file'
} as const;

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet.',
  SERVER_ERROR: 'Lỗi máy chủ. Vui lòng thử lại sau.',
  UNAUTHORIZED: 'Bạn không có quyền truy cập.',
  FORBIDDEN: 'Truy cập bị từ chối.',
  NOT_FOUND: 'Không tìm thấy tài nguyên.',
  VALIDATION_ERROR: 'Dữ liệu không hợp lệ.',
  TIMEOUT_ERROR: 'Yêu cầu bị hết thời gian chờ.',
  UNKNOWN_ERROR: 'Đã xảy ra lỗi không xác định.'
} as const;

/**
 * Success messages
 */
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Đăng nhập thành công!',
  LOGOUT_SUCCESS: 'Đăng xuất thành công!',
  REGISTER_SUCCESS: 'Đăng ký thành công!',
  PROFILE_UPDATED: 'Cập nhật thông tin thành công!',
  PASSWORD_CHANGED: 'Đổi mật khẩu thành công!',
  FILE_UPLOADED: 'Tải file lên thành công!',
  DATA_SAVED: 'Lưu dữ liệu thành công!',
  DATA_DELETED: 'Xóa dữ liệu thành công!'
} as const;