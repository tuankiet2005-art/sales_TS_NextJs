import type { AccessoryCatalogItem } from "@onroad/shared/types";

export type { AccessoryCatalogItem };

export function accessoryByCode(
  catalog: AccessoryCatalogItem[],
  code?: string,
): AccessoryCatalogItem | undefined {
  if (!code) {
    return undefined;
  }
  return catalog.find((item) => item.code === code);
}
