import { useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { ProductShell } from "../../shared/components/ProductShell";
import { alamcenWorkspaceSections } from "./alamcen.workspace.config";
import { findProductByBarcode } from "./alamcen.catalog.client";
import { categories, discoveryQuestions, items, movements, orders, sites } from "./alamcen.demo.data";
import { AlamcenView, BarcodeProductLookup, InventoryMovement } from "./alamcen.types";

type SaleLine = {
  productId: number;
  barcode: string;
  name: string;
  category: string | null;
  price: number;
  quantity: number;
  subtotal: number;
  stockActual: number;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0
  }).format(value);
}

export function AlamcenHomePage() {
  const [activeView, setActiveView] = useState<AlamcenView | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState(sites[0]?.id ?? "");
  const [currentMovements, setCurrentMovements] = useState(movements);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [barcodeInput, setBarcodeInput] = useState("");
  const [saleLines, setSaleLines] = useState<SaleLine[]>([]);
  const [lastScannedProduct, setLastScannedProduct] = useState<BarcodeProductLookup | null>(null);
  const [isLookingUpBarcode, setIsLookingUpBarcode] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement | null>(null);
  const [movementForm, setMovementForm] = useState({
    date: "2026-05-06",
    siteId: sites[0]?.id ?? "",
    itemId: items[0]?.id ?? "",
    direction: "out" as "in" | "out",
    quantity: "12",
    reason: ""
  });

  const visibleItems = useMemo(() => items.filter((item) => item.siteId === selectedSiteId), [selectedSiteId]);
  const visibleOrders = useMemo(() => orders.filter((order) => order.siteId === selectedSiteId), [selectedSiteId]);
  const visibleMovements = useMemo(
    () => currentMovements.filter((movement) => movement.siteId === selectedSiteId).slice().reverse(),
    [currentMovements, selectedSiteId]
  );

  const totalUnits = visibleItems.reduce((sum, item) => sum + item.quantity, 0);
  const lowStockCount = visibleItems.filter((item) => item.quantity <= item.minQuantity).length;
  const pendingOrders = visibleOrders.filter((order) => order.status !== "recibido").length;
  const saleUnits = saleLines.reduce((sum, line) => sum + line.quantity, 0);
  const saleTotal = saleLines.reduce((sum, line) => sum + line.subtotal, 0);

  function handleMovementSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const quantity = Number(movementForm.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error("La cantidad debe ser mayor a 0.", { autoClose: false });
      return;
    }

    const nextMovement: InventoryMovement = {
      id: `mov-${Date.now()}`,
      date: movementForm.date,
      siteId: movementForm.siteId,
      itemId: movementForm.itemId,
      direction: movementForm.direction,
      quantity,
      reason: movementForm.reason.trim() || "Movimiento demo"
    };

    setCurrentMovements((current) => [...current, nextMovement]);
    setMovementForm((current) => ({ ...current, quantity: "", reason: "" }));
    setSelectedSiteId(movementForm.siteId);
    toast.success("Movimiento guardado.", { autoClose: 2200 });
  }

  async function handleBarcodeSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedBarcode = barcodeInput.trim();
    if (!normalizedBarcode) {
      toast.error("Ingresa un codigo de barras.", { autoClose: false });
      return;
    }

    setIsLookingUpBarcode(true);

    try {
      const product = await findProductByBarcode(normalizedBarcode);
      if (!product) {
        toast.error("No encontramos un producto para ese codigo.", { autoClose: false });
        return;
      }

      setLastScannedProduct(product);
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
            barcode: product.barcodeNormalized ?? product.barcode ?? normalizedBarcode,
            name: product.nombre,
            category: product.categoria,
            price: product.precioVenta,
            quantity: 1,
            subtotal: product.precioVenta,
            stockActual: product.stockActual
          },
          ...current
        ];
      });

      setBarcodeInput("");
      requestAnimationFrame(() => {
        barcodeInputRef.current?.focus();
      });

      toast.success(`Producto agregado: ${product.nombre}`, { autoClose: 1800 });
    } catch (error) {
      console.error(error);
      toast.error("No se pudo leer el codigo de barras desde backend.", { autoClose: false });
    } finally {
      setIsLookingUpBarcode(false);
    }
  }

  function increaseLine(lineProductId: number) {
    setSaleLines((current) =>
      current.map((line) =>
        line.productId === lineProductId
          ? { ...line, quantity: line.quantity + 1, subtotal: (line.quantity + 1) * line.price }
          : line
      )
    );
  }

  function decreaseLine(lineProductId: number) {
    setSaleLines((current) =>
      current
        .map((line) =>
          line.productId === lineProductId
            ? { ...line, quantity: line.quantity - 1, subtotal: (line.quantity - 1) * line.price }
            : line
        )
        .filter((line) => line.quantity > 0)
    );
  }

  function clearSale() {
    setSaleLines([]);
    setLastScannedProduct(null);
    setBarcodeInput("");
    requestAnimationFrame(() => {
      barcodeInputRef.current?.focus();
    });
    toast.success("Ticket demo reiniciado.", { autoClose: 1800 });
  }

  return (
    <main className="app-shell">
      <ProductShell
        navItems={alamcenWorkspaceSections}
        activeKey={activeView}
        onSelect={(key) => setActiveView(key as AlamcenView)}
        onHomeClick={() => setActiveView(null)}
      >
        <section className="toolbar">
          <label className="establishment-picker">
            <span>Deposito visible</span>
            <select value={selectedSiteId} onChange={(event) => setSelectedSiteId(event.target.value)}>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="summary-grid">
          <article className="metric-card">
            <span>Productos visibles</span>
            <strong>{visibleItems.length}</strong>
            <small>Catalogo activo del deposito seleccionado.</small>
          </article>
          <article className="metric-card">
            <span>Unidades totales</span>
            <strong>{totalUnits}</strong>
            <small>Stock demo actualmente visible.</small>
          </article>
          <article className="metric-card">
            <span>Stock bajo</span>
            <strong>{lowStockCount}</strong>
            <small>Productos que ya piden reposicion.</small>
          </article>
          <article className="metric-card accent">
            <span>Pedidos abiertos</span>
            <strong>{pendingOrders}</strong>
            <small>Seguimiento comercial pendiente.</small>
          </article>
        </section>

        {activeView === "scanner" ? (
          <section className="content-grid">
            <article className="panel">
              <div className="panel-header">
                <div>
                  <h2>Lector de codigo de barras</h2>
                  <p>Escanea o pega un codigo y la caja va sumando el producto al ticket.</p>
                </div>
              </div>
              <form className="form-grid" onSubmit={handleBarcodeSubmit}>
                <label className="span-2">
                  <span>Codigo de barras</span>
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    inputMode="numeric"
                    value={barcodeInput}
                    placeholder="Escanea y presiona Enter"
                    onChange={(event) => setBarcodeInput(event.target.value)}
                  />
                </label>
                <button type="submit" className="primary-button">
                  {isLookingUpBarcode ? "Buscando..." : "Agregar al ticket"}
                </button>
                <button type="button" className="secondary-button" onClick={clearSale}>
                  Limpiar ticket
                </button>
              </form>

              {lastScannedProduct ? (
                <div className="scanner-product-card">
                  <div>
                    <span>Ultimo producto leido</span>
                    <strong>{lastScannedProduct.nombre}</strong>
                  </div>
                  <div className="scanner-product-meta">
                    <span>{lastScannedProduct.barcodeNormalized ?? lastScannedProduct.barcode ?? "-"}</span>
                    <span>{formatCurrency(lastScannedProduct.precioVenta)}</span>
                    <span>Stock {lastScannedProduct.stockActual}</span>
                  </div>
                </div>
              ) : null}
            </article>

            <article className="panel">
              <div className="panel-header">
                <div>
                  <h2>Ticket demo</h2>
                  <p>Comportamiento clasico de caja: si repetis el codigo, suma cantidad.</p>
                </div>
              </div>
              <div className="sale-summary-grid">
                <article className="report-summary-card">
                  <span>Items</span>
                  <strong>{saleLines.length}</strong>
                </article>
                <article className="report-summary-card">
                  <span>Unidades</span>
                  <strong>{saleUnits}</strong>
                </article>
                <article className="report-summary-card">
                  <span>Total</span>
                  <strong>{formatCurrency(saleTotal)}</strong>
                </article>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Precio</th>
                      <th>Cantidad</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {saleLines.length === 0 ? (
                      <tr>
                        <td colSpan={4}>Todavia no hay productos en el ticket.</td>
                      </tr>
                    ) : (
                      saleLines.map((line) => (
                        <tr key={line.productId}>
                          <td>
                            <div className="sale-line-main">
                              <strong>{line.name}</strong>
                              <span>
                                {line.barcode} | {line.category ?? "Sin categoria"}
                              </span>
                            </div>
                          </td>
                          <td>{formatCurrency(line.price)}</td>
                          <td>
                            <div className="quantity-stepper">
                              <button type="button" onClick={() => decreaseLine(line.productId)}>
                                -
                              </button>
                              <span>{line.quantity}</span>
                              <button type="button" onClick={() => increaseLine(line.productId)}>
                                +
                              </button>
                            </div>
                          </td>
                          <td>{formatCurrency(line.subtotal)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          </section>
        ) : null}

        {activeView === "overview" ? (
          <section className="content-grid">
            <article className="panel wide">
              <div className="panel-header">
                <div>
                  <h2>Catalogo del deposito</h2>
                  <p>Vista simple para revisar productos, categoria y stock minimo.</p>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Producto</th>
                      <th>Categoria</th>
                      <th>Unidad</th>
                      <th>Stock</th>
                      <th>Minimo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleItems.map((item) => (
                      <tr key={item.id}>
                        <td>{item.sku}</td>
                        <td>{item.name}</td>
                        <td>{categories.find((category) => category.id === item.categoryId)?.name ?? "-"}</td>
                        <td>{item.unit}</td>
                        <td>{item.quantity}</td>
                        <td>{item.minQuantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </section>
        ) : null}

        {activeView === "stock" ? (
          <section className="content-grid">
            <article className="panel wide">
              <div className="panel-header">
                <div>
                  <h2>Stock actual</h2>
                  <p>Lectura rapida del inventario por producto en el deposito visible.</p>
                </div>
              </div>
              <div className="chip-grid">
                {visibleItems.map((item) => (
                  <article key={item.id} className="chip-card">
                    <strong>{item.name}</strong>
                    <span>
                      {item.sku} | {item.quantity} {item.unit}
                    </span>
                  </article>
                ))}
              </div>
            </article>
          </section>
        ) : null}

        {activeView === "movements" ? (
          <section className="content-grid">
            <article className="panel">
              <div className="panel-header">
                <div>
                  <h2>Cargar movimiento</h2>
                </div>
              </div>
              <form className="form-grid" onSubmit={handleMovementSubmit}>
                <label>
                  <span>Fecha</span>
                  <input
                    type="date"
                    value={movementForm.date}
                    onChange={(event) => setMovementForm((current) => ({ ...current, date: event.target.value }))}
                  />
                </label>
                <label>
                  <span>Deposito</span>
                  <select
                    value={movementForm.siteId}
                    onChange={(event) => {
                      const siteId = event.target.value;
                      const nextItemId = items.find((item) => item.siteId === siteId)?.id ?? "";
                      setMovementForm((current) => ({ ...current, siteId, itemId: nextItemId }));
                    }}
                  >
                    {sites.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Producto</span>
                  <select
                    value={movementForm.itemId}
                    onChange={(event) => setMovementForm((current) => ({ ...current, itemId: event.target.value }))}
                  >
                    {items
                      .filter((item) => item.siteId === movementForm.siteId)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  <span>Tipo</span>
                  <select
                    value={movementForm.direction}
                    onChange={(event) =>
                      setMovementForm((current) => ({ ...current, direction: event.target.value as "in" | "out" }))
                    }
                  >
                    <option value="in">Entrada</option>
                    <option value="out">Salida</option>
                  </select>
                </label>
                <label>
                  <span>Cantidad</span>
                  <input
                    type="number"
                    min="1"
                    value={movementForm.quantity}
                    onChange={(event) => setMovementForm((current) => ({ ...current, quantity: event.target.value }))}
                  />
                </label>
                <label>
                  <span>Motivo</span>
                  <input
                    type="text"
                    value={movementForm.reason}
                    onChange={(event) => setMovementForm((current) => ({ ...current, reason: event.target.value }))}
                  />
                </label>
                <button type="submit" className="primary-button">
                  Guardar movimiento demo
                </button>
              </form>
            </article>

            <article className="panel">
              <div className="panel-header">
                <div>
                  <h2>Ultimos movimientos</h2>
                </div>
              </div>
              <div className="list-stack">
                {visibleMovements.slice(0, 6).map((movement) => (
                  <div key={movement.id} className="list-row">
                    <div>
                      <strong>{items.find((item) => item.id === movement.itemId)?.name ?? "Producto"}</strong>
                      <span>
                        {movement.date} | {movement.reason}
                      </span>
                    </div>
                    <strong className={movement.direction === "in" ? "tone-positive" : "tone-negative"}>
                      {movement.direction === "in" ? "+" : "-"}
                      {movement.quantity}
                    </strong>
                  </div>
                ))}
              </div>
            </article>
          </section>
        ) : null}

        {activeView === "orders" ? (
          <section className="content-grid">
            <article className="panel wide">
              <div className="panel-header">
                <div>
                  <h2>Pedidos demo</h2>
                  <p>Seguimiento inicial de compras y recepciones pendientes.</p>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Codigo</th>
                      <th>Proveedor</th>
                      <th>Estado</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleOrders.map((order) => (
                      <tr key={order.id}>
                        <td>{order.code}</td>
                        <td>{order.supplier}</td>
                        <td>{order.status}</td>
                        <td>{formatCurrency(order.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </section>
        ) : null}

        {activeView === "questions" ? (
          <section className="content-grid">
            <article className="panel wide">
              <div className="panel-header">
                <div>
                  <h2>Preguntas</h2>
                </div>
              </div>
              <div className="question-stack">
                {discoveryQuestions.map((question) => (
                  <section key={question.id} className="question-card">
                    <div>
                      <h3>{question.title}</h3>
                    </div>
                    <div className="option-row">
                      {question.options.map((option) => (
                        <label
                          key={option}
                          className={answers[question.id] === option ? "option-pill active" : "option-pill"}
                        >
                          <input
                            type="radio"
                            name={question.id}
                            value={option}
                            checked={answers[question.id] === option}
                            onChange={(event) =>
                              setAnswers((current) => ({ ...current, [question.id]: event.target.value }))
                            }
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </article>
          </section>
        ) : null}
      </ProductShell>
    </main>
  );
}
