/**
 * Reports MCP Tools
 * Reporting and analytics tools
 */

import { dolibarr } from '../client/dolibarr.js';
import { z } from 'zod';

// ============ SCHEMAS ============

export const DashboardSummarySchema = z.object({
  period: z.enum(['today', 'week', 'month', 'quarter', 'year']).optional().default('month').describe('Reporting period'),
});

export const ThirdpartyReportSchema = z.object({
  thirdparty_id: z.number().describe('Third party ID'),
  type: z.enum(['all', 'proposals', 'orders', 'invoices', 'supplier_orders', 'supplier_invoices']).optional().default('all').describe('Report type'),
});

export const SalesReportSchema = z.object({
  date_start: z.string().describe('Start date (YYYY-MM-DD)'),
  date_end: z.string().describe('End date (YYYY-MM-DD)'),
  thirdparty_id: z.number().optional().describe('Filter by third party'),
});

export const InventoryReportSchema = z.object({
  warehouse_id: z.number().optional().describe('Filter by warehouse'),
  low_stock: z.boolean().optional().describe('Show only low stock items'),
});

// ============ TOOLS ============

export const reportTools = {
  /**
   * Get dashboard summary
   */
  get_dashboard_summary: {
    description: 'Get a dashboard summary of Dolibarr data (proposals, orders, invoices)',
    inputSchema: DashboardSummarySchema,
    async handle(params: z.infer<typeof DashboardSummarySchema>): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const now = new Date();
      let dateStart: Date;

      switch (params.period) {
        case 'today':
          dateStart = now;
          break;
        case 'week':
          dateStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          dateStart = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          const quarter = Math.floor(now.getMonth() / 3);
          dateStart = new Date(now.getFullYear(), quarter * 3, 1);
          break;
        case 'year':
          dateStart = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          dateStart = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      const dateStartStr = dateStart.toISOString().split('T')[0];
      const dateEndStr = now.toISOString().split('T')[0];

      // Fetch data in parallel
      const [proposals, orders, supplierInvoices, supplierOrders] = await Promise.all([
        dolibarr.listProposals({ limit: 1000, sortorder: 'DESC' }),
        dolibarr.listOrders({ limit: 1000, sortorder: 'DESC' }),
        dolibarr.listSupplierInvoices({ limit: 1000, sortorder: 'DESC' }),
        dolibarr.listSupplierOrders({ limit: 1000, sortorder: 'DESC' })
      ]);

      // Filter by period
      const filterByDate = (dateStr?: string) => {
        if (!dateStr) return false;
        return dateStr >= dateStartStr && dateStr <= dateEndStr;
      };

      const proposalsInPeriod = proposals.data.filter(p => filterByDate(p.date_creation));
      const ordersInPeriod = orders.data.filter(o => filterByDate(o.date_creation));
      const supplierInvoicesInPeriod = supplierInvoices.data.filter(i => filterByDate(i.date_creation));
      const supplierOrdersInPeriod = supplierOrders.data.filter(o => filterByDate(o.date_creation));

      // Calculate totals
      const totalProposals = proposalsInPeriod.reduce((sum, p) => sum + (p.total_ttc || 0), 0);
      const totalOrders = ordersInPeriod.reduce((sum, o) => sum + (o.total_ttc || 0), 0);
      const totalSupplierInvoices = supplierInvoicesInPeriod.reduce((sum, i) => sum + (i.total_ttc || 0), 0);
      const totalSupplierOrders = supplierOrdersInPeriod.reduce((sum, o) => sum + (o.total_ttc || 0), 0);

      const summary = {
        period: {
          start: dateStartStr,
          end: dateEndStr,
          type: params.period
        },
        proposals: {
          count: proposalsInPeriod.length,
          total_ttc: Math.round(totalProposals * 100) / 100,
        },
        customer_orders: {
          count: ordersInPeriod.length,
          total_ttc: Math.round(totalOrders * 100) / 100,
        },
        supplier_invoices: {
          count: supplierInvoicesInPeriod.length,
          total_ttc: Math.round(totalSupplierInvoices * 100) / 100,
        },
        supplier_orders: {
          count: supplierOrdersInPeriod.length,
          total_ttc: Math.round(totalSupplierOrders * 100) / 100,
        },
        net_position: Math.round((totalOrders - totalSupplierInvoices) * 100) / 100,
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }]
      };
    }
  },

  /**
   * Get third party report
   */
  get_thirdparty_report: {
    description: 'Get a detailed report for a specific third party (client/supplier)',
    inputSchema: ThirdpartyReportSchema,
    async handle(params: z.infer<typeof ThirdpartyReportSchema>): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      // Get third party info
      const thirdpartyResult = await dolibarr.getThirdparty(params.thirdparty_id);
      if (!thirdpartyResult.success || !thirdpartyResult.data) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Third party not found', details: thirdpartyResult.error }, null, 2) }]
        };
      }

      const thirdparty = thirdpartyResult.data;
      const report: Record<string, unknown> = {
        thirdparty: {
          id: thirdparty.id,
          name: thirdparty.name,
          email: thirdparty.email,
          phone: thirdparty.phone,
          is_client: thirdparty.client === 1,
          is_supplier: thirdparty.fournisseur === 1,
        },
        data: {} as Record<string, unknown>
      };

      // Get proposals for this third party
      if (params.type === 'all' || params.type === 'proposals') {
        const proposalsResult = await dolibarr.listProposals({ limit: 1000 });
        const proposals = proposalsResult.data.filter(p => p.fk_soc === params.thirdparty_id);
        const totalProposals = proposals.reduce((sum, p) => sum + (p.total_ttc || 0), 0);

        (report.data as Record<string, unknown>).proposals = {
          count: proposals.length,
          total_ttc: Math.round(totalProposals * 100) / 100,
          items: proposals.slice(0, 10).map(p => ({
            id: p.id,
            ref: p.ref,
            status: p.fk_statut,
            date: p.date_creation,
            total_ttc: p.total_ttc
          }))
        };
      }

      // Get orders for this third party
      if (params.type === 'all' || params.type === 'orders') {
        const ordersResult = await dolibarr.listOrders({ limit: 1000 });
        const orders = ordersResult.data.filter(o => o.fk_soc === params.thirdparty_id);
        const totalOrders = orders.reduce((sum, o) => sum + (o.total_ttc || 0), 0);

        (report.data as Record<string, unknown>).customer_orders = {
          count: orders.length,
          total_ttc: Math.round(totalOrders * 100) / 100,
          items: orders.slice(0, 10).map(o => ({
            id: o.id,
            ref: o.ref,
            status: o.fk_statut,
            date: o.date_creation,
            total_ttc: o.total_ttc
          }))
        };
      }

      // Get supplier invoices for this third party
      if (params.type === 'all' || params.type === 'supplier_invoices') {
        const invoicesResult = await dolibarr.listSupplierInvoices({ limit: 1000 });
        const invoices = invoicesResult.data.filter(i => i.fk_soc === params.thirdparty_id);
        const totalInvoices = invoices.reduce((sum, i) => sum + (i.total_ttc || 0), 0);

        (report.data as Record<string, unknown>).supplier_invoices = {
          count: invoices.length,
          total_ttc: Math.round(totalInvoices * 100) / 100,
          items: invoices.slice(0, 10).map(i => ({
            id: i.id,
            ref: i.ref,
            status: i.fk_statut,
            date: i.datef,
            total_ttc: i.total_ttc
          }))
        };
      }

      // Get supplier orders for this third party
      if (params.type === 'all' || params.type === 'supplier_orders') {
        const supplierOrdersResult = await dolibarr.listSupplierOrders({ limit: 1000 });
        const supplierOrders = supplierOrdersResult.data.filter(o => o.fk_soc === params.thirdparty_id);
        const totalSupplierOrders = supplierOrders.reduce((sum, o) => sum + (o.total_ttc || 0), 0);

        (report.data as Record<string, unknown>).supplier_orders = {
          count: supplierOrders.length,
          total_ttc: Math.round(totalSupplierOrders * 100) / 100,
          items: supplierOrders.slice(0, 10).map(o => ({
            id: o.id,
            ref: o.ref,
            status: o.fk_statut,
            date: o.date_order,
            total_ttc: o.total_ttc
          }))
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(report, null, 2) }]
      };
    }
  },

  /**
   * Get sales report
   */
  get_sales_report: {
    description: 'Get a sales report for a date range',
    inputSchema: SalesReportSchema,
    async handle(params: z.infer<typeof SalesReportSchema>): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const [ordersResult, proposalsResult, invoicesResult] = await Promise.all([
        dolibarr.listOrders({ limit: 1000, sortorder: 'DESC' }),
        dolibarr.listProposals({ limit: 1000, sortorder: 'DESC' }),
        dolibarr.listSupplierInvoices({ limit: 1000, sortorder: 'DESC' })
      ]);

      const filterByDateRange = (dateStr?: string) => {
        if (!dateStr) return false;
        return dateStr >= params.date_start && dateStr <= params.date_end;
      };

      // Filter orders
      let orders = ordersResult.data.filter(o => filterByDateRange(o.date_creation));
      if (params.thirdparty_id) {
        orders = orders.filter(o => o.fk_soc === params.thirdparty_id);
      }

      // Filter proposals
      let proposals = proposalsResult.data.filter(p => filterByDateRange(p.date_creation));
      if (params.thirdparty_id) {
        proposals = proposals.filter(p => p.fk_soc === params.thirdparty_id);
      }

      // Filter supplier invoices
      let supplierInvoices = invoicesResult.data.filter(i => filterByDateRange(i.date_creation));
      if (params.thirdparty_id) {
        supplierInvoices = supplierInvoices.filter(i => i.fk_soc === params.thirdparty_id);
      }

      const totalOrdersHT = orders.reduce((sum, o) => sum + (o.total_ht || 0), 0);
      const totalOrdersTVA = orders.reduce((sum, o) => sum + (o.total_tva || 0), 0);
      const totalOrdersTTC = orders.reduce((sum, o) => sum + (o.total_ttc || 0), 0);

      const totalSupplierInvoicesHT = supplierInvoices.reduce((sum, i) => sum + (i.total_ht || 0), 0);
      const totalSupplierInvoicesTVA = supplierInvoices.reduce((sum, i) => sum + (i.total_tva || 0), 0);
      const totalSupplierInvoicesTTC = supplierInvoices.reduce((sum, i) => sum + (i.total_ttc || 0), 0);

      const report = {
        period: {
          start: params.date_start,
          end: params.date_end
        },
        customer_orders: {
          count: orders.length,
          total_ht: Math.round(totalOrdersHT * 100) / 100,
          total_tva: Math.round(totalOrdersHT * 100) / 100,
          total_ttc: Math.round(totalOrdersTTC * 100) / 100,
        },
        proposals: {
          count: proposals.length,
          total_ht: Math.round(proposals.reduce((sum, p) => sum + (p.total_ht || 0), 0) * 100) / 100,
          total_ttc: Math.round(proposals.reduce((sum, p) => sum + (p.total_ttc || 0), 0) * 100) / 100,
        },
        supplier_invoices: {
          count: supplierInvoices.length,
          total_ht: Math.round(totalSupplierInvoicesHT * 100) / 100,
          total_tva: Math.round(totalSupplierInvoicesTVA * 100) / 100,
          total_ttc: Math.round(totalSupplierInvoicesTTC * 100) / 100,
        },
        summary: {
          sales_net: Math.round(totalOrdersTTC * 100) / 100,
          purchases_net: Math.round(totalSupplierInvoicesTTC * 100) / 100,
          gross_margin: Math.round((totalOrdersTTC - totalSupplierInvoicesTTC) * 100) / 100,
        }
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(report, null, 2) }]
      };
    }
  },

  /**
   * Get inventory report
   */
  get_inventory_report: {
    description: 'Get an inventory/stock report',
    inputSchema: InventoryReportSchema,
    async handle(params: z.infer<typeof InventoryReportSchema>): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const productsResult = await dolibarr.listProducts({ limit: 1000 });
      const products = productsResult.data || [];

      // Get stock for each product
      const productsWithStock = await Promise.all(
        products.map(async (p) => {
          const stockResult = await dolibarr.getProductStock(p.id!);
          return {
            id: p.id,
            ref: p.ref,
            label: p.label,
            stock: stockResult.data?.stock_reel || 0,
            warehouse_id: stockResult.data?.warehouse_id || 0,
            price: p.price,
            cost_price: p.cost_price,
            type: p.fk_product_type === 0 ? 'Product' : 'Service',
          };
        })
      );

      // Filter by low stock if requested
      let filteredProducts = productsWithStock.filter(p => p.type === 'Product');
      if (params.low_stock) {
        filteredProducts = filteredProducts.filter(p => p.stock < 10);
      }

      const totalStockValue = filteredProducts.reduce(
        (sum, p) => sum + (p.stock * (p.cost_price || 0)),
        0
      );

      const totalStockValueSale = filteredProducts.reduce(
        (sum, p) => sum + (p.stock * (p.price || 0)),
        0
      );

      const report = {
        filters: {
          warehouse_id: params.warehouse_id || 'all',
          low_stock_only: params.low_stock || false,
        },
        summary: {
          total_products: filteredProducts.length,
          total_stock_units: filteredProducts.reduce((sum, p) => sum + p.stock, 0),
          total_stock_value_cost: Math.round(totalStockValue * 100) / 100,
          total_stock_value_sale: Math.round(totalStockValueSale * 100) / 100,
        },
        products: filteredProducts.slice(0, 50).map(p => ({
          id: p.id,
          ref: p.ref,
          label: p.label,
          stock: p.stock,
          price: p.price,
          cost_price: p.cost_price,
          stock_value: Math.round(p.stock * (p.cost_price || 0) * 100) / 100,
        }))
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(report, null, 2) }]
      };
    }
  },

  /**
   * Get categories
   */
  list_categories: {
    description: 'List all categories in Dolibarr',
    inputSchema: z.object({
      type: z.string().optional().describe('Category type (customer, supplier, contact, product, etc.)'),
    }),
    async handle(params: { type?: string }): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const result = await dolibarr.listCategories(params.type);

      if (!result.success || !result.data) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to fetch categories', details: result.error }, null, 2) }]
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({
          count: result.data.length,
          categories: result.data.map(c => ({
            id: c.id,
            ref: c.ref,
            label: c.label,
            type: c.type,
            description: c.description,
          }))
        }, null, 2) }]
      };
    }
  },

  /**
   * Get bank accounts
   */
  list_bank_accounts: {
    description: 'List all bank accounts and their balances',
    inputSchema: z.object({
      limit: z.number().optional().default(50).describe('Maximum number of results'),
    }),
    async handle(params: { limit?: number }): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const result = await dolibarr.listBankAccounts({ limit: params.limit });

      if (!result.success || !result.data) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to fetch bank accounts', details: result.error }, null, 2) }]
        };
      }

      // Get balances for each account
      const accountsWithBalance = await Promise.all(
        result.data.map(async (account) => {
          const balanceResult = await dolibarr.getBankAccountBalance(account.id!);
          return {
            id: account.id,
            ref: account.ref,
            label: account.label,
            number: account.number,
            iban: account.iban,
            bic: account.bic,
            balance: balanceResult.success ? balanceResult.data : null,
            currency: account.currency_code,
            status: account.closed === 0 ? 'Active' : 'Closed',
          };
        })
      );

      const totalBalance = accountsWithBalance.reduce(
        (sum, a) => sum + (a.balance || 0),
        0
      );

      return {
        content: [{ type: 'text', text: JSON.stringify({
          total_accounts: accountsWithBalance.length,
          total_balance: Math.round(totalBalance * 100) / 100,
          accounts: accountsWithBalance
        }, null, 2) }]
      };
    }
  },
};
