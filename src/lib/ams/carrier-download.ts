import {
  CARRIER_DOWNLOAD_LABELS,
  CARRIER_DOWNLOAD_NOT_CONNECTED,
  CARRIER_DOWNLOAD_PROVIDERS,
  CARRIER_DOWNLOAD_STUB_REASON,
  type CarrierDownloadProvider,
} from "@/lib/domain-ams";

export type CarrierDownloadConnection = {
  provider: CarrierDownloadProvider;
  status: string;
  lastAttemptAt: Date | null;
  lastError: string | null;
};

export function carrierDownloadCatalog(
  rows: CarrierDownloadConnection[],
): Array<{
  provider: CarrierDownloadProvider;
  label: string;
  status: string;
  connected: boolean;
  lastAttemptAt: Date | null;
  lastError: string | null;
  blurb: string;
}> {
  return CARRIER_DOWNLOAD_PROVIDERS.map((provider) => {
    const row = rows.find((item) => item.provider === provider);
    return {
      provider,
      label: CARRIER_DOWNLOAD_LABELS[provider],
      status: row?.status ?? CARRIER_DOWNLOAD_NOT_CONNECTED,
      connected: false,
      lastAttemptAt: row?.lastAttemptAt ?? null,
      lastError: row?.lastError ?? null,
      blurb:
        provider === "ivans"
          ? "IVANS download is the later plug for carrier policy feeds. This desk does not invent a book or dollar amounts."
          : "AL3 / carrier-download files land here when a real feed exists. Empty importer on purpose.",
    };
  });
}

export function attemptCarrierDownload(_provider: CarrierDownloadProvider): {
  ok: false;
  reason: string;
  status: typeof CARRIER_DOWNLOAD_NOT_CONNECTED;
} {
  return {
    ok: false,
    reason: CARRIER_DOWNLOAD_STUB_REASON,
    status: CARRIER_DOWNLOAD_NOT_CONNECTED,
  };
}
