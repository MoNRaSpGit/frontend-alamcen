import type { ReactNode } from "react";

type BasePlanRow = {
  plan: string;
  includes: string;
  softwarePrice: string;
};

type AddonRow = {
  name: string;
  price: string;
  note: string;
};

type ExampleRow = {
  scenario: string;
  formula: string;
  total: string;
};

const BASE_PLANS: BasePlanRow[] = [
  {
    plan: "M1",
    includes: "Caja + Clientes + Panel",
    softwarePrice: "$350"
  },
  {
    plan: "M2",
    includes: "Todo lo de M1 + Modulo de impresion",
    softwarePrice: "$425"
  }
];

const ADDONS: AddonRow[] = [
  {
    name: "Scanner",
    price: "$125",
    note: "Se suma al plan elegido"
  },
  {
    name: "Impresora",
    price: "$225",
    note: "Se suma al plan elegido"
  },
  {
    name: "Carga de datos",
    price: "$150",
    note: "Hasta 2000 productos"
  }
];

const EXAMPLES: ExampleRow[] = [
  {
    scenario: "M1 + Scanner",
    formula: "$350 + $125",
    total: "$475"
  },
  {
    scenario: "M1 + Scanner + Impresora",
    formula: "$350 + $125 + $225",
    total: "$700"
  },
  {
    scenario: "M2 + Impresora",
    formula: "$425 + $225",
    total: "$650"
  }
];

function TableRow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`alamcen-payment-methods-row ${className}`.trim()}>{children}</div>;
}

export function PaymentMethodsTab() {
  return (
    <section className="alamcen-payment-methods-page">
      <header className="alamcen-payment-methods-hero">
        <p className="alamcen-payment-methods-kicker">Almacen</p>
        <h1>Metodos de pago</h1>
        <p>Primeros 2 meses. El total se arma sumando el plan base y los complementos elegidos.</p>
      </header>

      <article className="alamcen-payment-methods-card">
        <div className="alamcen-payment-methods-card-head">
          <div>
            <p className="alamcen-payment-methods-kicker">Planes</p>
            <h2>Base de software</h2>
          </div>
        </div>
        <div className="alamcen-payment-methods-table">
          <div className="alamcen-payment-methods-table-head alamcen-payment-methods-table-head-3">
            <span>Plan</span>
            <span>Incluye</span>
            <span>Precio software</span>
          </div>

          {BASE_PLANS.map((row) => (
            <TableRow key={row.plan} className="alamcen-payment-methods-row-3">
              <strong className="alamcen-payment-methods-plan">{row.plan}</strong>
              <span className="alamcen-payment-methods-includes">{row.includes}</span>
              <span className="alamcen-payment-methods-price">{row.softwarePrice}</span>
            </TableRow>
          ))}
        </div>
      </article>

      <article className="alamcen-payment-methods-card">
        <div className="alamcen-payment-methods-card-head">
          <div>
            <p className="alamcen-payment-methods-kicker">Complementos</p>
            <h2>Equipamiento y extras</h2>
          </div>
        </div>

        <div className="alamcen-payment-methods-table">
          <div className="alamcen-payment-methods-table-head alamcen-payment-methods-table-head-3">
            <span>Complemento</span>
            <span>Precio</span>
            <span>Detalle</span>
          </div>

          {ADDONS.map((row) => (
            <TableRow key={row.name} className="alamcen-payment-methods-row-3">
              <strong className="alamcen-payment-methods-plan">{row.name}</strong>
              <span className="alamcen-payment-methods-price">{row.price}</span>
              <span className="alamcen-payment-methods-equipment">{row.note}</span>
            </TableRow>
          ))}
        </div>
      </article>

      <article className="alamcen-payment-methods-card">
        <div className="alamcen-payment-methods-card-head">
          <div>
            <p className="alamcen-payment-methods-kicker">Ejemplos</p>
            <h2>Combinaciones frecuentes</h2>
          </div>
        </div>

        <div className="alamcen-payment-methods-table">
          <div className="alamcen-payment-methods-table-head alamcen-payment-methods-table-head-3">
            <span>Escenario</span>
            <span>Formula</span>
            <span>Total</span>
          </div>

          {EXAMPLES.map((row) => (
            <TableRow key={row.scenario} className="alamcen-payment-methods-row-3">
              <strong className="alamcen-payment-methods-plan">{row.scenario}</strong>
              <span className="alamcen-payment-methods-includes">{row.formula}</span>
              <span className="alamcen-payment-methods-total">{row.total}</span>
            </TableRow>
          ))}
        </div>
      </article>
    </section>
  );
}
