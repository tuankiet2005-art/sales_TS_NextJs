"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "../api/client";
import { PageLoadingScreen } from "../components/LoadingState";
import { useI18n } from "../i18n/LanguageContext";
import { modelToSlug } from "../lib/modelSlug";

/** Legacy deep link — forwards to the model page with trim pre-selected. */
export function VehiclePage() {
  const params = useParams() ?? {};
  const vehicleId = typeof params.vehicleId === "string" ? params.vehicleId : "";
  const brandCode = typeof params.brandCode === "string" ? params.brandCode : "";
  const id = Number(vehicleId);
  const router = useRouter();
  const { t } = useI18n();

  useEffect(() => {
    if (!id || !brandCode) {
      return;
    }
    api
      .getVehicle(id)
      .then((vehicle) => {
        router.replace(`/brand/${brandCode}/models/${modelToSlug(vehicle.model)}?vehicleId=${id}`);
      })
      .catch(() => {
        router.replace(`/brand/${brandCode}`);
      });
  }, [brandCode, id, router]);

  return <PageLoadingScreen message={t("loadingVehicle")} />;
}
