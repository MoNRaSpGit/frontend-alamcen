import { FormEvent, useMemo, useState } from "react";
import { Edit3, LoaderCircle, Package2, RefreshCw, ScanBarcode, Search } from "lucide-react";
import { getStockIntensity, getStockLabel, TrackedStockItem } from "./alamcen.stock";

type StockTabProps = {
  items: TrackedStockItem[];
  loading?: boolean;
  onRefresh?: () => void;
  onClearDemo?: () => void;
  onUpdateStock: (productId: number, quantity: number) => void;
};

export function StockTab({ items, loading = false, onRefresh, onClearDemo, onUpdateStock }: StockTabProps) {
  const [searchInput, setSearchInput] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [quantityDraft, setQuantityDraft] = useState("");
  const [searchNote, setSearchNote] = useState("");

  const criticalCount = items.filter((item) => getStockIntensity(item.quantity) === "critical").length;
  const warningCount = items.filter((item) => getStockIntensity(item.quantity) === "warning").length;
  const normalCount = items.filter((item) => getStockIntensity(item.quantity) === "normal").length;

  const editingProduct = useMemo(() => items.find((item) => item.productId === editingProductId) || null, [items, editingProductId]);

  function normalizeQuery(value: string | null | undefined) {
    return String(value || "").trim().replace(/\s+/g, "");
  }

  function findProduct(query: string) {
    const normalizedQuery = normalizeQuery(query);
    if (!normalizedQuery) {
      return null;
    }

    const barcodeMatch = items.find((item) => normalizeQuery(item.barcode) === normalizedQuery);
    if (barcodeMatch) {
      return barcodeMatch;
    }

    const loweredQuery = normalizedQuery.toLowerCase();
    return items.find((item) => item.name.toLowerCase().includes(loweredQuery)) || null;
  }

  function openEdit(product: TrackedStockItem) {
    setEditingProductId(product.productId);
    setQuantityDraft(String(product.quantity));
  }

  function closeEdit() {
    setEditingProductId(null);
    setQuantityDraft("");
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const match = findProduct(searchInput);
    setSearchNote("");

    if (!match) {
      setSelectedProductId(null);
      setSearchNote("No encontramos un producto con ese codigo o nombre.");
      return;
    }

    setSelectedProductId(match.productId);
    if (normalizeQuery(match.barcode) && normalizeQuery(match.barcode) === normalizeQuery(searchInput)) {
      openEdit(match);
      setSearchNote(`Encontrado: ${match.name}.`);
      return;
    }

    setSearchNote(`Encontrado: ${match.name}.`);
  }

  function handleSaveEdit() {
    if (!editingProduct) {
      return;
    }

    const parsedQuantity = Number(quantityDraft.replace(",", "."));
    if (!Number.isFinite(parsedQuantity) || parsedQuantity < 0) {
      return;
    }

    onUpdateStock(editingProduct.productId, Math.floor(parsedQuantity));
    setSelectedProductId(editingProduct.productId);
    closeEdit();
    setSearchNote(`Stock actualizado para ${editingProduct.name}.`);
  }

  return (
    <section className="stock-page">
      <article className="panel-card stock-hero">
        <div>
          <p className="stock-kicker">Stock visual</p>
          <h2>Seguimiento de productos vendidos</h2>
          <p className="stock-helper">Arranca en 10 unidades la primera vez que se vende un producto y baja con cada confirmacion.</p>
        </div>
        <div className="stock-hero-actions">
          {onRefresh ? (
            <button type="button" className="stock-ghost-button" onClick={onRefresh}>
              <RefreshCw size={16} />
              Refrescar
            </button>
          ) : null}
          {onClearDemo ? (
            <button type="button" className="stock-ghost-button" onClick={onClearDemo}>
              Reiniciar demo
            </button>
          ) : null}
        </div>
      </article>

      <article className="panel-card stock-search">
        <form className="stock-search-form" onSubmit={handleSearch}>
          <label className="stock-search-label">
            <span>
              <Search size={14} /> Buscar o escanear producto
            </span>
            <input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Barcode o nombre"
            />
          </label>
          <button type="submit" className="stock-search-button">
            <ScanBarcode size={16} />
            Buscar
          </button>
        </form>
        {searchNote ? <p className="stock-search-note">{searchNote}</p> : null}
      </article>

      <article className="panel-card stock-summary">
        <div className="stock-summary-chip critical">
          <strong>{criticalCount}</strong>
          <span>Criticos</span>
        </div>
        <div className="stock-summary-chip warning">
          <strong>{warningCount}</strong>
          <span>Bajo stock</span>
        </div>
        <div className="stock-summary-chip normal">
          <strong>{normalCount}</strong>
          <span>Normales</span>
        </div>
        <div className="stock-summary-chip total">
          <strong>{items.length}</strong>
          <span>Seguidos</span>
        </div>
      </article>

      {loading ? (
        <article className="panel-card stock-empty">
          <LoaderCircle size={18} className="spin" />
          Cargando stock...
        </article>
      ) : null}

      {!loading && !items.length ? (
        <article className="panel-card stock-empty">
          <Package2 size={18} />
          Aun no hay productos seguidos. Confirma una venta para empezar a ver el stock.
        </article>
      ) : null}

      {!loading && items.length ? (
        <div className="stock-grid">
          {items.map((item) => {
            const intensity = getStockIntensity(item.quantity);
            const isSelected = selectedProductId === item.productId;

            return (
              <article key={item.productId} className={`stock-card ${intensity}${isSelected ? " selected" : ""}`}>
                <div className="stock-card-head">
                  <div>
                    <p className="stock-card-name">{item.name}</p>
                    <p className="stock-card-meta">
                      Stock inicial {item.initialQuantity} - stock actual {item.quantity}
                    </p>
                    {item.barcode ? <p className="stock-card-meta barcode">Barcode {item.barcode}</p> : null}
                  </div>
                  <div className="stock-card-head-actions">
                    <span className={`stock-badge ${intensity}`}>{getStockLabel(item.quantity)}</span>
                    <button type="button" className="stock-edit-button" onClick={() => openEdit(item)}>
                      <Edit3 size={14} />
                      Actualizar
                    </button>
                  </div>
                </div>

                <div className="stock-card-body">
                  <div className="stock-quantity">{item.quantity}</div>
                  <p className="stock-card-note">
                    Inicial {item.initialQuantity} - Actual {item.quantity}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      {editingProduct ? (
        <div className="manual-modal-backdrop" onClick={closeEdit}>
          <section className="manual-modal stock-edit-modal" onClick={(event) => event.stopPropagation()}>
            <div className="manual-modal-header">
              <strong>Actualizar stock</strong>
              <button type="button" className="manual-modal-close" onClick={closeEdit} aria-label="Cerrar">
                ×
              </button>
            </div>
            <div className="manual-modal-copy">
              <span>{editingProduct.name}</span>
              <strong>{editingProduct.barcode || "Sin barcode"}</strong>
            </div>
            <div className="manual-modal-form">
              <label className="manual-modal-label">Stock actual</label>
              <input
                className="manual-modal-input"
                value={quantityDraft}
                onChange={(event) => setQuantityDraft(event.target.value)}
                inputMode="numeric"
              />
              <button type="button" className="manual-modal-submit" onClick={handleSaveEdit}>
                Guardar stock
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
