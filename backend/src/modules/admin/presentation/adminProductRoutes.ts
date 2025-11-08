import { HttpRequest, HttpResponse } from "../../../infrastructure/http/types";
import { AdminProductController } from "./AdminProductController";
import { AdminProductService } from "../application/AdminProductService";
import { authenticateToken } from "../../../infrastructure/auth";
import { parseMultipartData } from "../../../infrastructure/upload/MultipartParser";

/**
 * Admin Product Routes Configuration
 * Registers all admin product management endpoints
 */
export function registerAdminProductRoutes(router: any): void {
  // Initialize controller (service is initialized internally)
  const adminProductController = new AdminProductController();

  // ========================================
  // Product Routes
  // ========================================
  
  // Search products
  router.get("/api/admin/products/search", authenticateToken, async (req: HttpRequest, res: HttpResponse) => {
    await adminProductController.searchProducts(req, res);
  });

  // Get products needing restock
  router.get("/api/admin/products/restock/needed", authenticateToken, async (req: HttpRequest, res: HttpResponse) => {
    await adminProductController.getProductsNeedingRestock(req, res);
  });

  // Get all products with pagination
  router.get("/api/admin/products", authenticateToken, async (req: HttpRequest, res: HttpResponse) => {
    await adminProductController.getAllProducts(req, res);
  });

  // Get product by ID
  router.get("/api/admin/products/:id", authenticateToken, async (req: HttpRequest, res: HttpResponse) => {
    const urlParts = req.url?.split("/") || [];
    const productId = urlParts[urlParts.length - 1].split("?")[0] || "";
    await adminProductController.getProductById(req, res, productId);
  });

  // Create product
  router.post("/api/admin/products", authenticateToken, async (req: HttpRequest, res: HttpResponse) => {
    await adminProductController.createProduct(req, res);
  });

  // Update product
  router.put("/api/admin/products/:id", authenticateToken, async (req: HttpRequest, res: HttpResponse) => {
    const urlParts = req.url?.split("/") || [];
    const productId = urlParts[urlParts.length - 1].split("?")[0] || "";
    await adminProductController.updateProduct(req, res, productId);
  });

  // Delete product
  router.delete("/api/admin/products/:id", authenticateToken, async (req: HttpRequest, res: HttpResponse) => {
    const urlParts = req.url?.split("/") || [];
    const productId = urlParts[urlParts.length - 1].split("?")[0] || "";
    await adminProductController.deleteProduct(req, res, productId);
  });

  // Update product stock
  router.patch("/api/admin/products/:id/stock", authenticateToken, async (req: HttpRequest, res: HttpResponse) => {
    const urlParts = req.url?.split("/") || [];
    const productId = urlParts[urlParts.length - 2] || "";
    await adminProductController.updateStock(req, res, productId);
  });

  // Update product status
  router.patch("/api/admin/products/:id/status", authenticateToken, async (req: HttpRequest, res: HttpResponse) => {
    const urlParts = req.url?.split("/") || [];
    const productId = urlParts[urlParts.length - 2] || "";
    await adminProductController.updateStatus(req, res, productId);
  });

  // Upload product image - With multipart parser
  router.post("/api/admin/products/upload-image", authenticateToken, async (req: HttpRequest, res: HttpResponse) => {
    try {
      console.log('📤 [Route] Upload product image');
      
      // Parse multipart data
      const parsedData = await parseMultipartData(req);
      
      if (!parsedData || !parsedData.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }
      
      // Merge fields into req.body
      req.body = { ...(req.body || {}), ...parsedData.fields };
      
      await adminProductController.uploadProductImage(req, res, parsedData.file);
    } catch (error: any) {
      console.error('❌ [Route] Error uploading product image:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // Add images to product - With multipart parser
  router.post("/api/admin/products/:id/images", authenticateToken, async (req: HttpRequest, res: HttpResponse) => {
    try {
      console.log('📤 [Route] Add product images - URL:', req.url);
      console.log('📤 [Route] Content-Type:', req.headers['content-type']);
      
      // Parse multipart data
      const parsedData = await parseMultipartData(req);
      
      console.log('📤 [Route] Parsed data received:', parsedData ? 'YES' : 'NO');
      
      if (!parsedData || !parsedData.file) {
        console.error('❌ [Route] No file uploaded');
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }
      
      // Merge fields into req.body for controller access
      req.body = { ...(req.body || {}), ...parsedData.fields };
      
      const urlParts = req.url?.split("/") || [];
      const productId = urlParts[urlParts.length - 2] || "";
      
      console.log('📤 [Route] Product ID:', productId);
      console.log('📤 [Route] Parsed fields:', parsedData.fields);
      console.log('📤 [Route] File info:', { 
        filename: parsedData.file.filename, 
        size: parsedData.file.size,
        mimetype: parsedData.file.mimetype 
      });
      
      await adminProductController.addProductImages(req, res, productId, parsedData.file);
    } catch (error: any) {
      console.error('❌ [Route] Error adding product images:', error);
      console.error('❌ [Route] Error stack:', error.stack);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // Delete product image
  router.delete("/api/admin/products/images/:id", authenticateToken, async (req: HttpRequest, res: HttpResponse) => {
    const urlParts = req.url?.split("/") || [];
    const imageId = urlParts[urlParts.length - 1].split("?")[0] || "";
    await adminProductController.deleteProductImage(req, res, imageId);
  });

  // Delete product image by product ID and image index
  router.delete("/api/admin/products/:productId/images/:imageIndex", authenticateToken, async (req: HttpRequest, res: HttpResponse) => {
    await adminProductController.deleteProductImageByIndex(req, res);
  });

  // ========================================
  // Category Routes
  // ========================================

  // Get all categories
  router.get("/api/admin/categories", authenticateToken, async (req: HttpRequest, res: HttpResponse) => {
    await adminProductController.getAllCategories(req, res);
  });

  // Get active categories
  router.get("/api/admin/categories/active", authenticateToken, async (req: HttpRequest, res: HttpResponse) => {
    await adminProductController.getActiveCategories(req, res);
  });

  // Get category by ID
  router.get("/api/admin/categories/:id", authenticateToken, async (req: HttpRequest, res: HttpResponse) => {
    const urlParts = req.url?.split("/") || [];
    const categoryId = urlParts[urlParts.length - 1].split("?")[0] || "";
    await adminProductController.getCategoryById(req, res, categoryId);
  });

  // Create category
  router.post("/api/admin/categories", authenticateToken, async (req: HttpRequest, res: HttpResponse) => {
    await adminProductController.createCategory(req, res);
  });

  // Update category
  router.put("/api/admin/categories/:id", authenticateToken, async (req: HttpRequest, res: HttpResponse) => {
    const urlParts = req.url?.split("/") || [];
    const categoryId = urlParts[urlParts.length - 1].split("?")[0] || "";
    await adminProductController.updateCategory(req, res, categoryId);
  });

  // Delete category
  router.delete("/api/admin/categories/:id", authenticateToken, async (req: HttpRequest, res: HttpResponse) => {
    const urlParts = req.url?.split("/") || [];
    const categoryId = urlParts[urlParts.length - 1].split("?")[0] || "";
    await adminProductController.deleteCategory(req, res, categoryId);
  });
}
