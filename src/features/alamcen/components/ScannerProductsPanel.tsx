import { SaleLine } from "../alamcen.scanner.types";
import { formatCurrency } from "../alamcen.scanner.utils";

type ScannerProductsPanelProps = {
  saleLines: SaleLine[];
  total: number;
  isSubmittingSale: boolean;
  onIncreaseLine: (productId: number) => void;
  onRemoveLine: (productId: number) => void;
  onOpenCheckout: () => void;
};

export function ScannerProductsPanel({
  saleLines,
  total,
  isSubmittingSale,
  onIncreaseLine,
  onRemoveLine,
  onOpenCheckout
}: ScannerProductsPanelProps) {
  if (!saleLines.length) {
    return null;
  }

  return (
    <section className="scanner-panel-shell">
      <div className="scanner-products-panel">
        <table className="scanner-products-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th className="scanner-col-end">Cant.</th>
              <th className="scanner-col-end">Total</th>
              <th className="scanner-col-end" />
            </tr>
          </thead>
          <tbody>
            {saleLines.map((line) => (
              <tr key={line.productId} className="scanner-row-default">
                <td className="scanner-product-cell">
                  <button
                    type="button"
                    className="scanner-line-main"
                    onClick={() => onIncreaseLine(line.productId)}
                    aria-label={`Sumar una unidad de ${line.name}`}
                  >
                    {line.image ? (
                      <div className="scanner-thumb-frame">
                        <img
                          src={line.image}
                          alt={line.name}
                          className="scanner-thumb"
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                    ) : (
                      <div className="scanner-thumb-frame scanner-thumb-placeholder">
                        <span className="scanner-thumb-placeholder-label">{line.name.slice(0, 2).toUpperCase()}</span>
                      </div>
                    )}
                    <div className="scanner-line-copy">
                      <div className="scanner-product-name">{line.name}</div>
                      <div className="scanner-price-badge">{formatCurrency(line.price)} c/u</div>
                    </div>
                  </button>
                </td>
                <td className="scanner-col-end scanner-line-qty scanner-mobile-stat" data-label="Cant.">
                  {line.quantity}
                </td>
                <td className="scanner-col-end scanner-line-total scanner-mobile-stat" data-label="Total">
                  {formatCurrency(line.subtotal)}
                </td>
                <td className="scanner-col-end scanner-mobile-actions" data-label="Quitar">
                  <button
                    type="button"
                    className="scanner-remove-btn"
                    aria-label={`Quitar ${line.name}`}
                    onClick={() => onRemoveLine(line.productId)}
                  >
                    x
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="scanner-checkout">
        <div className="scanner-total-row">
          <span className="scanner-total-label">Total</span>
          <span className="scanner-total">{formatCurrency(total)}</span>
        </div>
        <button type="button" className="scanner-charge-btn" onClick={onOpenCheckout} disabled={isSubmittingSale}>
          Cobrar
        </button>
      </div>
    </section>
  );
}
