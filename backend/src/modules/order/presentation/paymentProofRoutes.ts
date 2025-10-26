import { HttpRequest, HttpResponse } from "../../../infrastructure/http/types";
import { PaymentProofController } from "./PaymentProofController";
import { PaymentProofService } from "../application/PaymentProofService";
import { PaymentProofRepository } from "../infrastructure/PaymentProofRepository";
import { authenticateToken } from "../../../infrastructure/auth";

/**
 * Payment Proof Routes Configuration
 * Registers all payment proof-related endpoints
 */
export function registerPaymentProofRoutes(router: any): void {
  // Initialize dependencies
  const paymentProofRepository = new PaymentProofRepository("payment_proofs");
  const paymentProofService = new PaymentProofService(paymentProofRepository);
  const paymentProofController = new PaymentProofController(paymentProofService);

  // Upload payment proof
  router.post("/api/payment-proofs/upload", authenticateToken, async (req: HttpRequest, res: HttpResponse) => {
    await paymentProofController.uploadProof(req, res);
  });

  // Get payment proofs by order ID
  router.get("/api/payment-proofs/order/:orderId", authenticateToken, async (req: HttpRequest, res: HttpResponse) => {
    const orderId = req.url?.split("/").pop() || "";
    await paymentProofController.getProofsByOrderId(req, res, orderId);
  });

  // Get payment proof by ID
  router.get("/api/payment-proofs/:proofId", authenticateToken, async (req: HttpRequest, res: HttpResponse) => {
    const proofId = req.url?.split("/").pop() || "";
    await paymentProofController.getProofById(req, res, proofId);
  });

  // Accept payment proof (admin only)
  router.patch("/api/payment-proofs/:proofId/accept", authenticateToken, async (req: HttpRequest, res: HttpResponse) => {
    const urlParts = req.url?.split("/") || [];
    const proofId = urlParts[urlParts.length - 2] || "";
    await paymentProofController.acceptProof(req, res, proofId);
  });

  // Reject payment proof (admin only)
  router.patch("/api/payment-proofs/:proofId/reject", authenticateToken, async (req: HttpRequest, res: HttpResponse) => {
    const urlParts = req.url?.split("/") || [];
    const proofId = urlParts[urlParts.length - 2] || "";
    await paymentProofController.rejectProof(req, res, proofId);
  });
}
