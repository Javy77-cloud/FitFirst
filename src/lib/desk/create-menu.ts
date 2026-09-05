export type CreateMenuItem = {
  id: string;
  label: string;
  href: string;
};

export type CreateMenuGroup = {
  id: string;
  label: string;
  items: CreateMenuItem[];
};

/**
 * Home New menu. Only targets with a real /new page or an existing create form.
 * Quote tracking has no own create — it opens a shopping deal.
 * Policy /new is a bind stub, not a create. Skip it.
 */
export const CREATE_MENU: CreateMenuGroup[] = [
  {
    id: "people",
    label: "People & accounts",
    items: [
      { id: "lead", label: "Lead", href: "/leads/new" },
      { id: "contact", label: "Contact", href: "/contacts/new" },
      { id: "business", label: "Business", href: "/accounts/new" },
    ],
  },
  {
    id: "deals",
    label: "Deals",
    items: [{ id: "deal", label: "Deal (shopping)", href: "/deals/new" }],
  },
  {
    id: "activities",
    label: "Activities",
    items: [
      { id: "task", label: "Task", href: "/tasks/new" },
      { id: "meeting", label: "Meeting", href: "/meetings/new" },
      { id: "call", label: "Call", href: "/calls/new" },
    ],
  },
  {
    id: "records",
    label: "Records",
    items: [{ id: "claim", label: "Claim (FNOL)", href: "/claims/new" }],
  },
];
