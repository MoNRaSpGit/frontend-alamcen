import type { FormEvent, RefObject } from "react";

type ScannerInputPanelProps = {
  barcodeInput: string;
  lookupError: string;
  isCheckoutConfirmOpen: boolean;
  manualModalOpen: boolean;
  editModalOpen: boolean;
  barcodeInputRef: RefObject<HTMLInputElement | null>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onChangeBarcode: (value: string) => void;
  onBlurBarcode: () => void;
  onOpenManual: () => void;
};

export function ScannerInputPanel({
  barcodeInput,
  lookupError,
  isCheckoutConfirmOpen,
  manualModalOpen,
  editModalOpen,
  barcodeInputRef,
  onSubmit,
  onChangeBarcode,
  onBlurBarcode,
  onOpenManual
}: ScannerInputPanelProps) {
  return (
    <div className="scanner-input-dominant">
      <form className="scanner-input-shell" onSubmit={onSubmit}>
        <input
          id="barcode-input"
          ref={barcodeInputRef}
          className="scanner-input-control"
          type="text"
          inputMode="numeric"
          value={barcodeInput}
          placeholder="Escanear aqui"
          onBlur={() => {
            if (!manualModalOpen && !editModalOpen && !isCheckoutConfirmOpen) {
              onBlurBarcode();
            }
          }}
          onChange={(event) => onChangeBarcode(event.target.value)}
        />
      </form>
      {lookupError ? <p className="scanner-feedback scanner-feedback-error">{lookupError}</p> : null}
      <div className="scanner-manual-actions">
        <button type="button" className="scanner-manual-trigger" onClick={onOpenManual}>
          Producto Manual
        </button>
      </div>
    </div>
  );
}
