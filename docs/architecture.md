# Arquitectura verificada de BoskePOS

Corte: 16 de septiembre de 2026, revisión local v0.2.1. Estos diagramas describen el código; no representan un despliegue productivo ni un proceso BPMN validado.

## Componentes

BoskePOS es un monolito modular con un cliente React separado. Django concentra autorización, validación y transacciones. PostgreSQL es la base usada en las pruebas completas y de concurrencia; SQLite se usa para la demo aislada y verificaciones complementarias.

```mermaid
flowchart LR
    Usuario[Administrador vendedor o inventario] --> UI[React 19 y Vite 8]
    UI -->|HTTP JSON y JWT| API[Django 6 y DRF]
    API --> Roles[accounts y permisos por acción]
    API --> Catalogo[inventory customers suppliers]
    API --> Operacion[sales y purchases]
    API --> Resumen[dashboard y system_settings]
    Operacion --> Servicios[Servicios transaccionales]
    Servicios --> DB[(PostgreSQL)]
    Catalogo --> DB
    Resumen --> DB
    Roles --> DB
    Admin[Django Admin] --> API
```

`reports` aún no implementa reportería; los indicadores actuales viven en `dashboard`. `system_settings` administra datos del negocio y una proyección de solo lectura para comprobantes. Django Admin permite consultar transacciones; ya no permite mutarlas saltándose los servicios.

## Modelo de datos resumido

Se incluyen campos relevantes, no el esquema completo. El código y las migraciones son la fuente del esquema completo.

```mermaid
erDiagram
    User ||--o{ Sale : registra
    User ||--o{ Purchase : registra
    User ||--o{ StockMovement : responsable
    Category o|--o{ Product : clasifica
    Customer o|--o{ Sale : identifica
    Supplier ||--o{ Purchase : provee
    Sale ||--|{ SaleItem : contiene
    Purchase ||--|{ PurchaseItem : contiene
    Product ||--o{ SaleItem : vendido
    Product ||--o{ PurchaseItem : recibido
    Product ||--o{ StockMovement : cambia
    User {
        bigint id PK
        string email UK
    }
    Product {
        bigint id PK
        string sku UK
        string barcode UK
        integer stock
        decimal cost_price
        decimal sale_price
    }
    Sale {
        bigint id PK
        string status
        decimal total
        datetime completed_at
    }
    SaleItem {
        bigint id PK
        string product_name
        string product_sku
        integer quantity
        decimal unit_price
        decimal line_total
    }
    Purchase {
        bigint id PK
        string status
        decimal total
        datetime confirmed_at
    }
    PurchaseItem {
        bigint id PK
        integer quantity
        decimal unit_cost
        decimal line_total
    }
    StockMovement {
        bigint id PK
        string movement_type
        integer quantity
        integer stock_before
        integer stock_after
        string reference
    }
    BusinessSettings {
        bigint id PK
        string business_name
        string currency
        decimal default_tax_rate
    }
```

Las instantáneas de nombre, SKU y precio conservan el detalle vendido aunque cambie el catálogo. No existe aún costo histórico de salida suficiente para reconstruir márgenes ni snapshot de identidad comercial para reimpresiones. Las cardinalidades de líneas expresan la operación válida de negocio, no una restricción de mínimo de filas impuesta por la base.

## Integridad de una venta

```mermaid
sequenceDiagram
    actor Cajero
    participant UI as POS
    participant API as API y permisos
    participant S as Servicio de venta
    participant DB as PostgreSQL
    Cajero->>UI: Confirma carrito cotizado
    UI->>API: POST de venta
    API->>S: Datos validados y usuario autorizado
    S->>DB: BEGIN y bloqueo de productos
    S->>S: Revalidar stock e importes
    alt Datos válidos
        S->>DB: Venta líneas stock y movimientos
        S->>DB: COMMIT
        API-->>UI: Venta registrada
    else Stock o importes inválidos
        S->>DB: ROLLBACK
        API-->>UI: Error de validación
    end
```

El bloqueo evita que dos cajeros consuman la última unidad en los escenarios probados. No evita repetir una operación válida tras perder su respuesta; se propone idempotencia en v0.3. La cotización no reserva stock. Las ventas pendientes tampoco lo descuentan.

## Despliegue pendiente de validación

La demo usa Vite y `runserver` en localhost; no corresponde a un servidor productivo. Para staging se propone HTTPS en proxy inverso, frontend compilado, proceso Django supervisado, PostgreSQL con respaldos externos, monitoreo del health check y caché compartida según la estrategia de límites. Deben definirse dominio, secretos, imágenes, retención de respaldos y recuperación. Esta propuesta necesita ensayos y costos antes de presentarse como infraestructura implementada.

Referencias: [Django select_for_update](https://docs.djangoproject.com/en/6.0/ref/models/querysets/#select-for-update) y [lista de despliegue Django](https://docs.djangoproject.com/en/6.0/howto/deployment/checklist/).
