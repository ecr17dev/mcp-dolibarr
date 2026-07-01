/**
 * Orders MCP Tools
 * Customer orders CRUD operations
 */

import { dolibarr } from '../client/dolibarr.js';
import { z } from 'zod';

// ============ SCHEMAS ============

export const OrderSearchSchema = z.object({
  limit: z.number().optional().default(100).describe('Maximum number of results'),
  page: z.number().optional().default(1).describe('Page number'),
  sortfield: z.string().optional().default('t.rowid').describe('Sort field'),
  sortorder: z.enum(['ASC', 'DESC']).optional().default('DESC').describe('Sort order'),
  sqlfilters: z.string().optional().describe('SQL filters for advanced search'),
});

export const OrderCreateSchema = z.object({
  fk_soc: z.number().describe('Third party ID (client)'),
  fk_projet: z.number().optional().describe('Project ID'),
  ref_client: z.string().optional().describe('Client reference'),
  date_order: z.string().optional().describe('Order date (YYYY-MM-DD)'),
  date_delivery: z.string().optional().describe('Expected delivery date'),
  remise_percent: z.number().optional().describe('Discount percentage'),
  remise_absolue: z.number().optional().describe('Absolute discount'),
  fk_cond_reglement: z.number().optional().describe('Payment term ID'),
  fk_mode_reglement: z.number().optional().describe('Payment mode ID'),
  fk_delivery_address: z.number().optional().describe('Delivery address ID'),
  fk_shipping_method: z.number().optional().describe('Shipping method ID'),
  note_public: z.string().optional().describe('Public notes'),
  note_private: z.string().optional().describe('Private notes'),
  lines: z.array(z.object({
    fk_product: z.number().optional().describe('Product ID (optional - can use label/description instead)'),
    label: z.string().optional().describe('Line label / Product name'),
    desc: z.string().optional().describe('Line description (Dolibarr field: desc)'),
    qty: z.number().optional().describe('Quantity'),
    subprice: z.number().optional().describe('Unit price HT'),
    price: z.number().optional().describe('Unit price (alias for subprice)'),
    tva_tx: z.number().optional().describe('VAT rate (%)'),
    remise_percent: z.number().optional().describe('Discount percentage'),
    product_type: z.number().optional().default(0).describe('Type: 0=product, 1=service'),
  })).optional().describe('Order lines'),
});

export const OrderUpdateSchema = z.object({
  id: z.number().describe('Order ID to update'),
  ref_client: z.string().optional().describe('Client reference'),
  date_order: z.string().optional().describe('Order date'),
  date_delivery: z.string().optional().describe('Expected delivery date'),
  remise_percent: z.number().optional().describe('Discount percentage'),
  remise_absolue: z.number().optional().describe('Absolute discount'),
  fk_cond_reglement: z.number().optional().describe('Payment term ID'),
  fk_mode_reglement: z.number().optional().describe('Payment mode ID'),
  note_public: z.string().optional().describe('Public notes'),
  note_private: z.string().optional().describe('Private notes'),
});

// Order status constants
export const ORDER_STATUS = {
  DRAFT: 0,
  VALIDATED: 1,
  CLOSED_SIGNED: 2,
  CLOSED_CANCELED: 3,
  RECEIVED: 4,
} as const;

// ============ TOOLS ============

export const orderTools = {
  /**
   * List/search customer orders
   */
  list_orders: {
    description: 'List and search customer orders in Dolibarr',
    inputSchema: OrderSearchSchema,
    async handle(params: z.infer<typeof OrderSearchSchema>): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const result = await dolibarr.listOrders(params);

      if (!result.success || !result.data) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to fetch orders', details: result.error }, null, 2) }]
        };
      }

      const statusLabels: Record<number, string> = {
        0: 'Draft',
        1: 'Validated',
        2: 'Closed (Signed)',
        3: 'Closed (Canceled)',
        4: 'Received'
      };

      const response = {
        total: result.total,
        page: result.page,
        limit: result.limit,
        orders: result.data.map(o => ({
          id: o.id,
          ref: o.ref,
          client_ref: o.ref_client,
          thirdparty_id: o.fk_soc,
          status: statusLabels[o.fk_statut || 0] || 'Unknown',
          date: o.date_order || o.date_creation,
          total_ht: o.total_ht,
          total_tva: o.total_tva,
          total_ttc: o.total_ttc,
        }))
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(response, null, 2) }]
      };
    }
  },

  /**
   * Get a specific order by ID
   */
  get_order: {
    description: 'Get detailed information about a specific order including lines',
    inputSchema: z.object({
      id: z.number().describe('Order ID')
    }),
    async handle(params: { id: number }): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const result = await dolibarr.getOrder(params.id);

      if (!result.success || !result.data) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Order not found', details: result.error }, null, 2) }]
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }]
      };
    }
  },

  /**
   * Create a new customer order
   */
  create_order: {
    description: 'Create a new customer order in Dolibarr',
    inputSchema: OrderCreateSchema,
    async handle(params: z.infer<typeof OrderCreateSchema>): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const result = await dolibarr.createOrder(params);

      if (!result.success) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to create order', details: result.error }, null, 2) }]
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({
          success: true,
          message: `Order created successfully`,
          id: result.data,
          data: params
        }, null, 2) }]
      };
    }
  },

  /**
   * Update an existing order
   */
  update_order: {
    description: 'Update an existing customer order in Dolibarr',
    inputSchema: OrderUpdateSchema,
    async handle(params: z.infer<typeof OrderUpdateSchema>): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const { id, ...updateData } = params;
      const result = await dolibarr.updateOrder(id, updateData);

      if (!result.success) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to update order', details: result.error }, null, 2) }]
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({
          success: true,
          message: `Order ${id} updated successfully`,
          data: result.data
        }, null, 2) }]
      };
    }
  },

  /**
   * Delete an order
   */
  delete_order: {
    description: 'Delete an order from Dolibarr',
    inputSchema: z.object({
      id: z.number().describe('Order ID to delete')
    }),
    async handle(params: { id: number }): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const result = await dolibarr.deleteOrder(params.id);

      if (!result.success) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to delete order', details: result.error }, null, 2) }]
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({
          success: true,
          message: `Order ${params.id} deleted successfully`
        }, null, 2) }]
      };
    }
  },

  /**
   * Validate an order
   */
  validate_order: {
    description: 'Validate an order to change its status',
    inputSchema: z.object({
      id: z.number().describe('Order ID to validate')
    }),
    async handle(params: { id: number }): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const result = await dolibarr.validateOrder(params.id);

      if (!result.success) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to validate order', details: result.error }, null, 2) }]
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({
          success: true,
          message: `Order ${params.id} validated successfully`,
          data: result.data
        }, null, 2) }]
      };
    }
  },

  /**
   * Close an order
   */
  close_order: {
    description: 'Close an order (mark as delivered/shipped)',
    inputSchema: z.object({
      id: z.number().describe('Order ID to close')
    }),
    async handle(params: { id: number }): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const result = await dolibarr.closeOrder(params.id);

      if (!result.success) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to close order', details: result.error }, null, 2) }]
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({
          success: true,
          message: `Order ${params.id} closed successfully`,
          data: result.data
        }, null, 2) }]
      };
    }
  },

  /**
   * Reopen an order
   */
  reopen_order: {
    description: 'Reopen a closed order',
    inputSchema: z.object({
      id: z.number().describe('Order ID to reopen')
    }),
    async handle(params: { id: number }): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const result = await dolibarr.reopenOrder(params.id);

      if (!result.success) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to reopen order', details: result.error }, null, 2) }]
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({
          success: true,
          message: `Order ${params.id} reopened successfully`,
          data: result.data
        }, null, 2) }]
      };
    }
  },

  /**
   * Set order back to draft
   */
  set_order_to_draft: {
    description: 'Set an order back to draft status',
    inputSchema: z.object({
      id: z.number().describe('Order ID')
    }),
    async handle(params: { id: number }): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const result = await dolibarr.setOrderToDraft(params.id);

      if (!result.success) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to set order to draft', details: result.error }, null, 2) }]
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({
          success: true,
          message: `Order ${params.id} set to draft`,
          data: result.data
        }, null, 2) }]
      };
    }
  },
};
