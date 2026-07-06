import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Menu, UserRound } from "lucide-react";
import { toast } from "react-toastify";
import { logoutSession } from "../auth/auth.client";
import { AlamcenHomePage } from "./AlamcenHomePage";
import { clearProductLookupCache, createPayment, fetchAlamcenStatus, fetchDashboard, listProducts, updateProduct } from "./alamcen.catalog.client";
import { StoredAuthUser } from "../auth/auth.types";
import { BarcodeProductLookup } from "./alamcen.types";
import { previewAppUpdateNotice } from "../../shared/pwa/sw-updates";

type AlamcenWorkspaceProps = {
  currentUser: StoredAuthUser;
  onLoggedOut: () => void;
};

type WorkspaceTab = "scanner" | "panel" | "products";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0
  }).format(value);
}

export function AlamcenWorkspace({ currentUser, onLoggedOut }: AlamcenWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("scanner");
  const [statusError, setStatusError] = useState("");
  const [panelRefreshKey, setPanelRefreshKey] = useState(0);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchAlamcenStatus()
      .then(() => {
        setStatusError("");
      })
      .catch((error) => {
        setStatusError(error instanceof Error ? error.message : "No pudimos validar el módulo.");
      });
  }, []);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  async function handleLogout() {
    await logoutSession();
    onLoggedOut();
  }

  function handleResetProductCache() {
    clearProductLookupCache();
    toast.success("Cache de productos reiniciado.");
  }

  function handlePreviewUpdateNotice() {
    previewAppUpdateNotice();
    toast.success("Aviso de actualizacion disparado.");
  }

  return (
    <main className="workspace-shell">
      <header className="workspace-topbar">
        <div className="workspace-topbar-actions">
          <span className="workspace-tenant-badge">
            {currentUser.tenantContext?.tenant.name || "Sin tenant"}
          </span>
          <button
            type="button"
            className={activeTab === "scanner" ? "workspace-tab active" : "workspace-tab"}
            onClick={() => setActiveTab("scanner")}
          >
            Caja
          </button>
          <button
            type="button"
            className={activeTab === "panel" ? "workspace-tab active" : "workspace-tab"}
            onClick={() => setActiveTab("panel")}
          >
            Panel de control
          </button>
          <button type="button" className="workspace-utility-button" onClick={handleResetProductCache}>
            Reiniciar cache
          </button>
          <button type="button" className="workspace-utility-button" onClick={handlePreviewUpdateNotice}>
            Probar actualizacion
          </button>

          <div className="workspace-user-menu" ref={userMenuRef}>
            <button
              type="button"
              className={isUserMenuOpen ? "workspace-user-button open" : "workspace-user-button"}
              aria-label="Abrir menú de usuario"
              aria-expanded={isUserMenuOpen}
              onClick={() => setIsUserMenuOpen((current) => !current)}
            >
              <UserRound size={18} strokeWidth={2.2} />
              <Menu size={18} strokeWidth={2.2} />
            </button>

            {isUserMenuOpen ? (
              <div className="workspace-user-dropdown">
                <button
                  type="button"
                  className={activeTab === "products" ? "workspace-user-dropdown-item active" : "workspace-user-dropdown-item"}
                  onClick={() => {
                    setActiveTab("products");
                    setIsUserMenuOpen(false);
                  }}
                >
                  Productos
                </button>
                <button
                  type="button"
                  className="workspace-user-dropdown-item"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    void handleLogout();
                  }}
                >
                  Salir
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>
      {statusError ? <p className="workspace-error">{statusError}</p> : null}

      {activeTab === "scanner" ? <AlamcenHomePage onSaleRecorded={() => setPanelRefreshKey((current) => current + 1)} /> : null}
      {activeTab === "panel" ? <PanelTab refreshKey={panelRefreshKey} onPaymentRecorded={() => setPanelRefreshKey((current) => current + 1)} /> : null}
      {activeTab === "products" ? <ProductsTab /> : null}
    </main>
  );
}

function PanelTab({ refreshKey, onPaymentRecorded }: { refreshKey: number; onPaymentRecorded: () => void }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboard, setDashboard] = useState<Awaited<ReturnType<typeof fetchDashboard>>["dashboard"] | null>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchDashboard()
      .then((payload) => {
        setDashboard(payload.dashboard);
        setError("");
      })
      .catch((nextError) => {
        setError(nextError instanceof Error ? nextError.message : "No pudimos cargar el panel.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [refreshKey]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedAmount = Number(amount.replace(",", "."));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || !description.trim()) {
      setError("Ingresa monto válido y descripción.");
      return;
    }

    setSaving(true);
    try {
      await createPayment({
        externalId: `alamcen-payment-${Date.now()}`,
        amount: parsedAmount,
        description: description.trim()
      });
      setAmount("");
      setDescription("");
      setError("");
      onPaymentRecorded();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No pudimos registrar el pago.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <section className="panel-card">Cargando panel...</section>;
  }

  return (
    <section className="panel-grid">
      <article className="panel-card panel-metrics-card">
        <h2>Resumen del día</h2>
        {dashboard ? (
          <div className="panel-metrics">
            <div><span>Caja inicial</span><strong>{formatCurrency(dashboard.metrics.initialCash)}</strong></div>
            <div><span>Ventas</span><strong>{formatCurrency(dashboard.metrics.salesToday)}</strong></div>
            <div><span>Pagos</span><strong>{formatCurrency(dashboard.metrics.paymentsTotal)}</strong></div>
            <div><span>Monto actual</span><strong>{formatCurrency(dashboard.metrics.currentAmount)}</strong></div>
          </div>
        ) : null}
      </article>

      <article className="panel-card">
        <h2>Registrar pago</h2>
        <form className="panel-payment-form" onSubmit={handleSubmit}>
          <input type="text" inputMode="decimal" placeholder="Monto" value={amount} onChange={(event) => setAmount(event.target.value)} />
          <input type="text" placeholder="Descripción" value={description} onChange={(event) => setDescription(event.target.value)} />
          <button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar pago"}</button>
        </form>
        {error ? <p className="workspace-error">{error}</p> : null}
      </article>

      <article className="panel-card">
        <h2>Ranking</h2>
        <div className="panel-list">
          {(dashboard?.ranking || []).length ? dashboard?.ranking.map((item) => (
            <div key={item.key} className="panel-list-row">
              <span>{item.name}</span>
              <strong>{item.qty}</strong>
            </div>
          )) : <p className="workspace-helper">Todavía no hay ventas registradas.</p>}
        </div>
      </article>

      <article className="panel-card">
        <h2>Movimientos</h2>
        <div className="panel-list">
          {(dashboard?.movements || []).length ? dashboard?.movements.map((movement) => (
            <div key={movement.id} className="panel-movement-card">
              <div className="panel-list-row">
                <span>{movement.type}</span>
                <strong>{formatCurrency(movement.amount)}</strong>
              </div>
              <small>{new Date(movement.createdAt).toLocaleString("es-UY")}</small>
            </div>
          )) : <p className="workspace-helper">Sin movimientos todavía.</p>}
        </div>
      </article>
    </section>
  );
}

function ProductsTab() {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [products, setProducts] = useState<BarcodeProductLookup[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [priceDraft, setPriceDraft] = useState("");

  function loadProducts(nextSearch = "") {
    setLoading(true);
    listProducts({ search: nextSearch, limit: 30 })
      .then((payload) => {
        setProducts(payload.items);
        setError("");
      })
      .catch((nextError) => {
        setError(nextError instanceof Error ? nextError.message : "No pudimos cargar productos.");
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    loadProducts();
  }, []);

  const editingProduct = useMemo(
    () => products.find((product) => product.id === editingId) || null,
    [editingId, products]
  );

  function openEdit(product: BarcodeProductLookup) {
    setEditingId(product.id);
    setNameDraft(product.nombre);
    setPriceDraft(String(product.precioVenta));
  }

  async function saveEdit() {
    if (!editingProduct) {
      return;
    }

    const parsedPrice = Number(priceDraft.replace(",", "."));
    if (!nameDraft.trim() || !Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setError("Nombre y precio son obligatorios.");
      return;
    }

    try {
      const updated = await updateProduct(editingProduct.id, {
        nombre: nameDraft.trim(),
        precioVenta: parsedPrice
      });
      setProducts((current) => current.map((product) => product.id === updated.id ? updated : product));
      setEditingId(null);
      setError("");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No pudimos guardar el producto.");
    }
  }

  return (
    <section className="panel-card">
      <div className="products-toolbar">
        <form
          className="products-search-form"
          onSubmit={(event) => {
            event.preventDefault();
            loadProducts(search);
          }}
        >
          <input type="text" placeholder="Buscar por nombre" value={search} onChange={(event) => setSearch(event.target.value)} />
          <button type="submit">Buscar</button>
        </form>
      </div>

      {loading ? <p className="workspace-helper">Cargando productos...</p> : null}
      {error ? <p className="workspace-error">{error}</p> : null}

      <div className="products-list">
        {products.map((product) => (
          <article key={product.id} className="products-item-card">
            <div>
              <strong>{product.nombre}</strong>
              <p>{product.barcode || "Sin barcode"} · {formatCurrency(product.precioVenta)}</p>
            </div>
            <button type="button" className="sale-line-edit" onClick={() => openEdit(product)}>
              Editar
            </button>
          </article>
        ))}
      </div>

      {editingProduct ? (
        <div className="manual-modal-backdrop" onClick={() => setEditingId(null)}>
          <section className="manual-modal" onClick={(event) => event.stopPropagation()}>
            <div className="manual-modal-header">
              <strong>Editar producto</strong>
              <button type="button" className="manual-modal-close" onClick={() => setEditingId(null)} aria-label="Cerrar">
                ×
              </button>
            </div>
            <div className="manual-modal-form">
              <label className="manual-modal-label">Nombre</label>
              <input className="manual-modal-input" value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} />
              <label className="manual-modal-label">Precio</label>
              <input className="manual-modal-input" value={priceDraft} onChange={(event) => setPriceDraft(event.target.value)} />
              <button type="button" className="manual-modal-submit" onClick={saveEdit}>
                Guardar
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
