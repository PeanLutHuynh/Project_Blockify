/**
 * Data Transfer Objects for Admin Module
 */

export interface CheckAdminDTO {
  authUid: string;
}

export interface CheckAdminResponseDTO {
  isAdmin: boolean;
  adminId?: number;
  email?: string;
  fullName?: string;
  isActive?: boolean;
}

export interface LoginAuditDTO {
  adminId: number;
  ip?: string;
  userAgent?: string;
  method: "google" | "password" | "email";
}

export interface AdminActionDTO {
  adminId: number;
  action: "LOGIN" | "LOGOUT" | "CREATE" | "UPDATE" | "DELETE" | "VIEW" | "LOGIN_FAILED";
  targetType: string;
  targetId?: string;
  payload?: Record<string, any>;
}

export interface UpdateLastLoginDTO {
  authUid: string;
}

export interface LinkAuthAccountDTO {
  email: string;
  authUid: string;
}
