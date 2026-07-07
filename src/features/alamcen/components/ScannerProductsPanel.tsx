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
              <th className="scanner-col-end">Precio</th>
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
                    <div className="scanner-line-copy">
                      <div className="scanner-product-name" title={line.name}>
                        {line.name}
                      </div>
                    </div>
                  </button>
                </td>
                <td className="scanner-col-end scanner-line-qty scanner-mobile-stat" data-label="Cant.">
                  {line.quantity}
                </td>
                <td className="scanner-col-end scanner-line-price scanner-mobile-stat" data-label="Precio">
                  <span className="scanner-price-truncate" title={formatCurrency(line.price)}>
                    {formatCurrency(line.price)}
                  </span>
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

        <div className="scanner-products-mobile">
          {saleLines.map((line) => (
            <article key={line.productId} className="scanner-mobile-card">
              <div className="scanner-mobile-card-top">
                <button
                  type="button"
                  className="scanner-mobile-product"
                  onClick={() => onIncreaseLine(line.productId)}
                  aria-label={`Sumar una unidad de ${line.name}`}
                  title={line.name}
                >
                  <span className="scanner-mobile-product-name">{line.name}</span>
                </button>

                <div className="scanner-mobile-columns">
                  <span className="scanner-mobile-qty" title="Cantidad">
                    {line.quantity}
                  </span>
                  <span className="scanner-mobile-price" title={formatCurrency(line.price)}>
                    {formatCurrency(line.price)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="scanner-mobile-remove"
                aria-label={`Quitar ${line.name}`}
                onClick={() => onRemoveLine(line.productId)}
              >
                Quitar
              </button>
            </article>
          ))}
        </div>
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
