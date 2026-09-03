export const SEEDED_TEMPLATE_COPY = {
  googleReview: {
    name: "Google review request",
    kind: "google_review" as const,
    slug: "google-review-request",
    subjectEn: "Quick Google review? — {{agency_name}}",
    subjectEs: "¿Una reseña rápida en Google? — {{agency_name}}",
    bodyEn: `Hi {{contact_first_name}},

It's Javier with {{agency_name}}. Thanks for trusting us with your {{policy_type}}. If we earned it, would you leave a short Google review? {{review_link}}

Javier
{{agent_phone}}

— Example copy. Edit this for your voice. —`,
    bodyEs: `Hola {{contact_first_name}},

Soy Javier de {{agency_name}}. Gracias por confiar en nosotros con tu {{policy_type}}. Si te pareció bien el servicio, ¿nos dejas una reseña corta en Google? {{review_link}}

Javier
{{agent_phone}}

— Texto de ejemplo. Edítalo con tu voz. —`,
  },
  checkin4mo: {
    name: "Four-month check-in",
    kind: "checkin_4mo" as const,
    slug: "four-month-check-in",
    subjectEn: "You've been my client for four months — {{agency_name}}",
    subjectEs: "Llevas cuatro meses como cliente — {{agency_name}}",
    bodyEn: `Hi {{contact_first_name}},

You've been my client at {{agency_name}} for four months now (since {{won_date}}). Is everything okay with your {{policy_type}}? If something changed or you need a hand, call or text me.

Javier
{{agent_phone}}

— Example copy. Edit this for your voice. —`,
    bodyEs: `Hola {{contact_first_name}},

Ya llevas cuatro meses como cliente de {{agency_name}} (desde {{won_date}}). ¿Todo bien con tu {{policy_type}}? Si cambió algo o te puedo ayudar, llámame o mándame un mensaje.

Javier
{{agent_phone}}

— Texto de ejemplo. Edítalo con tu voz. —`,
  },
  renewal: {
    name: "Renewal awareness",
    kind: "renewal_awareness" as const,
    slug: "renewal-awareness",
    subjectEn: "I know your renewal is coming — {{agency_name}}",
    subjectEs: "Sé que se acerca tu renovación — {{agency_name}}",
    bodyEn: `Hi {{contact_first_name}},

I know your {{policy_type}} renewal is coming. I will be in touch well before it so we can look at options together. No action needed from you today.

Javier
{{agency_name}}
{{agent_phone}}

— Example copy. Edit this for your voice. —`,
    bodyEs: `Hola {{contact_first_name}},

Sé que se acerca la renovación de tu {{policy_type}}. Te voy a escribir con tiempo para revisar opciones juntos. Hoy no tienes que hacer nada.

Javier
{{agency_name}}
{{agent_phone}}

— Texto de ejemplo. Edítalo con tu voz. —`,
  },
} as const;
