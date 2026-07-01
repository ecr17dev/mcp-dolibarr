# MCP Dolibarr - Model Context Protocol Server

> **Servidor MCP para integrar agentes AI con Dolibarr ERP**

[![npm version](https://badge.fury.io/js/mcp-dolibarr.svg)](https://badge.fury.io/js/mcp-dolibarr)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Tabla de Contenidos

- [Descripción](#descripción)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Herramientas Disponibles](#herramientas-disponibles)
- [Esquemas de Datos](#esquemas-de-datos)
- [Ejemplos de Uso](#ejemplos-de-uso)
- [API de Dolibarr](#api-de-dolibarr)
- [Notas Técnicas](#notas-técnicas)
- [Resolución de Problemas](#resolución-de-problemas)

---

## Descripción

MCP Dolibarr es un servidor Model Context Protocol (MCP) que permite a agentes AI interactuar con el sistema ERP Dolibarr. Proporciona herramientas CRUD completas para gestionar:

- **Terceros** (clientes y proveedores)
- **Contactos y direcciones**
- **Productos y servicios**
- **Propuestas comerciales** (cotizaciones)
- **Pedidos de cliente**
- **Pedidos a proveedores**
- **Facturas de proveedor**
- **Reportes y dashboards**

### Características Principales

- **60+ herramientas** disponibles
- **Tipos de líneas flexibles**: productos inventariados o líneas libres
- **Soporte multi-moneda**: CLP, USD, EUR
- **Gestión de precios**: precio venta (subprice) y precio compra (pa_ht)
- **Reportes**: dashboard, ventas, inventario, terceros

---

## Instalación

### Requisitos Previos

- Node.js 20+ LTS
- [pnpm](https://pnpm.io/installation) (gestor de paquetes recomendado)
- Acceso a una instancia de Dolibarr con API REST habilitada

### Instalación con pnpm (recomendado)

pnpm es más rápido y usa menos espacio en disco gracias a su almacenamiento content-addressable.

```bash
# Instalar pnpm si no lo tienes
npm install -g pnpm

# Clonar o entrar al proyecto
cd mcp-dolibarr

# Instalar dependencias
pnpm install

# Construir
pnpm build
```

### Instalación con npm (alternativo)

```bash
npm install
npm run build
```

### Estructura de Dependencias

| Paquete | Tipo | Descripción |
|---------|------|-------------|
| `@modelcontextprotocol/sdk` | producción | Core SDK de MCP |
| `zod` | producción | Validación de esquemas |
| `typescript` | dev | Compilación TypeScript |
| `tsx` | dev | Ejecución en desarrollo |
| `esbuild` | dev | Bundling para producción |

**Tamaños:**
- `node_modules/`: ~69MB
- `dist/bundle.js`: ~360KB (bundle completo con SDK)
- `dist/index.js`: ~7KB (requiere node_modules)

### Scripts Disponibles

```bash
# Development
pnpm dev              # Watch mode con tsx
pnpm typecheck        # Verificar tipos

# Production
pnpm build            # Compilar TypeScript → dist/index.js
pnpm build:bundle     # Bundlar con esbuild → dist/bundle.js
pnpm build:all        # Ambos anteriores

# Ejecutar
pnpm start            # Con node_modules (desarrollo)
pnpm start:bundle     # Bundle standalone (producción)
```

### Bundle Standalone

Para ejecutar sin dependencias de node_modules:

```bash
pnpm build:bundle
pnpm start:bundle
```

El bundle incluye todo lo necesario (~360KB).

```bash
npm install
npm run build
```

### Configuración en Claude Code / Cursor

Agregar al archivo de configuración del cliente MCP:

```json
{
  "mcpServers": {
    "dolibarr": {
      "command": "npx",
      "args": ["-y", "mcp-dolibarr"],
      "env": {
        "DOLIBARR_URL": "https://tu-dolibarr.com/api/index.php",
        "DOLIBARR_API_KEY": "tu-api-key"
      }
    }
  }
}
```

---

## Configuración

### Variables de Entorno

| Variable | Descripción | Requerido | Valor por defecto |
|----------|-------------|-----------|-------------------|
| `DOLIBARR_URL` | URL base de la API Dolibarr | Sí | - |
| `DOLIBARR_API_KEY` | Token de API de Dolibarr | Sí | - |
| `DOLIBARR_ENTITY` | Entity ID (multiempresa) | No | `0` |

### Obtener API Key en Dolibarr

1. Iniciar sesión en Dolibarr
2. Ir a **Inicio → Configuración → Configuración de seguridad**
3. Buscar **Clave API REST personal**
4. Generar o copiar una clave existente

### Habilitar API REST en Dolibarr

1. Ir a **Inicio → Configuración → Configuración del sistema**
2. Buscar **API Web / Servicios Web**
3. Habilitar **Enable the REST API**

---

## Herramientas Disponibles

### Terceros (Third Parties)

| Herramienta | Descripción |
|-------------|-------------|
| `list_thirdparties` | Listar terceros con filtros |
| `get_thirdparty` | Obtener detalle de tercero |
| `create_thirdparty` | Crear cliente/proveedor |
| `update_thirdparty` | Actualizar tercero |
| `search_thirdparties` | Buscar por nombre/código |
| `get_thirdparty_sales` | Obtener ventas de tercero |
| `get_thirdparty_buyers` | Obtener compras de tercero |

### Contactos y Direcciones

| Herramienta | Descripción |
|-------------|-------------|
| `list_contacts` | Listar contactos |
| `get_contact` | Obtener detalle de contacto |
| `create_contact` | Crear contacto |
| `update_contact` | Actualizar contacto |
| `list_addresses` | Listar direcciones |
| `get_address` | Obtener dirección |

### Productos

| Herramienta | Descripción |
|-------------|-------------|
| `list_products` | Listar productos/servicios |
| `get_product` | Obtener detalle de producto |
| `create_product` | Crear producto |
| `update_product` | Actualizar producto |
| `search_products` | Buscar productos |
| `get_product_stock` | Consultar stock |

### Propuestas Comerciales (Cotizaciones)

| Herramienta | Descripción |
|-------------|-------------|
| `list_proposals` | Listar propuestas |
| `get_proposal` | Obtener propuesta |
| `create_proposal` | Crear propuesta |
| `update_proposal` | Actualizar propuesta |
| `delete_proposal` | Eliminar borrador |
| `validate_proposal` | Validar propuesta |
| `close_proposal` | Cerrar propuesta |
| `proposal_to_order` | Convertir a pedido |

### Pedidos de Cliente

| Herramienta | Descripción |
|-------------|-------------|
| `list_orders` | Listar pedidos |
| `get_order` | Obtener pedido |
| `create_order` | Crear pedido |
| `update_order` | Actualizar pedido |
| `delete_order` | Eliminar borrador |
| `validate_order` | Validar pedido |
| `cancel_order` | Cancelar pedido |
| `ship_order` | Enviar pedido |
| `order_to_invoice` | Facturar pedido |

### Pedidos a Proveedores

| Herramienta | Descripción |
|-------------|-------------|
| `list_supplier_orders` | Listar pedidos proveedor |
| `get_supplier_order` | Obtener pedido |
| `create_supplier_order` | Crear pedido |
| `update_supplier_order` | Actualizar pedido |
| `delete_supplier_order` | Eliminar |
| `validate_supplier_order` | Validar |
| `cancel_supplier_order` | Cancelar |

### Facturas de Proveedor

| Herramienta | Descripción |
|-------------|-------------|
| `list_supplier_invoices` | Listar facturas |
| `get_supplier_invoice` | Obtener factura |
| `create_supplier_invoice` | Crear factura |
| `update_supplier_invoice` | Actualizar |
| `validate_supplier_invoice` | Validar |
| `pay_supplier_invoice` | Registrar pago |

### Reportes

| Herramienta | Descripción |
|-------------|-------------|
| `get_dashboard` | Dashboard general |
| `get_sales_report` | Reporte de ventas |
| `get_inventory_report` | Reporte de inventario |
| `get_thirdparties_report` | Reporte de terceros |

---

## Esquemas de Datos

### Crear Tercero

```typescript
{
  name: string;              // Razón social
  client?: number;           // 1 = cliente
  supplier?: number;         // 1 = proveedor
  code_client?: string;     // Código cliente
  code_fournisseur?: string; // Código proveedor
  address?: string;
  zip?: string;
  town?: string;
  fk_pays?: string;          // Código país (e.g., "CL")
  phone?: string;
  email?: string;
  vat_reverse?: number;     // 1 = reversa de IVA
  tva_intra?: string;       // RUT/NIT
}
```

### Crear Producto

```typescript
{
  ref: string;               // Referencia
  label: string;            // Nombre
  description?: string;
  price?: number;            // Precio venta
  price_min_ttc?: number;    // Precio mínimo TTC
  cost_price?: number;       // Precio costo
  tva_tx?: number;           // Tasa IVA %
  type?: number;             // 0=producto, 1=servicio
  status?: number;           // 0=borrador, 1=activo
  stock_reel?: number;       // Stock inicial
  accountancy_code_buy?: string; // Cuenta contable compra
  accountancy_code_sell?: string;// Cuenta contable venta
}
```

### Crear Propuesta/Cotización

```typescript
{
  fk_soc: number;            // ID del cliente
  ref_client?: string;      // Referencia del cliente
  date?: string;            // Fecha (YYYY-MM-DD)
  fin_validite?: string;    // Validez hasta (YYYY-MM-DD)
  subject?: string;         // Asunto
  fk_cond_reglement?: number; // Condición pago
  fk_mode_reglement?: number; // Forma pago
  note_public?: string;
  note_private?: string;
  lines?: ProposalLine[];
}

interface ProposalLine {
  fk_product?: number;      // ID producto (opcional)
  label?: string;           // Nombre línea
  desc?: string;            // Descripción (Dolibarr usa "desc")
  qty?: number;             // Cantidad
  subprice?: number;         // Precio unitario HT
  price?: number;           // Alias de subprice
  tva_tx?: number;           // IVA %
  remise_percent?: number;   // Descuento %
  product_type?: number;     // 0=producto, 1=servicio
}
```

### Crear Pedido de Cliente

```typescript
{
  fk_soc: number;            // ID del cliente
  ref_client?: string;
  date?: string;
  date_delivery?: string;
  fk_cond_reglement?: number;
  fk_mode_reglement?: number;
  fk_shipping_method?: number;
  note_public?: string;
  note_private?: string;
  lines?: OrderLine[];
}
```

### Crear Pedido a Proveedor

```typescript
{
  fk_soc: number;            // ID del proveedor
  ref_supplier?: string;    // Ref. del proveedor
  date?: string;
  fk_cond_reglement?: number;
  fk_mode_reglement?: number;
  note_public?: string;
  lines?: SupplierOrderLine[];
}

interface SupplierOrderLine {
  fk_product?: number;
  ref?: string;
  label?: string;
  desc?: string;
  qty?: number;
  pa_ht?: number;           // Precio compra HT (importante!)
  subprice?: number;        // Precio venta HT
  price?: number;           // Alias de subprice
  tva_tx?: number;
  remise_percent?: number;
  product_type?: number;
}
```

---

## Ejemplos de Uso

### 1. Crear Cliente

```typescript
// Crear nuevo cliente
const cliente = await tools.create_thirdparty({
  name: "Empresa ABC SpA",
  client: 1,
  code_client: "CLI-001",
  address: "Av. Principal 123",
  zip: "7500000",
  town: "Santiago",
  fk_pays: "CL",
  phone: "+56912345678",
  email: "contacto@empresa.cl",
  tva_intra: "76123456-7"
});
// Retorna: { success: true, data: 5 }
```

### 2. Crear Producto

```typescript
// Crear producto con precio de compra y venta
const producto = await tools.create_product({
  ref: "PROD-001",
  label: "Notebook HP ProBook",
  description: "Notebook HP ProBook 450 G10",
  price: 599990,             // Precio venta CLP
  cost_price: 450000,       // Precio compra
  tva_tx: 19,
  type: 0,                  // Producto
  stock_reel: 10,
  accountancy_code_sell: "701001",
  accountancy_code_buy: "601001"
});
```

### 3. Crear Cotización con Líneas Libres

```typescript
// Cotización sin productos inventariados (líneas libres)
const cotizacion = await tools.create_proposal({
  fk_soc: 3,                // Cliente
  date: "2025-07-15",
  fin_validite: "2025-08-15",
  subject: "Propuesta Servicios de Consultoría",
  lines: [
    {
      product_type: 1,      // Servicio
      label: "Consultoría Técnica",
      desc: "8 horas de consultoría técnica especializada",
      qty: 8,
      price: 150000,        // $150.000 CLP por hora
      tva_tx: 19
    },
    {
      product_type: 1,
      label: "Desarrollo de Módulo",
      desc: "Desarrollo de módulo personalizado",
      qty: 1,
      price: 2500000,       // $2.500.000 CLP
      tva_tx: 19
    }
  ]
});
// Total: 8×150.000 + 2.500.000 = $3.700.000 + IVA
```

### 4. Crear Cotización con Producto Inventariado

```typescript
// Cotización usando productos del catálogo
const cotizacion = await tools.create_proposal({
  fk_soc: 3,
  lines: [
    {
      fk_product: 1,         // Producto existente
      qty: 5,
      remise_percent: 10    // 10% descuento
    },
    {
      product_type: 1,
      label: "Instalación",
      desc: "Servicio de instalación incluido",
      qty: 1,
      price: 150000,
      tva_tx: 19
    }
  ]
});
```

### 5. Crear Pedido a Proveedor con Precios de Compra

```typescript
// Crear pedido a proveedor con precios de compra
const pedido = await tools.create_supplier_order({
  fk_soc: 4,                // Proveedor
  ref_supplier: "PO-2025-001",
  lines: [
    {
      fk_product: 1,        // Producto
      qty: 10,
      pa_ht: 450000,        // Precio compra HT
      tva_tx: 19
    },
    {
      product_type: 1,
      label: "Flete Internacional",
      desc: "Costo de flete desde USA",
      qty: 1,
      pa_ht: 250000,        // Costo flete
      tva_tx: 19
    }
  ]
});
```

### 6. Convertir Propuesta a Pedido

```typescript
// Validar propuesta
await tools.validate_proposal({ id: 21 });

// Convertir a pedido
const pedido = await tools.proposal_to_order({
  proposal_id: 21,
  create_invoice?: false
});
```

### 7. Obtener Reporte de Ventas

```typescript
// Reporte de ventas por período
const ventas = await tools.get_sales_report({
  date_start: "2025-01-01",
  date_end: "2025-12-31",
  mode: "customer"  // o "supplier"
});
```

---

## API de Dolibarr

### Endpoints Principales

| Entidad | Endpoint | Métodos |
|---------|----------|---------|
| Terceros | `/thirdparties` | GET, POST, PUT, DELETE |
| Contactos | `/contacts` | GET, POST, PUT, DELETE |
| Direcciones | `/addresses` | GET, POST |
| Productos | `/products` | GET, POST, PUT, DELETE |
| Propuestas | `/proposals` | GET, POST, PUT, DELETE |
| Pedidos | `/orders` | GET, POST, PUT, DELETE |
| Pedidos Prov. | `/supplierorders` | GET, POST, PUT, DELETE |
| Facturas Prov. | `/supplierinvoices` | GET, POST, PUT, DELETE |

### Campos Especiales de Dolibarr

| Campo API | Descripción |
|-----------|-------------|
| `socid` | ID del tercero (cliente/proveedor) - Dolibarr usa `socid`, no `fk_soc` |
| `subprice` | Precio unitario HT de una línea |
| `pa_ht` | Precio de compra HT (solo pedidos/facturas proveedor) |
| `desc` | Descripción de línea (Dolibarr usa `desc`, no `description`) |
| `product_type` | 0=producto físico, 1=servicio |
| `tva_tx` | Tasa de IVA (%) |

---

## Notas Técnicas

### Conversiones Automáticas

El cliente MCP realiza conversiones automáticas:

```typescript
// Input del usuario
{ fk_soc: 3, price: 100 }

// Lo que Dolibarr recibe
{ socid: 3, subprice: 100 }
```

| Input | Output |
|-------|--------|
| `fk_soc` | `socid` |
| `price` | `subprice` |
| `description` | `desc` |
| Sin `product_type` | `0` (producto) |

### Estados de Documentos

**Propuestas:**
- 0 = Borrador
- 1 = Abierta
- 2 = Firmada
- 3 = No firmada
- 4 = Cancelada

**Pedidos:**
- 0 = Borrador
- 1 = Validado
- 2 = En envío
- 3 = Entregado
- -1 = Cancelado

**Facturas:**
- 0 = Borrador
- 1 = Validada
- 2 = Pagada
- 3 = Cancelada

### Formato de Fechas

Usar formato ISO: `YYYY-MM-DD`

```typescript
// Correcto
date: "2025-07-15"

// Incorrecto
date: "15-07-2025"
date: "July 15, 2025"
```

### Moneda y Precios

- Todos los precios van en la moneda base de Dolibarr (CLP por defecto)
- Los precios son **sin IVA** (HT)
- El IVA se calcula automáticamente según `tva_tx`

---

## Resolución de Problemas

### Error: "socid field missing"

Dolibarr requiere `socid` (no `fk_soc`) para identificar el tercero. El cliente MCP convierte automáticamente.

### Error: "Date of proposal is required"

Dolibarr requiere el campo `date`. Agregar al crear propuestas:

```typescript
{
  fk_soc: 3,
  date: "2025-07-15"  // Requerido!
}
```

### Error: "Price is zero" o totales en 0

Verificar que se usa `subprice` (no `price`) para el precio unitario. El cliente MCP convierte `price` → `subprice` automáticamente.

### Error: "API key not configured"

Configurar la variable de entorno:

```bash
export DOLIBARR_API_KEY="tu-api-key"
export DOLIBARR_URL="https://tu-dolibarr.com/api/index.php"
```

### Error 401 Unauthorized

1. Verificar que la API key es correcta
2. Confirmar que REST API está habilitada en Dolibarr
3. Verificar que la URL termina en `/api/index.php`

### Precios de Compra en Blanco

Para pedidos/facturas de proveedor, usar `pa_ht` para el precio de compra:

```typescript
{
  pa_ht: 450000,  // Precio compra
  subprice: 599990 // Precio venta (opcional)
}
```

---

## Licencia

MIT License - ver archivo [LICENSE](LICENSE)

## Changelog

### v1.0.0
- Soporte completo CRUD para todas las entidades
- 60+ herramientas disponibles
- Helper para líneas libres (sin producto)
- Conversiones automáticas de campos
- Reportes integrados

---

## Soporte

Para reportar issues o solicitar features:
- GitHub Issues: [ enlace ]
- Email: soporte@ejemplo.cl
