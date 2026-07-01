/**
 * Proposal (Cotización) MCP Tools
 * CRUD operations for commercial proposals
 */

import { dolibarr } from '../client/dolibarr.js';
import { z } from 'zod';

// ============ SCHEMAS ============

export const ProposalSearchSchema = z.object({
  limit: z.number().optional().default(100).describe('Maximum number of results'),
  page: z.number().optional().default(1).describe('Page number'),
  sortfield: z.string().optional().default('t.rowid').describe('Sort field'),
  sortorder: z.enum(['ASC', 'DESC']).optional().default('DESC').describe('Sort order'),
  sqlfilters: z.string().optional().describe('SQL filters for advanced search'),
});

export const ProposalCreateSchema = z.object({
  fk_soc: z.number().describe('Third party ID (client)'),
  fk_projet: z.number().optional().describe('Project ID'),
  ref_client: z.string().optional().describe('Client reference'),
  date_propal: z.string().optional().describe('Proposal date (YYYY-MM-DD)'),
  fin_validite: z.string().optional().describe('Validity end date (YYYY-MM-DD)'),
  remise_percent: z.number().optional().describe('Discount percentage'),
  remise_absolue: z.number().optional().describe('Absolute discount amount'),
  fk_cond_reglement: z.number().optional().describe('Payment term ID'),
  fk_mode_reglement: z.number().optional().describe('Payment mode ID'),
  fk_shipping_method: z.number().optional().describe('Shipping method ID'),
  subject: z.string().optional().describe('Proposal subject/title'),
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
  })).optional().describe('Proposal lines'),
});

export const ProposalUpdateSchema = z.object({
  id: z.number().describe('Proposal ID to update'),
  ref_client: z.string().optional().describe('Client reference'),
  date_propal: z.string().optional().describe('Proposal date'),
  fin_validite: z.string().optional().describe('Validity end date'),
  remise_percent: z.number().optional().describe('Discount percentage'),
  remise_absolue: z.number().optional().describe('Absolute discount'),
  fk_cond_reglement: z.number().optional().describe('Payment term ID'),
  fk_mode_reglement: z.number().optional().describe('Payment mode ID'),
  subject: z.string().optional().describe('Subject'),
  note_public: z.string().optional().describe('Public notes'),
  note_private: z.string().optional().describe('Private notes'),
});

// Proposal status constants
export const PROPOSAL_STATUS = {
  DRAFT: 0,
  OPENED: 1,
  SIGNED: 2,
  NOTSIGNED: 3,
  CLOSED_SIGNED: 4,
  CLOSED_UNSIGNED: 5,
} as const;

// ============ TOOLS ============

export const proposalTools = {
  /**
   * List/search proposals (cotizaciones)
   */
  list_proposals: {
    description: 'List and search commercial proposals (cotizaciones) in Dolibarr',
    inputSchema: ProposalSearchSchema,
    async handle(params: z.infer<typeof ProposalSearchSchema>): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const result = await dolibarr.listProposals(params);

      if (!result.success || !result.data) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to fetch proposals', details: result.error }, null, 2) }]
        };
      }

      const statusLabels: Record<number, string> = {
        0: 'Draft',
        1: 'Open',
        2: 'Signed',
        3: 'Not Signed',
        4: 'Closed (Signed)',
        5: 'Closed (Not Signed)'
      };

      const response = {
        total: result.total,
        page: result.page,
        limit: result.limit,
        proposals: result.data.map(p => ({
          id: p.id,
          ref: p.ref,
          client_ref: p.ref_client,
          thirdparty_id: p.fk_soc,
          status: statusLabels[p.fk_statut || 0] || 'Unknown',
          date: p.date_propal || p.date_creation,
          total_ht: p.total_ht,
          total_tva: p.total_tva,
          total_ttc: p.total_ttc,
          subject: p.subject
        }))
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(response, null, 2) }]
      };
    }
  },

  /**
   * Get a specific proposal by ID
   */
  get_proposal: {
    description: 'Get detailed information about a specific proposal including lines',
    inputSchema: z.object({
      id: z.number().describe('Proposal ID')
    }),
    async handle(params: { id: number }): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const result = await dolibarr.getProposal(params.id);

      if (!result.success || !result.data) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Proposal not found', details: result.error }, null, 2) }]
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }]
      };
    }
  },

  /**
   * Create a new proposal (cotización)
   */
  create_proposal: {
    description: 'Create a new commercial proposal (cotización) in Dolibarr',
    inputSchema: ProposalCreateSchema,
    async handle(params: z.infer<typeof ProposalCreateSchema>): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const result = await dolibarr.createProposal(params);

      if (!result.success) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to create proposal', details: result.error }, null, 2) }]
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({
          success: true,
          message: `Proposal created successfully`,
          id: result.data,
          data: params
        }, null, 2) }]
      };
    }
  },

  /**
   * Update an existing proposal
   */
  update_proposal: {
    description: 'Update an existing proposal in Dolibarr',
    inputSchema: ProposalUpdateSchema,
    async handle(params: z.infer<typeof ProposalUpdateSchema>): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const { id, ...updateData } = params;
      const result = await dolibarr.updateProposal(id, updateData);

      if (!result.success) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to update proposal', details: result.error }, null, 2) }]
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({
          success: true,
          message: `Proposal ${id} updated successfully`,
          data: result.data
        }, null, 2) }]
      };
    }
  },

  /**
   * Delete a proposal
   */
  delete_proposal: {
    description: 'Delete a proposal from Dolibarr',
    inputSchema: z.object({
      id: z.number().describe('Proposal ID to delete')
    }),
    async handle(params: { id: number }): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const result = await dolibarr.deleteProposal(params.id);

      if (!result.success) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to delete proposal', details: result.error }, null, 2) }]
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({
          success: true,
          message: `Proposal ${params.id} deleted successfully`
        }, null, 2) }]
      };
    }
  },

  /**
   * Validate a proposal
   */
  validate_proposal: {
    description: 'Validate a proposal to change its status to open/valid',
    inputSchema: z.object({
      id: z.number().describe('Proposal ID to validate')
    }),
    async handle(params: { id: number }): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const result = await dolibarr.validateProposal(params.id);

      if (!result.success) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to validate proposal', details: result.error }, null, 2) }]
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({
          success: true,
          message: `Proposal ${params.id} validated successfully`,
          data: result.data
        }, null, 2) }]
      };
    }
  },

  /**
   * Close a proposal (signed or not signed)
   */
  close_proposal: {
    description: 'Close a proposal (mark as signed/not signed)',
    inputSchema: z.object({
      id: z.number().describe('Proposal ID to close')
    }),
    async handle(params: { id: number }): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const result = await dolibarr.closeProposal(params.id);

      if (!result.success) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to close proposal', details: result.error }, null, 2) }]
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({
          success: true,
          message: `Proposal ${params.id} closed successfully`,
          data: result.data
        }, null, 2) }]
      };
    }
  },

  /**
   * Set proposal back to draft
   */
  set_proposal_to_draft: {
    description: 'Set a proposal back to draft status',
    inputSchema: z.object({
      id: z.number().describe('Proposal ID')
    }),
    async handle(params: { id: number }): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const result = await dolibarr.setProposalToDraft(params.id);

      if (!result.success) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to set proposal to draft', details: result.error }, null, 2) }]
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({
          success: true,
          message: `Proposal ${params.id} set to draft`,
          data: result.data
        }, null, 2) }]
      };
    }
  },
};
