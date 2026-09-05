export type HubSurface = "settings" | "automations";

export function hubSurface(raw: string | null | undefined): HubSurface {
  return raw === "automations" ? "automations" : "settings";
}

export function hubPaths(surface: HubSurface) {
  if (surface === "automations") {
    return {
      functions: "/automations/functions",
      functionNew: "/automations/functions/new",
      function: (id: string) => `/automations/functions/${id}`,
      apiKeys: "/automations/api-keys",
      webhooks: "/automations/webhooks",
      webhookNew: "/automations/webhooks/new",
      webhook: (id: string) => `/automations/webhooks/${id}`,
      connections: "/automations/connections",
      connection: (id: string) => `/automations/connections/${id}`,
      macros: "/automations/macros",
    };
  }
  return {
    functions: "/settings/developer/functions",
    functionNew: "/settings/developer/functions/new",
    function: (id: string) => `/settings/developer/functions/${id}`,
    apiKeys: "/settings/developer/api-keys",
    webhooks: "/settings/developer/webhooks",
    webhookNew: "/settings/developer/webhooks/new",
    webhook: (id: string) => `/settings/developer/webhooks/${id}`,
    connections: "/settings/developer/connections",
    connection: (id: string) => `/settings/developer/connections/${id}`,
    macros: "/settings/developer/macros",
  };
}
