type PaymentPlanRow = {
  plan: string;
  includes: string;
  softwarePrice: string;
  equipment: string;
  totalWithEquipment: string;
};

type AddonBox = {
  title: string;
  price: string;
  note: string;
};

const PAYMENT_PLANS: PaymentPlanRow[] = [
  {
    plan: "M1",
    includes: "Caja + Clientes + Panel",
    softwarePrice: "$350",
    equipment: "+ Scanner",
    totalWithEquipment: "$475"
  },
  {
    plan: "M2",
    includes: "Todo lo de M1 + Modulo de impresion",
    softwarePrice: "$425",
    equipment: "+ Impresora",
    totalWithEquipment: "$650"
  },
  {
    plan: "M3",
    includes: "Todo lo de M1 + Scanner + Impresora",
    softwarePrice: "$350",
    equipment: "+ Scanner + Impresora",
    totalWithEquipment: "$700"
  }
];

const ADDONS: AddonBox[] = [
  {
    title: "Scanner",
    price: "+$125",
    note: "Se suma a cualquier plan"
  },
  {
    title: "Impresora",
    price: "+$225",
    note: "Se suma a cualquier plan"
  }
];

function PaymentRow({ row }: { row: PaymentPlanRow }) {
  return (
    <div className="alamcen-payment-methods-row">
      <strong className="alamcen-payment-methods-plan">{row.plan}</strong>
      <span className="alamcen-payment-methods-includes">{row.includes}</span>
      <span className="alamcen-payment-methods-price">{row.softwarePrice}</span>
      <span className="alamcen-payment-methods-equipment">{row.equipment}</span>
      <span className="alamcen-payment-methods-total">{row.totalWithEquipment}</span>
    </div>
  );
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
          <div className="alamcen-payment-methods-table-head">
            <span>Plan</span>
            <span>Incluye</span>
            <span>Precio software</span>
            <span>Equipamiento</span>
            <span>Con equipamiento</span>
          </div>

          {PAYMENT_PLANS.map((row) => (
            <PaymentRow key={row.plan} row={row} />
          ))}
        </div>
      </article>

      <article className="alamcen-payment-methods-card alamcen-payment-methods-addon-card">
        <div className="alamcen-payment-methods-card-head">
          <div>
            <p className="alamcen-payment-methods-kicker">Complementos</p>
            <h2>Agregar equipo a cualquier plan</h2>
          </div>
        </div>

        <div className="alamcen-payment-methods-addon-grid">
          {ADDONS.map((addon) => (
            <div key={addon.title} className="alamcen-payment-methods-addon-box">
              <strong>{addon.title}</strong>
              <span className="alamcen-payment-methods-addon-price">{addon.price}</span>
              <small>{addon.note}</small>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
