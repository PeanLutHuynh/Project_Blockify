export interface User {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  address?: UserAddress;
  date_of_birth?: string;
  role: 'customer' | 'admin' | 'manager';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserAddress {
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  full_name?: string;
  phone?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UpdateProfileRequest {
  full_name?: string;
  phone?: string;
  address?: UserAddress;
  date_of_birth?: string;
}