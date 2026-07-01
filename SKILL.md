# Dolibarr MCP - AI Expert Guide

> **Documento de referencia para agentes AI que usan el servidor MCP de Dolibarr**

## Identificación del Sistema

- **Sistema**: Dolibarr ERP/CRM
- **API**: REST API Dolibarr
- **MCP Server**: `mcp-dolibarr`
- **URL Base**: `https://bluesmile.platform.cl/api/index.php`

## Contexto del Usuario

Empresa chilena que usa Dolibarr para gestión de:
- Clientes y proveedores
- Cotizaciones y pedidos
- Compras y facturas de proveedor
- Productos y servicios

**Moneda**: CLP (Pesos Chilenos)
**IVA**: 19%

## Herramientas Principales

### Configuración

```json
// Primero: configurar conexión
configure_dolibarr({
  base_url: "https://bluesmile.platform.cl/api/index.php",
  api_key: "e2c3ac317dc4c8a1227a88fbdce1166c7b567d74"
})

// Probar conexión
test_connection()
```

### Terceros (Clientes/Proveedores)

| Herramienta | Uso |
|-------------|-----|
| `list_thirdparties` | Listar clientes/proveedores |
| `get_thirdparty(id)` | Detalle de tercero |
| `create_thirdparty` | Crear cliente/proveedor |
| `search_thirdparties(query)` | Buscar por nombre |

### Propuestas/Cotizaciones

| Herramienta | Uso |
|-------------|-----|
| `list_proposals` | Listar cotizaciones |
| `get_proposal(id)` | Detalle de cotización |
| `create_proposal` | Crear cotización |
| `validate_proposal(id)` | Validar cotización |
| `proposal_to_order` | Convertir a pedido |

### Pedidos

| Herramienta | Uso |
|-------------|-----|
| `list_orders` | Listar pedidos cliente |
| `get_order(id)` | Detalle de pedido |
| `create_order` | Crear pedido |
| `validate_order(id)` | Validar pedido |
| `list_supplier_orders` | Pedidos a proveedores |
| `create_supplier_order` | Crear pedido proveedor |

### Productos

| Herramienta | Uso |
|-------------|-----|
| `list_products` | Listar productos |
| `get_product(id)` | Detalle producto |
| `create_product` | Crear producto |
| `search_products(query)` | Buscar producto |

---

## Guía de Uso para IA

### 1. Flujo Típico: Crear Cotización

```
PASO 1: Buscar o crear cliente
→ search_thirdparties("nombre cliente")
→ create_thirdparty({ name: "...", client: 1 })

PASO 2: Crear cotización con líneas
→ create_proposal({
    fk_soc: <id_cliente>,
    subject: "Cotización servicios",
    lines: [
      {
        product_type: 1,  // servicio
        label: "Consultoría",
        desc: "8 horas",
        qty: 8,
        price: 150000,
        tva_tx: 19
      }
    ]
  })

PASO 3: Validar si el cliente acepta
→ validate_proposal({ id: <id_cotizacion> })
```

### 2. Líneas Libres vs Productos

**Línea libre (sin inventario)**:
```json
{
  product_type: 1,
  label: "Nombre del servicio",
  desc: "Descripción detallada",
  qty: 1,
  price: 100000,
  tva_tx: 19
}
```

**Línea con producto (inventariado)**:
```json
{
  fk_product: 5,
  qty: 2,
  remise_percent: 10
}
```

### 3. Pedidos a Proveedores

**Importante**: Usar `pa_ht` para precio de compra.

```json
{
  fk_soc: <id_proveedor>,
  ref_supplier: "PO-2025-001",
  lines: [
    {
      fk_product: 1,
      qty: 10,
      pa_ht: 450000,
      tva_tx: 19
    },
    {
      product_type: 1,
      label: "Flete",
      desc: "Costo flete internacional",
      qty: 1,
      pa_ht: 250000,
      tva_tx: 19
    }
  ]
}
```

### 4. Crear Producto

```json
{
  ref: "SKU-001",
  label: "Producto ejemplo",
  description: "Descripción del producto",
  price: 59990,
  cost_price: 45000,
  tva_tx: 19,
  type: 0,
  stock_reel: 100
}
```

---

## Conversiones Automáticas

El MCP convierte automáticamente:

| Input | Output (Dolibarr) |
|-------|-------------------|
| `fk_soc` | `socid` |
| `price` | `subprice` |
| `description` | `desc` |
| Sin `product_type` | `0` (producto) |
| `product_type: 1` | servicio |

---

## Campos Requeridos por Entidad

### Tercero
- `name` (razón social)

### Propuesta/Pedido
- `fk_soc` (ID cliente/proveedor)
- `date` (YYYY-MM-DD, requerido)

### Línea
- Para **servicios**: `product_type: 1`, `label`, `price`
- Para **productos**: `fk_product`, `qty`

---

## Códigos de Estado

### Propuestas
- 0 = Borrador
- 1 = Abierta
- 2 = Firmada
- 3 = No firmada
- 4 = Cancelada

### Pedidos
- 0 = Borrador
- 1 = Validado
- 2 = En envío
- 3 = Entregado
- -1 = Cancelado

---

## Ejemplos de Respuestas

### Crear Cotización Exitoso
```json
{
  "success": true,
  "data": 25
}
```
Retorna el ID de la cotización creada.

### Error Común
```json
{
  "success": false,
  "error": {
    "code": 400,
    "message": "Bad Request: socid field missing"
  }
}
```
**Solución**: Agregar `date` al payload.

---

## Validación de Datos

El MCP valida inputs con Zod. Si un campo falla:
1. Verificar tipos (string, number)
2. Verificar campos requeridos
3. Usar nombres exactos de Dolibarr (`socid`, `subprice`, `desc`)

---

## Tips para Agentes AI

1. **Siempre buscar primero** antes de crear
   ```
   search_thirdparties("nombre") → create_thirdparty
   search_products("código") → create_product
   ```

2. **Usar IDs conhecidos** cuando existan
   - Proveedor: TECNOGLOBAL (ID=4)
   - Cliente de prueba (ID=3)

3. **Confirmar antes de crear**
   - Mostrar resumen antes de crear entidades
   - Verificar precios en CLP

4. **Manejar errores gracefulmente**
   - Capturar `success: false`
   - Explicar el error al usuario
   - Sugerir corrección

5. **Líneas libres son servicios**
   - Sin `fk_product` = servicio
   - `product_type: 1` explícito

---

## Referencias

- [Dolibarr API Docs](https://doc.dolibarr.org/)
- [MCP Protocol](https://modelcontextprotocol.io/)
- Repositorio: `ECR17/mcp-dolibarr`
