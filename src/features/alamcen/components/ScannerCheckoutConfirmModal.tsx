import { formatCurrency } from "../alamcen.scanner.utils";
import { DemoCustomer } from "../alamcen.customer-demo";

export type ScannerPaymentMethod = "efectivo" | "tarjeta" | "cuenta";

type ScannerCheckoutConfirmModalProps = {
  isOpen: boolean;
  total: number;
  isSubmittingSale: boolean;
  paymentMethod: ScannerPaymentMethod;
  showPaymentMethods: boolean;
  customers: DemoCustomer[];
  selectedCustomerId: string;
  onClose: () => void;
  onConfirm: () => void;
  onChangePaymentMethod: (paymentMethod: ScannerPaymentMethod) => void;
  onChangeCustomer: (customerId: string) => void;
  onTogglePaymentMethods: () => void;
};

export function ScannerCheckoutConfirmModal({
  isOpen,
  total,
  isSubmittingSale,
  paymentMethod,
  showPaymentMethods,
  customers,
  selectedCustomerId,
  onClose,
  onConfirm,
  onChangePaymentMethod,
  onChangeCustomer,
  onTogglePaymentMethods
}: ScannerCheckoutConfirmModalProps) {
  if (!isOpen) {
    return null;
  }

  const isAccountPayment = paymentMethod === "cuenta";
  const isMissingCustomer = isAccountPayment && !selectedCustomerId;
  const paymentOptions: Array<{ value: ScannerPaymentMethod; label: string }> = [
    { value: "efectivo", label: "Efectivo" },
    { value: "tarjeta", label: "Tarjeta" },
    { value: "cuenta", label: "Cuenta" }
  ];

  function getPaymentButtonClass(value: ScannerPaymentMethod) {
    const baseClass = "scanner-payment-method-btn";
    const variantClass =
      value === "tarjeta"
        ? "scanner-payment-method-btn-card"
        : value === "cuenta"
          ? "scanner-payment-method-btn-account"
          : "scanner-payment-method-btn-cash";
    const activeClass = paymentMethod === value ? "scanner-payment-method-btn-active" : "";

    return [baseClass, variantClass, activeClass].filter(Boolean).join(" ");
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
        <div className="scanner-payment-toggle-row">
          <button
            type="button"
            className="scanner-payment-toggle"
            onClick={onTogglePaymentMethods}
            disabled={isSubmittingSale}
            aria-pressed={showPaymentMethods}
          >
            {showPaymentMethods ? "Ocultar medios" : "Medios"}
          </button>
        </div>
        {showPaymentMethods ? (
          <div className="scanner-payment-method-section">
            <p className="scanner-modal-kicker">Medio de cobro</p>
            <div className="scanner-payment-method-grid">
              {paymentOptions.map((option) => (
                <label
                  key={option.value}
                  className={getPaymentButtonClass(option.value)}
                >
                  <input
                    type="radio"
                    name="scanner-payment-method"
                    value={option.value}
                    checked={paymentMethod === option.value}
                    disabled={isSubmittingSale}
                    onChange={() => {
                      onChangePaymentMethod(option.value);
                      if (option.value !== "cuenta") {
                        onChangeCustomer("");
                      }
                    }}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        ) : null}
        {isAccountPayment ? (
          <div className="scanner-account-customer-box">
            <label htmlFor="scanner-account-customer">Cliente</label>
            <select
              id="scanner-account-customer"
              value={selectedCustomerId}
              onChange={(event) => onChangeCustomer(event.target.value)}
              disabled={isSubmittingSale}
            >
              <option value="">Seleccionar cliente</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}{customer.debtTotal > 0 ? ` - Debe ${formatCurrency(customer.debtTotal)}` : ""}
                </option>
              ))}
            </select>
            {isMissingCustomer ? <p>Selecciona un cliente para cargar la venta en cuenta.</p> : null}
          </div>
        ) : null}
        <div className="scanner-modal-actions">
          <button type="button" className="scanner-secondary-btn" onClick={onClose} disabled={isSubmittingSale}>
            Cancelar
          </button>
          <button type="button" className="scanner-primary-btn" onClick={onConfirm} disabled={isSubmittingSale || isMissingCustomer}>
            {isSubmittingSale ? "Confirmando..." : "Confirmar"}
          </button>
        </div>
      </section>
    </div>
  );
}
