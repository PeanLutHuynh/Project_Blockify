import { BaseRepository } from "../../../../shared/infrastructure/BaseRepository";
import { Admin } from "../../domain/entities/Admin";
import {
  IAdminRepository,
  IAdminAuditLogRepository,
} from "../../domain/repositories/IAdminRepository";
import { AdminAuditLog } from "../../domain/entities/AdminAuditLog";
import { supabaseAdmin } from "../../../../config/database";

/**
 * Admin Repository Implementation using Supabase SDK
 * Infrastructure Layer - Clean Architecture
 */
export class AdminRepository
  extends BaseRepository<Admin>
  implements IAdminRepository
{
  protected tableName = "admin_users";

  constructor() {
    super("admin_users");
  }

  async findByAuthUid(authUid: string): Promise<Admin | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.tableName)
        .select("*")
        .eq("auth_uid", authUid)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No rows returned
          return null;
        }
        throw error;
      }

      return data ? this.mapToEntity(data) : null;
    } catch (error) {
      console.error("Error finding admin by auth_uid:", error);
      throw error;
    }
  }

  async findByEmail(email: string): Promise<Admin | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.tableName)
        .select("*")
        .eq("email", email)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null;
        }
        throw error;
      }

      return data ? this.mapToEntity(data) : null;
    } catch (error) {
      console.error("Error finding admin by email:", error);
      throw error;
    }
  }

  async updateLastLogin(adminId: number): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from(this.tableName)
        .update({ last_login: new Date().toISOString() })
        .eq("admin_id", adminId);

      if (error) throw error;
    } catch (error) {
      console.error("Error updating last login:", error);
      throw error;
    }
  }

  async isActive(adminId: number): Promise<boolean> {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.tableName)
        .select("is_active")
        .eq("admin_id", adminId)
        .single();

      if (error) throw error;

      return data?.is_active || false;
    } catch (error) {
      console.error("Error checking admin active status:", error);
      return false;
    }
  }

  async linkAuthAccount(adminId: number, authUid: string): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from(this.tableName)
        .update({ auth_uid: authUid })
        .eq("admin_id", adminId);

      if (error) throw error;
    } catch (error) {
      console.error("Error linking auth account:", error);
      throw error;
    }
  }

  async findById(id: string): Promise<Admin | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.tableName)
        .select("*")
        .eq("admin_id", parseInt(id))
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null;
        }
        throw error;
      }

      return data ? this.mapToEntity(data) : null;
    } catch (error) {
      console.error("Error finding admin by id:", error);
      throw error;
    }
  }

  async findAll(): Promise<Admin[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.tableName)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data ? data.map((item) => this.mapToEntity(item)) : [];
    } catch (error) {
      console.error("Error finding all admins:", error);
      throw error;
    }
  }

  async create(entity: Admin): Promise<Admin> {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.tableName)
        .insert([
          {
            email: entity.email,
            full_name: entity.fullName,
            auth_uid: entity.authUid,
            is_active: entity.isActive,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      return this.mapToEntity(data);
    } catch (error) {
      console.error("Error creating admin:", error);
      throw error;
    }
  }

  async update(id: string, entity: Admin): Promise<Admin> {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.tableName)
        .update({
          email: entity.email,
          full_name: entity.fullName,
          is_active: entity.isActive,
          updated_at: new Date().toISOString(),
        })
        .eq("admin_id", parseInt(id))
        .select()
        .single();

      if (error) throw error;

      return this.mapToEntity(data);
    } catch (error) {
      console.error("Error updating admin:", error);
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from(this.tableName)
        .delete()
        .eq("admin_id", parseInt(id));

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error deleting admin:", error);
      throw error;
    }
  }

  protected mapToEntity(data: any): Admin {
    return new Admin({
      adminId: data.admin_id,
      email: data.email,
      fullName: data.full_name,
      authUid: data.auth_uid,
      isActive: data.is_active,
      lastLogin: data.last_login ? new Date(data.last_login) : null,
      avatarUrl: data.avatar_url,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    });
  }

  protected mapFromEntity(entity: Admin | Partial<Admin>): any {
    const admin = entity as Admin;
    const mapped: any = {};
    
    if (admin.email !== undefined) mapped.email = admin.email;
    if (admin.fullName !== undefined) mapped.full_name = admin.fullName;
    if (admin.authUid !== undefined) mapped.auth_uid = admin.authUid;
    if (admin.isActive !== undefined) mapped.is_active = admin.isActive;
    if (admin.avatarUrl !== undefined) mapped.avatar_url = admin.avatarUrl;
    
    return mapped;
  }
}

/**
 * Admin Audit Log Repository Implementation
 */
export class AdminAuditLogRepository
  extends BaseRepository<AdminAuditLog>
  implements IAdminAuditLogRepository
{
  protected tableName = "admin_audit_logs";

  async logAction(log: AdminAuditLog): Promise<void> {
    try {
      const { error } = await supabaseAdmin.from(this.tableName).insert([
        {
          admin_id: log.adminId,
          action: log.action,
          target_type: log.targetType,
          target_id: log.targetId,
          payload: log.payload,
        },
      ]);

      if (error) throw error;
    } catch (error) {
      console.error("Error logging admin action:", error);
      throw error;
    }
  }

  async findByAdminId(
    adminId: number,
    limit: number = 50
  ): Promise<AdminAuditLog[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.tableName)
        .select("*")
        .eq("admin_id", adminId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data ? data.map((item) => this.mapToEntity(item)) : [];
    } catch (error) {
      console.error("Error finding audit logs:", error);
      throw error;
    }
  }

  async findById(id: string): Promise<AdminAuditLog | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.tableName)
        .select("*")
        .eq("log_id", parseInt(id))
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null;
        }
        throw error;
      }

      return data ? this.mapToEntity(data) : null;
    } catch (error) {
      console.error("Error finding audit log by id:", error);
      throw error;
    }
  }

  async findAll(): Promise<AdminAuditLog[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.tableName)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      return data ? data.map((item) => this.mapToEntity(item)) : [];
    } catch (error) {
      console.error("Error finding all audit logs:", error);
      throw error;
    }
  }

  async create(entity: AdminAuditLog): Promise<AdminAuditLog> {
    await this.logAction(entity);
    return entity;
  }

  async update(id: string, entity: AdminAuditLog): Promise<AdminAuditLog> {
    throw new Error("Audit logs cannot be updated");
  }

  async delete(id: string): Promise<boolean> {
    throw new Error("Audit logs cannot be deleted");
  }

  protected mapToEntity(data: any): AdminAuditLog {
    return new AdminAuditLog({
      logId: data.log_id,
      adminId: data.admin_id,
      action: data.action,
      targetType: data.target_type,
      targetId: data.target_id,
      payload: data.payload || {},
      createdAt: new Date(data.created_at),
    });
  }

  protected mapFromEntity(entity: AdminAuditLog | Partial<AdminAuditLog>): any {
    const log = entity as AdminAuditLog;
    return {
      admin_id: log.adminId,
      action: log.action,
      target_type: log.targetType,
      target_id: log.targetId,
      payload: log.payload,
    };
  }
}
