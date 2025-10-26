import { BaseRepository } from "../../../shared/infrastructure/BaseRepository";
import { PaymentProof } from "../domain/entities/PaymentProof";
import { supabaseAdmin } from "../../../config/database";
import { logger } from "../../../config/logger";

/**
 * PaymentProof Repository - Infrastructure Layer
 * Handles data persistence for payment proofs using Supabase SDK
 */
export class PaymentProofRepository extends BaseRepository<PaymentProof> {
  constructor(tableName: string = "payment_proofs") {
    super(tableName);
  }

  /**
   * Create new payment proof
   */
  async create(proof: PaymentProof): Promise<PaymentProof> {
    try {
      const proofData = proof.toObject();

      const { data, error } = await supabaseAdmin
        .from(this.tableName)
        .insert(proofData)
        .select()
        .single();

      if (error) {
        logger.error("Error creating payment proof:", error);
        throw new Error(`Failed to create payment proof: ${error.message}`);
      }

      return this.mapToEntity(data);
    } catch (error: any) {
      logger.error("Repository error creating payment proof:", error);
      throw error;
    }
  }

  /**
   * Find payment proof by ID
   */
  async findById(id: string): Promise<PaymentProof | null> {
    try {
      const proofId = parseInt(id, 10);
      const { data, error } = await supabaseAdmin
        .from(this.tableName)
        .select("*")
        .eq("proof_id", proofId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null; // Not found
        }
        logger.error("Error finding payment proof:", error);
        throw new Error(`Failed to find payment proof: ${error.message}`);
      }

      return data ? this.mapToEntity(data) : null;
    } catch (error: any) {
      logger.error("Repository error finding payment proof:", error);
      throw error;
    }
  }

  /**
   * Find payment proofs by order ID
   */
  async findByOrderId(orderId: number): Promise<PaymentProof[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.tableName)
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });

      if (error) {
        logger.error("Error finding payment proofs by order:", error);
        throw new Error(`Failed to find payment proofs: ${error.message}`);
      }

      return data ? data.map((item) => this.mapToEntity(item)) : [];
    } catch (error: any) {
      logger.error("Repository error finding payment proofs by order:", error);
      throw error;
    }
  }

  /**
   * Find payment proofs by user ID
   */
  async findByUserId(userId: number): Promise<PaymentProof[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.tableName)
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        logger.error("Error finding payment proofs by user:", error);
        throw new Error(`Failed to find payment proofs: ${error.message}`);
      }

      return data ? data.map((item) => this.mapToEntity(item)) : [];
    } catch (error: any) {
      logger.error("Repository error finding payment proofs by user:", error);
      throw error;
    }
  }

  /**
   * Update payment proof status (for admin review)
   */
  async updateStatus(
    proofId: number,
    status: string,
    reviewedBy: number
  ): Promise<PaymentProof> {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.tableName)
        .update({
          status,
          reviewed_by: reviewedBy,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("proof_id", proofId)
        .select()
        .single();

      if (error) {
        logger.error("Error updating payment proof status:", error);
        throw new Error(`Failed to update payment proof: ${error.message}`);
      }

      return this.mapToEntity(data);
    } catch (error: any) {
      logger.error("Repository error updating payment proof:", error);
      throw error;
    }
  }

  /**
   * Upload file to Supabase Storage
   */
  async uploadFile(
    file: Buffer,
    fileName: string,
    fileType: string,
    userId: number
  ): Promise<string> {
    try {
      // Generate unique file name with user ID
      const timestamp = Date.now();
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
      const storagePath = `${userId}/${timestamp}_${sanitizedFileName}`;

      const { data, error } = await supabaseAdmin.storage
        .from("payment_proofs")
        .upload(storagePath, file, {
          contentType: fileType,
          upsert: false,
        });

      if (error) {
        logger.error("Error uploading file to storage:", error);
        throw new Error(`Failed to upload file: ${error.message}`);
      }

      // Get public URL (will work with signed URLs since bucket is private)
      const { data: urlData } = supabaseAdmin.storage
        .from("payment_proofs")
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (error: any) {
      logger.error("Repository error uploading file:", error);
      throw error;
    }
  }

  /**
   * Get signed URL for private file access
   */
  async getSignedUrl(fileUrl: string, expiresIn: number = 3600): Promise<string> {
    try {
      // Extract path from URL
      const urlObj = new URL(fileUrl);
      const path = urlObj.pathname.split("/storage/v1/object/public/payment_proofs/")[1];

      if (!path) {
        throw new Error("Invalid file URL");
      }

      const { data, error } = await supabaseAdmin.storage
        .from("payment_proofs")
        .createSignedUrl(path, expiresIn);

      if (error) {
        logger.error("Error creating signed URL:", error);
        throw new Error(`Failed to create signed URL: ${error.message}`);
      }

      return data.signedUrl;
    } catch (error: any) {
      logger.error("Repository error creating signed URL:", error);
      throw error;
    }
  }

  /**
   * Delete file from storage
   */
  async deleteFile(fileUrl: string): Promise<void> {
    try {
      const urlObj = new URL(fileUrl);
      const path = urlObj.pathname.split("/storage/v1/object/public/payment_proofs/")[1];

      if (!path) {
        throw new Error("Invalid file URL");
      }

      const { error } = await supabaseAdmin.storage
        .from("payment_proofs")
        .remove([path]);

      if (error) {
        logger.error("Error deleting file from storage:", error);
        throw new Error(`Failed to delete file: ${error.message}`);
      }
    } catch (error: any) {
      logger.error("Repository error deleting file:", error);
      throw error;
    }
  }

  // Map database row to entity
  protected mapToEntity(data: any): PaymentProof {
    return new PaymentProof({
      proofId: data.proof_id,
      orderId: data.order_id,
      userId: data.user_id,
      fileUrl: data.file_url,
      fileType: data.file_type,
      note: data.note,
      status: data.status,
      reviewedBy: data.reviewed_by,
      reviewedAt: data.reviewed_at ? new Date(data.reviewed_at) : undefined,
      createdAt: data.created_at ? new Date(data.created_at) : undefined,
      updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
    });
  }

  // Required by BaseRepository but not used
  async findAll(): Promise<PaymentProof[]> {
    throw new Error("Method not implemented. Use findByOrderId or findByUserId instead.");
  }

  async update(id: string, data: Partial<PaymentProof>): Promise<PaymentProof> {
    throw new Error("Method not implemented. Use updateStatus instead.");
  }

  async delete(id: string): Promise<boolean> {
    throw new Error("Method not implemented.");
  }

  // Map entity to database row (required by BaseRepository)
  protected mapFromEntity(entity: PaymentProof): any {
    return entity.toObject();
  }
}
