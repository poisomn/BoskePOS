import { FiPlus } from 'react-icons/fi'
import Mascot from '../../components/Mascot'
import { formatMoney } from '../../utils/formatters'

export function ProductResults({ error, isProcessing, onAddProduct, results, search, selectedIndex }) {
  const mascotState = error ? 'error' : isProcessing ? 'cargando' : undefined
  const message = error
    ? 'Hay un problema que necesita tu atención.'
    : isProcessing ? 'Procesando…' : search ? 'No se encontraron productos.' : 'Tu próxima venta comienza aquí.'
  const guidance = error
    ? 'Revisa el aviso de error y corrige el producto o la cantidad para continuar.'
    : search ? 'Prueba con otro nombre, SKU o código.' : 'Escribe o escanea para agregar productos.'
  return (
    <section className="surface min-h-0 flex-1 overflow-hidden">
      <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <h2 className="section-title">Resultados</h2>
          <p className="section-note">
            {error ? 'Revisa el aviso de error para continuar.' : isProcessing ? 'Procesando…' : 'Selecciona un producto para agregarlo.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {results.length && (error || isProcessing) ? <Mascot state={mascotState} size={64} /> : null}
          <span className="badge badge-neutral">{results.length} resultados</span>
        </div>
      </div>

      <div className="max-h-full overflow-auto p-3">
        {results.length ? (
          <div className="grid gap-2">
            {results.map((product, index) => (
              <ProductResultRow
                isSelected={index === selectedIndex}
                key={product.id}
                onAdd={() => onAddProduct(product)}
                product={product}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state" role="status">
            <Mascot state={mascotState} size={100} />
            <p>{message}</p>
            {!isProcessing || error ? <p className="text-xs">{guidance}</p> : null}
          </div>
        )}
      </div>
    </section>
  )
}

function ProductResultRow({ isSelected, onAdd, product }) {
  return (
    <button
      aria-label={`Agregar ${product.name} al carrito`}
      className="grid gap-3 rounded-lg border bg-white p-4 text-left transition hover:bg-[var(--color-steel-50)] md:grid-cols-[minmax(0,1fr)_150px_110px]"
      onClick={onAdd}
      style={{
        borderColor: isSelected ? 'var(--color-brand-600)' : 'var(--color-border)',
        boxShadow: isSelected ? '0 0 0 3px rgb(0 132 61 / 0.16)' : 'var(--shadow-xs)',
      }}
      type="button"
    >
      <div className="min-w-0">
        <p className="truncate font-semibold">{product.name}</p>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          SKU {product.sku}
          {product.barcode ? ` - ${product.barcode}` : ''}
        </p>
        {product.category?.name ? (
          <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {product.category.name}
          </p>
        ) : null}
      </div>
      <div className="text-sm">
        <p className="font-semibold">{formatMoney(product.sale_price)}</p>
        <p className={Number(product.stock) <= 0 ? 'badge badge-error mt-2' : 'badge badge-success mt-2'}>
          Stock {product.stock}
        </p>
      </div>
      <span className="btn btn-primary h-9 self-center px-3" aria-hidden="true">
        <FiPlus aria-hidden="true" />
        Agregar
      </span>
      <span className="sr-only">
        Presiona Enter o espacio para agregar este producto.
      </span>
    </button>
  )
}

