import { HttpRequest, HttpResponse } from "../../../infrastructure/http/types";
import { PaymentProofService } from "../application/PaymentProofService";
import { logger } from "../../../config/logger";

/**
 * PaymentProof Controller - Presentation Layer
 * Handles HTTP requests for payment proof operations
 */
export class PaymentProofController {
  constructor(private paymentProofService: PaymentProofService) {}

  /**
   * Send JSON response
   */
  private sendResponse(
    res: HttpResponse,
    statusCode: number,
    data: any
  ): void {
    res.status(statusCode).json(data);
  }

  /**
   * Success response helper
   */
  private success(message: string, data?: any): any {
    return {
      success: true,
      message,
      data,
    };
  }

  /**
   * Error response helper
   */
  private error(message: string, details?: any): any {
    return {
      success: false,
      message,
      error: details,
    };
  }

  /**
   * Upload payment proof
   * POST /api/payment-proofs/upload
   * Body: { order_id, user_id, file_data (base64), file_name, file_type, note? }
   */
  async uploadProof(req: HttpRequest, res: HttpResponse): Promise<void> {
    try {
      const {
        order_id,
        user_id,
        file_data,
        file_name,
        file_type,
        file_size,
        note,
      } = req.body;

      // Validate required fields
      if (!order_id || !user_id || !file_data || !file_name || !file_type) {
        this.sendResponse(
          res,
          400,
          this.error("Missing required fields", {
            required: ["order_id", "user_id", "file_data", "file_name", "file_type"],
          })
        );
        return;
      }

      // Convert base64 to buffer
      const fileBuffer = Buffer.from(file_data, "base64");
      const actualFileSize = file_size || fileBuffer.length;

      // Upload payment proof
      const paymentProof = await this.paymentProofService.uploadPaymentProof({
        orderId: parseInt(order_id, 10),
        userId: parseInt(user_id, 10),
        file: fileBuffer,
        fileName: file_name,
        fileType: file_type,
        fileSize: actualFileSize,
        note,
      });

      this.sendResponse(
        res,
        201,
        this.success("Payment proof uploaded successfully", {
          proof_id: paymentProof.proofId,
          order_id: paymentProof.orderId,
          file_url: paymentProof.fileUrl,
          status: paymentProof.status,
          created_at: paymentProof.createdAt,
        })
      );
    } catch (error: any) {
      logger.error("Upload proof error:", error);
      this.sendResponse(
        res,
        400,
        this.error(error.message || "Failed to upload payment proof")
      );
    }
  }

  /**
   * Get payment proofs by order ID
   * GET /api/payment-proofs/order/:orderId
   */
  async getProofsByOrderId(
    req: HttpRequest,
    res: HttpResponse,
    orderId: string
  ): Promise<void> {
    try {
      const orderIdNum = parseInt(orderId, 10);
      if (isNaN(orderIdNum)) {
        this.sendResponse(res, 400, this.error("Invalid order ID"));
        return;
      }

      const proofs = await this.paymentProofService.getPaymentProofsByOrderId(
        orderIdNum
      );

      // Get signed URLs for private files
      const proofsWithSignedUrls = await Promise.all(
        proofs.map(async (proof) => {
          const signedUrl = await this.paymentProofService.getSignedUrl(
            proof.fileUrl
          );
          return {
            proof_id: proof.proofId,
            order_id: proof.orderId,
            user_id: proof.userId,
            file_url: signedUrl, // Return signed URL
            file_type: proof.fileType,
            note: proof.note,
            status: proof.status,
            reviewed_by: proof.reviewedBy,
            reviewed_at: proof.reviewedAt,
            created_at: proof.createdAt,
          };
        })
      );

      this.sendResponse(
        res,
        200,
        this.success("Payment proofs retrieved successfully", proofsWithSignedUrls)
      );
    } catch (error: any) {
      logger.error("Get proofs by order error:", error);
      this.sendResponse(
        res,
        400,
        this.error(error.message || "Failed to get payment proofs")
      );
    }
  }

  /**
   * Get payment proof by ID
   * GET /api/payment-proofs/:proofId
   */
  async getProofById(
    req: HttpRequest,
    res: HttpResponse,
    proofId: string
  ): Promise<void> {
    try {
      const proofIdNum = parseInt(proofId, 10);
      if (isNaN(proofIdNum)) {
        this.sendResponse(res, 400, this.error("Invalid proof ID"));
        return;
      }

      const proof = await this.paymentProofService.getPaymentProofById(proofIdNum);

      if (!proof) {
        this.sendResponse(res, 404, this.error("Payment proof not found"));
        return;
      }

      // Get signed URL for private file
      const signedUrl = await this.paymentProofService.getSignedUrl(proof.fileUrl);

      this.sendResponse(
        res,
        200,
        this.success("Payment proof retrieved successfully", {
          proof_id: proof.proofId,
          order_id: proof.orderId,
          user_id: proof.userId,
          file_url: signedUrl,
          file_type: proof.fileType,
          note: proof.note,
          status: proof.status,
          reviewed_by: proof.reviewedBy,
          reviewed_at: proof.reviewedAt,
          created_at: proof.createdAt,
        })
      );
    } catch (error: any) {
      logger.error("Get proof by ID error:", error);
      this.sendResponse(
        res,
        400,
        this.error(error.message || "Failed to get payment proof")
      );
    }
  }

  /**
   * Accept payment proof (admin only)
   * PATCH /api/payment-proofs/:proofId/accept
   */
  async acceptProof(
    req: HttpRequest,
    res: HttpResponse,
    proofId: string
  ): Promise<void> {
    try {
      const { admin_id } = req.body;

      if (!admin_id) {
        this.sendResponse(res, 400, this.error("Admin ID is required"));
        return;
      }

      const proofIdNum = parseInt(proofId, 10);
      if (isNaN(proofIdNum)) {
        this.sendResponse(res, 400, this.error("Invalid proof ID"));
        return;
      }

      const proof = await this.paymentProofService.acceptPaymentProof(
        proofIdNum,
        admin_id
      );

      this.sendResponse(
        res,
        200,
        this.success("Payment proof accepted", {
          proof_id: proof.proofId,
          status: proof.status,
          reviewed_by: proof.reviewedBy,
          reviewed_at: proof.reviewedAt,
        })
      );
    } catch (error: any) {
      logger.error("Accept proof error:", error);
      this.sendResponse(
        res,
        400,
        this.error(error.message || "Failed to accept payment proof")
      );
    }
  }

  /**
   * Reject payment proof (admin only)
   * PATCH /api/payment-proofs/:proofId/reject
   */
  async rejectProof(
    req: HttpRequest,
    res: HttpResponse,
    proofId: string
  ): Promise<void> {
    try {
      const { admin_id, note } = req.body;

      if (!admin_id) {
        this.sendResponse(res, 400, this.error("Admin ID is required"));
        return;
      }

      const proofIdNum = parseInt(proofId, 10);
      if (isNaN(proofIdNum)) {
        this.sendResponse(res, 400, this.error("Invalid proof ID"));
        return;
      }

      const proof = await this.paymentProofService.rejectPaymentProof(
        proofIdNum,
        admin_id,
        note
      );

      this.sendResponse(
        res,
        200,
        this.success("Payment proof rejected", {
          proof_id: proof.proofId,
          status: proof.status,
          reviewed_by: proof.reviewedBy,
          reviewed_at: proof.reviewedAt,
        })
      );
    } catch (error: any) {
      logger.error("Reject proof error:", error);
      this.sendResponse(
        res,
        400,
        this.error(error.message || "Failed to reject payment proof")
      );
    }
  }
}
