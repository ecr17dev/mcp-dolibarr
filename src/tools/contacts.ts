/**
 * Contact MCP Tools
 * CRUD operations for contacts
 */

import { dolibarr } from '../client/dolibarr.js';
import { z } from 'zod';

// ============ SCHEMAS ============

export const ContactSearchSchema = z.object({
  limit: z.number().optional().default(100).describe('Maximum number of results'),
  page: z.number().optional().default(1).describe('Page number'),
  sortfield: z.string().optional().default('t.rowid').describe('Sort field'),
  sortorder: z.enum(['ASC', 'DESC']).optional().default('DESC').describe('Sort order'),
});

export const ContactCreateSchema = z.object({
  lastname: z.string().min(1).describe('Last name'),
  firstname: z.string().optional().describe('First name'),
  fk_soc: z.number().optional().describe('Third party ID (company)'),
  fk_contact_type: z.number().optional().describe('Contact type ID'),
  address: z.string().optional().describe('Address'),
  zip: z.string().optional().describe('ZIP/Postal code'),
  town: z.string().optional().describe('City/Town'),
  fk_country: z.number().optional().describe('Country ID'),
  phone_pro: z.string().optional().describe('Professional phone'),
  phone_perso: z.string().optional().describe('Personal phone'),
  phone_mobile: z.string().optional().describe('Mobile phone'),
  fax: z.string().optional().describe('Fax'),
  email: z.string().email().optional().describe('Email address'),
  civility: z.string().optional().describe('Civility code (MR, MME, MLLE, etc.)'),
  note_private: z.string().optional().describe('Private notes'),
  note_public: z.string().optional().describe('Public notes'),
  default_lang: z.string().optional().describe('Default language code'),
});

export const ContactUpdateSchema = z.object({
  id: z.number().describe('Contact ID to update'),
  lastname: z.string().optional().describe('Last name'),
  firstname: z.string().optional().describe('First name'),
  fk_soc: z.number().optional().describe('Third party ID (company)'),
  fk_contact_type: z.number().optional().describe('Contact type ID'),
  address: z.string().optional().describe('Address'),
  zip: z.string().optional().describe('ZIP/Postal code'),
  town: z.string().optional().describe('City/Town'),
  fk_country: z.number().optional().describe('Country ID'),
  phone_pro: z.string().optional().describe('Professional phone'),
  phone_perso: z.string().optional().describe('Personal phone'),
  phone_mobile: z.string().optional().describe('Mobile phone'),
  fax: z.string().optional().describe('Fax'),
  email: z.string().email().optional().describe('Email address'),
  civility: z.string().optional().describe('Civility code'),
  note_private: z.string().optional().describe('Private notes'),
  note_public: z.string().optional().describe('Public notes'),
});

// ============ TOOLS ============

export const contactTools = {
  /**
   * List/search contacts
   */
  list_contacts: {
    description: 'List and search contacts in Dolibarr',
    inputSchema: ContactSearchSchema,
    async handle(params: z.infer<typeof ContactSearchSchema>): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const result = await dolibarr.listContacts(params);

      if (!result.success || !result.data) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to fetch contacts', details: result.error }, null, 2) }]
        };
      }

      const response = {
        total: result.total,
        page: result.page,
        limit: result.limit,
        contacts: result.data.map(c => ({
          id: c.id,
          name: `${c.firstname || ''} ${c.lastname}`.trim(),
          email: c.email,
          phone: c.phone_pro || c.phone_mobile,
          company_id: c.fk_soc,
          status: c.statut === 1 ? 'Active' : 'Inactive'
        }))
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(response, null, 2) }]
      };
    }
  },

  /**
   * Get a specific contact by ID
   */
  get_contact: {
    description: 'Get detailed information about a specific contact by ID',
    inputSchema: z.object({
      id: z.number().describe('Contact ID')
    }),
    async handle(params: { id: number }): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const result = await dolibarr.getContact(params.id);

      if (!result.success || !result.data) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Contact not found', details: result.error }, null, 2) }]
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }]
      };
    }
  },

  /**
   * Create a new contact
   */
  create_contact: {
    description: 'Create a new contact in Dolibarr',
    inputSchema: ContactCreateSchema,
    async handle(params: z.infer<typeof ContactCreateSchema>): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const result = await dolibarr.createContact(params);

      if (!result.success) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to create contact', details: result.error }, null, 2) }]
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({
          success: true,
          message: `Contact created successfully`,
          id: result.data,
          data: { ...params }
        }, null, 2) }]
      };
    }
  },

  /**
   * Update an existing contact
   */
  update_contact: {
    description: 'Update an existing contact in Dolibarr',
    inputSchema: ContactUpdateSchema,
    async handle(params: z.infer<typeof ContactUpdateSchema>): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const { id, ...updateData } = params;
      const result = await dolibarr.updateContact(id, updateData);

      if (!result.success) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to update contact', details: result.error }, null, 2) }]
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({
          success: true,
          message: `Contact ${id} updated successfully`,
          data: result.data
        }, null, 2) }]
      };
    }
  },

  /**
   * Delete a contact
   */
  delete_contact: {
    description: 'Delete a contact from Dolibarr',
    inputSchema: z.object({
      id: z.number().describe('Contact ID to delete')
    }),
    async handle(params: { id: number }): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const result = await dolibarr.deleteContact(params.id);

      if (!result.success) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to delete contact', details: result.error }, null, 2) }]
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({
          success: true,
          message: `Contact ${params.id} deleted successfully`
        }, null, 2) }]
      };
    }
  },

  /**
   * Search contact by email
   */
  search_contact_by_email: {
    description: 'Find a contact by their email address',
    inputSchema: z.object({
      email: z.string().email().describe('Email address to search')
    }),
    async handle(params: { email: string }): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
      const result = await dolibarr.searchContactByEmail(params.email);

      if (!result.success || !result.data) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Contact not found', details: result.error }, null, 2) }]
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({
          found: true,
          contact: result.data
        }, null, 2) }]
      };
    }
  },
};
