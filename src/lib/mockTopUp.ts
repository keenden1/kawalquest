export const MOCK_TOP_UP_PACKAGES = [
  { id: "starter", name: "Scout Pouch", gold: 100, displayPrice: "₱49" },
  { id: "guardian", name: "Guardian Cache", gold: 550, displayPrice: "₱249" },
  { id: "legend", name: "Legend Vault", gold: 1200, displayPrice: "₱499" },
] as const;

export type MockTopUpPackageId = (typeof MOCK_TOP_UP_PACKAGES)[number]["id"];

export function getMockTopUpPackage(id: unknown) {
  return MOCK_TOP_UP_PACKAGES.find((item) => item.id === id) ?? null;
}
