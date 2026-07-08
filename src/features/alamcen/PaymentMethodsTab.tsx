import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

type Option = {
  id: string;
  label: string;
  price: number;
  note: string;
  requires?: string;
};

const BASE_PLAN = {
  label: "Plan A",
  includes: "Caja + Clientes + Panel",
  price: 350
};

const MODULE_OPTIONS: Option[] = [
  {
    id: "printing",
    label: "Modulo de impresion",
    price: 125,
    note: "Se suma al plan base"
  }
];

const EQUIPMENT_OPTIONS: Option[] = [
  {
    id: "scanner",
    label: "Scanner",
    price: 125,
    note: "Se suma a cualquier plan"
  },
  {
    id: "printer",
    label: "Impresora",
    price: 225,
    note: "Requiere modulo de impresion",
    requires: "printing"
  }
];

const EXTRA_SERVICES: Option[] = [
  {
    id: "data",
    label: "Carga de datos",
    price: 150,
    note: "Hasta 2000 productos"
  }
];

function currency(value: number) {
  return `$${new Intl.NumberFormat("es-UY", { maximumFractionDigits: 0 }).format(value)}`;
}

function isSelected(selectedIds: string[], id: string) {
  return selectedIds.includes(id);
}

function ToggleCard({
  option,
  selected,
  disabled,
  onClick
}: {
  option: Option;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`payment-toggle-card ${selected ? "selected" : ""} ${disabled ? "disabled" : ""}`.trim()}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="payment-toggle-card-title">{option.label}</span>
      <strong className="payment-toggle-card-price">{`+${currency(option.price)}`}</strong>
      <small>{option.note}</small>
    </button>
  );
}

export function PaymentMethodsTab() {
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);

  const printingEnabled = selectedModules.includes("printing");

  useEffect(() => {
    if (printingEnabled) {
      return;
    }

    setSelectedEquipment((current) => current.filter((id) => id !== "printer"));
  }, [printingEnabled]);

  const total = useMemo(() => {
    const moduleTotal = MODULE_OPTIONS.filter((option) => selectedModules.includes(option.id)).reduce(
      (sum, option) => sum + option.price,
      0
    );

    const equipmentTotal = EQUIPMENT_OPTIONS.filter((option) => selectedEquipment.includes(option.id)).reduce(
      (sum, option) => sum + option.price,
      0
    );

    const extraTotal = EXTRA_SERVICES.filter((option) => selectedExtras.includes(option.id)).reduce(
      (sum, option) => sum + option.price,
      0
    );

    return BASE_PLAN.price + moduleTotal + equipmentTotal + extraTotal;
  }, [selectedEquipment, selectedExtras, selectedModules]);

  const selectedModuleTotal = useMemo(
    () => MODULE_OPTIONS.filter((option) => selectedModules.includes(option.id)).reduce((sum, option) => sum + option.price, 0),
    [selectedModules]
  );
  const selectedEquipmentTotal = useMemo(
    () => EQUIPMENT_OPTIONS.filter((option) => selectedEquipment.includes(option.id)).reduce((sum, option) => sum + option.price, 0),
    [selectedEquipment]
  );
  const selectedExtrasTotal = useMemo(
    () => EXTRA_SERVICES.filter((option) => selectedExtras.includes(option.id)).reduce((sum, option) => sum + option.price, 0),
    [selectedExtras]
  );

  function toggleSelection(
    current: string[],
    setCurrent: Dispatch<SetStateAction<string[]>>,
    id: string
  ) {
    setCurrent(current.includes(id) ? current.filter((currentId) => currentId !== id) : [...current, id]);
  }

  function togglePrinter() {
    if (!printingEnabled) {
      setSelectedModules((current) => [...current, "printing"]);
    }

    setSelectedEquipment((current) =>
      current.includes("printer") ? current.filter((id) => id !== "printer") : [...current, "printer"]
    );
  }

  return (
    <section className="alamcen-payment-methods-page">
      <header className="alamcen-payment-methods-hero">
        <p className="alamcen-payment-methods-kicker">Almacen</p>
        <h1>Configurador de planes</h1>
        <p>Primeros 2 meses. Empezas con el plan base y vas sumando modulos o equipo segun lo que el cliente quiera.</p>
      </header>

      <article className="alamcen-payment-methods-card pricing-base-card">
        <div className="alamcen-payment-methods-card-head">
          <div>
            <p className="alamcen-payment-methods-kicker">Base fija</p>
            <h2>{BASE_PLAN.label}</h2>
          </div>
          <strong className="pricing-base-price">{currency(BASE_PLAN.price)}</strong>
        </div>

        <div className="pricing-base-copy">
          <span>{BASE_PLAN.includes}</span>
          <small>Este plan queda activo por defecto y no se desmarca.</small>
        </div>
      </article>

      <article className="alamcen-payment-methods-card">
        <div className="alamcen-payment-methods-card-head">
          <div>
            <p className="alamcen-payment-methods-kicker">Modulos</p>
            <h2>Sumas de software</h2>
          </div>
        </div>

        <div className="pricing-grid">
          {MODULE_OPTIONS.map((option) => (
            <ToggleCard
              key={option.id}
              option={option}
              selected={isSelected(selectedModules, option.id)}
              onClick={() => toggleSelection(selectedModules, setSelectedModules, option.id)}
            />
          ))}
        </div>
      </article>

      <article className="alamcen-payment-methods-card">
        <div className="alamcen-payment-methods-card-head">
          <div>
            <p className="alamcen-payment-methods-kicker">Equipamiento</p>
            <h2>Se suma al plan elegido</h2>
          </div>
        </div>

        <div className="pricing-grid">
          {EQUIPMENT_OPTIONS.map((option) => (
            <ToggleCard
              key={option.id}
              option={option}
              selected={isSelected(selectedEquipment, option.id)}
              disabled={option.requires === "printing" && !printingEnabled}
              onClick={option.id === "printer" ? togglePrinter : () => toggleSelection(selectedEquipment, setSelectedEquipment, option.id)}
            />
          ))}
        </div>
      </article>

      <article className="alamcen-payment-methods-card">
        <div className="alamcen-payment-methods-card-head">
          <div>
            <p className="alamcen-payment-methods-kicker">Extras</p>
            <h2>Carga de datos</h2>
          </div>
        </div>

        <div className="pricing-grid">
          {EXTRA_SERVICES.map((option) => (
            <ToggleCard
              key={option.id}
              option={option}
              selected={isSelected(selectedExtras, option.id)}
              onClick={() => toggleSelection(selectedExtras, setSelectedExtras, option.id)}
            />
          ))}
        </div>
      </article>

      <article className="alamcen-payment-methods-card pricing-summary-card">
        <div className="pricing-summary-head">
          <div>
            <p className="alamcen-payment-methods-kicker">Resumen</p>
            <h2>Total estimado</h2>
          </div>
          <strong className="pricing-summary-total">{currency(total)}</strong>
        </div>

        <div className="pricing-summary-list">
          <div>
            <span>Base</span>
            <strong>{currency(BASE_PLAN.price)}</strong>
          </div>
          <div>
            <span>Modulos</span>
            <strong>{selectedModuleTotal ? currency(selectedModuleTotal) : "$0"}</strong>
          </div>
          <div>
            <span>Equipamiento</span>
            <strong>{selectedEquipmentTotal ? currency(selectedEquipmentTotal) : "$0"}</strong>
          </div>
          <div>
            <span>Extras</span>
            <strong>{selectedExtrasTotal ? currency(selectedExtrasTotal) : "$0"}</strong>
          </div>
        </div>
      </article>
    </section>
  );
}
