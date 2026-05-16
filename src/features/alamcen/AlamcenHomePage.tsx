import { useEffect, useRef, useState } from "react";
import { getApiBaseUrl, getDefaultApiBaseUrl, resetApiBaseUrl, setApiBaseUrl } from "../../shared/config/api";
import { createManualProduct, fetchAlamcenStatus, findProductByBarcode, updateProduct } from "./alamcen.catalog.client";

type SaleLine = {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  image: string | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0
  }).format(value);
}

export function AlamcenHomePage() {
  const [barcodeInput, setBarcodeInput] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [apiBaseUrlInput, setApiBaseUrlInput] = useState(() => getApiBaseUrl());
  const [apiStatusMessage, setApiStatusMessage] = useState("");
  const [apiStatusTone, setApiStatusTone] = useState<"idle" | "success" | "error">("idle");
  const [apiStatusLoading, setApiStatusLoading] = useState(false);
  const [saleLines, setSaleLines] = useState<SaleLine[]>([]);
  const [manualBarcode, setManualBarcode] = useState("");
  const [manualPriceInput, setManualPriceInput] = useState("");
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [editingLineId, setEditingLineId] = useState<number | null>(null);
  const [editNameInput, setEditNameInput] = useState("");
  const [editPriceInput, setEditPriceInput] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [shouldRestoreBarcodeFocus, setShouldRestoreBarcodeFocus] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement | null>(null);
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

  const isMixedContentRisk =
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    apiBaseUrlInput.trim().toLowerCase().startsWith("http://");

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

  function openManualProductModal(barcode: string) {
    setManualBarcode(barcode);
    setManualPriceInput("");
    setManualModalOpen(true);
  }

  function closeManualProductModal() {
    setManualModalOpen(false);
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
      setLookupError(
        "No pudimos consultar productos ahora. Revisa la conexion al backend o la configuracion de la API."
      );
      focusBarcodeInput();
    }
  }

  function handleCheckout() {
    setSaleLines([]);
    setBarcodeInput("");
    setLookupError("");
    focusBarcodeInput();
  }

  async function handleApiConnectionTest() {
    const normalizedApiBaseUrl = apiBaseUrlInput.trim();
    if (!normalizedApiBaseUrl) {
      setApiStatusTone("error");
      setApiStatusMessage("La URL de la API es obligatoria.");
      return;
    }

    setApiStatusLoading(true);
    setApiStatusTone("idle");
    setApiStatusMessage("");
    setApiBaseUrl(normalizedApiBaseUrl);

    try {
      const status = await fetchAlamcenStatus();
      setApiStatusTone("success");
      setApiStatusMessage(`Conexion OK con ${status.module}. Tabla fuente: ${status.sourceTable}.`);
    } catch (error) {
      console.error(error);
      setApiStatusTone("error");
      setApiStatusMessage(
        "No pudimos conectar con la API. Verifica URL, backend levantado y CORS del entorno."
      );
    } finally {
      setApiStatusLoading(false);
    }
  }

  function handleResetApiBaseUrl() {
    resetApiBaseUrl();
    const nextValue = getDefaultApiBaseUrl();
    setApiBaseUrlInput(nextValue);
    setApiStatusTone("idle");
    setApiStatusMessage(`Se restauro la API por defecto: ${nextValue}`);
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
      const product = await createManualProduct(manualBarcode, parsedPrice);
      appendProductToSale(product);
      setManualModalOpen(false);
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
      const product = await updateProduct(editingLineId, {
        nombre: normalizedName,
        precioVenta: parsedPrice
      });

      applyEditedProduct(editingLineId, {
        nombre: product.nombre,
        precioVenta: product.precioVenta
      });

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
          <label className="barcode-label" htmlFor="barcode-input">
            Buscar codigo de barras
          </label>
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
        </form>

        <section className="api-config-card">
          <div className="api-config-header">
            <strong>Conexion API</strong>
            <span>Usa una URL accesible desde este dispositivo</span>
          </div>

          <label className="api-config-label" htmlFor="api-base-url-input">
            URL base
          </label>
          <input
            id="api-base-url-input"
            className="api-config-input"
            type="text"
            inputMode="url"
            value={apiBaseUrlInput}
            placeholder="http://192.168.1.20:3000/api/v1"
            onChange={(event) => setApiBaseUrlInput(event.target.value)}
          />

          <div className="api-config-actions">
            <button
              type="button"
              className="api-config-button primary"
              onClick={() => void handleApiConnectionTest()}
              disabled={apiStatusLoading}
            >
              {apiStatusLoading ? "Probando..." : "Guardar y probar"}
            </button>
            <button type="button" className="api-config-button" onClick={handleResetApiBaseUrl}>
              Restaurar
            </button>
          </div>

          <div className="api-config-help">
            <span>Default detectado: {getDefaultApiBaseUrl()}</span>
            <span>Actual guardado: {getApiBaseUrl()}</span>
          </div>

          {isMixedContentRisk ? (
            <p className="api-status-message error">
              Si la app esta en `https`, una API `http` va a ser bloqueada por el navegador. Para GitHub Pages necesitas
              backend con `https`.
            </p>
          ) : null}

          {apiStatusMessage ? (
            <p className={apiStatusTone === "error" ? "api-status-message error" : "api-status-message success"}>
              {apiStatusMessage}
            </p>
          ) : null}
        </section>

        <section className="sale-panel">
          <div className="sale-panel-header">
            <strong>Productos</strong>
          </div>

          <div className="sale-list">
            {saleLines.length === 0 ? (
              <div className="sale-empty">Todavia no hay productos.</div>
            ) : (
              saleLines.map((line) => (
                <article key={line.productId} className="sale-line">
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

                  <div className="sale-line-center">
                    <button type="button" className="sale-line-edit" onClick={() => openEditModal(line)}>
                      Editar
                    </button>
                  </div>

                  <div className="sale-line-side">
                    <div className="sale-line-meta">
                      <span>Cant {line.quantity}</span>
                      <strong>{formatCurrency(line.subtotal)}</strong>
                    </div>
                    <button
                      type="button"
                      className="sale-line-remove"
                      aria-label={`Quitar ${line.name}`}
                      onClick={() => handleRemoveLine(line.productId)}
                    >
                      ×
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>

          <div className="sale-total-card">
            <span className="sale-total-label">Total</span>
            <strong className="sale-total-value">{formatCurrency(total)}</strong>
          </div>

          <button type="button" className="checkout-button" onClick={handleCheckout}>
            Cobrar
          </button>
        </section>
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
              <span>Codigo leido: {manualBarcode}</span>
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
