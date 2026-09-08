import { eq } from "drizzle-orm";

import { getDb } from "../client";
import { appSettings } from "../schema";

export async function getAppSetting(settingKey: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.settingKey, settingKey))
    .limit(1);
  return rows[0] ?? null;
}

export async function saveAppSetting(settingKey: string, payload: unknown) {
  const db = getDb();
  const serialized = JSON.stringify(payload);
  const existing = await getAppSetting(settingKey);
  if (existing) {
    await db
      .update(appSettings)
      .set({ payload: serialized })
      .where(eq(appSettings.settingKey, settingKey));
    return;
  }
  await db.insert(appSettings).values({ settingKey, payload: serialized });
}
