import { FormEvent, useMemo, useState } from "react";
import { Edit3, LoaderCircle, Package2, RefreshCw, ScanBarcode, Search } from "lucide-react";
import { findProductByBarcodeDetailed } from "./alamcen.catalog.client";
import { BarcodeProductLookup } from "./alamcen.types";
import { findTrackedStockItem, getStockIntensity, getStockLabel, StockUpdateInput, TrackedStockItem } from "./alamcen.stock";

type StockTabProps = {
  items: TrackedStockItem[];
  loading?: boolean;
  onRefresh?: () => void;
  onClearDemo?: () => void;
  onUpdateStock: (payload: StockUpdateInput) => void;
};

type StockTarget = {
  productId: number;
  name: string;
  barcode: string | null;
  image: string | null;
  price: number | null;
  quantity: number;
};

function StockCompactView({ item }: { item: StockTarget }) {
  return (
    <div className="stock-card-mobile">
      <div className="stock-card-mobile-media">
        {item.image ? (
          <img src={item.image} alt={item.name} className="stock-card-mobile-image" />
        ) : (
          <div className="stock-card-mobile-placeholder">{item.name.slice(0, 2).toUpperCase()}</div>
        )}
      </div>
      <div className="stock-card-mobile-copy">
        <p className="stock-card-mobile-name">{item.name}</p>
        <p className="stock-card-mobile-price">Precio {formatPrice(item.price)}</p>
        <p className="stock-card-mobile-qty">Cantidad {item.quantity}</p>
      </div>
    </div>
  );
}

function formatPrice(value: number | null) {
  if (!Number.isFinite(value ?? NaN)) {
    return "Precio no cargado";
  }

  return new Intl.NumberFormat("es-UY", {
    maximumFractionDigits: 0
  }).format(value as number);
}

function normalizeQuery(value: string | null | undefined) {
  return String(value || "").trim().replace(/\s+/g, "");
}

function toTargetFromTracked(item: TrackedStockItem): StockTarget {
  return {
    productId: item.productId,
    name: item.name,
    barcode: item.barcode,
    image: item.image,
    price: item.price,
    quantity: item.quantity
  };
}

function toTargetFromBackend(product: BarcodeProductLookup): StockTarget {
  return {
    productId: product.id,
    name: product.nombre,
    barcode: product.barcodeNormalized || product.barcode || null,
    image: product.imagen,
    price: product.precioVenta,
    quantity: product.stockActual
  };
}

export function StockTab({ items, loading = false, onRefresh, onClearDemo, onUpdateStock }: StockTabProps) {
  const [activeTab, setActiveTab] = useState<"view" | "incoming">("view");
  const [searchInput, setSearchInput] = useState("");
  const [selectedTarget, setSelectedTarget] = useState<StockTarget | null>(null);
  const [editingTarget, setEditingTarget] = useState<StockTarget | null>(null);
  const [quantityDraft, setQuantityDraft] = useState("");
  const [searchNote, setSearchNote] = useState("");
  const [searching, setSearching] = useState(false);

  const lowStockItems = useMemo(() => items.filter((item) => item.quantity < 10), [items]);
  const criticalCount = items.filter((item) => getStockIntensity(item.quantity) === "critical").length;
  const warningCount = items.filter((item) => getStockIntensity(item.quantity) === "warning").length;
  const normalCount = items.filter((item) => getStockIntensity(item.quantity) === "normal").length;

  function openEdit(target: StockTarget) {
    setEditingTarget(target);
    setQuantityDraft(String(target.quantity));
  }

  function closeEdit() {
    setEditingTarget(null);
    setQuantityDraft("");
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedSearch = normalizeQuery(searchInput);
    if (!normalizedSearch) {
      return;
    }

    setSearching(true);
    setSearchNote("");

    try {
      const localMatch = findTrackedStockItem(items, searchInput);
      if (localMatch) {
        const target = toTargetFromTracked(localMatch);
        setSelectedTarget(target);
        setSearchNote(`Encontrado: ${target.name}.`);
        if (normalizeQuery(target.barcode) === normalizedSearch || /^\d+$/.test(normalizedSearch)) {
          openEdit(target);
        }
        return;
      }

      const { product } = await findProductByBarcodeDetailed(normalizedSearch);
      if (!product) {
        setSelectedTarget(null);
        setSearchNote("No encontramos un producto con ese codigo.");
        return;
      }

      const target = toTargetFromBackend(product);
      setSelectedTarget(target);
      setSearchNote(`Encontrado: ${target.name}.`);
      openEdit(target);
    } catch (error) {
      console.error(error);
      setSelectedTarget(null);
      setSearchNote(error instanceof Error ? error.message : "No pudimos buscar el producto.");
    } finally {
      setSearching(false);
    }
  }

  function handleSaveEdit() {
    if (!editingTarget) {
      return;
    }

    const parsedQuantity = Number(quantityDraft.replace(",", "."));
    if (!Number.isFinite(parsedQuantity) || parsedQuantity < 0) {
      return;
    }

    onUpdateStock({
      productId: editingTarget.productId,
      quantity: Math.floor(parsedQuantity),
      name: editingTarget.name,
      barcode: editingTarget.barcode,
      image: editingTarget.image,
      price: editingTarget.price
    });

    setSelectedTarget(null);
    setSearchInput("");
    closeEdit();
    setSearchNote(`Stock actualizado para ${editingTarget.name}.`);
  }

  return (
    <section className="stock-page">
      <article className="panel-card stock-hero">
        <div>
          <p className="stock-kicker">Stock visual</p>
          <h2>Seguimiento de productos</h2>
          <p className="stock-helper">La vista muestra solo stock menor a 10. En ingresar stock podés buscar cualquier producto por código.</p>
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
        <div className="stock-subtabs">
          <button
            type="button"
            className={activeTab === "view" ? "stock-subtab active" : "stock-subtab"}
            onClick={() => setActiveTab("view")}
          >
            Ver stock
          </button>
          <button
            type="button"
            className={activeTab === "incoming" ? "stock-subtab active" : "stock-subtab"}
            onClick={() => setActiveTab("incoming")}
          >
            Ingresar stock
          </button>
        </div>

        {activeTab === "incoming" ? (
          <>
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
              <button type="submit" className="stock-search-button" disabled={searching}>
                <ScanBarcode size={16} />
                {searching ? "Buscando..." : "Buscar"}
              </button>
            </form>
            {searchNote ? <p className="stock-search-note">{searchNote}</p> : null}
          </>
        ) : (
          <p className="stock-search-note">Acá solo se muestran los productos con stock menor a 10.</p>
        )}
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

      {activeTab === "view" && !loading && lowStockItems.length ? (
        <div className="stock-grid">
          {lowStockItems.map((item) => {
            const intensity = getStockIntensity(item.quantity);
            const target = toTargetFromTracked(item);
            return (
              <article key={item.productId} className={`stock-card ${intensity}`}>
                <div className="stock-card-head">
                  <div>
                    <p className="stock-card-name">{item.name}</p>
                    <p className="stock-card-meta">Stock actual {item.quantity}</p>
                    {item.barcode ? <p className="stock-card-meta barcode">Barcode {item.barcode}</p> : null}
                  </div>
                  <div className="stock-card-head-actions">
                    <span className={`stock-badge ${intensity}`}>{getStockLabel(item.quantity)}</span>
                    <button type="button" className="stock-edit-button" onClick={() => openEdit(toTargetFromTracked(item))}>
                      <Edit3 size={14} />
                      Actualizar
                    </button>
                  </div>
                </div>

                <div className="stock-card-body">
                  <div className="stock-quantity">{item.quantity}</div>
                  <p className="stock-card-note">Stock actual {item.quantity}</p>
                </div>

                <StockCompactView item={target} />
              </article>
            );
          })}
        </div>
      ) : null}

      {activeTab === "incoming" && selectedTarget ? (
        <article className={`stock-card ${getStockIntensity(selectedTarget.quantity)} stock-result`}>
          <div className="stock-card-head">
            <div>
              <p className="stock-card-name">{selectedTarget.name}</p>
              <p className="stock-card-meta">Stock actual {selectedTarget.quantity}</p>
              {selectedTarget.barcode ? <p className="stock-card-meta barcode">Barcode {selectedTarget.barcode}</p> : null}
            </div>
            <div className="stock-card-head-actions">
              <span className={`stock-badge ${getStockIntensity(selectedTarget.quantity)}`}>{getStockLabel(selectedTarget.quantity)}</span>
              <button type="button" className="stock-edit-button" onClick={() => openEdit(selectedTarget)}>
                <Edit3 size={14} />
                Actualizar
              </button>
            </div>
          </div>

          <div className="stock-card-body">
            <div className="stock-quantity">{selectedTarget.quantity}</div>
            <p className="stock-card-note">Stock actual {selectedTarget.quantity}</p>
          </div>

          <StockCompactView item={selectedTarget} />
        </article>
      ) : null}

      {editingTarget ? (
        <div className="manual-modal-backdrop" onClick={closeEdit}>
          <section className="manual-modal stock-edit-modal" onClick={(event) => event.stopPropagation()}>
            <div className="manual-modal-header">
              <strong>Actualizar stock</strong>
              <button type="button" className="manual-modal-close" onClick={closeEdit} aria-label="Cerrar">
                ×
              </button>
            </div>
            <div className="manual-modal-copy">
              <span>{editingTarget.name}</span>
              <strong>{editingTarget.barcode || "Sin barcode"}</strong>
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
