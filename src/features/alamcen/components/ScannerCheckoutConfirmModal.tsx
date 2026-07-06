import { formatCurrency } from "../alamcen.scanner.utils";

type ScannerCheckoutConfirmModalProps = {
  isOpen: boolean;
  total: number;
  isSubmittingSale: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function ScannerCheckoutConfirmModal({
  isOpen,
  total,
  isSubmittingSale,
  onClose,
  onConfirm
}: ScannerCheckoutConfirmModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="scanner-modal-overlay" onClick={onClose}>
      <section
        className="scanner-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="scanner-modal-header">
          <h2 id="checkout-title" className="scanner-modal-title">Confirmar cobro</h2>
          <button
            type="button"
            className="scanner-modal-close"
            onClick={onClose}
            aria-label="Cerrar"
            disabled={isSubmittingSale}
          >
            x
          </button>
        </div>
        <p className="scanner-modal-kicker">Total a cobrar</p>
        <p className="scanner-modal-total">{formatCurrency(total)}</p>
        <div className="scanner-modal-actions">
          <button type="button" className="scanner-secondary-btn" onClick={onClose} disabled={isSubmittingSale}>
            Cancelar
          </button>
          <button type="button" className="scanner-primary-btn" onClick={onConfirm} disabled={isSubmittingSale}>
            {isSubmittingSale ? "Confirmando..." : "Confirmar"}
          </button>
        </div>
      </section>
    </div>
  );
}
