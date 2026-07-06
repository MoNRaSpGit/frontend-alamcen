import { useEffect, useRef, useState } from "react";
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

  function handleCheckout() {
    if (!saleLines.length || isSubmittingSale) {
      return;
    }

    setIsSubmittingSale(true);
    setSaleMessage("");

    createSale({
      externalId: `alamcen-sale-${Date.now()}`,
      items: saleLines.map((line) => ({
        productId: line.productId > 0 ? line.productId : null,
        isManual: line.productId <= 0,
        nombre: line.name,
        precioVenta: line.price,
        quantity: line.quantity,
        thumbnailUrl: line.image
      }))
    })
      .then(() => {
        setSaleLines([]);
        setBarcodeInput("");
        setLookupError("");
        setSaleMessage("Venta registrada correctamente.");
        onSaleRecorded();
        focusBarcodeInput();
      })
      .catch((error) => {
        console.error(error);
        setSaleMessage(error instanceof Error ? error.message : "No pudimos registrar la venta.");
        focusBarcodeInput();
      })
      .finally(() => {
        setIsSubmittingSale(false);
      });
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
      onClick={() => (!manualModalOpen && !editModalOpen ? barcodeInputRef.current?.focus() : null)}
    >
      <section className="barcode-layout">
        <form className="barcode-form" onSubmit={handleBarcodeSubmit}>
          <input
            id="barcode-input"
            ref={barcodeInputRef}
            className="barcode-input"
            type="text"
            inputMode="numeric"
            value={barcodeInput}
            placeholder="Escanea y presiona Enter"
            onBlur={() => {
              if (!manualModalOpen && !editModalOpen) {
                focusBarcodeInput();
              }
            }}
            onChange={(event) => setBarcodeInput(event.target.value)}
          />
          {lookupError ? <p className="barcode-error">{lookupError}</p> : null}
          {saleMessage ? <p className="barcode-helper-text">{saleMessage}</p> : null}
          <div className="barcode-manual-action">
            <button
              type="button"
              className="barcode-manual-button"
              onClick={() => openManualProductModal("", "manual-button")}
            >
              Producto Manual
            </button>
          </div>
        </form>

        {saleLines.length > 0 ? (
        <section className="sale-panel">
          <div className="sale-panel-header">
            <strong>Productos</strong>
          </div>

          <div className="sale-table-wrap">
            <table className="sale-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th className="sale-table-edit-head">Editar</th>
                  <th className="sale-table-qty-head">Cant.</th>
                  <th className="sale-table-total-head">Total</th>
                  <th className="sale-table-remove-head" />
                </tr>
              </thead>
              <tbody>
                {saleLines.map((line) => (
                  <tr key={line.productId} className="sale-row">
                    <td>
                      <button
                        type="button"
                        className="sale-line-main"
                        onClick={() => handleIncreaseLine(line.productId)}
                        aria-label={`Sumar una unidad de ${line.name}`}
                      >
                        <div className="product-thumb">
                          {line.image ? (
                            <img src={line.image} alt={line.name} />
                          ) : (
                            <div className="product-placeholder">{line.name.slice(0, 2).toUpperCase()}</div>
                          )}
                        </div>
                        <div className="sale-line-copy">
                          <strong>{line.name}</strong>
                          <span>{formatCurrency(line.price)} c/u</span>
                        </div>
                      </button>
                    </td>
                    <td className="sale-table-edit-cell">
                      <button type="button" className="sale-line-edit" onClick={() => openEditModal(line)}>
                        Editar
                      </button>
                    </td>
                    <td className="sale-table-qty-cell">{line.quantity}</td>
                    <td className="sale-table-total-cell">{formatCurrency(line.subtotal)}</td>
                    <td className="sale-table-remove-cell">
                      <button
                        type="button"
                        className="sale-line-remove"
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
          <div className="sale-total-card">
            <span className="sale-total-label">Total</span>
            <strong className="sale-total-value">{formatCurrency(total)}</strong>
          </div>

          <button type="button" className="checkout-button" onClick={handleCheckout} disabled={isSubmittingSale}>
            {isSubmittingSale ? "Cobrando..." : "Cobrar"}
          </button>
        </section>
        ) : null}
      </section>

      {manualModalOpen ? (
        <div className="manual-modal-backdrop" onClick={closeManualProductModal}>
          <section
            className="manual-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="manual-product-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="manual-modal-header">
              <strong id="manual-product-title">Ingrese valor</strong>
              <button type="button" className="manual-modal-close" onClick={closeManualProductModal} aria-label="Cerrar">
                ×
              </button>
            </div>

            <div className="manual-modal-copy">
              {manualModalMode === "barcode-miss" ? <span>Codigo leido: {manualBarcode}</span> : <span>Ingrese precio</span>}
              <strong>Producto Manual</strong>
            </div>

            <form className="manual-modal-form" onSubmit={handleManualProductSubmit}>
              <label className="manual-modal-label" htmlFor="manual-price-input">
                Precio
              </label>
              <input
                id="manual-price-input"
                ref={manualPriceInputRef}
                className="manual-modal-input"
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={manualPriceInput}
                onChange={(event) => setManualPriceInput(event.target.value)}
              />

              <button type="submit" className="manual-modal-submit">
                Agregar
              </button>
            </form>
          </section>
        </div>
      ) : null}

      {editModalOpen ? (
        <div className="manual-modal-backdrop" onClick={closeEditModal}>
          <section
            className="manual-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-product-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="manual-modal-header">
              <strong id="edit-product-title">Editar producto</strong>
              <button type="button" className="manual-modal-close" onClick={closeEditModal} aria-label="Cerrar">
                ×
              </button>
            </div>

            <form className="manual-modal-form" onSubmit={handleEditProductSubmit}>
              <label className="manual-modal-label" htmlFor="edit-name-input">
                Nombre
              </label>
              <input
                id="edit-name-input"
                ref={editNameInputRef}
                className="manual-modal-input"
                type="text"
                value={editNameInput}
                onChange={(event) => setEditNameInput(event.target.value)}
              />

              <label className="manual-modal-label" htmlFor="edit-price-input">
                Precio
              </label>
              <input
                id="edit-price-input"
                className="manual-modal-input"
                type="text"
                inputMode="decimal"
                value={editPriceInput}
                onChange={(event) => setEditPriceInput(event.target.value)}
              />

              <button type="submit" className="manual-modal-submit">
                Guardar
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}
