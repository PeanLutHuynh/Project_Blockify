/**
 * Generate category_slug for all categories that don't have one
 * Run: npx ts-node scripts/generate-category-slugs.ts
 */
import { supabaseAdmin } from '../src/config/database';

const sanitizeName = (name: string): string => {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars including &
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-'); // Remove duplicate hyphens
};

async function generateCategorySlugs() {
  try {
    console.log('🔍 Fetching all categories...');
    
    // Get all categories
    const { data: categories, error } = await supabaseAdmin
      .from('categories')
      .select('category_id, category_name, category_slug');

    if (error) {
      throw error;
    }

    console.log(`✅ Found ${categories?.length || 0} categories`);

    if (!categories || categories.length === 0) {
      console.log('No categories to process');
      return;
    }

    // Process each category
    for (const category of categories) {
      const currentSlug = category.category_slug;
      const expectedSlug = sanitizeName(category.category_name);

      if (!currentSlug || currentSlug !== expectedSlug) {
        console.log(`\n📝 Updating category: "${category.category_name}"`);
        console.log(`   Current slug: "${currentSlug || 'NULL'}"`);
        console.log(`   New slug: "${expectedSlug}"`);

        // Update category slug
        const { error: updateError } = await supabaseAdmin
          .from('categories')
          .update({ category_slug: expectedSlug })
          .eq('category_id', category.category_id);

        if (updateError) {
          console.error(`   ❌ Error updating: ${updateError.message}`);
        } else {
          console.log(`   ✅ Updated successfully`);
        }
      } else {
        console.log(`✓ Category "${category.category_name}" already has correct slug: "${currentSlug}"`);
      }
    }

    console.log('\n🎉 Category slug generation completed!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
generateCategorySlugs().then(() => {
  console.log('Done!');
  process.exit(0);
});
