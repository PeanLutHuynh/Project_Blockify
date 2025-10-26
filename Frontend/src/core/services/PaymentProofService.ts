import { FetchHttpClient } from "../api/FetchHttpClient.js";
import { PaymentProof } from "../models/PaymentProof.js";
import { ENV } from "../config/env.js";

/**
 * Payment Proof Service - Frontend
 * Handles all payment proof-related API calls using custom Fetch wrapper
 */
export class PaymentProofService {
  private httpClient: FetchHttpClient;
  private baseUrl: string = "/api/payment-proofs";

  constructor() {
    this.httpClient = new FetchHttpClient(ENV.API_BASE_URL);
  }

  /**
   * Upload payment proof file
   * Converts file to base64 and sends to backend
   */
  async uploadPaymentProof(data: {
    orderId: number;
    userId: number;
    file: File;
    note?: string;
  }): Promise<PaymentProof> {
    try {
      // Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024;
      if (data.file.size > maxSize) {
        throw new Error("Kích thước file vượt quá 5MB");
      }

      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
        "application/pdf",
      ];
      if (!allowedTypes.includes(data.file.type)) {
        throw new Error(
          "Loại file không hợp lệ. Chỉ chấp nhận ảnh (JPEG, PNG, GIF, WebP) và PDF"
        );
      }

      // Convert file to base64
      const fileData = await this.fileToBase64(data.file);

      // Send request
      const response = await this.httpClient.post(`${this.baseUrl}/upload`, {
        order_id: data.orderId,
        user_id: data.userId,
        file_data: fileData,
        file_name: data.file.name,
        file_type: data.file.type,
        file_size: data.file.size,
        note: data.note,
      });

      if (!response.success) {
        throw new Error(response.message || "Upload failed");
      }

      return new PaymentProof(response.data);
    } catch (error: any) {
      console.error("Upload payment proof error:", error);
      throw new Error(error.message || "Failed to upload payment proof");
    }
  }

  /**
   * Get payment proofs by order ID
   */
  async getPaymentProofsByOrderId(orderId: number): Promise<PaymentProof[]> {
    try {
      const response = await this.httpClient.get(
        `${this.baseUrl}/order/${orderId}`
      );

      if (!response.success) {
        throw new Error(response.message || "Failed to get payment proofs");
      }

      return response.data.map((proof: any) => new PaymentProof(proof));
    } catch (error: any) {
      console.error("Get payment proofs error:", error);
      throw new Error(error.message || "Failed to retrieve payment proofs");
    }
  }

  /**
   * Get payment proof by ID
   */
  async getPaymentProofById(proofId: number): Promise<PaymentProof> {
    try {
      const response = await this.httpClient.get(`${this.baseUrl}/${proofId}`);

      if (!response.success) {
        throw new Error(response.message || "Payment proof not found");
      }

      return new PaymentProof(response.data);
    } catch (error: any) {
      console.error("Get payment proof error:", error);
      throw new Error(error.message || "Failed to retrieve payment proof");
    }
  }

  /**
   * Accept payment proof (admin only)
   */
  async acceptPaymentProof(proofId: number, adminId: number): Promise<void> {
    try {
      const response = await this.httpClient.patch(
        `${this.baseUrl}/${proofId}/accept`,
        { admin_id: adminId }
      );

      if (!response.success) {
        throw new Error(response.message || "Failed to accept payment proof");
      }
    } catch (error: any) {
      console.error("Accept payment proof error:", error);
      throw new Error(error.message || "Failed to accept payment proof");
    }
  }

  /**
   * Reject payment proof (admin only)
   */
  async rejectPaymentProof(
    proofId: number,
    adminId: number,
    note?: string
  ): Promise<void> {
    try {
      const response = await this.httpClient.patch(
        `${this.baseUrl}/${proofId}/reject`,
        { admin_id: adminId, note }
      );

      if (!response.success) {
        throw new Error(response.message || "Failed to reject payment proof");
      }
    } catch (error: any) {
      console.error("Reject payment proof error:", error);
      throw new Error(error.message || "Failed to reject payment proof");
    }
  }

  /**
   * Convert File to base64 string
   */
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        if (typeof reader.result === "string") {
          // Remove data:image/png;base64, prefix
          const base64 = reader.result.split(",")[1];
          resolve(base64);
        } else {
          reject(new Error("Failed to convert file to base64"));
        }
      };

      reader.onerror = () => {
        reject(new Error("Failed to read file"));
      };

      reader.readAsDataURL(file);
    });
  }

  /**
   * Download file from URL
   */
  async downloadFile(fileUrl: string, fileName: string): Promise<void> {
    try {
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = fileName;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error: any) {
      console.error("Download file error:", error);
      throw new Error("Failed to download file");
    }
  }
}
