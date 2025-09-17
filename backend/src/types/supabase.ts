export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      cart_items: {
        Row: {
          added_at: string | null
          cart_id: number
          product_id: number
          quantity: number | null
          updated_at: string | null
          user_id: number
        }
        Insert: {
          added_at?: string | null
          cart_id?: number
          product_id: number
          quantity?: number | null
          updated_at?: string | null
          user_id: number
        }
        Update: {
          added_at?: string | null
          cart_id?: number
          product_id?: number
          quantity?: number | null
          updated_at?: string | null
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "cart_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      categories: {
        Row: {
          category_id: number
          category_name: string
          category_slug: string
          created_at: string | null
          description: string | null
          image_url: string | null
          is_active: boolean | null
          parent_category_id: number | null
          sort_order: number | null
        }
        Insert: {
          category_id?: number
          category_name: string
          category_slug: string
          created_at?: string | null
          description?: string | null
          image_url?: string | null
          is_active?: boolean | null
          parent_category_id?: number | null
          sort_order?: number | null
        }
        Update: {
          category_id?: number
          category_name?: string
          category_slug?: string
          created_at?: string | null
          description?: string | null
          image_url?: string | null
          is_active?: boolean | null
          parent_category_id?: number | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["category_id"]
          },
        ]
      }
      coupon_usage: {
        Row: {
          coupon_id: number
          discount_amount: number
          order_id: number
          usage_id: number
          used_at: string | null
          user_id: number
        }
        Insert: {
          coupon_id: number
          discount_amount: number
          order_id: number
          usage_id?: number
          used_at?: string | null
          user_id: number
        }
        Update: {
          coupon_id?: number
          discount_amount?: number
          order_id?: number
          usage_id?: number
          used_at?: string | null
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usage_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["coupon_id"]
          },
          {
            foreignKeyName: "coupon_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "coupon_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      coupons: {
        Row: {
          combinable: boolean | null
          coupon_code: string
          coupon_id: number
          coupon_name: string
          created_at: string | null
          description: string | null
          discount_type: string
          discount_value: number
          end_date: string
          is_active: boolean | null
          maximum_discount_amount: number | null
          minimum_order_amount: number | null
          start_date: string
          usage_limit: number | null
          used_count: number | null
        }
        Insert: {
          combinable?: boolean | null
          coupon_code: string
          coupon_id?: number
          coupon_name: string
          created_at?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          end_date: string
          is_active?: boolean | null
          maximum_discount_amount?: number | null
          minimum_order_amount?: number | null
          start_date: string
          usage_limit?: number | null
          used_count?: number | null
        }
        Update: {
          combinable?: boolean | null
          coupon_code?: string
          coupon_id?: number
          coupon_name?: string
          created_at?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          end_date?: string
          is_active?: boolean | null
          maximum_discount_amount?: number | null
          minimum_order_amount?: number | null
          start_date?: string
          usage_limit?: number | null
          used_count?: number | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          order_id: number
          order_item_id: number
          product_id: number
          product_name: string
          product_sku: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          order_id: number
          order_item_id?: number
          product_id: number
          product_name: string
          product_sku: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          order_id?: number
          order_item_id?: number
          product_id?: number
          product_name?: string
          product_sku?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
        ]
      }
      orders: {
        Row: {
          customer_email: string
          customer_name: string
          customer_phone: string
          discount_amount: number | null
          notes: string | null
          order_id: number
          order_number: string
          ordered_at: string | null
          payment_method: string | null
          payment_status: string | null
          shipping_address: string
          shipping_city: string
          shipping_fee: number | null
          status: string | null
          subtotal: number
          tax_amount: number | null
          total_amount: number
          user_id: number
        }
        Insert: {
          customer_email: string
          customer_name: string
          customer_phone: string
          discount_amount?: number | null
          notes?: string | null
          order_id?: number
          order_number: string
          ordered_at?: string | null
          payment_method?: string | null
          payment_status?: string | null
          shipping_address: string
          shipping_city: string
          shipping_fee?: number | null
          status?: string | null
          subtotal: number
          tax_amount?: number | null
          total_amount: number
          user_id: number
        }
        Update: {
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          discount_amount?: number | null
          notes?: string | null
          order_id?: number
          order_number?: string
          ordered_at?: string | null
          payment_method?: string | null
          payment_status?: string | null
          shipping_address?: string
          shipping_city?: string
          shipping_fee?: number | null
          status?: string | null
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string | null
          image_id: number
          image_url: string
          is_primary: boolean | null
          product_id: number
          sort_order: number | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          image_id?: number
          image_url: string
          is_primary?: boolean | null
          product_id: number
          sort_order?: number | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          image_id?: number
          image_url?: string
          is_primary?: boolean | null
          product_id?: number
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          created_at: string | null
          helpful_count: number | null
          is_approved: boolean | null
          is_verified_purchase: boolean | null
          order_id: number | null
          product_id: number
          rating: number
          review_id: number
          review_text: string | null
          title: string | null
          updated_at: string | null
          user_id: number
        }
        Insert: {
          created_at?: string | null
          helpful_count?: number | null
          is_approved?: boolean | null
          is_verified_purchase?: boolean | null
          order_id?: number | null
          product_id: number
          rating: number
          review_id?: number
          review_text?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: number
        }
        Update: {
          created_at?: string | null
          helpful_count?: number | null
          is_approved?: boolean | null
          is_verified_purchase?: boolean | null
          order_id?: number | null
          product_id?: number
          rating?: number
          review_id?: number
          review_text?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: number
          created_at: string | null
          description: string | null
          difficulty_level: string | null
          dimensions: string | null
          is_bestseller: boolean | null
          is_featured: boolean | null
          is_new: boolean | null
          min_stock_level: number | null
          piece_count: number | null
          price: number
          product_id: number
          product_name: string
          product_slug: string
          rating_average: number | null
          rating_count: number | null
          sale_price: number | null
          short_description: string | null
          sold_count: number | null
          status: string | null
          stock_quantity: number | null
          updated_at: string | null
          weight: number | null
        }
        Insert: {
          category_id: number
          created_at?: string | null
          description?: string | null
          difficulty_level?: string | null
          dimensions?: string | null
          is_bestseller?: boolean | null
          is_featured?: boolean | null
          is_new?: boolean | null
          min_stock_level?: number | null
          piece_count?: number | null
          price: number
          product_id?: number
          product_name: string
          product_slug: string
          rating_average?: number | null
          rating_count?: number | null
          sale_price?: number | null
          short_description?: string | null
          sold_count?: number | null
          status?: string | null
          stock_quantity?: number | null
          updated_at?: string | null
          weight?: number | null
        }
        Update: {
          category_id?: number
          created_at?: string | null
          description?: string | null
          difficulty_level?: string | null
          dimensions?: string | null
          is_bestseller?: boolean | null
          is_featured?: boolean | null
          is_new?: boolean | null
          min_stock_level?: number | null
          piece_count?: number | null
          price?: number
          product_id?: number
          product_name?: string
          product_slug?: string
          rating_average?: number | null
          rating_count?: number | null
          sale_price?: number | null
          short_description?: string | null
          sold_count?: number | null
          status?: string | null
          stock_quantity?: number | null
          updated_at?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["category_id"]
          },
        ]
      }
      user_addresses: {
        Row: {
          address_id: number
          address_name: string | null
          city: string
          created_at: string | null
          district: string
          full_address: string
          is_default: boolean | null
          postal_code: string | null
          user_id: number
          ward: string | null
        }
        Insert: {
          address_id?: number
          address_name?: string | null
          city: string
          created_at?: string | null
          district: string
          full_address: string
          is_default?: boolean | null
          postal_code?: string | null
          user_id: number
          ward?: string | null
        }
        Update: {
          address_id?: number
          address_name?: string | null
          city?: string
          created_at?: string | null
          district?: string
          full_address?: string
          is_default?: boolean | null
          postal_code?: string | null
          user_id?: number
          ward?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          created_at: string | null
          email: string
          email_verified: boolean | null
          full_name: string
          gender: string
          is_active: boolean | null
          password_hash: string
          phone: string | null
          updated_at: string | null
          user_id: number
          username: string
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string | null
          email: string
          email_verified?: boolean | null
          full_name: string
          gender: string
          is_active?: boolean | null
          password_hash: string
          phone?: string | null
          updated_at?: string | null
          user_id?: number
          username: string
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string | null
          email?: string
          email_verified?: boolean | null
          full_name?: string
          gender?: string
          is_active?: boolean | null
          password_hash?: string
          phone?: string | null
          updated_at?: string | null
          user_id?: number
          username?: string
        }
        Relationships: []
      }
      wishlists: {
        Row: {
          added_at: string | null
          product_id: number
          user_id: number
          wishlist_id: number
        }
        Insert: {
          added_at?: string | null
          product_id: number
          user_id: number
          wishlist_id?: number
        }
        Update: {
          added_at?: string | null
          product_id?: number
          user_id?: number
          wishlist_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "wishlists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
