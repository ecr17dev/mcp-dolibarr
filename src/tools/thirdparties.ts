/**
 * Thirdparty (Terceros) MCP Tools
 * CRUD operations for third parties (companies/clients/suppliers)
 */

import { dolibarr, Thirdparty, ListResponse } from '../client/dolibarr.js';
import { z } from 'zod';

// ============ SCHEMAS ============

export const ThirdpartySearchSchema = z.object({
  limit: z.number().optional().default(100).describe('Maximum number of results'),
  page: z.number().optional().default(1).describe('Page number'),
  sortfield: z.string().optional().default('t.rowid').describe('Sort field'),
  sortorder: z.enum(['ASC', 'DESC']).optional().default('DESC').describe('Sort order'),
  sqlfilters: z.string().optional().describe('SQL filters (e.g. "(t.name:like:\'%company%\')")'),
  category: z.number().optional().describe('Filter by category ID'),
});

export const ThirdpartyCreateSchema = z.object({
  name: z.string().min(1).describe('Company name'),
  name_alias: z.string().optional().describe('Company alias'),
  address: z.string().optional().describe('Address'),
  zip: z.string().optional().describe('ZIP/Postal code'),
  town: z.string().optional().describe('City/Town'),
  phone: z.string().optional().describe('Phone number'),
  phone_mobile: z.string().optional().describe('Mobile phone'),
  email: z.string().email().optional().describe('Email address'),
  url: z.string().url().optional().describe('Website URL'),
  client: z.number().min(0).max(1).optional().default(1).describe('Is client (0/1)'),
  fournisseur: z.number().min(0).max(1).optional().default(0).describe('Is supplier (0/1)'),
  status: z.number().min(0).max(1).optional().default(1).describe('Status (0=inactive, 1=active)'),
  tva_intra: z.string().optional().describe('VAT number (INTRA)'),
  idprof1: z.string().optional().describe('Professional ID 1'),
  idprof2: z.string().optional().describe('Professional ID 2'),
  idprof3: z.string().optional().describe('Professional ID 3'),
  fk_pays: z.number().optional().describe('Country ID'),
  fk_civility: z.number().optional().describe('Civility ID'),
  capital: z.number().optional().describe('Capital'),
  fk_typent: z.number().optional().describe('Type of company (typent)'),
  fk_effectif: z.number().optional().describe('Workforce size (effectif)'),
  fk_forme_juridique: z.number().optional().describe('Legal form ID'),
  note_private: z.string().optional().describe('Private notes'),
  note_public: z.string().optional().describe('Public notes'),
  default_lang: z.string().optional().describe('Default language code (e.g. es_ES)'),
});

export const ThirdpartyUpdateSchema = z.object({
  id: z.number().describe('Thirdparty ID to update'),
  name: z.string().optional().describe('Company name'),
  name_alias: z.string().optional().describe('Company alias'),
  address: z.string().optional().describe('Address'),
  zip: z.string().optional().describe('ZIP/Postal code'),
  town: z.string().optional().describe('City/Town'),
  phone: z.string().optional().describe('Phone number'),
  phone_mobile: z.string().optional().describe('Mobile phone'),
  email: z.string().email().optional().describe('Email address'),
  url: z.string().url().optional().describe('Website URL'),
  client: z.number().min(0).max(1).optional().describe('Is client (0/1)'),
  fournisseur: z.number().min(0).max(1).optional().describe('Is supplier (0/1)'),
  status: z.number().min(0).max(1).optional().describe('Status (0=inactive, 1=active)'),
  tva_intra: z.string().optional().describe('VAT number (INTRA)'),
  idprof1: z.string().optional().describe('Professional ID 1'),
  idprof2: z.string().optional().describe('Professional ID 2'),
  idprof3: z.string().optional().describe('Professional ID 3'),
  fk_pays: z.number().optional().describe('Country ID'),
  capital: z.number().optional().describe('Capital'),
  note_private: z.string().optional().describe('Private notes'),
  note_public: z.string().optional().describe('Public notes'),
});

// ============ TOOLS ============

export const thirdpartyTools = {
  /**
   * List/search third parties (terceros)
   */
  list_thirdparties: {
    description: 'List and search third parties (companies, clients, suppliers) in Dolibarr',
    inputSchema: ThirdpartySearchSchema,
    async handle(params: z.infer<typeof ThirdpartySearchSchema>): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const result = await dolibarr.listThirdparties(params);

      if (!result.success || !result.data) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to fetch thirdparties', details: result.error }, null, 2) }]
        };
      }

      const response = {
        total: result.total,
        page: result.page,
        limit: result.limit,
        thirdparties: result.data.map(t => ({
          id: t.id,
          name: t.name,
          email: t.email,
          phone: t.phone,
          client: t.client ? 'Yes' : 'No',
          supplier: t.fournisseur ? 'Yes' : 'No',
          status: t.status === 1 ? 'Active' : 'Inactive'
        }))
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(response, null, 2) }]
      };
    }
  },

  /**
   * Get a specific third party by ID
   */
  get_thirdparty: {
    description: 'Get detailed information about a specific third party by ID',
    inputSchema: z.object({
      id: z.number().describe('Third party ID')
    }),
    async handle(params: { id: number }): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const result = await dolibarr.getThirdparty(params.id);

      if (!result.success || !result.data) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Third party not found', details: result.error }, null, 2) }]
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }]
      };
    }
  },

  /**
   * Create a new third party
   */
  create_thirdparty: {
    description: 'Create a new third party (company/client/supplier) in Dolibarr',
    inputSchema: ThirdpartyCreateSchema,
    async handle(params: z.infer<typeof ThirdpartyCreateSchema>): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const result = await dolibarr.createThirdparty(params);

      if (!result.success) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to create thirdparty', details: result.error }, null, 2) }]
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({
          success: true,
          message: `Third party created successfully`,
          id: result.data,
          data: { ...params }
        }, null, 2) }]
      };
    }
  },

  /**
   * Update an existing third party
   */
  update_thirdparty: {
    description: 'Update an existing third party in Dolibarr',
    inputSchema: ThirdpartyUpdateSchema,
    async handle(params: z.infer<typeof ThirdpartyUpdateSchema>): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const { id, ...updateData } = params;
      const result = await dolibarr.updateThirdparty(id, updateData);

      if (!result.success) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to update thirdparty', details: result.error }, null, 2) }]
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({
          success: true,
          message: `Third party ${id} updated successfully`,
          data: result.data
        }, null, 2) }]
      };
    }
  },

  /**
   * Delete a third party
   */
  delete_thirdparty: {
    description: 'Delete a third party from Dolibarr (soft delete)',
    inputSchema: z.object({
      id: z.number().describe('Third party ID to delete')
    }),
    async handle(params: { id: number }): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const result = await dolibarr.deleteThirdparty(params.id);

      if (!result.success) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to delete thirdparty', details: result.error }, null, 2) }]
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({
          success: true,
          message: `Third party ${params.id} deleted successfully`
        }, null, 2) }]
      };
    }
  },

  /**
   * Search third party by email
   */
  search_thirdparty_by_email: {
    description: 'Find a third party by their email address',
    inputSchema: z.object({
      email: z.string().email().describe('Email address to search')
    }),
    async handle(params: { email: string }): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const result = await dolibarr.searchThirdpartiesByEmail(params.email);

      if (!result.success || !result.data) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Third party not found', details: result.error }, null, 2) }]
        };
      }

      const data = Array.isArray(result.data) ? result.data : [result.data];
      return {
        content: [{ type: 'text', text: JSON.stringify({
          found: data.length,
          thirdparties: data
        }, null, 2) }]
      };
    }
  },
};
