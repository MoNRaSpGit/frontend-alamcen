import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { createManualProduct, createSale, findProductByBarcode, updateProduct } from "./alamcen.catalog.client";
import { getApiBaseUrl } from "../../shared/config/api";

type SaleLine = {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  image: string | null;
};

type ManualModalMode = "barcode-miss" | "manual-button";

type AlamcenHomePageProps = {
  onSaleRecorded: () => void;
};

function formatCurrency(value: number) {
  const formattedValue = new Intl.NumberFormat("es-UY", {
    maximumFractionDigits: 0
  }).format(value);

  return `$ ${formattedValue}`;
}

export function AlamcenHomePage({ onSaleRecorded }: AlamcenHomePageProps) {
  const [barcodeInput, setBarcodeInput] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [saleLines, setSaleLines] = useState<SaleLine[]>([]);
  const [manualBarcode, setManualBarcode] = useState("");
  const [manualPriceInput, setManualPriceInput] = useState("");
  const [manualModalMode, setManualModalMode] = useState<ManualModalMode>("barcode-miss");
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [editingLineId, setEditingLineId] = useState<number | null>(null);
  const [editNameInput, setEditNameInput] = useState("");
  const [editPriceInput, setEditPriceInput] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [shouldRestoreBarcodeFocus, setShouldRestoreBarcodeFocus] = useState(false);
  const [saleMessage, setSaleMessage] = useState("");
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);
  const [isCheckoutConfirmOpen, setIsCheckoutConfirmOpen] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement | null>(null);
  const manualPriceInputRef = useRef<HTMLInputElement | null>(null);
  const editNameInputRef = useRef<HTMLInputElement | null>(null);
  const total = saleLines.reduce((sum, line) => sum + line.subtotal, 0);

  function buildLookupErrorMessage(error: unknown) {
    if (error instanceof Error) {
      const normalizedMessage = error.message.trim();

      if (!normalizedMessage || normalizedMessage === "Failed to fetch") {
        return `No pudimos consultar productos. Revisa la API activa (${getApiBaseUrl()}) y la conexion al backend.`;
      }

      return `No pudimos consultar productos. ${normalizedMessage}`;
    }

    return `No pudimos consultar productos. Revisa la API activa (${getApiBaseUrl()}) y la conexion al backend.`;
  }

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
    if (!manualModalOpen) {
      return;
    }

    requestAnimationFrame(() => {
      manualPriceInputRef.current?.focus();
      manualPriceInputRef.current?.select();
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

  function appendProductToSale(product: {
    id: number;
    nombre: string;
    precioVenta: number;
    imagen: string | null;
    tieneImagen: boolean;
  }) {
    setSaleLines((current) => {
      const existingLine = current.find((line) => line.productId === product.id);
      if (existingLine) {
        return current.map((line) =>
          line.productId === product.id
            ? {
                ...line,
                quantity: line.quantity + 1,
                subtotal: (line.quantity + 1) * line.price
              }
            : line
        );
      }

      return [
        {
          productId: product.id,
          name: product.nombre,
          price: product.precioVenta,
          quantity: 1,
          subtotal: product.precioVenta,
          image: product.tieneImagen ? product.imagen : null
        },
        ...current
      ];
    });
  }

  function applyEditedProduct(productId: number, payload: { nombre: string; precioVenta: number }) {
    setSaleLines((current) =>
      current.map((line) =>
        line.productId === productId
          ? {
              ...line,
              name: payload.nombre,
              price: payload.precioVenta,
              subtotal: line.quantity * payload.precioVenta
            }
          : line
      )
    );
  }

  function appendLocalManualProduct(price: number) {
    const manualProductId = Date.now() * -1;
    appendProductToSale({
      id: manualProductId,
      nombre: "Producto Manual",
      precioVenta: price,
      imagen: null,
      tieneImagen: false
    });
  }

  function openManualProductModal(barcode: string, mode: ManualModalMode = "barcode-miss") {
    setManualModalMode(mode);
    setManualBarcode(barcode);
    setManualPriceInput("");
    setManualModalOpen(true);
  }

  function closeManualProductModal() {
    setManualModalOpen(false);
    setManualModalMode("barcode-miss");
    setShouldRestoreBarcodeFocus(true);
    setManualBarcode("");
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
      const product = await findProductByBarcode(normalizedBarcode);
      if (!product) {
        openManualProductModal(normalizedBarcode);
        return;
      }

      appendProductToSale(product);
      setBarcodeInput("");
      focusBarcodeInput();
    } catch (error) {
      console.error(error);
      setLookupError(buildLookupErrorMessage(error));
      focusBarcodeInput();
    }
  }

  async function handleCheckout() {
    if (!saleLines.length || isSubmittingSale) {
      return false;
    }

    setIsSubmittingSale(true);
    setSaleMessage("");

    try {
      await createSale({
        externalId: `alamcen-sale-${Date.now()}`,
        items: saleLines.map((line) => ({
          productId: line.productId > 0 ? line.productId : null,
          isManual: line.productId <= 0,
          nombre: line.name,
          precioVenta: line.price,
          quantity: line.quantity,
          thumbnailUrl: line.image
        }))
      });

      setSaleLines([]);
      setBarcodeInput("");
      setLookupError("");
      setSaleMessage("");
      setIsCheckoutConfirmOpen(false);
      toast.success("Venta registrada correctamente.");
      onSaleRecorded();
      focusBarcodeInput();
      return true;
    } catch (error) {
      console.error(error);
      setSaleMessage(error instanceof Error ? error.message : "No pudimos registrar la venta.");
      focusBarcodeInput();
      return false;
    } finally {
      setIsSubmittingSale(false);
    }
  }

  function handleRemoveLine(productId: number) {
    setSaleLines((current) =>
      current.flatMap((line) => {
        if (line.productId !== productId) {
          return [line];
        }

        if (line.quantity <= 1) {
          return [];
        }

        return [
          {
            ...line,
            quantity: line.quantity - 1,
            subtotal: (line.quantity - 1) * line.price
          }
        ];
      })
    );
    focusBarcodeInput();
  }

  function handleIncreaseLine(productId: number) {
    setSaleLines((current) =>
      current.map((line) =>
        line.productId === productId
          ? {
              ...line,
              quantity: line.quantity + 1,
              subtotal: (line.quantity + 1) * line.price
            }
          : line
      )
    );
    focusBarcodeInput();
  }

  async function handleManualProductSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsedPrice = Number(manualPriceInput.replace(",", "."));
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      manualPriceInputRef.current?.focus();
      manualPriceInputRef.current?.select();
      return;
    }

    try {
      if (manualModalMode === "manual-button") {
        appendLocalManualProduct(parsedPrice);
      } else {
        const product = await createManualProduct(manualBarcode, parsedPrice);
        appendProductToSale(product);
      }

      setManualModalOpen(false);
      setManualModalMode("barcode-miss");
      setShouldRestoreBarcodeFocus(true);
      setManualBarcode("");
      setManualPriceInput("");
      setBarcodeInput("");
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
    const parsedPrice = Number(editPriceInput.replace(",", "."));

    if (!normalizedName) {
      editNameInputRef.current?.focus();
      editNameInputRef.current?.select();
      return;
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      return;
    }

    try {
      if (editingLineId > 0) {
        const product = await updateProduct(editingLineId, {
          nombre: normalizedName,
          precioVenta: parsedPrice
        });

        applyEditedProduct(editingLineId, {
          nombre: product.nombre,
          precioVenta: product.precioVenta
        });
      } else {
        applyEditedProduct(editingLineId, {
          nombre: normalizedName,
          precioVenta: parsedPrice
        });
      }

      setEditModalOpen(false);
      setEditingLineId(null);
      setEditNameInput("");
      setEditPriceInput("");
      setShouldRestoreBarcodeFocus(true);
    } catch (error) {
      console.error(error);
    }
  }
  return (
    <main
      className="barcode-screen"
      onClick={() =>
        (!manualModalOpen && !editModalOpen && !isCheckoutConfirmOpen ? barcodeInputRef.current?.focus() : null)
      }
    >
      <section className="barcode-layout">
        <div className="scanner-input-dominant">
          <form className="scanner-input-shell" onSubmit={handleBarcodeSubmit}>
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
                  focusBarcodeInput();
                }
              }}
              onChange={(event) => setBarcodeInput(event.target.value)}
            />
          </form>
          {lookupError ? <p className="scanner-feedback scanner-feedback-error">{lookupError}</p> : null}
          {saleMessage ? <p className="scanner-feedback scanner-feedback-ok">{saleMessage}</p> : null}
          <div className="scanner-manual-actions">
            <button
              type="button"
              className="scanner-manual-trigger"
              onClick={() => openManualProductModal("", "manual-button")}
            >
              Producto Manual
            </button>
          </div>
        </div>

        {saleLines.length > 0 ? (
          <section className="scanner-panel-shell">
            <div className="scanner-products-panel">
              <table className="scanner-products-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th className="scanner-col-center">Editar</th>
                    <th className="scanner-col-end">Cant.</th>
                    <th className="scanner-col-end">Total</th>
                    <th className="scanner-col-end" />
                  </tr>
                </thead>
                <tbody>
                  {saleLines.map((line) => (
                    <tr key={line.productId} className="scanner-row-default">
                      <td>
                        <button
                          type="button"
                          className="scanner-line-main"
                          onClick={() => handleIncreaseLine(line.productId)}
                          aria-label={`Sumar una unidad de ${line.name}`}
                        >
                          {line.image ? (
                            <div className="scanner-thumb-frame">
                              <img src={line.image} alt={line.name} className="scanner-thumb" />
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
                      <td className="scanner-col-center">
                        <button type="button" className="scanner-edit-btn" onClick={() => openEditModal(line)}>
                          Editar
                        </button>
                      </td>
                      <td className="scanner-col-end scanner-line-qty">{line.quantity}</td>
                      <td className="scanner-col-end scanner-line-total">{formatCurrency(line.subtotal)}</td>
                      <td className="scanner-col-end">
                        <button
                          type="button"
                          className="scanner-remove-btn"
                          aria-label={`Quitar ${line.name}`}
                          onClick={() => handleRemoveLine(line.productId)}
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
              <button
                type="button"
                className="scanner-charge-btn"
                onClick={() => setIsCheckoutConfirmOpen(true)}
                disabled={isSubmittingSale}
              >
                Cobrar
              </button>
            </div>
          </section>
        ) : null}
      </section>

      {isCheckoutConfirmOpen ? (
        <div className="scanner-modal-overlay" onClick={() => setIsCheckoutConfirmOpen(false)}>
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
                onClick={() => setIsCheckoutConfirmOpen(false)}
                aria-label="Cerrar"
                disabled={isSubmittingSale}
              >
                x
              </button>
            </div>
            <p className="scanner-modal-kicker">Total a cobrar</p>
            <p className="scanner-modal-total">{formatCurrency(total)}</p>
            <div className="scanner-modal-actions">
              <button
                type="button"
                className="scanner-secondary-btn"
                onClick={() => setIsCheckoutConfirmOpen(false)}
                disabled={isSubmittingSale}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="scanner-primary-btn"
                onClick={() => {
                  handleCheckout().catch(() => {});
                }}
                disabled={isSubmittingSale}
              >
                {isSubmittingSale ? "Confirmando..." : "Confirmar"}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {manualModalOpen ? (
        <div className="scanner-modal-overlay" onClick={closeManualProductModal}>
          <section
            className="scanner-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="manual-product-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="scanner-modal-header">
              <h2 id="manual-product-title" className="scanner-modal-title">Producto manual</h2>
              <button type="button" className="scanner-modal-close" onClick={closeManualProductModal} aria-label="Cerrar">
                x
              </button>
            </div>
            <div className="scanner-modal-copy">
              {manualModalMode === "barcode-miss" ? <span>Codigo leido: {manualBarcode}</span> : <span>Ingrese precio</span>}
            </div>
            <form className="scanner-modal-form" onSubmit={handleManualProductSubmit}>
              <label className="scanner-modal-label" htmlFor="manual-price-input">
                Precio
              </label>
              <input
                id="manual-price-input"
                ref={manualPriceInputRef}
                className="scanner-modal-input"
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={manualPriceInput}
                onChange={(event) => setManualPriceInput(event.target.value)}
              />
              <button type="submit" className="scanner-primary-btn scanner-primary-btn-full">
                Agregar
              </button>
            </form>
          </section>
        </div>
      ) : null}

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
