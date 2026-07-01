/**
 * Supplier Order (Pedido a Proveedor) MCP Tools
 * CRUD operations for supplier orders
 */

import { dolibarr } from '../client/dolibarr.js';
import { z } from 'zod';

// ============ SCHEMAS ============

export const SupplierOrderSearchSchema = z.object({
  limit: z.number().optional().default(100).describe('Maximum number of results'),
  page: z.number().optional().default(1).describe('Page number'),
  sortfield: z.string().optional().default('t.rowid').describe('Sort field'),
  sortorder: z.enum(['ASC', 'DESC']).optional().default('DESC').describe('Sort order'),
  sqlfilters: z.string().optional().describe('SQL filters for advanced search'),
});

export const SupplierOrderCreateSchema = z.object({
  fk_soc: z.number().describe('Third party ID (supplier)'),
  fk_projet: z.number().optional().describe('Project ID'),
  ref_supplier: z.string().optional().describe('Supplier reference'),
  date_order: z.string().optional().describe('Order date (YYYY-MM-DD)'),
  date_livraison: z.string().optional().describe('Expected delivery date'),
  fk_cond_reglement: z.number().optional().describe('Payment term ID'),
  fk_mode_reglement: z.number().optional().describe('Payment mode ID'),
  note_public: z.string().optional().describe('Public notes'),
  note_private: z.string().optional().describe('Private notes'),
  lines: z.array(z.object({
    fk_product: z.number().optional().describe('Product ID (optional - can use label/description instead)'),
    ref: z.string().optional().describe('Product reference'),
    label: z.string().optional().describe('Line label / Product name'),
    desc: z.string().optional().describe('Line description (Dolibarr field: desc)'),
    qty: z.number().optional().describe('Quantity'),
    subprice: z.number().optional().describe('Unit price HT (selling price for supplier)'),
    price: z.number().optional().describe('Unit price (alias for subprice)'),
    pa_ht: z.number().optional().describe('Purchase price HT'),
    tva_tx: z.number().optional().describe('VAT rate (%)'),
    remise_percent: z.number().optional().describe('Discount percentage'),
    product_type: z.number().optional().default(0).describe('Type: 0=product, 1=service'),
  })).optional().describe('Order lines'),
});

export const SupplierOrderUpdateSchema = z.object({
  id: z.number().describe('Order ID to update'),
  ref_supplier: z.string().optional().describe('Supplier reference'),
  date_order: z.string().optional().describe('Order date'),
  date_livraison: z.string().optional().describe('Expected delivery date'),
  fk_cond_reglement: z.number().optional().describe('Payment term ID'),
  fk_mode_reglement: z.number().optional().describe('Payment mode ID'),
  note_public: z.string().optional().describe('Public notes'),
  note_private: z.string().optional().describe('Private notes'),
});

export const SupplierOrderReceiveSchema = z.object({
  warehouse_id: z.number().optional().describe('Warehouse ID for reception'),
  lines: z.array(z.object({
    id: z.number().describe('Line ID'),
    qty: z.number().describe('Quantity received'),
    price_buy: z.number().optional().describe('Purchase price'),
  })).optional().describe('Lines to receive'),
});

// Supplier order status constants
export const SUPPLIER_ORDER_STATUS = {
  DRAFT: 0,
  VALIDATED: 1,
  APPROVED: 2,
  ORDERSENT: 3,
  RECEIVED: 4,
  CANCELED: 5,
  REFUSED: 6,
} as const;

// ============ TOOLS ============

export const supplierOrderTools = {
  /**
   * List/search supplier orders
   */
  list_supplier_orders: {
    description: 'List and search supplier orders (pedidos a proveedor) in Dolibarr',
    inputSchema: SupplierOrderSearchSchema,
    async handle(params: z.infer<typeof SupplierOrderSearchSchema>): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const result = await dolibarr.listSupplierOrders(params);

      if (!result.success || !result.data) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to fetch orders', details: result.error }, null, 2) }]
        };
      }

      const statusLabels: Record<number, string> = {
        0: 'Draft',
        1: 'Validated',
        2: 'Approved',
        3: 'Order Sent',
        4: 'Received',
        5: 'Canceled',
        6: 'Refused'
      };

      const response = {
        total: result.total,
        page: result.page,
        limit: result.limit,
        orders: result.data.map(o => ({
          id: o.id,
          ref: o.ref,
          supplier_ref: o.ref_supplier,
          thirdparty_id: o.fk_soc,
          status: statusLabels[o.fk_statut || 0] || 'Unknown',
          date: o.date_order || o.date_creation,
          expected_date: o.date_livraison,
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
   * Get a specific supplier order
   */
  get_supplier_order: {
    description: 'Get detailed information about a supplier order including lines',
    inputSchema: z.object({
      id: z.number().describe('Order ID')
    }),
    async handle(params: { id: number }): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const result = await dolibarr.getSupplierOrder(params.id);

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
   * Create a new supplier order
   */
  create_supplier_order: {
    description: 'Create a new supplier order (pedido a proveedor) in Dolibarr',
    inputSchema: SupplierOrderCreateSchema,
    async handle(params: z.infer<typeof SupplierOrderCreateSchema>): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const result = await dolibarr.createSupplierOrder(params);

      if (!result.success) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to create order', details: result.error }, null, 2) }]
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({
          success: true,
          message: `Supplier order created successfully`,
          id: result.data,
          data: params
        }, null, 2) }]
      };
    }
  },

  /**
   * Update a supplier order
   */
  update_supplier_order: {
    description: 'Update an existing supplier order in Dolibarr',
    inputSchema: SupplierOrderUpdateSchema,
    async handle(params: z.infer<typeof SupplierOrderUpdateSchema>): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const { id, ...updateData } = params;
      const result = await dolibarr.updateSupplierOrder(id, updateData);

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
   * Delete a supplier order
   */
  delete_supplier_order: {
    description: 'Delete a supplier order from Dolibarr',
    inputSchema: z.object({
      id: z.number().describe('Order ID to delete')
    }),
    async handle(params: { id: number }): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const result = await dolibarr.deleteSupplierOrder(params.id);

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
   * Validate a supplier order
   */
  validate_supplier_order: {
    description: 'Validate a supplier order',
    inputSchema: z.object({
      id: z.number().describe('Order ID to validate')
    }),
    async handle(params: { id: number }): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const result = await dolibarr.validateSupplierOrder(params.id);

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
   * Approve a supplier order
   */
  approve_supplier_order: {
    description: 'Approve a supplier order',
    inputSchema: z.object({
      id: z.number().describe('Order ID to approve')
    }),
    async handle(params: { id: number }): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const result = await dolibarr.approveSupplierOrder(params.id);

      if (!result.success) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to approve order', details: result.error }, null, 2) }]
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({
          success: true,
          message: `Order ${params.id} approved successfully`,
          data: result.data
        }, null, 2) }]
      };
    }
  },

  /**
   * Mark order as sent to supplier
   */
  make_supplier_order: {
    description: 'Mark a supplier order as sent/ordered',
    inputSchema: z.object({
      id: z.number().describe('Order ID')
    }),
    async handle(params: { id: number }): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const result = await dolibarr.makeSupplierOrder(params.id);

      if (!result.success) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to mark order as made', details: result.error }, null, 2) }]
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({
          success: true,
          message: `Order ${params.id} marked as sent`,
          data: result.data
        }, null, 2) }]
      };
    }
  },

  /**
   * Receive goods for a supplier order
   */
  receive_supplier_order: {
    description: 'Record reception of goods for a supplier order',
    inputSchema: z.object({
      id: z.number().describe('Order ID'),
      receive: SupplierOrderReceiveSchema.optional().describe('Reception details')
    }),
    async handle(params: { id: number; receive?: z.infer<typeof SupplierOrderReceiveSchema> }): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const result = await dolibarr.receiveSupplierOrder(params.id, params.receive);

      if (!result.success) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to receive order', details: result.error }, null, 2) }]
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({
          success: true,
          message: `Order ${params.id} received successfully`,
          data: result.data
        }, null, 2) }]
      };
    }
  },
};
