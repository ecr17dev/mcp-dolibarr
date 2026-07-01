/**
 * Supplier Invoice (Factura de Proveedor) MCP Tools
 * CRUD operations for supplier invoices
 */

import { dolibarr } from '../client/dolibarr.js';
import { z } from 'zod';

// ============ SCHEMAS ============

export const SupplierInvoiceSearchSchema = z.object({
  limit: z.number().optional().default(100).describe('Maximum number of results'),
  page: z.number().optional().default(1).describe('Page number'),
  sortfield: z.string().optional().default('t.rowid').describe('Sort field'),
  sortorder: z.enum(['ASC', 'DESC']).optional().default('DESC').describe('Sort order'),
  sqlfilters: z.string().optional().describe('SQL filters for advanced search'),
});

export const SupplierInvoiceCreateSchema = z.object({
  fk_soc: z.number().describe('Third party ID (supplier)'),
  ref_supplier: z.string().optional().describe('Supplier reference'),
  fk_projet: z.number().optional().describe('Project ID'),
  datef: z.string().optional().describe('Invoice date (YYYY-MM-DD)'),
  date_echeance: z.string().optional().describe('Due date (YYYY-MM-DD)'),
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
    subprice: z.number().optional().describe('Unit price HT'),
    price: z.number().optional().describe('Unit price (alias for subprice)'),
    tva_tx: z.number().optional().describe('VAT rate (%)'),
    remise_percent: z.number().optional().describe('Discount percentage'),
    product_type: z.number().optional().default(0).describe('Type: 0=product, 1=service'),
  })).optional().describe('Invoice lines'),
});

export const SupplierInvoiceUpdateSchema = z.object({
  id: z.number().describe('Invoice ID to update'),
  ref_supplier: z.string().optional().describe('Supplier reference'),
  datef: z.string().optional().describe('Invoice date'),
  date_echeance: z.string().optional().describe('Due date'),
  fk_cond_reglement: z.number().optional().describe('Payment term ID'),
  fk_mode_reglement: z.number().optional().describe('Payment mode ID'),
  note_public: z.string().optional().describe('Public notes'),
  note_private: z.string().optional().describe('Private notes'),
});

export const SupplierInvoicePaymentSchema = z.object({
  date_paye: z.string().describe('Payment date (YYYY-MM-DD)'),
  payment_amount: z.number().describe('Payment amount'),
  payment_mode: z.string().optional().describe('Payment mode (TIP, VIR, etc.)'),
  payment_num: z.string().optional().describe('Payment number/reference'),
  note_private: z.string().optional().describe('Private notes'),
  note_public: z.string().optional().describe('Public notes'),
});

// Invoice status constants
export const SUPPLIER_INVOICE_STATUS = {
  DRAFT: 0,
  UNPAID: 1,
  PAID: 2,
  CANCELLED: 3,
} as const;

// ============ TOOLS ============

export const supplierInvoiceTools = {
  /**
   * List/search supplier invoices
   */
  list_supplier_invoices: {
    description: 'List and search supplier invoices (facturas de proveedor) in Dolibarr',
    inputSchema: SupplierInvoiceSearchSchema,
    async handle(params: z.infer<typeof SupplierInvoiceSearchSchema>): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const result = await dolibarr.listSupplierInvoices(params);

      if (!result.success || !result.data) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to fetch invoices', details: result.error }, null, 2) }]
        };
      }

      const statusLabels: Record<number, string> = {
        0: 'Draft',
        1: 'Unpaid',
        2: 'Paid',
        3: 'Cancelled'
      };

      const response = {
        total: result.total,
        page: result.page,
        limit: result.limit,
        invoices: result.data.map(i => ({
          id: i.id,
          ref: i.ref,
          supplier_ref: i.ref_supplier,
          thirdparty_id: i.fk_soc,
          status: statusLabels[i.fk_statut || 0] || 'Unknown',
          date: i.datef || i.date_creation,
          due_date: i.date_echeance,
          total_ht: i.total_ht,
          total_tva: i.total_tva,
          total_ttc: i.total_ttc,
        }))
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(response, null, 2) }]
      };
    }
  },

  /**
   * Get a specific supplier invoice
   */
  get_supplier_invoice: {
    description: 'Get detailed information about a supplier invoice including lines',
    inputSchema: z.object({
      id: z.number().describe('Invoice ID')
    }),
    async handle(params: { id: number }): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const result = await dolibarr.getSupplierInvoice(params.id);

      if (!result.success || !result.data) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Invoice not found', details: result.error }, null, 2) }]
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }]
      };
    }
  },

  /**
   * Create a new supplier invoice
   */
  create_supplier_invoice: {
    description: 'Create a new supplier invoice in Dolibarr',
    inputSchema: SupplierInvoiceCreateSchema,
    async handle(params: z.infer<typeof SupplierInvoiceCreateSchema>): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const result = await dolibarr.createSupplierInvoice(params);

      if (!result.success) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to create invoice', details: result.error }, null, 2) }]
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({
          success: true,
          message: `Supplier invoice created successfully`,
          id: result.data,
          data: params
        }, null, 2) }]
      };
    }
  },

  /**
   * Update a supplier invoice
   */
  update_supplier_invoice: {
    description: 'Update an existing supplier invoice in Dolibarr',
    inputSchema: SupplierInvoiceUpdateSchema,
    async handle(params: z.infer<typeof SupplierInvoiceUpdateSchema>): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const { id, ...updateData } = params;
      const result = await dolibarr.updateSupplierInvoice(id, updateData);

      if (!result.success) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to update invoice', details: result.error }, null, 2) }]
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({
          success: true,
          message: `Invoice ${id} updated successfully`,
          data: result.data
        }, null, 2) }]
      };
    }
  },

  /**
   * Delete a supplier invoice
   */
  delete_supplier_invoice: {
    description: 'Delete a supplier invoice from Dolibarr',
    inputSchema: z.object({
      id: z.number().describe('Invoice ID to delete')
    }),
    async handle(params: { id: number }): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const result = await dolibarr.deleteSupplierInvoice(params.id);

      if (!result.success) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to delete invoice', details: result.error }, null, 2) }]
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({
          success: true,
          message: `Invoice ${params.id} deleted successfully`
        }, null, 2) }]
      };
    }
  },

  /**
   * Validate a supplier invoice
   */
  validate_supplier_invoice: {
    description: 'Validate a supplier invoice',
    inputSchema: z.object({
      id: z.number().describe('Invoice ID to validate')
    }),
    async handle(params: { id: number }): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const result = await dolibarr.validateSupplierInvoice(params.id);

      if (!result.success) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to validate invoice', details: result.error }, null, 2) }]
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({
          success: true,
          message: `Invoice ${params.id} validated successfully`,
          data: result.data
        }, null, 2) }]
      };
    }
  },

  /**
   * Set supplier invoice to draft
   */
  set_supplier_invoice_to_draft: {
    description: 'Set a supplier invoice back to draft status',
    inputSchema: z.object({
      id: z.number().describe('Invoice ID')
    }),
    async handle(params: { id: number }): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const result = await dolibarr.setSupplierInvoiceToDraft(params.id);

      if (!result.success) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to set invoice to draft', details: result.error }, null, 2) }]
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({
          success: true,
          message: `Invoice ${params.id} set to draft`,
          data: result.data
        }, null, 2) }]
      };
    }
  },

  /**
   * Add payment to a supplier invoice
   */
  add_supplier_invoice_payment: {
    description: 'Record a payment for a supplier invoice',
    inputSchema: z.object({
      id: z.number().describe('Invoice ID'),
      payment: SupplierInvoicePaymentSchema.describe('Payment details')
    }),
    async handle(params: { id: number; payment: z.infer<typeof SupplierInvoicePaymentSchema> }): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const result = await dolibarr.addPaymentToSupplierInvoice(params.id, params.payment);

      if (!result.success) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to add payment', details: result.error }, null, 2) }]
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({
          success: true,
          message: `Payment added to invoice ${params.id}`,
          payment: params.payment
        }, null, 2) }]
      };
    }
  },
};
