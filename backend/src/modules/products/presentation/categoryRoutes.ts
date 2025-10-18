import { Router } from '../../../infrastructure/http/Router';
import { HttpRequest, HttpResponse } from '../../../infrastructure/http/types';
import { supabase } from '../../../config/database';
import { logger } from '../../../config/logger';

const router = new Router();

/**
 * GET /api/v1/categories
 * Get all active categories
 */
router.get('', async (req: HttpRequest, res: HttpResponse) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('category_id, category_name, category_slug, description, image_url, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;

    const categories = (data || []).map((cat: any) => ({
      id: cat.category_id?.toString() || '',
      name: cat.category_name || '',
      slug: cat.category_slug || '',
      description: cat.description || '',
      image_url: cat.image_url || '',
      url: `/src/pages/Service.html?category=${cat.category_slug}`
    }));

    logger.info(`Retrieved ${categories.length} categories`);
    
    res.json({
      success: true,
      data: categories,
      count: categories.length
    });
  } catch (error) {
    logger.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể lấy danh mục',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export const categoryRoutes = router;
