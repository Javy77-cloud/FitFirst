export type NotImplementedResult = {
  status: "not_implemented";
  message: string;
};

export function notImplemented(feature: string): NotImplementedResult {
  return {
    status: "not_implemented",
    message: `${feature} is not implemented in this build. The connector interface is in place for a later phase.`,
  };
}
