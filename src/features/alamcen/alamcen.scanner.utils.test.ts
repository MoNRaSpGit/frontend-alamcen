import { describe, expect, it, vi } from "vitest";
import {
  appendLocalManualProduct,
  appendProductToSale,
  applyEditedProduct,
  buildLookupErrorMessage,
  formatCurrency,
  increaseSaleLine,
  parsePriceInput,
  removeSaleLine
} from "./alamcen.scanner.utils";

describe("alamcen.scanner.utils", () => {
  it("formats currency in pesos style", () => {
    expect(formatCurrency(1250)).toBe("$ 1.250");
  });

  it("builds a backend connection error message for failed fetch", () => {
    expect(buildLookupErrorMessage(new Error("Failed to fetch"), "https://api.test")).toContain("https://api.test");
  });

  it("adds a new sale line with image when product has one", () => {
    const result = appendProductToSale([], {
      id: 10,
      nombre: "Yerba",
      precioVenta: 220,
      imagen: "https://img.test/yerba.png",
      tieneImagen: true
    });

    expect(result).toEqual([
      {
        productId: 10,
        name: "Yerba",
        price: 220,
        quantity: 1,
        subtotal: 220,
        image: "https://img.test/yerba.png"
      }
    ]);
  });

  it("increments quantity when product already exists in sale", () => {
    const result = appendProductToSale(
      [{ productId: 10, name: "Yerba", price: 220, quantity: 1, subtotal: 220, image: null }],
      {
        id: 10,
        nombre: "Yerba",
        precioVenta: 220,
        imagen: null,
        tieneImagen: false
      }
    );

    expect(result[0]).toMatchObject({
      productId: 10,
      quantity: 2,
      subtotal: 440
    });
  });

  it("updates line name and subtotal when editing product", () => {
    const result = applyEditedProduct(
      [{ productId: 10, name: "Viejo", price: 100, quantity: 3, subtotal: 300, image: null }],
      10,
      { nombre: "Nuevo", precioVenta: 150 }
    );

    expect(result[0]).toMatchObject({
      name: "Nuevo",
      price: 150,
      subtotal: 450
    });
  });

  it("creates a local manual product line", () => {
    vi.spyOn(Date, "now").mockReturnValue(1234);

    const result = appendLocalManualProduct([], 99);

    expect(result[0]).toMatchObject({
      productId: -1234,
      name: "Producto manual",
      price: 99,
      quantity: 1,
      subtotal: 99,
      image: null
    });
  });

  it("removes a line when quantity reaches zero", () => {
    const result = removeSaleLine(
      [{ productId: 10, name: "Yerba", price: 220, quantity: 1, subtotal: 220, image: null }],
      10
    );

    expect(result).toEqual([]);
  });

  it("decrements quantity and subtotal when removing one unit", () => {
    const result = removeSaleLine(
      [{ productId: 10, name: "Yerba", price: 220, quantity: 3, subtotal: 660, image: null }],
      10
    );

    expect(result[0]).toMatchObject({
      quantity: 2,
      subtotal: 440
    });
  });

  it("increments quantity and subtotal explicitly", () => {
    const result = increaseSaleLine(
      [{ productId: 10, name: "Yerba", price: 220, quantity: 2, subtotal: 440, image: null }],
      10
    );

    expect(result[0]).toMatchObject({
      quantity: 3,
      subtotal: 660
    });
  });

  it("parses decimal input with comma", () => {
    expect(parsePriceInput("12,5")).toBe(12.5);
  });
});
