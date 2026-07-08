type PaymentPlan = {
  module: string;
  includes: string;
  monthly: string;
  note?: string;
};

const WITHOUT_MATERIALS: PaymentPlan[] = [
  {
    module: "Modulo 1",
    includes: "Caja",
    monthly: "$350",
    note: "Primeros 2 meses"
  },
  {
    module: "Modulo 2",
    includes: "Caja + Cliente",
    monthly: "$400",
    note: "Primeros 2 meses"
  },
  {
    module: "Modulo 3",
    includes: "Caja + Cliente + Impresora",
    monthly: "$500",
    note: "Primeros 2 meses"
  }
];

const WITH_MATERIALS: PaymentPlan[] = [
  {
    module: "Modulo 1",
    includes: "Caja + Scanner",
    monthly: "$450",
    note: "Primeros 2 meses"
  },
  {
    module: "Modulo 2",
    includes: "Caja + Scanner + Cliente",
    monthly: "$500"
  },
  {
    module: "Modulo 3",
    includes: "Caja + Scanner + Cliente + Impresora",
    monthly: "$700"
  }
];

function PlanTable({ title, subtitle, plans }: { title: string; subtitle: string; plans: PaymentPlan[] }) {
  return (
    <article className="alamcen-payment-methods-card">
      <div className="alamcen-payment-methods-card-head">
        <div>
          <p className="alamcen-payment-methods-kicker">{subtitle}</p>
          <h2>{title}</h2>
        </div>
      </div>

      <div className="alamcen-payment-methods-table">
        <div className="alamcen-payment-methods-table-head">
          <span>Modulo</span>
          <span>Incluye</span>
          <span>Mensual</span>
          <span>Detalle</span>
        </div>

        {plans.map((plan) => (
          <div key={`${title}-${plan.module}-${plan.includes}`} className="alamcen-payment-methods-row">
            <strong>{plan.module}</strong>
            <span>{plan.includes}</span>
            <span className="alamcen-payment-methods-price">{plan.monthly}</span>
            <span>{plan.note ?? "Mensual"}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

export function PaymentMethodsTab() {
  return (
    <section className="alamcen-payment-methods-page">
      <header className="alamcen-payment-methods-hero">
        <div>
          <p className="alamcen-payment-methods-kicker">Almacen</p>
          <h1>Metodos de pago</h1>
          <p>Propuesta visual de los planes disponibles para presentar al cliente.</p>
        </div>
      </header>

      <div className="alamcen-payment-methods-grid">
        <PlanTable title="Sin materiales" subtitle="Planes base" plans={WITHOUT_MATERIALS} />
        <PlanTable title="Con materiales" subtitle="Planes con equipo" plans={WITH_MATERIALS} />
      </div>
    </section>
  );
}
