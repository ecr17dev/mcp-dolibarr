/**
 * Dolibarr API Configuration
 * Loads settings from environment or config file
 */

export interface DolibarrConfig {
  baseUrl: string;
  apiKey: string;
  entity?: string;
}

let config: DolibarrConfig | null = null;

export function setConfig(newConfig: DolibarrConfig): void {
  config = newConfig;
}

export function getConfig(): DolibarrConfig {
  if (config) {
    return config;
  }

  // Try to load from environment
  const baseUrl = process.env.DOLIBARR_URL || 'https://bluesmile.platform.cl/api/index.php';
  const apiKey = process.env.DOLIBARR_API_KEY || '';
  const entity = process.env.DOLIBARR_ENTITY;

  if (!apiKey) {
    throw new Error(
      'Dolibarr API key not configured. Please set DOLIBARR_API_KEY environment variable ' +
      'or call setConfig() with your credentials.'
    );
  }

  config = {
    baseUrl,
    apiKey,
    entity: entity || '0'
  };

  return config;
}

export function updateApiKey(apiKey: string): void {
  const currentConfig = config || getConfig();
  config = { ...currentConfig, apiKey };
}
