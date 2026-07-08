import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

type Option = {
  id: string;
  label: string;
  price: number;
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
    price: 125
  }
];

const EQUIPMENT_OPTIONS: Option[] = [
  {
    id: "scanner",
    label: "Scanner",
    price: 125
  },
  {
    id: "printer",
    label: "Impresora",
    price: 225,
    requires: "printing"
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
    </button>
  );
}

export function PaymentMethodsTab() {
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [includeEquipment, setIncludeEquipment] = useState(false);

  const printingEnabled = selectedModules.includes("printing");

  useEffect(() => {
    if (printingEnabled) {
      return;
    }

    setSelectedEquipment((current) => current.filter((id) => id !== "printer"));
  }, [printingEnabled]);

  useEffect(() => {
    if (includeEquipment) {
      return;
    }

    setSelectedEquipment([]);
  }, [includeEquipment]);

  const total = useMemo(() => {
    const moduleTotal = MODULE_OPTIONS.filter((option) => selectedModules.includes(option.id)).reduce(
      (sum, option) => sum + option.price,
      0
    );

    const equipmentTotal = EQUIPMENT_OPTIONS.filter((option) => selectedEquipment.includes(option.id)).reduce(
      (sum, option) => sum + option.price,
      0
    );
    return BASE_PLAN.price + moduleTotal + equipmentTotal;
  }, [selectedEquipment, selectedModules]);

  const selectedModuleTotal = useMemo(
    () => MODULE_OPTIONS.filter((option) => selectedModules.includes(option.id)).reduce((sum, option) => sum + option.price, 0),
    [selectedModules]
  );
  const selectedEquipmentTotal = useMemo(
    () => EQUIPMENT_OPTIONS.filter((option) => selectedEquipment.includes(option.id)).reduce((sum, option) => sum + option.price, 0),
    [selectedEquipment]
  );

  function toggleSelection(
    current: string[],
    setCurrent: Dispatch<SetStateAction<string[]>>,
    id: string
  ) {
    setCurrent(current.includes(id) ? current.filter((currentId) => currentId !== id) : [...current, id]);
  }

  function togglePrinter() {
    if (!includeEquipment) {
      setIncludeEquipment(true);
    }

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
        <h1>Planes</h1>
        <p>Primeros 2 meses.</p>
      </header>

      <article className="alamcen-payment-methods-card pricing-builder-card">
        <div className="alamcen-payment-methods-card-head">
          <div>
            <h2>{BASE_PLAN.label}</h2>
            <p className="pricing-base-subtitle">{BASE_PLAN.includes}</p>
          </div>
          <strong className="pricing-base-price">{currency(BASE_PLAN.price)}</strong>
        </div>

        <div className="pricing-inline-section">
          <div className="pricing-inline-head">
            <div>
              <h2>Agregar equipamiento</h2>
            </div>
            <button
              type="button"
              className={`pricing-pill ${includeEquipment ? "selected" : ""}`}
              onClick={() => setIncludeEquipment((current) => !current)}
            >
              {includeEquipment ? "Si" : "No"}
            </button>
          </div>

          {includeEquipment ? (
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
          ) : (
            <p className="pricing-muted-copy">Sin equipamiento.</p>
          )}
        </div>

        <div className="pricing-inline-section">
          <div className="pricing-inline-head">
            <div>
              <h2>Agregar modulo</h2>
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
        </div>

        <div className="pricing-summary-card">
          <div className="pricing-summary-head">
            <div>
              <h2>Total</h2>
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
          </div>
        </div>
      </article>
    </section>
  );
}
