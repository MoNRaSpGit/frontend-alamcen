type PaymentPlanRow = {
  plan: string;
  includes: string;
  softwarePrice: string;
  equipment: string;
  totalWithEquipment: string;
};

const PAYMENT_PLANS: PaymentPlanRow[] = [
  {
    plan: "M1",
    includes: "Caja + Clientes + Panel",
    softwarePrice: "$350",
    equipment: "+ Scanner",
    totalWithEquipment: "$500"
  },
  {
    plan: "M2",
    includes: "Todo lo de M1 + Módulo de impresión",
    softwarePrice: "$350",
    equipment: "+ Impresora",
    totalWithEquipment: "$500"
  },
  {
    plan: "M3",
    includes: "Todo lo de M2 + Carga inicial de datos",
    softwarePrice: "$350",
    equipment: "+ Impresora + Carga de datos",
    totalWithEquipment: "$550"
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
        <p>Tabla de referencia para mostrar planes y equipamiento al cliente.</p>
      </header>

      <article className="alamcen-payment-methods-card">
        <div className="alamcen-payment-methods-table">
          <div className="alamcen-payment-methods-table-head">
            <span>Plan</span>
            <span>Incluye</span>
            <span>Precio (Software)</span>
            <span>Equipamiento</span>
            <span>Con equipamiento</span>
          </div>

          {PAYMENT_PLANS.map((row) => (
            <PaymentRow key={row.plan} row={row} />
          ))}
        </div>
      </article>

      <article className="alamcen-payment-methods-card alamcen-payment-methods-addon-card">
        <div className="alamcen-payment-methods-addon-head">
          <div>
            <p className="alamcen-payment-methods-kicker">Complemento</p>
            <h2>Carga de datos</h2>
          </div>
          <strong className="alamcen-payment-methods-addon-price">+$150</strong>
        </div>

        <div className="alamcen-payment-methods-addon-table">
          <div className="alamcen-payment-methods-addon-row">
            <span>Disponible para cualquier plan</span>
            <span>Opcional</span>
            <span>Se suma al plan elegido</span>
          </div>
        </div>
      </article>
    </section>
  );
}
