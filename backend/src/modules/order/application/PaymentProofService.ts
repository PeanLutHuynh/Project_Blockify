import { PaymentProof } from "../domain/entities/PaymentProof";
import { PaymentProofRepository } from "../infrastructure/PaymentProofRepository";
import { logger } from "../../../config/logger";

/**
 * Payment Proof Service - Application Layer
 * Use cases for handling payment proof uploads and management
 */
export class PaymentProofService {
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
  ];

  constructor(private paymentProofRepository: PaymentProofRepository) {}

  /**
   * Upload payment proof file
   */
  async uploadPaymentProof(data: {
    orderId: number;
    userId: number;
    file: Buffer;
    fileName: string;
    fileType: string;
    fileSize: number;
    note?: string;
  }): Promise<PaymentProof> {
    try {
      // Validate file size
      if (data.fileSize > this.MAX_FILE_SIZE) {
        throw new Error(
          `File size exceeds maximum limit of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`
        );
      }

      // Validate file type
      if (!this.ALLOWED_MIME_TYPES.includes(data.fileType.toLowerCase())) {
        throw new Error(
          "Invalid file type. Only images (JPEG, PNG, GIF, WebP) and PDF are allowed"
        );
      }

      // Upload file to storage
      const fileUrl = await this.paymentProofRepository.uploadFile(
        data.file,
        data.fileName,
        data.fileType,
        data.userId
      );

      // Create payment proof entity
      const paymentProof = new PaymentProof({
        orderId: data.orderId,
        userId: data.userId,
        fileUrl,
        fileType: data.fileType,
        note: data.note,
        status: "pending",
      });

      // Save to database
      const createdProof = await this.paymentProofRepository.create(paymentProof);

      logger.info(
        `Payment proof uploaded for order ${data.orderId} by user ${data.userId}`
      );

      return createdProof;
    } catch (error: any) {
      logger.error("Error uploading payment proof:", error);
      throw new Error(`Failed to upload payment proof: ${error.message}`);
    }
  }

  /**
   * Get payment proof by ID
   */
  async getPaymentProofById(proofId: number): Promise<PaymentProof | null> {
    try {
      return await this.paymentProofRepository.findById(proofId.toString());
    } catch (error: any) {
      logger.error("Error getting payment proof:", error);
      throw new Error(`Failed to get payment proof: ${error.message}`);
    }
  }

  /**
   * Get all payment proofs for an order
   */
  async getPaymentProofsByOrderId(orderId: number): Promise<PaymentProof[]> {
    try {
      return await this.paymentProofRepository.findByOrderId(orderId);
    } catch (error: any) {
      logger.error("Error getting payment proofs for order:", error);
      throw new Error(`Failed to get payment proofs: ${error.message}`);
    }
  }

  /**
   * Get all payment proofs for a user
   */
  async getPaymentProofsByUserId(userId: number): Promise<PaymentProof[]> {
    try {
      return await this.paymentProofRepository.findByUserId(userId);
    } catch (error: any) {
      logger.error("Error getting payment proofs for user:", error);
      throw new Error(`Failed to get payment proofs: ${error.message}`);
    }
  }

  /**
   * Accept payment proof (admin only)
   */
  async acceptPaymentProof(
    proofId: number,
    reviewedBy: number
  ): Promise<PaymentProof> {
    try {
      const proof = await this.paymentProofRepository.findById(proofId.toString());

      if (!proof) {
        throw new Error("Payment proof not found");
      }

      proof.accept(reviewedBy);

      const updated = await this.paymentProofRepository.updateStatus(
        proofId,
        "accepted",
        reviewedBy
      );

      logger.info(`Payment proof ${proofId} accepted by admin ${reviewedBy}`);

      return updated;
    } catch (error: any) {
      logger.error("Error accepting payment proof:", error);
      throw new Error(`Failed to accept payment proof: ${error.message}`);
    }
  }

  /**
   * Reject payment proof (admin only)
   */
  async rejectPaymentProof(
    proofId: number,
    reviewedBy: number,
    note?: string
  ): Promise<PaymentProof> {
    try {
      const proof = await this.paymentProofRepository.findById(proofId.toString());

      if (!proof) {
        throw new Error("Payment proof not found");
      }

      proof.reject(reviewedBy, note);

      const updated = await this.paymentProofRepository.updateStatus(
        proofId,
        "rejected",
        reviewedBy
      );

      logger.info(`Payment proof ${proofId} rejected by admin ${reviewedBy}`);

      return updated;
    } catch (error: any) {
      logger.error("Error rejecting payment proof:", error);
      throw new Error(`Failed to reject payment proof: ${error.message}`);
    }
  }

  /**
   * Get signed URL for accessing private file
   */
  async getSignedUrl(fileUrl: string, expiresIn: number = 3600): Promise<string> {
    try {
      return await this.paymentProofRepository.getSignedUrl(fileUrl, expiresIn);
    } catch (error: any) {
      logger.error("Error getting signed URL:", error);
      throw new Error(`Failed to get signed URL: ${error.message}`);
    }
  }

  /**
   * Delete payment proof and file
   */
  async deletePaymentProof(proofId: number): Promise<void> {
    try {
      const proof = await this.paymentProofRepository.findById(proofId.toString());

      if (!proof) {
        throw new Error("Payment proof not found");
      }

      // Delete file from storage
      await this.paymentProofRepository.deleteFile(proof.fileUrl);

      // Note: In real implementation, we should also delete the database record
      // For now, we just delete the file

      logger.info(`Payment proof ${proofId} deleted`);
    } catch (error: any) {
      logger.error("Error deleting payment proof:", error);
      throw new Error(`Failed to delete payment proof: ${error.message}`);
    }
  }
}
