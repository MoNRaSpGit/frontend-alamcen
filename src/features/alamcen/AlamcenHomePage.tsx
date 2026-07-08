import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
  createManualProduct,
  findProductByBarcodeDetailed,
  flushPendingSalesQueue,
  primeProductLookupCache,
  queueSaleForBackgroundSync,
  warmAlamcenScanner
} from "./alamcen.catalog.client";
import { ManualModalMode, SaleLine } from "./alamcen.scanner.types";
import {
  appendLocalManualProduct,
  appendProductToSale,
  applyEditedProduct,
  buildLookupErrorMessage,
  increaseSaleLine,
  parsePriceInput,
  removeSaleLine
} from "./alamcen.scanner.utils";
import { getApiBaseUrl } from "../../shared/config/api";
import { ScannerInputPanel } from "./components/ScannerInputPanel";
import { ScannerProductsPanel } from "./components/ScannerProductsPanel";
import { ScannerCheckoutConfirmModal, ScannerPaymentMethod } from "./components/ScannerCheckoutConfirmModal";
import { ScannerProductModal } from "./components/ScannerProductModal";
import { logScannerWarmup, logScanResult, logScanUi, warnWarmupFailure } from "./alamcen.diagnostics";
import { DemoCustomer } from "./alamcen.customer-demo";
import { recordCheckoutPaymentMethod } from "./alamcen.payment-metrics";

type AlamcenHomePageProps = {
  customers: DemoCustomer[];
  onAccountSale: (customerId: string, total: number, itemsLabel: string) => void;
  onSaleRecorded: (saleLines: SaleLine[]) => void;
  focusRequestId?: number;
};

export function AlamcenHomePage({ customers, onAccountSale, onSaleRecorded, focusRequestId = 0 }: AlamcenHomePageProps) {
  const [barcodeInput, setBarcodeInput] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [saleLines, setSaleLines] = useState<SaleLine[]>([]);
  const [manualBarcode, setManualBarcode] = useState("");
  const [manualNameInput, setManualNameInput] = useState("");
  const [manualPriceInput, setManualPriceInput] = useState("");
  const [manualModalMode, setManualModalMode] = useState<ManualModalMode>("barcode-miss");
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [editingLineId, setEditingLineId] = useState<number | null>(null);
  const [editNameInput, setEditNameInput] = useState("");
  const [editPriceInput, setEditPriceInput] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [shouldRestoreBarcodeFocus, setShouldRestoreBarcodeFocus] = useState(false);
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);
  const [isCheckoutConfirmOpen, setIsCheckoutConfirmOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<ScannerPaymentMethod>("efectivo");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const barcodeInputRef = useRef<HTMLInputElement | null>(null);
  const manualNameInputRef = useRef<HTMLInputElement | null>(null);
  const manualPriceInputRef = useRef<HTMLInputElement | null>(null);
  const editNameInputRef = useRef<HTMLInputElement | null>(null);
  const total = saleLines.reduce((sum, line) => sum + line.subtotal, 0);

  function focusBarcodeInput() {
    if (manualModalOpen || editModalOpen) {
      return;
    }

    requestAnimationFrame(() => {
      barcodeInputRef.current?.focus();
      barcodeInputRef.current?.select();
    });
  }

  useEffect(() => {
    focusBarcodeInput();
  }, []);

  useEffect(() => {
    if (!focusRequestId) {
      return;
    }

    focusBarcodeInput();
  }, [focusRequestId]);

  useEffect(() => {
    void flushPendingSalesQueue().catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const metrics = await warmAlamcenScanner();
        if (cancelled) {
          return;
        }

        logScannerWarmup(metrics);
      } catch (error) {
        if (!cancelled) {
          warnWarmupFailure(error);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let timeoutId: number | null = null;
    let idleCallbackId: number | null = null;
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    const runPrime = () => {
      void primeProductLookupCache();
    };

    if (typeof idleWindow.requestIdleCallback === "function") {
      idleCallbackId = idleWindow.requestIdleCallback(runPrime, { timeout: 2500 });
    } else {
      timeoutId = globalThis.setTimeout(runPrime, 1200);
    }

    return () => {
      if (timeoutId != null) {
        globalThis.clearTimeout(timeoutId);
      }
      if (idleCallbackId != null && typeof idleWindow.cancelIdleCallback === "function") {
        idleWindow.cancelIdleCallback(idleCallbackId);
      }
    };
  }, []);

  useEffect(() => {
    if (!manualModalOpen) {
      return;
    }

    requestAnimationFrame(() => {
      if (manualNameInputRef.current) {
        manualNameInputRef.current.focus();
        manualNameInputRef.current.select();
      } else {
        manualPriceInputRef.current?.focus();
        manualPriceInputRef.current?.select();
      }
    });
  }, [manualModalOpen]);

  useEffect(() => {
    if (!editModalOpen) {
      return;
    }

    requestAnimationFrame(() => {
      editNameInputRef.current?.focus();
      editNameInputRef.current?.select();
    });
  }, [editModalOpen]);

  useEffect(() => {
    if (!shouldRestoreBarcodeFocus || manualModalOpen || editModalOpen) {
      return;
    }

    focusBarcodeInput();
    setShouldRestoreBarcodeFocus(false);
  }, [editModalOpen, manualModalOpen, shouldRestoreBarcodeFocus]);

  function openManualProductModal(barcode: string, mode: ManualModalMode = "barcode-miss") {
    setManualModalMode(mode);
    setManualBarcode(barcode);
    setManualNameInput("");
    setManualPriceInput("");
    setManualModalOpen(true);
  }

  function closeManualProductModal() {
    setManualModalOpen(false);
    setManualModalMode("barcode-miss");
    setShouldRestoreBarcodeFocus(true);
    setManualBarcode("");
    setManualNameInput("");
    setManualPriceInput("");
    setBarcodeInput("");
  }

  function openEditModal(line: SaleLine) {
    setEditingLineId(line.productId);
    setEditNameInput(line.name);
    setEditPriceInput(String(line.price));
    setEditModalOpen(true);
  }

  function closeEditModal() {
    setEditModalOpen(false);
    setEditingLineId(null);
    setEditNameInput("");
    setEditPriceInput("");
    setShouldRestoreBarcodeFocus(true);
  }

  async function handleBarcodeSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedBarcode = barcodeInput.trim();
    if (!normalizedBarcode) {
      return;
    }

    setLookupError("");

    try {
      const startedAt = performance.now();
      const { product, metrics } = await findProductByBarcodeDetailed(normalizedBarcode);
      const durationMs = Math.round(performance.now() - startedAt);
      const uiStartedAt = performance.now();

      logScanResult(normalizedBarcode, product?.nombre || null, Boolean(product), durationMs, metrics);

      if (!product) {
        openManualProductModal(normalizedBarcode);
        return;
      }

      setSaleLines((current) => appendProductToSale(current, product));
      const uiMs = Math.round(performance.now() - uiStartedAt);
      setBarcodeInput("");
      focusBarcodeInput();

      logScanUi(normalizedBarcode, product.nombre, uiMs, durationMs + uiMs);
    } catch (error) {
      console.error(error);
      setLookupError(buildLookupErrorMessage(error, getApiBaseUrl()));
      focusBarcodeInput();
    }
  }

  async function handleCheckout() {
    if (!saleLines.length || isSubmittingSale) {
      return false;
    }

    if (paymentMethod === "cuenta" && !selectedCustomerId) {
      return false;
    }

    setIsSubmittingSale(true);

    try {
      const completedLines = saleLines.map((line) => ({ ...line }));
      const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId);
      const paymentLabel =
        paymentMethod === "cuenta" && selectedCustomer
          ? `cuenta de ${selectedCustomer.name}`
          : paymentMethod;
      const payload = {
        externalId: `alamcen-sale-${Date.now()}`,
        notes: `Metodo de cobro demo: ${paymentLabel}`,
        items: saleLines.map((line) => ({
          productId: line.productId > 0 ? line.productId : null,
          isManual: line.productId <= 0,
          nombre: line.name,
          precioVenta: line.price,
          quantity: line.quantity,
          thumbnailUrl: line.image
        }))
      };

      setSaleLines([]);
      setBarcodeInput("");
      setLookupError("");
      setIsCheckoutConfirmOpen(false);
      setPaymentMethod("efectivo");
      setSelectedCustomerId("");
      if (paymentMethod === "cuenta" && selectedCustomer) {
        const itemsLabel = saleLines.map((line) => `${line.name} x${line.quantity}`).join(", ");
        onAccountSale(selectedCustomer.id, total, itemsLabel || "Venta en cuenta");
      }
      recordCheckoutPaymentMethod(total, paymentMethod);
      queueSaleForBackgroundSync(payload);
      if (paymentMethod === "cuenta" && selectedCustomer) {
        toast.success(`Venta cargada a cuenta de ${selectedCustomer.name}.`);
      } else if (paymentMethod === "tarjeta") {
        toast.success("Venta confirmada con tarjeta.");
      } else {
        toast.success("Venta confirmada en efectivo.");
      }
      onSaleRecorded(completedLines);
      focusBarcodeInput();
      return true;
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "No pudimos registrar la venta.");
      focusBarcodeInput();
      return false;
    } finally {
      setIsSubmittingSale(false);
    }
  }

  function handleRemoveLine(productId: number) {
    setSaleLines((current) => removeSaleLine(current, productId));
    focusBarcodeInput();
  }

  function handleIncreaseLine(productId: number) {
    setSaleLines((current) => increaseSaleLine(current, productId));
    focusBarcodeInput();
  }

  async function handleManualProductSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsedPrice = parsePriceInput(manualPriceInput);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      manualPriceInputRef.current?.focus();
      manualPriceInputRef.current?.select();
      return;
    }

    try {
      if (manualModalMode === "manual-button") {
        setSaleLines((current) => appendLocalManualProduct(current, parsedPrice, manualNameInput));
      } else {
        const product = await createManualProduct(manualBarcode, parsedPrice, manualNameInput.trim() || undefined);
        setSaleLines((current) => appendProductToSale(current, product));
      }

      closeManualProductModal();
    } catch (error) {
      console.error(error);
    }
  }

  async function handleEditProductSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingLineId) {
      return;
    }

    const normalizedName = editNameInput.trim();
    const parsedPrice = parsePriceInput(editPriceInput);

    if (!normalizedName) {
      editNameInputRef.current?.focus();
      editNameInputRef.current?.select();
      return;
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      return;
    }

    setSaleLines((current) =>
      applyEditedProduct(current, editingLineId, {
        nombre: normalizedName,
        precioVenta: parsedPrice
      })
    );
    closeEditModal();
  }

  return (
    <main
      className="barcode-screen"
      onClick={() =>
        (!manualModalOpen && !editModalOpen && !isCheckoutConfirmOpen ? barcodeInputRef.current?.focus() : null)
      }
    >
      <section className="barcode-layout">
        <ScannerInputPanel
          barcodeInput={barcodeInput}
          lookupError={lookupError}
          isCheckoutConfirmOpen={isCheckoutConfirmOpen}
          manualModalOpen={manualModalOpen}
          editModalOpen={editModalOpen}
          barcodeInputRef={barcodeInputRef}
          onSubmit={handleBarcodeSubmit}
          onChangeBarcode={setBarcodeInput}
          onBlurBarcode={focusBarcodeInput}
          onOpenManual={() => openManualProductModal("", "manual-button")}
        />

        <ScannerProductsPanel
          saleLines={saleLines}
          total={total}
          isSubmittingSale={isSubmittingSale}
          onIncreaseLine={handleIncreaseLine}
          onOpenEdit={openEditModal}
          onRemoveLine={handleRemoveLine}
          onOpenCheckout={() => setIsCheckoutConfirmOpen(true)}
        />
      </section>

      <ScannerCheckoutConfirmModal
        isOpen={isCheckoutConfirmOpen}
        total={total}
        isSubmittingSale={isSubmittingSale}
        paymentMethod={paymentMethod}
        customers={customers}
        selectedCustomerId={selectedCustomerId}
        onClose={() => setIsCheckoutConfirmOpen(false)}
        onConfirm={() => {
          void handleCheckout();
        }}
        onChangePaymentMethod={setPaymentMethod}
        onChangeCustomer={setSelectedCustomerId}
      />

      <ScannerProductModal
        isOpen={manualModalOpen}
        title="Producto manual"
        helperText={manualModalMode === "barcode-miss" ? `Codigo leido: ${manualBarcode}` : "Nombre opcional. Si lo dejas vacio se guardara como S/N."}
        submitLabel="Agregar"
        nameInput={manualNameInput}
        priceInput={manualPriceInput}
        nameInputRef={manualNameInputRef}
        priceInputRef={manualPriceInputRef}
        onClose={closeManualProductModal}
        onChangeName={setManualNameInput}
        onChangePrice={setManualPriceInput}
        onSubmit={handleManualProductSubmit}
      />

      {editModalOpen ? (
        <div className="scanner-modal-overlay" onClick={closeEditModal}>
          <section
            className="scanner-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-product-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="scanner-modal-header">
              <h2 id="edit-product-title" className="scanner-modal-title">Editar producto</h2>
              <button type="button" className="scanner-modal-close" onClick={closeEditModal} aria-label="Cerrar">
                x
              </button>
            </div>
            <form className="scanner-modal-form" onSubmit={handleEditProductSubmit}>
              <label className="scanner-modal-label" htmlFor="edit-name-input">
                Nombre
              </label>
              <input
                id="edit-name-input"
                ref={editNameInputRef}
                className="scanner-modal-input"
                type="text"
                value={editNameInput}
                onChange={(event) => setEditNameInput(event.target.value)}
              />
              <label className="scanner-modal-label" htmlFor="edit-price-input">
                Precio
              </label>
              <input
                id="edit-price-input"
                className="scanner-modal-input"
                type="text"
                inputMode="decimal"
                value={editPriceInput}
                onChange={(event) => setEditPriceInput(event.target.value)}
              />
              <button type="submit" className="scanner-primary-btn scanner-primary-btn-full">
                Guardar
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}
