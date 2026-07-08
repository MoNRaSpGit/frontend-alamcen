import type { FormEvent, ReactNode, RefObject } from "react";

type ScannerProductModalProps = {
  isOpen: boolean;
  title: string;
  helperText?: string;
  submitLabel: string;
  showNameInput?: boolean;
  nameInput: string;
  priceInput: string;
  onClose: () => void;
  onChangeName: (value: string) => void;
  onChangePrice: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  nameInputRef?: RefObject<HTMLInputElement | null>;
  priceInputRef?: RefObject<HTMLInputElement | null>;
  children?: ReactNode;
};

export function ScannerProductModal({
  isOpen,
  title,
  helperText,
  submitLabel,
  showNameInput = true,
  nameInput,
  priceInput,
  onClose,
  onChangeName,
  onChangePrice,
  onSubmit,
  nameInputRef,
  priceInputRef,
  children
}: ScannerProductModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="scanner-modal-overlay" onClick={onClose}>
      <section
        className="scanner-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="scanner-product-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="scanner-modal-header">
          <h2 id="scanner-product-modal-title" className="scanner-modal-title">{title}</h2>
          <button type="button" className="scanner-modal-close" onClick={onClose} aria-label="Cerrar">
            x
          </button>
        </div>
        {helperText ? (
          <div className="scanner-modal-copy">
            <span>{helperText}</span>
          </div>
        ) : null}
        <form className="scanner-modal-form" onSubmit={onSubmit}>
          {children}
          {showNameInput ? (
            <>
              <label className="scanner-modal-label" htmlFor="scanner-product-name-input">
                Nombre
              </label>
              <input
                id="scanner-product-name-input"
                ref={nameInputRef}
                className="scanner-modal-input"
                type="text"
                placeholder="Opcional, deja vacio para S/N"
                value={nameInput}
                onChange={(event) => onChangeName(event.target.value)}
              />
            </>
          ) : null}
          <label className="scanner-modal-label" htmlFor="scanner-product-price-input">
            Precio
          </label>
          <input
            id="scanner-product-price-input"
            ref={priceInputRef}
            className="scanner-modal-input"
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={priceInput}
            onChange={(event) => onChangePrice(event.target.value)}
          />
          <button type="submit" className="scanner-primary-btn scanner-primary-btn-full">
            {submitLabel}
          </button>
        </form>
      </section>
    </div>
  );
}
