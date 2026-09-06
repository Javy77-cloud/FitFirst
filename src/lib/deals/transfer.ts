export type DeskUserOption = { id: string; name: string };

export function dealTransferConfirmCopy(name: string): string {
  const target = name.trim() || "this agent";
  return `Transfer this deal to ${target}? They'll own all follow-ups from now on.`;
}

export function dealTransferNotification(input: { dealTitle: string; fromName: string }): {
  title: string;
  body: string;
} {
  const dealTitle = input.dealTitle.trim() || "Deal";
  const fromName = input.fromName.trim() || "A teammate";
  return {
    title: dealTitle,
    body: `${fromName} handed this deal to you.`,
  };
}

export function canTransferDeal(actor: { id?: string | null } | null | undefined): boolean {
  return Boolean(actor?.id);
}
