import { ReactNode, useEffect, useRef, useState } from "react";
import { Check, Menu, UserRound } from "lucide-react";

export interface ProductShellNavItem {
  key: string;
  label: string;
}

interface ProductShellProps {
  navItems: ProductShellNavItem[];
  activeKey: string | null;
  onSelect: (key: string) => void;
  onHomeClick?: () => void;
  children: ReactNode;
}

export function ProductShell({ navItems, activeKey, onSelect, onHomeClick, children }: ProductShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const activeItem = navItems.find((item) => item.key === activeKey);

  return (
    <>
      <section className="product-shell-bar">
        <div className="product-shell-menu-wrap" ref={menuRef}>
          <button
            type="button"
            className={menuOpen ? "product-shell-menu-button open" : "product-shell-menu-button"}
            onClick={() => setMenuOpen((current) => !current)}
          >
            <span className="product-shell-menu-user">
              <span className="product-shell-avatar">
                <UserRound size={18} strokeWidth={2.1} />
              </span>
              <span className="product-shell-identity">
                <strong>Demo</strong>
                <small>{activeItem?.label ?? "Pantalla principal"}</small>
              </span>
            </span>
            <span className="product-shell-menu-icon">
              <Menu size={18} strokeWidth={2.1} />
            </span>
          </button>

          {menuOpen ? (
            <div className="product-shell-dropdown">
              <button
                type="button"
                className={activeKey === null ? "product-shell-dropdown-item active" : "product-shell-dropdown-item"}
                onClick={() => {
                  onHomeClick?.();
                  setMenuOpen(false);
                }}
              >
                <span>Pantalla principal</span>
                {activeKey === null ? <Check size={16} strokeWidth={2.4} /> : null}
              </button>
              {navItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={activeKey === item.key ? "product-shell-dropdown-item active" : "product-shell-dropdown-item"}
                  onClick={() => {
                    onSelect(item.key);
                    setMenuOpen(false);
                  }}
                >
                  <span>{item.label}</span>
                  {activeKey === item.key ? <Check size={16} strokeWidth={2.4} /> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </section>
      {children}
    </>
  );
}
