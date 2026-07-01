/**
 * Product MCP Tools
 * CRUD operations for products
 */

import { dolibarr } from '../client/dolibarr.js';
import { z } from 'zod';

// ============ SCHEMAS ============

export const ProductSearchSchema = z.object({
  limit: z.number().optional().default(100).describe('Maximum number of results'),
  page: z.number().optional().default(1).describe('Page number'),
  sortfield: z.string().optional().default('t.rowid').describe('Sort field'),
  sortorder: z.enum(['ASC', 'DESC']).optional().default('DESC').describe('Sort order'),
  sqlfilters: z.string().optional().describe('SQL filters for advanced search'),
});

export const ProductCreateSchema = z.object({
  ref: z.string().min(1).describe('Product reference/SKU'),
  label: z.string().min(1).describe('Product label/name'),
  description: z.string().optional().describe('Product description'),
  price: z.number().optional().describe('Selling price (HT)'),
  price_ttc: z.number().optional().describe('Selling price (TTC, with tax)'),
  price_min: z.number().optional().describe('Minimum selling price'),
  price_base_type: z.enum(['HT', 'TTC']).optional().default('HT').describe('Price base type'),
  tva_tx: z.number().optional().describe('VAT rate (%)'),
  cost_price: z.number().optional().describe('Cost price'),
  type: z.number().min(0).max(1).optional().default(0).describe('Type: 0=product, 1=service'),
  status: z.number().min(0).max(1).optional().default(1).describe('Status: 0=inactive, 1=active'),
  status_to_sell: z.number().min(0).max(1).optional().default(1).describe('For sale: 0=no, 1=yes'),
  status_buy: z.number().min(0).max(1).optional().default(1).describe('For purchase: 0=no, 1=yes'),
  barcode: z.string().optional().describe('Barcode'),
  weight: z.number().optional().describe('Weight'),
  weight_units: z.number().optional().describe('Weight unit'),
  volume: z.number().optional().describe('Volume'),
  volume_units: z.number().optional().describe('Volume unit'),
  duration: z.string().optional().describe('Duration for services (e.g. "1h", "1d", "1m")'),
  accountancy_code_sell: z.string().optional().describe('Sell accountancy code'),
  accountancy_code_buy: z.string().optional().describe('Buy accountancy code'),
  note_private: z.string().optional().describe('Private notes'),
  note_public: z.string().optional().describe('Public notes'),
});

export const ProductUpdateSchema = z.object({
  id: z.number().describe('Product ID to update'),
  ref: z.string().optional().describe('Product reference/SKU'),
  label: z.string().optional().describe('Product label/name'),
  description: z.string().optional().describe('Product description'),
  price: z.number().optional().describe('Selling price (HT)'),
  price_ttc: z.number().optional().describe('Selling price (TTC)'),
  price_min: z.number().optional().describe('Minimum selling price'),
  price_base_type: z.enum(['HT', 'TTC']).optional().describe('Price base type'),
  tva_tx: z.number().optional().describe('VAT rate (%)'),
  cost_price: z.number().optional().describe('Cost price'),
  type: z.number().min(0).max(1).optional().describe('Type: 0=product, 1=service'),
  status: z.number().min(0).max(1).optional().describe('Status'),
  status_to_sell: z.number().min(0).max(1).optional().describe('For sale'),
  status_buy: z.number().min(0).max(1).optional().describe('For purchase'),
  barcode: z.string().optional().describe('Barcode'),
  weight: z.number().optional().describe('Weight'),
  volume: z.number().optional().describe('Volume'),
  duration: z.string().optional().describe('Duration'),
  note_private: z.string().optional().describe('Private notes'),
  note_public: z.string().optional().describe('Public notes'),
});

// ============ TOOLS ============

export const productTools = {
  /**
   * List/search products
   */
  list_products: {
    description: 'List and search products in Dolibarr',
    inputSchema: ProductSearchSchema,
    async handle(params: z.infer<typeof ProductSearchSchema>): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const result = await dolibarr.listProducts(params);

      if (!result.success || !result.data) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to fetch products', details: result.error }, null, 2) }]
        };
      }

      const response = {
        total: result.total,
        page: result.page,
        limit: result.limit,
        products: result.data.map(p => ({
          id: p.id,
          ref: p.ref,
          label: p.label,
          type: p.fk_product_type === 0 ? 'Product' : 'Service',
          price: p.price,
          price_ttc: p.price_ttc,
          stock: p.stock,
          status: p.status === 1 ? 'Active' : 'Inactive',
          for_sale: p.status_to_sell === 1 ? 'Yes' : 'No',
          for_buy: p.status_buy === 1 ? 'Yes' : 'No',
        }))
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(response, null, 2) }]
      };
    }
  },

  /**
   * Get a specific product by ID
   */
  get_product: {
    description: 'Get detailed information about a specific product',
    inputSchema: z.object({
      id: z.number().describe('Product ID')
    }),
    async handle(params: { id: number }): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const result = await dolibarr.getProduct(params.id);

      if (!result.success || !result.data) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Product not found', details: result.error }, null, 2) }]
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }]
      };
    }
  },

  /**
   * Get a product by reference
   */
  get_product_by_ref: {
    description: 'Find a product by its reference/SKU',
    inputSchema: z.object({
      ref: z.string().describe('Product reference/SKU')
    }),
    async handle(params: { ref: string }): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const result = await dolibarr.getProductByRef(params.ref);

      if (!result.success || !result.data) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Product not found', details: result.error }, null, 2) }]
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }]
      };
    }
  },

  /**
   * Create a new product
   */
  create_product: {
    description: 'Create a new product in Dolibarr',
    inputSchema: ProductCreateSchema,
    async handle(params: z.infer<typeof ProductCreateSchema>): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const { type, ...rest } = params;
      const productData = {
        ...rest,
        fk_product_type: type || 0
      };

      const result = await dolibarr.createProduct(productData);

      if (!result.success) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to create product', details: result.error }, null, 2) }]
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({
          success: true,
          message: `Product created successfully`,
          id: result.data,
          data: params
        }, null, 2) }]
      };
    }
  },

  /**
   * Update a product
   */
  update_product: {
    description: 'Update an existing product in Dolibarr',
    inputSchema: ProductUpdateSchema,
    async handle(params: z.infer<typeof ProductUpdateSchema>): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const { id, ...updateData } = params;

      if (updateData.type !== undefined) {
        (updateData as Record<string, unknown>).fk_product_type = updateData.type;
        delete (updateData as Record<string, unknown>).type;
      }

      const result = await dolibarr.updateProduct(id, updateData);

      if (!result.success) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to update product', details: result.error }, null, 2) }]
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({
          success: true,
          message: `Product ${id} updated successfully`,
          data: result.data
        }, null, 2) }]
      };
    }
  },

  /**
   * Delete a product
   */
  delete_product: {
    description: 'Delete a product from Dolibarr',
    inputSchema: z.object({
      id: z.number().describe('Product ID to delete')
    }),
    async handle(params: { id: number }): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const result = await dolibarr.deleteProduct(params.id);

      if (!result.success) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to delete product', details: result.error }, null, 2) }]
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({
          success: true,
          message: `Product ${params.id} deleted successfully`
        }, null, 2) }]
      };
    }
  },

  /**
   * Get product stock information
   */
  get_product_stock: {
    description: 'Get stock information for a product',
    inputSchema: z.object({
      id: z.number().describe('Product ID')
    }),
    async handle(params: { id: number }): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const result = await dolibarr.getProductStock(params.id);

      if (!result.success || !result.data) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to get stock', details: result.error }, null, 2) }]
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({
          product_id: params.id,
          stock: result.data
        }, null, 2) }]
      };
    }
  },
};
