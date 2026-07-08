import { Dispatch, FormEvent, SetStateAction, useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, CreditCard, HandCoins, Trophy, Wallet } from "lucide-react";
import { logoutSession } from "../auth/auth.client";
import { AlamcenHomePage } from "./AlamcenHomePage";
import { PaymentMethodsTab } from "./PaymentMethodsTab";
import {
  createPayment,
  fetchAlamcenStatus,
  fetchDashboard,
  listProducts,
  updateProduct
} from "./alamcen.catalog.client";
import { CUSTOMER_PREVIEW, DemoCustomer } from "./alamcen.customer-demo";
import { BarcodeProductLookup } from "./alamcen.types";
import { clearTrackedStock, loadTrackedStock, recordStockSale, TrackedStockItem, updateTrackedStockItem, StockUpdateInput } from "./alamcen.stock";
import { StockTab } from "./StockTab";
import { SaleLine } from "./alamcen.scanner.types";
import { loadTodayPaymentMetrics } from "./alamcen.payment-metrics";

type AlamcenWorkspaceProps = {
  onLoggedOut: () => void;
};

type WorkspaceTab = "scanner" | "panel" | "customers" | "products" | "stock" | "payment-methods";
type WorkspaceNavItem = {
  key: Exclude<WorkspaceTab, "scanner">;
  label: string;
};

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

const SHOW_PANEL_EXTRAS = false;
const WORKSPACE_MENU_ITEMS: WorkspaceNavItem[] = [
  { key: "panel", label: "Panel de control" },
  { key: "customers", label: "Clientes" },
  { key: "payment-methods", label: "Metodo de pago" }
];

export function AlamcenWorkspace({ onLoggedOut }: AlamcenWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("scanner");
  const [statusError, setStatusError] = useState("");
  const [panelRefreshKey, setPanelRefreshKey] = useState(0);
  const [scannerFocusKey, setScannerFocusKey] = useState(0);
  const [customers, setCustomers] = useState<DemoCustomer[]>(CUSTOMER_PREVIEW);
  const [stockItems, setStockItems] = useState<TrackedStockItem[]>([]);

  useEffect(() => {
    setStockItems(loadTrackedStock());
  }, []);

  useEffect(() => {
    fetchAlamcenStatus()
      .then(() => {
        setStatusError("");
      })
      .catch((error) => {
        setStatusError(error instanceof Error ? error.message : "No pudimos validar el modulo.");
      });
  }, []);

  async function handleLogout() {
    await logoutSession();
    onLoggedOut();
  }

  function handleAccountSale(customerId: string, total: number, itemsLabel: string) {
    const saleTime = new Date().toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit" });

    setCustomers((current) =>
      current.map((customer) =>
        customer.id === customerId
          ? {
              ...customer,
              debtTotal: customer.debtTotal + total,
              lastSale: `Hoy ${saleTime}`,
              sales: [
                {
                  id: `account-sale-${Date.now()}`,
                  amount: total,
                  items: itemsLabel,
                  date: `Hoy ${saleTime}`
                },
                ...customer.sales
              ]
            }
          : customer
      )
    );
  }

  function handleSaleRecorded(saleLines: SaleLine[]) {
    setStockItems(recordStockSale(saleLines));
    setPanelRefreshKey((current) => current + 1);
  }

  return (
    <main className="workspace-shell">
      <header className="workspace-topbar">
        <div className="workspace-topbar-actions">
          <button
            type="button"
            className={activeTab === "scanner" ? "workspace-tab active" : "workspace-tab"}
            onClick={() => {
              setActiveTab("scanner");
              setScannerFocusKey((current) => current + 1);
            }}
          >
            Caja
          </button>
          {WORKSPACE_MENU_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={activeTab === item.key ? "workspace-tab active" : "workspace-tab"}
              onClick={() => setActiveTab(item.key)}
            >
              {item.label}
            </button>
          ))}
          <button type="button" className="workspace-tab workspace-logout-tab" onClick={() => void handleLogout()}>
            Salir
          </button>
        </div>
      </header>
      {statusError ? <p className="workspace-error">{statusError}</p> : null}

      <div className={activeTab === "scanner" ? "workspace-tab-panel active" : "workspace-tab-panel hidden"}>
        <AlamcenHomePage
          customers={customers}
          onAccountSale={handleAccountSale}
          onSaleRecorded={handleSaleRecorded}
          focusRequestId={scannerFocusKey}
        />
      </div>
      {activeTab === "panel" ? <PanelTab refreshKey={panelRefreshKey} onPaymentRecorded={() => setPanelRefreshKey((current) => current + 1)} /> : null}
      {activeTab === "customers" ? <CustomersTab customers={customers} onChangeCustomers={setCustomers} /> : null}
      {activeTab === "payment-methods" ? <PaymentMethodsTab /> : null}
      {activeTab === "products" ? <ProductsTab /> : null}
      {activeTab === "stock" ? (
        <StockTab
          items={stockItems}
          onRefresh={() => setStockItems(loadTrackedStock())}
          onUpdateStock={(payload: StockUpdateInput) => setStockItems(updateTrackedStockItem(payload))}
          onClearDemo={() => {
            clearTrackedStock();
            setStockItems([]);
          }}
        />
      ) : null}
    </main>
  );
}

function PanelTab({ refreshKey, onPaymentRecorded }: { refreshKey: number; onPaymentRecorded: () => void }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboard, setDashboard] = useState<Awaited<ReturnType<typeof fetchDashboard>>["dashboard"] | null>(null);
  const [paymentMetrics, setPaymentMetrics] = useState({ tarjeta: 0, cuenta: 0 });
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [expandedMovementId, setExpandedMovementId] = useState<string | null>(null);
  const [movementLimit, setMovementLimit] = useState(3);

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

  useEffect(() => {
    setPaymentMetrics(loadTodayPaymentMetrics());
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
  const allMovements = dashboard?.movements ?? [];
  const visibleMovements = allMovements.slice(0, movementLimit);
  const visibleRanking = dashboard?.ranking.slice(0, 8) ?? [];
  const hasMoreMovements = movementLimit < allMovements.length;
  const nextMovementButtonLabel =
    !allMovements.length
      ? ""
      : hasMoreMovements && movementLimit === 3
        ? "Mostrar 3 mas"
        : hasMoreMovements
          ? "Mostrar todo"
          : "Mostrar menos";

  function handleToggleMovements() {
    if (!hasMoreMovements) {
      setMovementLimit(3);
      return;
    }

    setMovementLimit((current) => (current === 3 ? Math.min(6, allMovements.length) : allMovements.length));
  }

  return (
    <section className="alamcen-panel-page">
      <div className="alamcen-panel-hero">
        <div>
          <p className="alamcen-panel-hero-kicker">Caja diaria</p>
          <h1>Panel de control</h1>
          <p>Ventas del dia, comparativa y ultimos movimientos.</p>
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
          <div className="alamcen-panel-summary-columns">
            <div className="alamcen-panel-summary-column">
              <MetricCard title="Ventas del dia" value={formatCurrency(dashboard.metrics.salesToday)} hint="Total vendido desde la caja." highlight />
              <MetricCard title="Ventas con tarjeta" value={formatCurrency(paymentMetrics.tarjeta)} hint="Cobros confirmados con tarjeta." />
            </div>
            <div className="alamcen-panel-summary-column">
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
              <MetricCard title="Ventas a credito" value={formatCurrency(paymentMetrics.cuenta)} hint="Ventas cargadas a cuenta." />
            </div>
          </div>
        ) : null}
      </article>

      {SHOW_PANEL_EXTRAS && dashboard ? (
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

      <div className={SHOW_PANEL_EXTRAS ? "alamcen-panel-layout-grid" : "alamcen-panel-layout-grid single"}>
        <div className="alamcen-panel-left-stack">
          <article className="alamcen-panel-block accent-blue">
            <div className="alamcen-panel-block-header">
              <div>
                <h3><ArrowLeftRight size={17} /> Movimientos</h3>
                <p>Ultimas ventas y pagos registrados.</p>
              </div>
              {allMovements.length > 3 ? (
                <button type="button" className="alamcen-panel-movements-toggle" onClick={handleToggleMovements}>
                  {nextMovementButtonLabel}
                </button>
              ) : null}
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

        {SHOW_PANEL_EXTRAS ? (
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
        ) : null}
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

function CustomersTab({
  customers,
  onChangeCustomers
}: {
  customers: DemoCustomer[];
  onChangeCustomers: Dispatch<SetStateAction<DemoCustomer[]>>;
}) {
  const [selectedCustomerId, setSelectedCustomerId] = useState(CUSTOMER_PREVIEW[0]?.id ?? "");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId) ?? customers[0];

  function handleCreateCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextName = customerName.trim();
    if (!nextName) {
      return;
    }

    const nextCustomer = {
      id: `customer-${Date.now()}`,
      name: nextName,
      phone: customerPhone.trim() || "Sin telefono",
      debtTotal: 0,
      lastSale: "Cliente nuevo",
      sales: [],
      payments: []
    };

    onChangeCustomers((current) => [nextCustomer, ...current]);
    setSelectedCustomerId(nextCustomer.id);
    setCustomerName("");
    setCustomerPhone("");
  }

  function handleRegisterCustomerPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCustomer) {
      return;
    }

    const parsedAmount = Number(paymentAmount.replace(",", "."));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return;
    }

    onChangeCustomers((current) =>
      current.map((customer) =>
        customer.id === selectedCustomer.id
          ? {
              ...customer,
              debtTotal: Math.max(0, customer.debtTotal - parsedAmount),
              lastSale: "Pago recien registrado",
              payments: [
                {
                  id: `payment-${Date.now()}`,
                  amount: parsedAmount,
                  note: "Pago registrado en demo",
                  date: new Date().toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit" })
                },
                ...customer.payments
              ]
            }
          : customer
      )
    );
    setPaymentAmount("");
  }

  return (
    <section className="alamcen-customers-page">
      <article className="alamcen-customers-card">
        <p className="alamcen-customers-kicker">Clientes</p>
        <h2>Alta rapida</h2>
        <p className="alamcen-customers-note">Demo visual: permite mostrar el flujo sin guardar en base de datos.</p>
        <form className="alamcen-customers-form" onSubmit={handleCreateCustomer}>
          <label>
            <span>Nombre</span>
            <input
              type="text"
              placeholder="Juan Perez"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
            />
          </label>
          <label>
            <span>Telefono</span>
            <input
              type="text"
              placeholder="099 000 000"
              value={customerPhone}
              onChange={(event) => setCustomerPhone(event.target.value)}
            />
          </label>
          <button type="submit" disabled={!customerName.trim()}>Guardar cliente</button>
        </form>
      </article>

      <article className="alamcen-customers-card">
        <div className="alamcen-customers-card-head">
          <div>
            <p className="alamcen-customers-kicker">Listado</p>
            <h2>Cuenta corriente</h2>
          </div>
          <span className="alamcen-customers-count">{customers.length}</span>
        </div>
        <div className="alamcen-customers-list">
          {customers.map((customer) => (
            <button
              type="button"
              key={customer.id}
              className={selectedCustomer?.id === customer.id ? "alamcen-customers-list-item active" : "alamcen-customers-list-item"}
              onClick={() => setSelectedCustomerId(customer.id)}
            >
              <span>
                <strong>{customer.name}</strong>
                <small>{customer.phone}</small>
              </span>
              <span>
                <strong>{formatCurrency(customer.debtTotal)}</strong>
                <small>{customer.lastSale}</small>
              </span>
            </button>
          ))}
        </div>
      </article>

      <article className="alamcen-customers-card">
        <p className="alamcen-customers-kicker">Detalle</p>
        <h2>Estado del cliente</h2>
        {selectedCustomer ? (
          <>
            <div className="alamcen-customers-balance">
              <span>
                <small>Saldo actual</small>
                <strong>{selectedCustomer.name}</strong>
              </span>
              <strong>{formatCurrency(selectedCustomer.debtTotal)}</strong>
            </div>

            <form className="alamcen-customers-payment-box" onSubmit={handleRegisterCustomerPayment}>
              <div>
                <small>Registrar pago</small>
                <strong>Descontar deuda</strong>
              </div>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Monto"
                value={paymentAmount}
                onChange={(event) => setPaymentAmount(event.target.value)}
              />
              <button type="submit" disabled={!paymentAmount.trim()}>Registrar pago</button>
            </form>

            <div className="alamcen-customers-history-head">
              <span>Historial de ventas</span>
              <strong>{selectedCustomer.sales.length}</strong>
            </div>
            <div className="alamcen-customers-history-list">
              {selectedCustomer.sales.length ? selectedCustomer.sales.map((sale) => (
                <div key={sale.id} className="alamcen-customers-history-row">
                  <span>
                    <strong>{formatCurrency(sale.amount)}</strong>
                    <small>{sale.items}</small>
                  </span>
                  <small>{sale.date}</small>
                </div>
              )) : <p className="alamcen-customers-note">Sin ventas pendientes.</p>}
            </div>

            <div className="alamcen-customers-history-head">
              <span>Historial de pagos</span>
              <strong>{selectedCustomer.payments.length}</strong>
            </div>
            <div className="alamcen-customers-history-list">
              {selectedCustomer.payments.length ? selectedCustomer.payments.map((payment) => (
                <div key={payment.id} className="alamcen-customers-history-row payment">
                  <span>
                    <strong>{formatCurrency(payment.amount)}</strong>
                    <small>{payment.note}</small>
                  </span>
                  <small>{payment.date}</small>
                </div>
              )) : <p className="alamcen-customers-note">Sin pagos registrados.</p>}
            </div>
          </>
        ) : (
          <p className="alamcen-customers-note">Selecciona un cliente para ver su estado.</p>
        )}
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

