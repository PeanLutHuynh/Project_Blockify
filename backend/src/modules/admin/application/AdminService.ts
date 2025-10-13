import { BaseService } from "../../../shared/application/BaseService";
import { Admin } from "../domain/entities/Admin";
import { AdminAuditLog, AdminAction } from "../domain/entities/AdminAuditLog";
import {
  AdminRepository,
  AdminAuditLogRepository,
} from "../infrastructure/repositories/AdminRepository";
import {
  CheckAdminDTO,
  CheckAdminResponseDTO,
  LoginAuditDTO,
  AdminActionDTO,
  UpdateLastLoginDTO,
  LinkAuthAccountDTO,
} from "./dto/AdminDTO";

/**
 * Admin Service - Application Layer (Use Cases)
 * Follows Clean Architecture principles
 */
export class AdminService {
  private adminRepository: AdminRepository;
  private auditLogRepository: AdminAuditLogRepository;

  constructor() {
    this.adminRepository = new AdminRepository();
    this.auditLogRepository = new AdminAuditLogRepository("admin_audit_logs");
  }

  /**
   * Use Case: Check if user is admin
   * Validates admin status and returns admin info
   */
  async checkAdmin(dto: CheckAdminDTO): Promise<CheckAdminResponseDTO> {
    try {
      console.log('🔍 [AdminService] Checking admin with authUid:', dto.authUid);
      const admin = await this.adminRepository.findByAuthUid(dto.authUid);

      if (!admin) {
        console.log('❌ [AdminService] Admin not found in database');
        return { isAdmin: false };
      }

      console.log('✅ [AdminService] Admin found:', { adminId: admin.adminId, email: admin.email, isActive: admin.isActive });

      if (!admin.isActive) {
        console.log('❌ [AdminService] Admin account is inactive');
        // Log failed login attempt
        await this.logAdminAction({
          adminId: admin.adminId,
          action: "LOGIN_FAILED",
          targetType: "session",
          payload: { reason: "Account inactive" },
        });

        throw new Error("Admin account is inactive");
      }

      return {
        isAdmin: true,
        adminId: admin.adminId,
        email: admin.email,
        fullName: admin.fullName,
        isActive: admin.isActive,
      };
    } catch (error) {
      console.error("Error checking admin:", error);
      throw error;
    }
  }

  /**
   * Use Case: Update last login timestamp
   * Called when admin successfully logs in
   */
  async updateLastLogin(dto: UpdateLastLoginDTO): Promise<void> {
    try {
      const admin = await this.adminRepository.findByAuthUid(dto.authUid);

      if (!admin) {
        throw new Error("Admin not found");
      }

      await this.adminRepository.updateLastLogin(admin.adminId);
    } catch (error) {
      console.error("Error updating last login:", error);
      throw error;
    }
  }

  /**
   * Use Case: Log admin login
   * Records login event with metadata
   */
  async logAdminLogin(dto: LoginAuditDTO): Promise<void> {
    try {
      const auditLog = new AdminAuditLog({
        adminId: dto.adminId,
        action: AdminAction.LOGIN,
        targetType: "session",
        payload: {
          ip: dto.ip,
          user_agent: dto.userAgent,
          method: dto.method,
          timestamp: new Date().toISOString(),
        },
      });

      await this.auditLogRepository.logAction(auditLog);
      // Directly update last login using adminId (integer) instead of auth_uid (UUID)
      await this.adminRepository.updateLastLogin(dto.adminId);
    } catch (error) {
      console.error("Error logging admin login:", error);
      throw error;
    }
  }

  /**
   * Use Case: Log admin action
   * Generic method for logging any admin action
   */
  async logAdminAction(dto: AdminActionDTO): Promise<void> {
    try {
      const auditLog = new AdminAuditLog({
        adminId: dto.adminId,
        action: dto.action as AdminAction,
        targetType: dto.targetType,
        targetId: dto.targetId || null,
        payload: dto.payload || {},
      });

      await this.auditLogRepository.logAction(auditLog);
    } catch (error) {
      console.error("Error logging admin action:", error);
      throw error;
    }
  }

  /**
   * Use Case: Link auth account to existing admin
   * Used when admin already exists but auth_uid is null
   */
  async linkAuthAccount(dto: LinkAuthAccountDTO): Promise<void> {
    try {
      const admin = await this.adminRepository.findByEmail(dto.email);

      if (!admin) {
        throw new Error("Admin not found with this email");
      }

      if (admin.authUid) {
        throw new Error("Admin already linked to an auth account");
      }

      await this.adminRepository.linkAuthAccount(admin.adminId, dto.authUid);

      // Log the linking action
      await this.logAdminAction({
        adminId: admin.adminId,
        action: "UPDATE",
        targetType: "admin_account",
        payload: {
          action: "link_auth_account",
          auth_uid: dto.authUid,
        },
      });
    } catch (error) {
      console.error("Error linking auth account:", error);
      throw error;
    }
  }

  /**
   * Use Case: Get admin audit logs
   * Retrieve action history for an admin
   */
  async getAdminAuditLogs(
    adminId: number,
    limit: number = 50
  ): Promise<AdminAuditLog[]> {
    try {
      return await this.auditLogRepository.findByAdminId(adminId, limit);
    } catch (error) {
      console.error("Error getting audit logs:", error);
      throw error;
    }
  }

  /**
   * Use Case: Create new admin
   * For manual admin creation
   */
  async createAdmin(data: {
    email: string;
    fullName: string;
    authUid?: string;
  }): Promise<Admin> {
    try {
      // Check if admin already exists
      const existingAdmin = await this.adminRepository.findByEmail(data.email);
      if (existingAdmin) {
        throw new Error("Admin with this email already exists");
      }

      const admin = new Admin({
        email: data.email,
        fullName: data.fullName,
        authUid: data.authUid || null,
        isActive: true,
      });

      admin.validate();

      const createdAdmin = await this.adminRepository.create(admin);

      // Log creation
      await this.logAdminAction({
        adminId: createdAdmin.adminId,
        action: "CREATE",
        targetType: "admin_account",
        payload: {
          email: data.email,
          full_name: data.fullName,
        },
      });

      return createdAdmin;
    } catch (error) {
      console.error("Error creating admin:", error);
      throw error;
    }
  }

  /**
   * Use Case: Deactivate admin
   */
  async deactivateAdmin(adminId: number, byAdminId: number): Promise<void> {
    try {
      const admin = await this.adminRepository.findById(adminId.toString());

      if (!admin) {
        throw new Error("Admin not found");
      }

      admin.deactivate();
      await this.adminRepository.update(adminId.toString(), admin);

      // Log deactivation
      await this.logAdminAction({
        adminId: byAdminId,
        action: "UPDATE",
        targetType: "admin_account",
        targetId: adminId.toString(),
        payload: {
          action: "deactivate",
        },
      });
    } catch (error) {
      console.error("Error deactivating admin:", error);
      throw error;
    }
  }

  /**
   * Use Case: Get all admins
   */
  async getAllAdmins(): Promise<Admin[]> {
    try {
      return await this.adminRepository.findAll();
    } catch (error) {
      console.error("Error getting all admins:", error);
      throw error;
    }
  }
}
