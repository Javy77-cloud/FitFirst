import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined, replace: () => undefined, push: () => undefined }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/deals/deal-1",
}));

import { RepeatableUnitBlocks } from "@/components/deal/repeatable-unit-blocks";
import type { QuoteSheetFieldValue } from "@/lib/db/schema";

function cell(value: string): QuoteSheetFieldValue {
  return { value, status: "confirmed", source: "agent" };
}

function buttonByTestId(html: string, testId: string): string {
  const match = html.match(new RegExp(`<button[^>]*data-testid="${testId}"[^>]*>`));
  expect(match, testId).toBeTruthy();
  return match?.[0] ?? "";
}

function buttonDisabled(tag: string): boolean {
  return /\sdisabled(?:=|>|\s)/.test(tag);
}

describe("Auto Risk Profile remove vehicle and driver", () => {
  it("disables Remove when only one vehicle and one driver remain", () => {
    const vehicles = renderToString(
      createElement(RepeatableUnitBlocks, {
        kind: "vehicle",
        product: "auto",
        values: { vin: cell("1FT") },
        extractedByKey: new Map(),
        dealId: "deal-1",
        line: "auto",
      }),
    );
    expect(vehicles).toContain("+ Add vehicle");
    expect(vehicles).toContain("- Remove vehicle");
    expect(buttonDisabled(buttonByTestId(vehicles, "deal-add-vehicle"))).toBe(false);
    expect(buttonDisabled(buttonByTestId(vehicles, "deal-remove-vehicle"))).toBe(true);
    expect(vehicles).toContain("At least one vehicle stays on the profile.");
    expect(vehicles).not.toContain('data-ff-remove-unit="vehicle-1"');

    const drivers = renderToString(
      createElement(RepeatableUnitBlocks, {
        kind: "driver",
        product: "auto",
        values: { driver_1_name: cell("Ana") },
        extractedByKey: new Map(),
      }),
    );
    expect(drivers).toContain("+ Add driver");
    expect(drivers).toContain("- Remove driver");
    expect(buttonDisabled(buttonByTestId(drivers, "deal-add-driver"))).toBe(false);
    expect(buttonDisabled(buttonByTestId(drivers, "deal-remove-driver"))).toBe(true);
    expect(drivers).toContain("At least one driver stays on the profile.");
    expect(drivers).not.toContain('data-ff-remove-unit="driver-1"');
  });

  it("offers Remove next to Add and on each extra card when more than one is open", () => {
    const vehicles = renderToString(
      createElement(RepeatableUnitBlocks, {
        kind: "vehicle",
        product: "auto",
        values: {
          vin: cell("AAA"),
          vehicle_2_vin: cell("BBB"),
        },
        extractedByKey: new Map(),
        dealId: "deal-1",
        line: "auto",
      }),
    );
    expect(buttonDisabled(buttonByTestId(vehicles, "deal-add-vehicle"))).toBe(false);
    expect(buttonDisabled(buttonByTestId(vehicles, "deal-remove-vehicle"))).toBe(false);
    expect(vehicles).toContain('data-ff-remove-unit="vehicle-1"');
    expect(vehicles).toContain('data-ff-remove-unit="vehicle-2"');
    expect(vehicles).not.toContain("At least one vehicle stays on the profile.");
    expect(vehicles.indexOf('data-testid="deal-add-vehicle"')).toBeLessThan(
      vehicles.indexOf('data-testid="deal-remove-vehicle"'),
    );

    const drivers = renderToString(
      createElement(RepeatableUnitBlocks, {
        kind: "driver",
        product: "auto",
        values: {
          driver_1_name: cell("Ana"),
          driver_2_name: cell("Bob"),
          driver_3_name: cell("Bob"),
          driver_4_name: cell("Bob"),
        },
        extractedByKey: new Map(),
      }),
    );
    expect(drivers).not.toContain('data-testid="deal-add-driver"');
    expect(buttonDisabled(buttonByTestId(drivers, "deal-remove-driver"))).toBe(false);
    expect(drivers).toContain('data-ff-remove-unit="driver-2"');
    expect(drivers).toContain('data-ff-remove-unit="driver-4"');
    expect(drivers).toContain('data-ff-unit-block="driver-4"');
  });
});
