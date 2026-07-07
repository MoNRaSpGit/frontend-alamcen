import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftRight, CreditCard, HandCoins, Menu, Trophy, UserRound, Wallet } from "lucide-react";
import { logoutSession } from "../auth/auth.client";
import { AlamcenHomePage } from "./AlamcenHomePage";
import {
  createPayment,
  fetchAlamcenStatus,
  fetchDashboard,
  listProducts,
  updateProduct
} from "./alamcen.catalog.client";
import { BarcodeProductLookup } from "./alamcen.types";

type AlamcenWorkspaceProps = {
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

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return { date: "-", time: "" };
  }

  return {
    date: date.toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit" }),
    time: date.toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit" })
  };
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) {
    return "0%";
  }

  return `${value >= 0 ? "+" : ""}${value.toFixed(0)}%`;
}

function MetricCard({
  title,
  value,
  hint,
  highlight = false
}: {
  title: string;
  value: string;
  hint: string;
  highlight?: boolean;
}) {
  return (
    <article className={highlight ? "alamcen-panel-metric-card highlight" : "alamcen-panel-metric-card"}>
      <p className="alamcen-panel-metric-title">{title}</p>
      <p className="alamcen-panel-metric-value">{value}</p>
      <p className="alamcen-panel-metric-hint">{hint}</p>
    </article>
  );
}

export function AlamcenWorkspace({ onLoggedOut }: AlamcenWorkspaceProps) {
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
        setStatusError(error instanceof Error ? error.message : "No pudimos validar el modulo.");
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

  return (
    <main className="workspace-shell">
      <header className="workspace-topbar">
        <div className="workspace-topbar-actions">
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

          <div className="workspace-user-menu" ref={userMenuRef}>
            <button
              type="button"
              className={isUserMenuOpen ? "workspace-user-button open" : "workspace-user-button"}
              aria-label="Abrir menu de usuario"
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
  const [expandedMovementId, setExpandedMovementId] = useState<string | null>(null);

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
      setError("Ingresa monto valido y descripcion.");
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
    return <section className="alamcen-panel-card">Cargando panel...</section>;
  }

  const comparisonVsYesterday =
    dashboard && dashboard.comparison.yesterday > 0
      ? ((dashboard.comparison.today - dashboard.comparison.yesterday) / dashboard.comparison.yesterday) * 100
      : 0;
  const visibleMovements = dashboard?.movements.slice(0, 8) ?? [];
  const visibleRanking = dashboard?.ranking.slice(0, 8) ?? [];

  return (
    <section className="alamcen-panel-page">
      <div className="alamcen-panel-hero">
        <div>
          <p className="alamcen-panel-hero-kicker">Caja diaria</p>
          <h1>Panel de control</h1>
          <p>Ventas, pagos y productos mas movidos del dia.</p>
        </div>
        <div className="alamcen-panel-status">
          <span>Estado</span>
          <strong>Abierta</strong>
          <span>{new Date().toLocaleDateString("es-UY", { weekday: "long", day: "2-digit", month: "long" })}</span>
        </div>
      </div>

      <article className="alamcen-panel-section">
        <div className="alamcen-panel-section-header">
          <div>
            <h2>Caja diaria</h2>
            <p>Resumen rapido para saber como viene la jornada.</p>
          </div>
          {error ? <span className="alamcen-panel-error">{error}</span> : null}
        </div>
        {dashboard ? (
          <div className="alamcen-panel-metrics-grid">
            <MetricCard title="Caja inicial" value={formatCurrency(dashboard.metrics.initialCash)} hint="Monto configurado para abrir el dia." />
            <MetricCard title="Ventas del dia" value={formatCurrency(dashboard.metrics.salesToday)} hint="Total vendido desde la caja." highlight />
            <MetricCard title="Pagos realizados" value={formatCurrency(dashboard.metrics.paymentsTotal)} hint="Egresos registrados manualmente." />
            <MetricCard title="Monto actual" value={formatCurrency(dashboard.metrics.currentAmount)} hint="Caja inicial + ventas - pagos." />
            <article className="alamcen-panel-metric-card comparison">
              <p className="alamcen-panel-metric-title">Comparativa</p>
              <div className="alamcen-panel-comparison-row">
                <span>vs ayer</span>
                <strong className={comparisonVsYesterday >= 0 ? "positive" : "negative"}>{formatPercent(comparisonVsYesterday)}</strong>
              </div>
              <div className="alamcen-panel-comparison-values">
                <span>Hoy {formatCurrency(dashboard.comparison.today)}</span>
                <span>Ayer {formatCurrency(dashboard.comparison.yesterday)}</span>
              </div>
            </article>
            <MetricCard title="Record" value={formatCurrency(dashboard.comparison.record)} hint="Mejor caja diaria registrada." />
          </div>
        ) : null}
      </article>

      {dashboard ? (
        <article className="alamcen-panel-section">
          <div className="alamcen-panel-section-header">
            <div>
              <h2>Medios de cobro</h2>
              <p>Base para ordenar la lectura de caja.</p>
            </div>
          </div>
          <div className="alamcen-panel-metrics-grid compact">
            <MetricCard title="Efectivo estimado" value={formatCurrency(dashboard.metrics.currentAmount)} hint="Disponible luego de pagos registrados." />
            <MetricCard title="Ventas" value={formatCurrency(dashboard.metrics.salesToday)} hint="Ingresos por tickets confirmados." />
            <MetricCard title="Pagos" value={formatCurrency(dashboard.metrics.paymentsTotal)} hint="Salidas cargadas desde el panel." />
          </div>
        </article>
      ) : null}

      <div className="alamcen-panel-layout-grid">
        <div className="alamcen-panel-left-stack">
          <article className="alamcen-panel-block accent-blue">
            <div className="alamcen-panel-block-header">
              <h3><ArrowLeftRight size={17} /> Movimientos</h3>
              <p>Ultimas ventas y pagos registrados.</p>
            </div>
            <div className="alamcen-panel-block-body">
              <div className="alamcen-panel-movements-list">
                {visibleMovements.length ? visibleMovements.map((movement) => {
                  const movementTime = formatDateTime(movement.createdAt);
                  const isPayment = movement.detail.kind === "payment";
                  const isExpanded = expandedMovementId === movement.id;
                  return (
                    <div key={movement.id}>
                      <div className={isPayment ? "alamcen-panel-movement-row payment" : "alamcen-panel-movement-row sale"}>
                        <div>
                          <p>{movement.type}</p>
                          <span>{movementTime.date} {movementTime.time}</span>
                        </div>
                        <div className="alamcen-panel-movement-actions">
                          <strong className={isPayment ? "negative" : "positive"}>
                            {isPayment ? "-" : "+"}{formatCurrency(movement.amount)}
                          </strong>
                          <button type="button" onClick={() => setExpandedMovementId(isExpanded ? null : movement.id)}>
                            {isExpanded ? "Ocultar" : "Detalle"}
                          </button>
                        </div>
                      </div>
                      {isExpanded ? (
                        <div className="alamcen-panel-movement-detail">
                          {movement.detail.kind === "sale" ? (
                            movement.detail.items?.length ? (
                              <ul>
                                {movement.detail.items.map((item) => (
                                  <li key={`${movement.id}-${item.name}`}>
                                    <span>{item.name} x{item.quantity}</span>
                                    <strong>{formatCurrency(item.lineTotal)}</strong>
                                  </li>
                                ))}
                              </ul>
                            ) : <span>Venta sin detalle de productos.</span>
                          ) : (
                            <span>{movement.detail.description || "Pago registrado"}</span>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                }) : (
                  <div className="alamcen-panel-empty">
                    <strong>Sin movimientos todavia.</strong>
                    <span>Cuando confirmes ventas o pagos van a aparecer aca.</span>
                  </div>
                )}
              </div>
            </div>
          </article>
        </div>

        <div className="alamcen-panel-right-stack">
          <article className="alamcen-panel-block accent-violet">
            <div className="alamcen-panel-block-header">
              <h3><Trophy size={17} /> Ranking</h3>
              <p>Productos que mas se movieron.</p>
            </div>
            <div className="alamcen-panel-block-body">
              {visibleRanking.length ? (
                <ol className="alamcen-panel-ranking-list">
                  {visibleRanking.map((item, index) => (
                    <li key={item.key}>
                      <div>
                        <span className="alamcen-panel-ranking-position">#{index + 1}</span>
                        {item.thumbnailUrl ? <img src={item.thumbnailUrl} alt="" /> : <span className="alamcen-panel-ranking-thumb">IMG</span>}
                        <span>{item.name}</span>
                      </div>
                      <strong>{item.qty}</strong>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="alamcen-panel-empty">
                  <strong>Todavia no hay ranking.</strong>
                  <span>Se completa con las ventas del dia.</span>
                </div>
              )}
            </div>
          </article>

          <article className="alamcen-panel-block accent-orange">
            <div className="alamcen-panel-block-header">
              <h3><HandCoins size={17} /> Registrar pago</h3>
              <p>Carga egresos de caja sin salir del panel.</p>
            </div>
            <div className="alamcen-panel-block-body">
              <form className="alamcen-panel-payment-form" onSubmit={handleSubmit}>
                <input type="text" inputMode="decimal" placeholder="Monto" value={amount} onChange={(event) => setAmount(event.target.value)} />
                <input type="text" placeholder="Descripcion" value={description} onChange={(event) => setDescription(event.target.value)} />
                <button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar pago"}</button>
              </form>
            </div>
          </article>

          <article className="alamcen-panel-block accent-green">
            <div className="alamcen-panel-block-header">
              <h3><Wallet size={17} /> Caja</h3>
              <p>Vista rapida del saldo disponible.</p>
            </div>
            <div className="alamcen-panel-live-banner">
              <div>
                <span>Monto actual</span>
                <strong>{dashboard ? formatCurrency(dashboard.metrics.currentAmount) : formatCurrency(0)}</strong>
              </div>
              <CreditCard size={24} />
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

export function LegacyPanelTab({ refreshKey, onPaymentRecorded }: { refreshKey: number; onPaymentRecorded: () => void }) {
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
      setError("Ingresa monto valido y descripcion.");
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
        <h2>Resumen del dia</h2>
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
          <input type="text" placeholder="Descripcion" value={description} onChange={(event) => setDescription(event.target.value)} />
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

