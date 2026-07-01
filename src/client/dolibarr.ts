/**
 * Dolibarr API Client
 * HTTP client for interacting with Dolibarr REST API
 */

import { getConfig } from '../config/index.js';

export interface DolibarrResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: number;
}

export interface PaginationParams {
  limit?: number;
  page?: number;
  sortfield?: string;
  sortorder?: 'ASC' | 'DESC';
}

export interface ListResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  error?: string;
}

class DolibarrClient {
  private getHeaders(): Record<string, string> {
    const config = getConfig();
    return {
      'DOLAPIKEY': config.apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown
  ): Promise<DolibarrResponse<T>> {
    const config = getConfig();
    const url = `${config.baseUrl}${endpoint}`;

    try {
      const options: RequestInit = {
        method,
        headers: this.getHeaders()
      };

      if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        // Dolibarr REST API: data goes directly, no wrapper
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);
      const contentType = response.headers.get('content-type') || '';

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json() as { message?: string; error?: string };
          if (errorData.message || errorData.error) {
            errorMessage = errorData.message || errorData.error || errorMessage;
          }
        } catch {
          // Ignore JSON parse errors
        }
        return {
          success: false,
          error: errorMessage,
          code: response.status
        };
      }

      // Handle empty responses
      if (response.status === 204 || contentType.includes('text/html')) {
        return { success: true };
      }

      const data = await response.json() as T;
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // ============ THIRDPARTIES (Terceros) ============

  async listThirdparties(params?: PaginationParams & { sqlfilters?: string; category?: number }): Promise<ListResponse<Thirdparty>> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.sortfield) queryParams.set('sortfield', params.sortfield);
    if (params?.sortorder) queryParams.set('sortorder', params.sortorder);
    if (params?.sqlfilters) queryParams.set('sqlfilters', params.sqlfilters);
    if (params?.category) queryParams.set('category', params.category.toString());

    const query = queryParams.toString();
    const endpoint = `/thirdparties${query ? `?${query}` : ''}`;

    const result = await this.request<Thirdparty[] | Thirdparty>('GET', endpoint);

    if (!result.success || !result.data) {
      return { success: false, data: [], total: 0, page: params?.page || 1, limit: params?.limit || 100, error: result.error };
    }

    const dataArray = Array.isArray(result.data) ? result.data : [result.data];
    return {
      success: true,
      data: dataArray,
      total: dataArray.length,
      page: params?.page || 1,
      limit: params?.limit || 100
    };
  }

  async getThirdparty(id: number): Promise<DolibarrResponse<Thirdparty>> {
    return this.request<Thirdparty>('GET', `/thirdparties/${id}`);
  }

  async createThirdparty(data: Partial<Thirdparty>): Promise<DolibarrResponse<number>> {
    return this.request<number>('POST', '/thirdparties', data);
  }

  async updateThirdparty(id: number, data: Partial<Thirdparty>): Promise<DolibarrResponse<Thirdparty>> {
    return this.request<Thirdparty>('PUT', `/thirdparties/${id}`, data);
  }

  async deleteThirdparty(id: number): Promise<DolibarrResponse<void>> {
    return this.request<void>('DELETE', `/thirdparties/${id}`);
  }

  async searchThirdpartiesByEmail(email: string): Promise<DolibarrResponse<Thirdparty[]>> {
    return this.request<Thirdparty[]>('GET', `/thirdparties/email/${encodeURIComponent(email)}`);
  }

  async searchThirdpartiesByBarcode(barcode: string): Promise<DolibarrResponse<Thirdparty>> {
    return this.request<Thirdparty>('GET', `/thirdparties/barcode/${barcode}`);
  }

  // ============ CONTACTS ============

  async listContacts(params?: PaginationParams): Promise<ListResponse<Contact>> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.sortfield) queryParams.set('sortfield', params.sortfield);
    if (params?.sortorder) queryParams.set('sortorder', params.sortorder);

    const query = queryParams.toString();
    const endpoint = `/contacts${query ? `?${query}` : ''}`;

    const result = await this.request<Contact[] | Contact>('GET', endpoint);

    if (!result.success || !result.data) {
      return { success: false, data: [], total: 0, page: params?.page || 1, limit: params?.limit || 100, error: result.error };
    }

    const dataArray = Array.isArray(result.data) ? result.data : [result.data];
    return {
      success: true,
      data: dataArray,
      total: dataArray.length,
      page: params?.page || 1,
      limit: params?.limit || 100
    };
  }

  async getContact(id: number): Promise<DolibarrResponse<Contact>> {
    return this.request<Contact>('GET', `/contacts/${id}`);
  }

  async createContact(data: Partial<Contact>): Promise<DolibarrResponse<number>> {
    return this.request<number>('POST', '/contacts', data);
  }

  async updateContact(id: number, data: Partial<Contact>): Promise<DolibarrResponse<Contact>> {
    return this.request<Contact>('PUT', `/contacts/${id}`, data);
  }

  async deleteContact(id: number): Promise<DolibarrResponse<void>> {
    return this.request<void>('DELETE', `/contacts/${id}`);
  }

  async searchContactByEmail(email: string): Promise<DolibarrResponse<Contact>> {
    return this.request<Contact>('GET', `/contacts/email/${encodeURIComponent(email)}`);
  }

  // ============ PROPOSALS (Cotizaciones) ============

  async listProposals(params?: PaginationParams): Promise<ListResponse<Proposal>> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.sortfield) queryParams.set('sortfield', params.sortfield);
    if (params?.sortorder) queryParams.set('sortorder', params.sortorder);

    const query = queryParams.toString();
    const endpoint = `/proposals${query ? `?${query}` : ''}`;

    const result = await this.request<Proposal[] | Proposal>('GET', endpoint);

    if (!result.success || !result.data) {
      return { success: false, data: [], total: 0, page: params?.page || 1, limit: params?.limit || 100, error: result.error };
    }

    const dataArray = Array.isArray(result.data) ? result.data : [result.data];
    return {
      success: true,
      data: dataArray,
      total: dataArray.length,
      page: params?.page || 1,
      limit: params?.limit || 100
    };
  }

  async getProposal(id: number): Promise<DolibarrResponse<Proposal>> {
    return this.request<Proposal>('GET', `/proposals/${id}`);
  }

  async createProposal(data: Partial<Proposal>): Promise<DolibarrResponse<number>> {
    const payload = this.processDocumentPayload(data as unknown as Record<string, unknown>);
    return this.request<number>('POST', '/proposals', payload);
  }

  // Helper para procesar líneas de documentos
  private processDocumentPayload(data: Record<string, unknown>): Record<string, unknown> {
    const payload: Record<string, unknown> = { ...data };

    // Dolibarr usa socid para todas las entidades, no fk_soc
    if ('fk_soc' in payload && !('socid' in payload)) {
      payload.socid = payload.fk_soc;
      delete payload.fk_soc;
    }

    // Procesar líneas
    if (data.lines && Array.isArray(data.lines)) {
      payload.lines = (data.lines as Array<Record<string, unknown>>).map(line => {
        const processedLine: Record<string, unknown> = {};

        // Copiar todos los campos disponibles
        for (const [key, value] of Object.entries(line)) {
          if (value !== undefined && value !== null) {
            processedLine[key] = value;
          }
        }

        // Si hay label pero no desc, usar label como desc
        if (processedLine.label && !processedLine.desc) {
          processedLine.desc = processedLine.label;
        }

        // Asegurar que product_type sea 0 (producto) o 1 (servicio)
        if (!processedLine.product_type) {
          processedLine.product_type = 0;
        }

        // Usar subprice como precio principal; si solo hay price, copiarlo a subprice
        const priceVal = processedLine.price;
        if (typeof priceVal === 'number' && !processedLine.subprice) {
          processedLine.subprice = priceVal;
        }

        return processedLine;
      });
    }

    return payload;
  }

  async updateProposal(id: number, data: Partial<Proposal>): Promise<DolibarrResponse<Proposal>> {
    return this.request<Proposal>('PUT', `/proposals/${id}`, data);
  }

  async deleteProposal(id: number): Promise<DolibarrResponse<void>> {
    return this.request<void>('DELETE', `/proposals/${id}`);
  }

  async validateProposal(id: number): Promise<DolibarrResponse<Proposal>> {
    return this.request<Proposal>('POST', `/proposals/${id}/validate`);
  }

  async closeProposal(id: number): Promise<DolibarrResponse<Proposal>> {
    return this.request<Proposal>('POST', `/proposals/${id}/close`);
  }

  async setProposalToDraft(id: number): Promise<DolibarrResponse<Proposal>> {
    return this.request<Proposal>('POST', `/proposals/${id}/settodraft`);
  }

  // ============ ORDERS (Pedidos de Cliente) ============

  async listOrders(params?: PaginationParams): Promise<ListResponse<Order>> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.sortfield) queryParams.set('sortfield', params.sortfield);
    if (params?.sortorder) queryParams.set('sortorder', params.sortorder);

    const query = queryParams.toString();
    const endpoint = `/orders${query ? `?${query}` : ''}`;

    const result = await this.request<Order[] | Order>('GET', endpoint);

    if (!result.success || !result.data) {
      return { success: false, data: [], total: 0, page: params?.page || 1, limit: params?.limit || 100, error: result.error };
    }

    const dataArray = Array.isArray(result.data) ? result.data : [result.data];
    return {
      success: true,
      data: dataArray,
      total: dataArray.length,
      page: params?.page || 1,
      limit: params?.limit || 100
    };
  }

  async getOrder(id: number): Promise<DolibarrResponse<Order>> {
    return this.request<Order>('GET', `/orders/${id}`);
  }

  async createOrder(data: Partial<Order>): Promise<DolibarrResponse<number>> {
    const payload = this.processDocumentPayload(data);
    return this.request<number>('POST', '/orders', payload);
  }

  async updateOrder(id: number, data: Partial<Order>): Promise<DolibarrResponse<Order>> {
    return this.request<Order>('PUT', `/orders/${id}`, data);
  }

  async deleteOrder(id: number): Promise<DolibarrResponse<void>> {
    return this.request<void>('DELETE', `/orders/${id}`);
  }

  async validateOrder(id: number): Promise<DolibarrResponse<Order>> {
    return this.request<Order>('POST', `/orders/${id}/validate`);
  }

  async closeOrder(id: number): Promise<DolibarrResponse<Order>> {
    return this.request<Order>('POST', `/orders/${id}/close`);
  }

  async reopenOrder(id: number): Promise<DolibarrResponse<Order>> {
    return this.request<Order>('POST', `/orders/${id}/reopen`);
  }

  async setOrderToDraft(id: number): Promise<DolibarrResponse<Order>> {
    return this.request<Order>('POST', `/orders/${id}/settodraft`);
  }

  // ============ SUPPLIER INVOICES (Facturas de Proveedor) ============

  async listSupplierInvoices(params?: PaginationParams): Promise<ListResponse<SupplierInvoice>> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.sortfield) queryParams.set('sortfield', params.sortfield);
    if (params?.sortorder) queryParams.set('sortorder', params.sortorder);

    const query = queryParams.toString();
    const endpoint = `/supplierinvoices${query ? `?${query}` : ''}`;

    const result = await this.request<SupplierInvoice[] | SupplierInvoice>('GET', endpoint);

    if (!result.success || !result.data) {
      return { success: false, data: [], total: 0, page: params?.page || 1, limit: params?.limit || 100, error: result.error };
    }

    const dataArray = Array.isArray(result.data) ? result.data : [result.data];
    return {
      success: true,
      data: dataArray,
      total: dataArray.length,
      page: params?.page || 1,
      limit: params?.limit || 100
    };
  }

  async getSupplierInvoice(id: number): Promise<DolibarrResponse<SupplierInvoice>> {
    return this.request<SupplierInvoice>('GET', `/supplierinvoices/${id}`);
  }

  async createSupplierInvoice(data: Partial<SupplierInvoice>): Promise<DolibarrResponse<number>> {
    // Dolibarr requiere socid
    const payload: Record<string, unknown> = {
      socid: data.fk_soc,
      ...this.processDocumentPayload(data as unknown as Record<string, unknown>),
    };
    return this.request<number>('POST', '/supplierinvoices', payload);
  }

  async updateSupplierInvoice(id: number, data: Partial<SupplierInvoice>): Promise<DolibarrResponse<SupplierInvoice>> {
    return this.request<SupplierInvoice>('PUT', `/supplierinvoices/${id}`, data);
  }

  async deleteSupplierInvoice(id: number): Promise<DolibarrResponse<void>> {
    return this.request<void>('DELETE', `/supplierinvoices/${id}`);
  }

  async validateSupplierInvoice(id: number): Promise<DolibarrResponse<SupplierInvoice>> {
    return this.request<SupplierInvoice>('POST', `/supplierinvoices/${id}/validate`);
  }

  async setSupplierInvoiceToDraft(id: number): Promise<DolibarrResponse<SupplierInvoice>> {
    return this.request<SupplierInvoice>('POST', `/supplierinvoices/${id}/settodraft`);
  }

  async addPaymentToSupplierInvoice(id: number, payment: PaymentData): Promise<DolibarrResponse<void>> {
    return this.request<void>('POST', `/supplierinvoices/${id}/payments`, payment);
  }

  // ============ SUPPLIER ORDERS (Pedidos a Proveedor) ============

  async listSupplierOrders(params?: PaginationParams): Promise<ListResponse<SupplierOrder>> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.sortfield) queryParams.set('sortfield', params.sortfield);
    if (params?.sortorder) queryParams.set('sortorder', params.sortorder);

    const query = queryParams.toString();
    const endpoint = `/supplierorders${query ? `?${query}` : ''}`;

    const result = await this.request<SupplierOrder[] | SupplierOrder>('GET', endpoint);

    if (!result.success || !result.data) {
      return { success: false, data: [], total: 0, page: params?.page || 1, limit: params?.limit || 100, error: result.error };
    }

    const dataArray = Array.isArray(result.data) ? result.data : [result.data];
    return {
      success: true,
      data: dataArray,
      total: dataArray.length,
      page: params?.page || 1,
      limit: params?.limit || 100
    };
  }

  async getSupplierOrder(id: number): Promise<DolibarrResponse<SupplierOrder>> {
    return this.request<SupplierOrder>('GET', `/supplierorders/${id}`);
  }

  async createSupplierOrder(data: Partial<SupplierOrder>): Promise<DolibarrResponse<number>> {
    // Dolibarr requiere socid en lugar de fk_soc para pedidos de proveedor
    const basePayload = {
      socid: data.fk_soc,
      ref_supplier: data.ref_supplier,
      fk_projet: data.fk_projet,
      fk_cond_reglement: data.fk_cond_reglement,
      fk_mode_reglement: data.fk_mode_reglement,
      note_public: data.note_public,
      note_private: data.note_private,
      lines: data.lines,
    };

    const payload = this.processDocumentPayload(basePayload);
    return this.request<number>('POST', '/supplierorders', payload);
  }

  async updateSupplierOrder(id: number, data: Partial<SupplierOrder>): Promise<DolibarrResponse<SupplierOrder>> {
    return this.request<SupplierOrder>('PUT', `/supplierorders/${id}`, data);
  }

  async deleteSupplierOrder(id: number): Promise<DolibarrResponse<void>> {
    return this.request<void>('DELETE', `/supplierorders/${id}`);
  }

  async validateSupplierOrder(id: number): Promise<DolibarrResponse<SupplierOrder>> {
    return this.request<SupplierOrder>('POST', `/supplierorders/${id}/validate`);
  }

  async approveSupplierOrder(id: number): Promise<DolibarrResponse<SupplierOrder>> {
    return this.request<SupplierOrder>('POST', `/supplierorders/${id}/approve`);
  }

  async makeSupplierOrder(id: number): Promise<DolibarrResponse<SupplierOrder>> {
    return this.request<SupplierOrder>('POST', `/supplierorders/${id}/makeorder`);
  }

  async receiveSupplierOrder(id: number, data?: ReceiveOrderData): Promise<DolibarrResponse<SupplierOrder>> {
    return this.request<SupplierOrder>('POST', `/supplierorders/${id}/receive`, data);
  }

  // ============ PRODUCTS (Productos) ============

  async listProducts(params?: PaginationParams): Promise<ListResponse<Product>> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.sortfield) queryParams.set('sortfield', params.sortfield);
    if (params?.sortorder) queryParams.set('sortorder', params.sortorder);

    const query = queryParams.toString();
    const endpoint = `/products${query ? `?${query}` : ''}`;

    const result = await this.request<Product[] | Product>('GET', endpoint);

    if (!result.success || !result.data) {
      return { success: false, data: [], total: 0, page: params?.page || 1, limit: params?.limit || 100, error: result.error };
    }

    const dataArray = Array.isArray(result.data) ? result.data : [result.data];
    return {
      success: true,
      data: dataArray,
      total: dataArray.length,
      page: params?.page || 1,
      limit: params?.limit || 100
    };
  }

  async getProduct(id: number): Promise<DolibarrResponse<Product>> {
    return this.request<Product>('GET', `/products/${id}`);
  }

  async getProductByRef(ref: string): Promise<DolibarrResponse<Product>> {
    return this.request<Product>('GET', `/products/ref/${encodeURIComponent(ref)}`);
  }

  async createProduct(data: Partial<Product>): Promise<DolibarrResponse<number>> {
    return this.request<number>('POST', '/products', data);
  }

  async updateProduct(id: number, data: Partial<Product>): Promise<DolibarrResponse<Product>> {
    return this.request<Product>('PUT', `/products/${id}`, data);
  }

  async deleteProduct(id: number): Promise<DolibarrResponse<void>> {
    return this.request<void>('DELETE', `/products/${id}`);
  }

  async getProductStock(id: number): Promise<DolibarrResponse<ProductStock>> {
    return this.request<ProductStock>('GET', `/products/${id}/stock`);
  }

  // ============ CATEGORIES ============

  async listCategories(type?: string): Promise<DolibarrResponse<Category[]>> {
    const endpoint = type ? `/categories?type=${type}` : '/categories';
    return this.request<Category[]>('GET', endpoint);
  }

  async getCategory(id: number): Promise<DolibarrResponse<Category>> {
    return this.request<Category>('GET', `/categories/${id}`);
  }

  // ============ BANK ACCOUNTS ============

  async listBankAccounts(params?: PaginationParams): Promise<ListResponse<BankAccount>> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.page) queryParams.set('page', params.page.toString());

    const query = queryParams.toString();
    const endpoint = `/bankaccounts${query ? `?${query}` : ''}`;

    const result = await this.request<BankAccount[] | BankAccount>('GET', endpoint);

    if (!result.success || !result.data) {
      return { success: false, data: [], total: 0, page: params?.page || 1, limit: params?.limit || 100, error: result.error };
    }

    const dataArray = Array.isArray(result.data) ? result.data : [result.data];
    return {
      success: true,
      data: dataArray,
      total: dataArray.length,
      page: params?.page || 1,
      limit: params?.limit || 100
    };
  }

  async getBankAccountBalance(id: number): Promise<DolibarrResponse<number>> {
    return this.request<number>('GET', `/bankaccounts/${id}/balance`);
  }
}

// ============ TYPE DEFINITIONS ============

export interface Thirdparty {
  id?: number;
  ref?: string;
  ref_ext?: string;
  name?: string;
  name_alias?: string;
  entity?: number;
  date_creation?: string;
  date_modification?: string;
  status?: number;
  address?: string;
  zip?: string;
  town?: string;
  fk_department?: number;
  fk_region?: number;
  fk_country?: number;
  country_code?: string;
  phone?: string;
  phone_mobile?: string;
  fax?: string;
  email?: string;
  socialnetworks?: Record<string, string>;
  url?: string;
  barcode?: string;
  idprof1?: string;
  idprof2?: string;
  idprof3?: string;
  idprof4?: string;
  idprof5?: string;
  idprof6?: string;
  tva_intra?: string;
  tva_assuj?: number;
  localtax1_assuj?: number;
  localtax2_assuj?: number;
  localtax1_value?: number;
  localtax2_value?: number;
  capital?: number;
  currency_code?: string;
  fk_typent?: number;
  fk_effectif?: number;
  fk_forme_juridique?: number;
  fk_parent?: number;
  fk_user_creat?: number;
  fk_user_modif?: number;
  client?: number;
  fournisseur?: number;
  client_type?: number;
  default_lang?: string;
  canvas?: string;
  import_key?: string;
  barcode_type?: number;
  price_level?: number;
  outstanding_limit?: number;
  unpaid_limit?: number;
  order_order_to_bill?: number;
  supplier_order_order_to_bill?: number;
  suppliers_quoted?: number;
  suppliers_invoiced?: number;
  notes?: string;
}

export interface Contact {
  id?: number;
  ref?: string;
  lastname?: string;
  firstname?: string;
  civility?: string;
  address?: string;
  zip?: string;
  town?: string;
  fk_country?: number;
  country_code?: string;
  phone_pro?: string;
  phone_perso?: string;
  phone_mobile?: string;
  fax?: string;
  email?: string;
  socialnetworks?: Record<string, string>;
  photo?: string;
  javacalendar?: string;
  date_creation?: string;
  date_modification?: string;
  fk_user_creat?: number;
  fk_user_modif?: number;
  fk_soc?: number;
  fk_socpeople?: number;
  fk_contact_type?: number;
  fk_pays?: number;
  fk_civility?: number;
  bilto?: string;
  barcode?: string;
  porcent?: number;
  no_email?: number;
  defpexp?: number;
  label?: string;
  statut?: number;
}

export interface Proposal {
  id?: number;
  ref?: string;
  ref_ext?: string;
  ref_int?: string;
  ref_client?: string;
  fk_soc?: number;
  fk_projet?: number;
  fk_statut?: number;
  fk_user_author?: number;
  fk_user_valid?: number;
  fk_user_close?: number;
  date_creation?: string;
  date_modification?: string;
  date_validation?: string;
  date_close?: string;
  date_propal?: string;
  date_valid?: string;
  fin_validite?: string;
  remise_absolue?: number;
  remise_percent?: number;
  remise?: number;
  total_ht?: number;
  total_tva?: number;
  total_localtax1?: number;
  total_localtax2?: number;
  total_ttc?: number;
  revenuestamp?: number;
  invoice_state?: number;
  fk_mode_reglement?: number;
  fk_cond_reglement?: number;
  fk_delivery_address?: number;
  fk_shipping_method?: number;
  model_pdf?: string;
  last_main_doc?: string;
  fk_account?: number;
  note_public?: string;
  note_private?: string;
  subject?: string;
  lines?: ProposalLine[];
}

export interface ProposalLine {
  id?: number;
  fk_propal?: number;
  fk_parent_line?: number;
  fk_product?: number;
  label?: string;
  description?: string;
  vat_src_code?: string;
  tva_tx?: number;
  localtax1_tx?: number;
  localtax2_tx?: number;
  localtax1_type?: string;
  localtax2_type?: string;
  qty?: number;
  remise_percent?: number;
  remise?: number;
  price?: number;
  unitprice?: number;
  subprice?: number;
  total_ht?: number;
  total_tva?: number;
  total_localtax1?: number;
  total_localtax2?: number;
  total_ttc?: number;
  product_type?: number;
  date_start?: string;
  date_end?: string;
  info_bits?: number;
  buy_price_ht?: number;
  mp上班?: number;
  variant_id?: number;
  fk_unit?: number;
}

export interface Order {
  id?: number;
  ref?: string;
  ref_ext?: string;
  ref_client?: string;
  fk_soc?: number;
  fk_projet?: number;
  fk_statut?: number;
  fk_user_author?: number;
  fk_user_valid?: number;
  fk_user_close?: number;
  date_creation?: string;
  date_modification?: string;
  date_valid?: string;
  date_close?: string;
  date_order?: string;
  date_delivery?: string;
  remise_absolue?: number;
  remise_percent?: number;
  remise?: number;
  total_ht?: number;
  total_tva?: number;
  total_localtax1?: number;
  total_localtax2?: number;
  total_ttc?: number;
  revenuestamp?: number;
  invoice_state?: number;
  fk_mode_reglement?: number;
  fk_cond_reglement?: number;
  fk_delivery_address?: number;
  fk_shipping_method?: number;
  model_pdf?: string;
  last_main_doc?: string;
  fk_account?: number;
  note_public?: string;
  note_private?: string;
  lines?: OrderLine[];
}

export interface OrderLine {
  id?: number;
  fk_commandef?: number;
  fk_parent_line?: number;
  fk_product?: number;
  label?: string;
  description?: string;
  vat_src_code?: string;
  tva_tx?: number;
  localtax1_tx?: number;
  localtax2_tx?: number;
  localtax1_type?: string;
  localtax2_type?: string;
  qty?: number;
  remise_percent?: number;
  remise?: number;
  price?: number;
  unitprice?: number;
  subprice?: number;
  total_ht?: number;
  total_tva?: number;
  total_localtax1?: number;
  total_localtax2?: number;
  total_ttc?: number;
  product_type?: number;
  date_start?: string;
  date_end?: string;
  info_bits?: number;
  buy_price_ht?: number;
  fk_unit?: number;
}

export interface SupplierInvoice {
  id?: number;
  ref?: string;
  ref_ext?: string;
  ref_supplier?: string;
  fk_soc?: number;
  fk_projet?: number;
  fk_statut?: number;
  fk_user_author?: number;
  fk_user_valid?: number;
  fk_user_close?: number;
  date_creation?: string;
  date_modification?: string;
  date_valid?: string;
  date_close?: string;
  date_echeance?: string;
  datef?: string;
  total_ht?: number;
  total_tva?: number;
  total_localtax1?: number;
  total_localtax2?: number;
  total_ttc?: number;
  revenuestamp?: number;
  fk_account?: number;
  fk_mode_reglement?: number;
  fk_cond_reglement?: number;
  model_pdf?: string;
  last_main_doc?: string;
  note_public?: string;
  note_private?: string;
  lines?: SupplierInvoiceLine[];
}

export interface SupplierInvoiceLine {
  id?: number;
  fk_facture_fourn?: number;
  fk_parent_line?: number;
  fk_product?: number;
  ref?: string;
  label?: string;
  description?: string;
  vat_src_code?: string;
  tva_tx?: number;
  localtax1_tx?: number;
  localtax2_tx?: number;
  localtax1_type?: string;
  localtax2_type?: string;
  qty?: number;
  remise_percent?: number;
  remise?: number;
  price?: number;
  unitprice?: number;
  subprice?: number;
  total_ht?: number;
  total_tva?: number;
  total_localtax1?: number;
  total_localtax2?: number;
  total_ttc?: number;
  product_type?: number;
  date_start?: string;
  date_end?: string;
  fk_unit?: number;
}

export interface SupplierOrder {
  id?: number;
  ref?: string;
  ref_ext?: string;
  ref_supplier?: string;
  fk_soc?: number;
  fk_projet?: number;
  fk_statut?: number;
  fk_user_author?: number;
  fk_user_valid?: number;
  fk_user_close?: number;
  date_creation?: string;
  date_modification?: string;
  date_valid?: string;
  date_close?: string;
  date_livraison?: string;
  date_order?: string;
  total_ht?: number;
  total_tva?: number;
  total_localtax1?: number;
  total_localtax2?: number;
  total_ttc?: number;
  revenuestamp?: number;
  fk_mode_reglement?: number;
  fk_cond_reglement?: number;
  model_pdf?: string;
  last_main_doc?: string;
  note_public?: string;
  note_private?: string;
  lines?: SupplierOrderLine[];
}

export interface SupplierOrderLine {
  id?: number;
  fk_commande_fournisseur?: number;
  fk_parent_line?: number;
  fk_product?: number;
  ref?: string;
  label?: string;
  description?: string;
  vat_src_code?: string;
  tva_tx?: number;
  localtax1_tx?: number;
  localtax2_tx?: number;
  qty?: number;
  remise_percent?: number;
  remise?: number;
  price?: number;
  unitprice?: number;
  subprice?: number;
  total_ht?: number;
  total_tva?: number;
  total_localtax1?: number;
  total_localtax2?: number;
  total_ttc?: number;
  product_type?: number;
  date_start?: string;
  date_end?: string;
  fk_unit?: number;
  pa_ht?: number;
}

export interface Product {
  id?: number;
  ref?: string;
  ref_ext?: string;
  ref_supplier?: string;
  label?: string;
  description?: string;
  note_public?: string;
  note_private?: string;
  date_creation?: string;
  date_modification?: string;
  fk_product_type?: number;
  fk_unit?: number;
  price?: number;
  price_ttc?: number;
  price_min?: number;
  price_min_ttc?: number;
  tva_tx?: number;
  price_base_type?: string;
  cost_price?: number;
  pmp?: number;
  stock?: number;
  stock_reel?: number;
  stock_warehouse?: number;
  stock_theoretical?: number;
  fk_default_bom?: number;
  fk_default_workstation?: number;
  duration?: string;
  status?: number;
  status_buy?: number;
  status_to_sell?: number;
  imported?: number;
  fk_country?: number;
  fk_state?: number;
  barcode?: string;
  fk_barcode_type?: number;
  weight?: number;
  weight_units?: number;
  volume?: number;
  volume_units?: number;
  import_key?: string;
  url?: string;
  accountancy_code_sell?: string;
  accountancy_code_sell_intra?: string;
  accountancy_code_sell_export?: string;
  accountancy_code_buy?: string;
  accountancy_code_buy_intra?: string;
  accountancy_code_buy_export?: string;
  labelcot?: string;
  customcode?: string;
  country_of_manufacture?: string;
  mandatory_period?: string;
}

export interface ProductStock {
  id?: number;
  fk_product?: number;
  fk_entrepot?: number;
  warehouse_id?: number;
  stock?: number;
  stock_reel?: number;
  pmp?: number;
  price_buy?: number;
  selected?: number;
}

export interface Category {
  id?: number;
  ref?: string;
  label?: string;
  type?: number;
  description?: string;
  fk_soc?: number;
  visible?: number;
  import_key?: string;
  entity?: number;
}

export interface BankAccount {
  id?: number;
  ref?: string;
  label?: string;
  bank?: string;
  number?: string;
  account_number?: string;
  iban_prefix?: string;
  iban?: string;
  bic?: string;
  swift?: string;
  fk_terme?: number;
  fk_pays?: number;
  currency_code?: string;
  courant?: number;
  closed?: number;
  fk_accountancy_journal?: number;
  min_allowed?: number;
  min_desired?: number;
  url?: string;
  fk_user_creat?: number;
  fk_user_modif?: number;
  date_creation?: string;
  date_modification?: string;
  fk_type?: number;
}

export interface PaymentData {
  date_paye?: string;
  payment_id?: number;
  payment_amount?: number;
  payment_mode?: string;
  payment_num?: string;
  note_private?: string;
  note_public?: string;
}

export interface ReceiveOrderData {
  warehouse_id?: number;
  lines?: Array<{
    id?: number;
    qty?: number;
    price_buy?: number;
  }>;
}

// Export singleton instance
export const dolibarr = new DolibarrClient();
