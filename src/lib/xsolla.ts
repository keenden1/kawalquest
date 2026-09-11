// Shared package catalog for the real (Xsolla) top-up flow -- kept separate from
// XsollaServer.ts (server-only) so the client-side package list/pricing display doesn't
// need to import anything that touches env vars or makes network calls. Matches the
// tiers already decided in CLAUDE.md's "Planned feature: GCash Top-Up" / Xsolla section.
export const XSOLLA_TOPUP_PACKAGES = [
  { id: "single_gold", name: "1 Gold", displayPrice: "₱1.00", gold: 1 },
  { id: "starter_gold", name: "Starter Gold", displayPrice: "₱300", gold: 300 },
  { id: "value_gold", name: "Value Gold", displayPrice: "₱650", gold: 650 },
  { id: "plus_gold", name: "Plus Gold", displayPrice: "₱1,100", gold: 1100 },
  { id: "mega_gold", name: "Mega Gold", displayPrice: "₱2,500", gold: 2500 },
] as const;

export type XsollaPackageId = (typeof XSOLLA_TOPUP_PACKAGES)[number]["id"];

export function getXsollaPackage(id: unknown) {
  return XSOLLA_TOPUP_PACKAGES.find((item) => item.id === id) ?? null;
}
