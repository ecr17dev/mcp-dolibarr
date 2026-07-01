/**
 * Dolibarr MCP Server
 * Main entry point for the Model Context Protocol server
 * Optimizado con lazy loading
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).__dolibarrTools = null;
let toolsReady = false;

// Lazy load tools - se cargan solo cuando se necesitan
async function loadTools() {
  if (toolsReady) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (globalThis as any).__dolibarrTools;
  }

  const [{ setConfig, updateApiKey }, thirdpartyTools, contactTools, proposalTools, orderTools, supplierInvoiceTools, supplierOrderTools, productTools, reportTools] = await Promise.all([
    import('./config/index.js'),
    import('./tools/thirdparties.js'),
    import('./tools/contacts.js'),
    import('./tools/proposals.js'),
    import('./tools/orders.js'),
    import('./tools/supplier-invoices.js'),
    import('./tools/supplier-orders.js'),
    import('./tools/products.js'),
    import('./tools/reports.js'),
  ]);

  // Config tools inline
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const configTools: Record<string, any> = {
    configure_dolibarr: {
      description: 'Configure Dolibarr API connection with URL and API key',
      inputSchema: {
        type: 'object',
        properties: {
          base_url: { type: 'string', description: 'Dolibarr API base URL' },
          api_key: { type: 'string', description: 'Dolibarr API key/token' },
          entity: { type: 'string', description: 'Dolibarr entity ID (default: 0)' }
        },
        required: ['base_url', 'api_key']
      },
      async handle(params: unknown) {
        const args = params as { base_url: string; api_key: string; entity?: string };
        setConfig({ baseUrl: args.base_url, apiKey: args.api_key, entity: args.entity || '0' });
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, message: 'Dolibarr configured successfully' }, null, 2) }] };
      }
    },
    update_api_key: {
      description: 'Update the Dolibarr API key/token',
      inputSchema: { type: 'object', properties: { api_key: { type: 'string' } }, required: ['api_key'] },
      async handle(params: unknown) {
        const args = params as { api_key: string };
        updateApiKey(args.api_key);
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, message: 'API key updated' }, null, 2) }] };
      }
    },
    test_connection: {
      description: 'Test the Dolibarr API connection',
      inputSchema: { type: 'object', properties: {} },
      async handle() {
        const { getConfig } = await import('./config/index.js');
        try {
          const config = getConfig();
          const response = await fetch(`${config.baseUrl}/login`, { headers: { 'DOLAPIKEY': config.apiKey, 'Content-Type': 'application/json' } });
          return { content: [{ type: 'text', text: JSON.stringify({ success: response.ok, message: response.ok ? 'Connected' : 'Failed' }, null, 2) }] };
        } catch (error) {
          return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: String(error) }, null, 2) }] };
        }
      }
    }
  };

  const allTools = {
    ...configTools,
    ...thirdpartyTools,
    ...contactTools,
    ...proposalTools,
    ...orderTools,
    ...supplierInvoiceTools,
    ...supplierOrderTools,
    ...productTools,
    ...reportTools,
  };

  (globalThis as Record<string, unknown>).__dolibarrTools = allTools;
  toolsReady = true;

  return allTools;
}

// ============ SERVER SETUP ============

async function main() {
  console.error('Starting Dolibarr MCP Server (lazy loading)...');

  // Dynamic imports para el SDK de MCP
  const [{ Server }, { StdioServerTransport }, { ListToolsRequestSchema, CallToolRequestSchema, ListResourcesRequestSchema, ListPromptsRequestSchema }] = await Promise.all([
    import('@modelcontextprotocol/sdk/server/index.js'),
    import('@modelcontextprotocol/sdk/server/stdio.js'),
    import('@modelcontextprotocol/sdk/types.js'),
  ]);

  const { setConfig } = await import('./config/index.js');

  const server = new Server(
    { name: 'dolibarr-mcp-server', version: '1.0.0' },
    { capabilities: { tools: {}, resources: {}, prompts: {} } }
  );

  // Request handlers
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = await loadTools() as Record<string, { description: string; inputSchema: unknown }>;
    return { tools: Object.entries(tools).map(([name, tool]) => ({ name, description: tool.description, inputSchema: tool.inputSchema })) };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const allTools = await loadTools();
    const tool = allTools[name];

    if (!tool) {
      return { content: [{ type: 'text', text: JSON.stringify({ error: `Tool '${name}' not found` }, null, 2) }], isError: true };
    }

    try {
      let parsedArgs = args || {};
      if (typeof args === 'string') parsedArgs = JSON.parse(args);
      return await tool.handle(parsedArgs);
    } catch (error) {
      return { content: [{ type: 'text', text: JSON.stringify({ error: String(error) }, null, 2) }], isError: true };
    }
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      { uri: 'dolibarr://config', name: 'Configuration', description: 'Dolibarr config', mimeType: 'application/json' },
      { uri: 'dolibarr://schemas/thirdparty', name: 'Thirdparty Schema', description: 'Thirdparty data', mimeType: 'application/json' },
      { uri: 'dolibarr://schemas/proposal', name: 'Proposal Schema', description: 'Proposal data', mimeType: 'application/json' },
      { uri: 'dolibarr://schemas/order', name: 'Order Schema', description: 'Order data', mimeType: 'application/json' },
      { uri: 'dolibarr://schemas/product', name: 'Product Schema', description: 'Product data', mimeType: 'application/json' },
    ]
  }));

  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: [
      { name: 'create_thirdparty_from_contact', description: 'Create third party from contact info', arguments: [{ name: 'contact_data', description: 'Contact info', required: true }] },
      { name: 'generate_proposal_summary', description: 'Summarize a proposal', arguments: [{ name: 'proposal_id', description: 'Proposal ID', required: true }] },
    ]
  }));

  // Config from environment
  const envApiKey = process.env.DOLIBARR_API_KEY;
  const envUrl = process.env.DOLIBARR_URL;

  if (envApiKey && envUrl) {
    setConfig({ baseUrl: envUrl, apiKey: envApiKey, entity: process.env.DOLIBARR_ENTITY || '0' });
    console.error(`Configured: ${envUrl}`);
  } else if (envApiKey) {
    setConfig({ baseUrl: 'https://bluesmile.platform.cl/api/index.php', apiKey: envApiKey, entity: '0' });
    console.error('Configured with default URL');
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Dolibarr MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
