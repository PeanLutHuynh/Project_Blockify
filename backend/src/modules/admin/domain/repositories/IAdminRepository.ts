import { Admin } from "../entities/Admin";
import { AdminAuditLog } from "../entities/AdminAuditLog";
import { IRepository } from "../../../../shared/domain/IRepository";

/**
 * Admin Repository Interface
 * Follows Repository Pattern from DDD
 */
export interface IAdminRepository extends IRepository<Admin> {
  /**
   * Find admin by auth_uid (from Supabase Auth)
   */
  findByAuthUid(authUid: string): Promise<Admin | null>;

  /**
   * Find admin by email
   */
  findByEmail(email: string): Promise<Admin | null>;

  /**
   * Update last login timestamp
   */
  updateLastLogin(adminId: number): Promise<void>;

  /**
   * Check if admin is active
   */
  isActive(adminId: number): Promise<boolean>;

  /**
   * Link auth account to admin
   */
  linkAuthAccount(adminId: number, authUid: string): Promise<void>;
}

/**
 * Admin Audit Log Repository Interface
 */
export interface IAdminAuditLogRepository extends IRepository<AdminAuditLog> {
  /**
   * Create audit log entry
   */
  logAction(log: AdminAuditLog): Promise<void>;

  /**
   * Get logs for specific admin
   */
  findByAdminId(adminId: number, limit?: number): Promise<AdminAuditLog[]>;
}
