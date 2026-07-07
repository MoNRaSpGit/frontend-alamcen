import { LoaderCircle, Package2, RefreshCw } from "lucide-react";
import { getStockIntensity, getStockLabel, TrackedStockItem } from "./alamcen.stock";

type StockTabProps = {
  items: TrackedStockItem[];
  loading?: boolean;
  onRefresh?: () => void;
  onClearDemo?: () => void;
};

export function StockTab({ items, loading = false, onRefresh, onClearDemo }: StockTabProps) {
  const criticalCount = items.filter((item) => getStockIntensity(item.quantity) === "critical").length;
  const warningCount = items.filter((item) => getStockIntensity(item.quantity) === "warning").length;
  const normalCount = items.filter((item) => getStockIntensity(item.quantity) === "normal").length;

  return (
    <section className="stock-page">
      <article className="panel-card stock-hero">
        <div>
          <p className="stock-kicker">Stock visual</p>
          <h2>Seguimiento de productos vendidos</h2>
          <p className="stock-helper">Arranca en 10 unidades la primera vez que se vende un producto y baja con cada confirmacion.</p>
        </div>
        <div className="stock-hero-actions">
          {onRefresh ? (
            <button type="button" className="stock-ghost-button" onClick={onRefresh}>
              <RefreshCw size={16} />
              Refrescar
            </button>
          ) : null}
          {onClearDemo ? (
            <button type="button" className="stock-ghost-button" onClick={onClearDemo}>
              Reiniciar demo
            </button>
          ) : null}
        </div>
      </article>

      <article className="panel-card stock-summary">
        <div className="stock-summary-chip critical">
          <strong>{criticalCount}</strong>
          <span>Criticos</span>
        </div>
        <div className="stock-summary-chip warning">
          <strong>{warningCount}</strong>
          <span>Bajo stock</span>
        </div>
        <div className="stock-summary-chip normal">
          <strong>{normalCount}</strong>
          <span>Normales</span>
        </div>
        <div className="stock-summary-chip total">
          <strong>{items.length}</strong>
          <span>Seguidos</span>
        </div>
      </article>

      {loading ? (
        <article className="panel-card stock-empty">
          <LoaderCircle size={18} className="spin" />
          Cargando stock...
        </article>
      ) : null}

      {!loading && !items.length ? (
        <article className="panel-card stock-empty">
          <Package2 size={18} />
          Aun no hay productos seguidos. Confirma una venta para empezar a ver el stock.
        </article>
      ) : null}

      {!loading && items.length ? (
        <div className="stock-grid">
          {items.map((item) => {
            const intensity = getStockIntensity(item.quantity);

            return (
              <article key={item.productId} className={`stock-card ${intensity}`}>
                <div className="stock-card-head">
                  <div>
                    <p className="stock-card-name">{item.name}</p>
                    <p className="stock-card-meta">
                      Stock inicial {item.initialQuantity} - stock actual {item.quantity}
                    </p>
                  </div>
                  <span className={`stock-badge ${intensity}`}>{getStockLabel(item.quantity)}</span>
                </div>

                <div className="stock-card-body">
                  <div className="stock-quantity">{item.quantity}</div>
                  <p className="stock-card-note">
                    Inicial {item.initialQuantity} - Actual {item.quantity}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
