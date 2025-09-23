// UserController.js - Frontend User Management
// DDD Architecture: Frontend Module for User Management

import { authStore } from '../../core/services/index.js';
import { userService } from '../../core/api/services.js';
import { API_ENDPOINTS, VALIDATION_RULES, ERROR_MESSAGES } from '../../shared/constants/index.js';

export class UserController {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        console.log('UserController initialized');
        this.bindEvents();
        await this.loadUserProfile();
        this.checkAuthStatus();
        this.populateDateSelectors();
    }

    bindEvents() {
        // Profile form submission
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', this.handleProfileSubmit.bind(this));
        }

        // Avatar change
        const avatarInput = document.getElementById('avatarInput');
        if (avatarInput) {
            avatarInput.addEventListener('change', this.handleAvatarChange.bind(this));
        }

        // Password change form
        const passwordForm = document.getElementById('changePasswordForm');
        if (passwordForm) {
            passwordForm.addEventListener('submit', this.handlePasswordChange.bind(this));
        }

        // Address form
        const addressForm = document.getElementById('addAddressForm');
        if (addressForm) {
            addressForm.addEventListener('submit', this.handleAddAddress.bind(this));
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', this.handleLogout.bind(this));
        }

        // Send verification code
        const sendCodeBtn = document.getElementById('sendCodeBtn');
        if (sendCodeBtn) {
            sendCodeBtn.addEventListener('click', this.handleSendVerificationCode.bind(this));
        }

        // Order status filters
        const orderTabs = document.querySelectorAll('[data-status]');
        orderTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const status = e.target.getAttribute('data-status');
                this.filterOrders(status);
            });
        });
    }

    async checkAuthStatus() {
        try {
            const isAuthenticated = authStore.isAuthenticated();
            if (!isAuthenticated) {
                // For demo purposes, create a mock user
                this.createMockUser();
                return;
            }
            
            const user = authStore.getCurrentUser();
            if (user) {
                this.currentUser = user;
                this.populateUserData(user);
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            this.createMockUser();
        }
    }

    createMockUser() {
        // Create mock user for demo
        this.currentUser = {
            id: 1,
            username: 'QTLHH',
            email: 'qtlhh@gmail.com',
            firstName: 'Quang',
            lastName: 'Trần Lê Hải',
            phone: '0987654321',
            avatar: '../../public/images/Group 40.png',
            gender: 'male',
            birthDate: {
                day: 15,
                month: 8,
                year: 1995
            }
        };
        this.populateUserData(this.currentUser);
    }

    async loadUserProfile() {
        try {
            if (!authStore.isAuthenticated()) {
                return;
            }

            const response = await userService.getProfile();
            
            if (response.success) {
                this.currentUser = response.data.user;
                authStore.updateUser(this.currentUser);
                this.populateUserData(this.currentUser);
            } else {
                throw new Error(response.message || 'Failed to load profile');
            }
        } catch (error) {
            console.error('Failed to load user profile:', error);
            // Use mock data for demo
            this.createMockUser();
        }
    }

    populateUserData(user) {
        // Update sidebar
        const userAvatar = document.getElementById('userAvatar');
        const displayUsername = document.getElementById('displayUsername');
        
        if (userAvatar) userAvatar.src = user.avatar || '../../public/images/Group 40.png';
        if (displayUsername) displayUsername.textContent = user.username || 'User';

        // Update form fields
        this.populateFormFields(user);
        
        // Update avatar preview
        const avatarPreview = document.getElementById('avatarPreview');
        if (avatarPreview) avatarPreview.src = user.avatar || '../../public/images/Group 40.png';
    }

    populateFormFields(user) {
        const fields = {
            'username': user.username,
            'email': user.email,
            'firstName': user.firstName,
            'lastName': user.lastName,
            'phone': user.phone,
            'verifyEmail': user.email
        };

        Object.entries(fields).forEach(([fieldId, value]) => {
            const field = document.getElementById(fieldId);
            if (field && value) {
                field.value = value;
            }
        });

        // Set gender
        if (user.gender) {
            const genderRadio = document.querySelector(`input[name="gender"][value="${user.gender}"]`);
            if (genderRadio) genderRadio.checked = true;
        }

        // Set birth date
        if (user.birthDate) {
            const daySelect = document.getElementById('birthDay');
            const monthSelect = document.getElementById('birthMonth');
            const yearSelect = document.getElementById('birthYear');

            if (daySelect && user.birthDate.day) daySelect.value = user.birthDate.day;
            if (monthSelect && user.birthDate.month) monthSelect.value = user.birthDate.month;
            if (yearSelect && user.birthDate.year) yearSelect.value = user.birthDate.year;
        }
    }

    populateDateSelectors() {
        const daySelect = document.getElementById('birthDay');
        const monthSelect = document.getElementById('birthMonth');
        const yearSelect = document.getElementById('birthYear');

        if (!daySelect || !monthSelect || !yearSelect) return;

        // Clear existing options (except first)
        daySelect.innerHTML = '<option value="">Ngày</option>';
        monthSelect.innerHTML = '<option value="">Tháng</option>';
        yearSelect.innerHTML = '<option value="">Năm</option>';

        // Populate days
        for (let day = 1; day <= 31; day++) {
            const option = document.createElement('option');
            option.value = day;
            option.textContent = day;
            daySelect.appendChild(option);
        }

        // Populate months
        const months = [
            'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
            'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
        ];
        months.forEach((month, index) => {
            const option = document.createElement('option');
            option.value = index + 1;
            option.textContent = month;
            monthSelect.appendChild(option);
        });

        // Populate years
        const currentYear = new Date().getFullYear();
        for (let year = currentYear; year >= currentYear - 100; year--) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        }
    }

    async handleProfileSubmit(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = this.getFormData(form);

        if (!this.validateProfileForm(formData)) {
            return;
        }

        try {
            this.setLoadingState(form, true);
            
            // Mock update for demo
            const updatedUser = {
                ...this.currentUser,
                firstName: formData.firstName,
                lastName: formData.lastName,
                phone: formData.phone,
                gender: formData.gender,
                birthDate: {
                    day: parseInt(formData.birthDay),
                    month: parseInt(formData.birthMonth),
                    year: parseInt(formData.birthYear)
                }
            };

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            this.currentUser = updatedUser;
            this.populateUserData(updatedUser);
            this.showToast('Cập nhật thông tin thành công!', 'success');
            
        } catch (error) {
            console.error('Profile update failed:', error);
            this.showToast(error.message || 'Có lỗi xảy ra khi cập nhật thông tin', 'error');
        } finally {
            this.setLoadingState(form, false);
        }
    }

    async handleAvatarChange(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file
        const validationResult = this.validateAvatarFile(file);
        if (!validationResult.isValid) {
            this.showToast(validationResult.message, 'error');
            event.target.value = '';
            return;
        }

        try {
            // Show preview immediately
            const reader = new FileReader();
            reader.onload = (e) => {
                this.updateAvatarDisplay(e.target.result);
            };
            reader.readAsDataURL(file);

            this.showToast('Đang tải lên ảnh đại diện...', 'info');
            
            // Simulate upload
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            this.showToast('Cập nhật ảnh đại diện thành công!', 'success');
            
        } catch (error) {
            console.error('Avatar upload failed:', error);
            this.showToast(error.message || 'Có lỗi xảy ra khi upload ảnh', 'error');
            // Restore original avatar on error
            this.updateAvatarDisplay(this.currentUser?.avatar);
        }
    }

    async handlePasswordChange(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = this.getFormData(form);

        if (!this.validatePasswordForm(formData)) {
            return;
        }

        try {
            this.setLoadingState(form, true);
            
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            this.showToast('Đổi mật khẩu thành công!', 'success');
            form.reset();
            this.clearFormErrors(form);
            
        } catch (error) {
            console.error('Password change failed:', error);
            this.showToast(error.message || 'Có lỗi xảy ra khi đổi mật khẩu', 'error');
        } finally {
            this.setLoadingState(form, false);
        }
    }

    async handleAddAddress(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = this.getFormData(form);

        try {
            this.setLoadingState(form, true);
            
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            this.showToast('Thêm địa chỉ thành công!', 'success');
            form.reset();
            
        } catch (error) {
            console.error('Add address failed:', error);
            this.showToast(error.message || 'Có lỗi xảy ra khi thêm địa chỉ', 'error');
        } finally {
            this.setLoadingState(form, false);
        }
    }

    async handleSendVerificationCode() {
        try {
            const btn = document.getElementById('sendCodeBtn');
            btn.disabled = true;
            btn.textContent = 'Đang gửi...';
            
            // Simulate sending code
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            this.showToast('Mã xác minh đã được gửi!', 'success');
            
            // Countdown
            let countdown = 60;
            const interval = setInterval(() => {
                btn.textContent = `Gửi lại (${countdown}s)`;
                countdown--;
                
                if (countdown < 0) {
                    clearInterval(interval);
                    btn.disabled = false;
                    btn.textContent = 'Gửi mã';
                }
            }, 1000);
            
        } catch (error) {
            console.error('Send verification code failed:', error);
            this.showToast('Có lỗi xảy ra khi gửi mã', 'error');
        }
    }

    filterOrders(status) {
        // Update active tab
        document.querySelectorAll('[data-status]').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-status="${status}"]`).classList.add('active');

        // Filter logic would go here
        console.log('Filtering orders by status:', status);
        this.showToast(`Hiển thị đơn hàng: ${status}`, 'info');
    }

    async handleLogout() {
        if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
            try {
                await authStore.logout();
                window.location.href = '/src/pages/SigninPage.html';
            } catch (error) {
                console.error('Logout failed:', error);
                this.showToast('Có lỗi xảy ra khi đăng xuất', 'error');
            }
        }
    }

    // Utility Methods
    getFormData(form) {
        const formData = new FormData(form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }

        // Also get values from input elements directly
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            if (input.name || input.id) {
                const key = input.name || input.id;
                if (input.type === 'radio') {
                    if (input.checked) {
                        data[key] = input.value;
                    }
                } else {
                    data[key] = input.value;
                }
            }
        });

        return data;
    }

    validateProfileForm(data) {
        let isValid = true;
        const form = document.getElementById('profileForm');
        this.clearFormErrors(form);

        // Validate first name
        if (!data.firstName || data.firstName.trim().length < 2) {
            this.showFieldError('firstName', 'Tên phải có ít nhất 2 ký tự');
            isValid = false;
        }

        // Validate last name
        if (!data.lastName || data.lastName.trim().length < 2) {
            this.showFieldError('lastName', 'Họ phải có ít nhất 2 ký tự');
            isValid = false;
        }

        // Validate phone
        if (data.phone && !this.isValidPhone(data.phone)) {
            this.showFieldError('phone', 'Số điện thoại không hợp lệ');
            isValid = false;
        }

        return isValid;
    }

    validatePasswordForm(data) {
        let isValid = true;
        const form = document.getElementById('changePasswordForm');
        this.clearFormErrors(form);

        // Validate current password
        if (!data.currentPassword) {
            this.showFieldError('currentPassword', 'Vui lòng nhập mật khẩu hiện tại');
            isValid = false;
        }

        // Validate new password
        if (!data.newPassword || data.newPassword.length < 6) {
            this.showFieldError('newPassword', 'Mật khẩu mới phải có ít nhất 6 ký tự');
            isValid = false;
        }

        // Validate confirm password
        if (data.newPassword !== data.confirmPassword) {
            this.showFieldError('confirmPassword', 'Mật khẩu xác nhận không khớp');
            isValid = false;
        }

        return isValid;
    }

    validateAvatarFile(file) {
        const maxSize = 5 * 1024 * 1024; // 5MB
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

        if (!allowedTypes.includes(file.type)) {
            return {
                isValid: false,
                message: 'Định dạng file không được hỗ trợ. Vui lòng chọn file JPG, PNG, GIF hoặc WebP.'
            };
        }

        if (file.size > maxSize) {
            return {
                isValid: false,
                message: 'Kích thước file quá lớn. Vui lòng chọn file nhỏ hơn 5MB.'
            };
        }

        return { isValid: true };
    }

    isValidPhone(phone) {
        const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,15}$/;
        return phoneRegex.test(phone);
    }

    updateAvatarDisplay(avatarUrl) {
        const avatarElements = [
            document.getElementById('avatarPreview'),
            document.getElementById('userAvatar')
        ];

        avatarElements.forEach(element => {
            if (element) {
                element.src = avatarUrl || '../../public/images/Group 40.png';
            }
        });
    }

    showFieldError(fieldId, message) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.classList.add('is-invalid');
            const feedback = field.parentNode.querySelector('.invalid-feedback');
            if (feedback) {
                feedback.textContent = message;
            }
        }
    }

    clearFormErrors(form) {
        if (!form) return;
        
        const invalidFields = form.querySelectorAll('.is-invalid');
        invalidFields.forEach(field => {
            field.classList.remove('is-invalid');
        });

        const feedbacks = form.querySelectorAll('.invalid-feedback');
        feedbacks.forEach(feedback => {
            feedback.textContent = '';
        });
    }

    setLoadingState(form, isLoading) {
        const submitBtn = form.querySelector('[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = isLoading;
            if (isLoading) {
                submitBtn.classList.add('loading');
                const originalText = submitBtn.textContent;
                submitBtn.setAttribute('data-original-text', originalText);
                submitBtn.textContent = 'Đang xử lý...';
            } else {
                submitBtn.classList.remove('loading');
                const originalText = submitBtn.getAttribute('data-original-text');
                if (originalText) {
                    submitBtn.textContent = originalText;
                }
            }
        }
    }

    showToast(message, type = 'info') {
        // Create toast container if it doesn't exist
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }

        const toast = document.createElement('div');
        toast.className = `toast-message toast-${type}`;
        toast.textContent = message;

        // Auto remove toast after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 5000);

        // Remove on click
        toast.addEventListener('click', () => {
            toast.remove();
        });

        toastContainer.appendChild(toast);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new UserController();
});

// Export for module use
export default UserController;