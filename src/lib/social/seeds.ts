import type { SocialPlatformId } from "./platforms";

export type SocialPulseMetrics = {
  followers: number;
  engagementPct: number;
  views: number;
  /** Newest last. Eight demo weeks. */
  followerTrend: number[];
  viewsTrend: number[];
};

/** Demo numbers only. Shown after the agency marks that stub connected. */
export const SOCIAL_PULSE_SEEDS: Record<SocialPlatformId, SocialPulseMetrics> = {
  facebook: {
    followers: 1840,
    engagementPct: 4.2,
    views: 12600,
    followerTrend: [1520, 1560, 1610, 1640, 1690, 1730, 1780, 1840],
    viewsTrend: [8200, 8600, 9100, 9800, 10400, 11100, 11800, 12600],
  },
  instagram: {
    followers: 3120,
    engagementPct: 6.8,
    views: 28400,
    followerTrend: [2480, 2590, 2680, 2760, 2850, 2940, 3030, 3120],
    viewsTrend: [17600, 18900, 20100, 21800, 23200, 24900, 26600, 28400],
  },
  x: {
    followers: 890,
    engagementPct: 1.9,
    views: 5400,
    followerTrend: [760, 780, 800, 820, 840, 855, 870, 890],
    viewsTrend: [3100, 3400, 3700, 4000, 4300, 4700, 5000, 5400],
  },
  linkedin: {
    followers: 640,
    engagementPct: 3.1,
    views: 2100,
    followerTrend: [510, 530, 550, 570, 590, 610, 625, 640],
    viewsTrend: [1200, 1320, 1450, 1580, 1700, 1840, 1960, 2100],
  },
  google_business_profile: {
    followers: 420,
    engagementPct: 8.4,
    views: 980,
    followerTrend: [280, 300, 320, 340, 360, 380, 400, 420],
    viewsTrend: [520, 580, 640, 700, 760, 840, 910, 980],
  },
};

export type SocialInquirySeed = {
  id: string;
  platform: SocialPlatformId;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  zip: string;
  insuranceTypeDesired: string;
  excerpt: string;
};

export const SOCIAL_INQUIRY_SEEDS: SocialInquirySeed[] = [
  {
    id: "inq-facebook-luis",
    platform: "facebook",
    firstName: "Luis",
    lastName: "Navarro",
    email: "luis.navarro@example.com",
    phone: "(321) 555-0144",
    city: "Melbourne",
    state: "FL",
    zip: "32935",
    insuranceTypeDesired: "HO",
    excerpt: "Facebook message: need an HO3 quote on our Melbourne house before hurricane season.",
  },
  {
    id: "inq-instagram-priya",
    platform: "instagram",
    firstName: "Priya",
    lastName: "Shah",
    email: "priya.shah@example.com",
    phone: "(407) 555-0199",
    city: "Orlando",
    state: "FL",
    zip: "32801",
    insuranceTypeDesired: "HO",
    excerpt: "Instagram stub: asked for an HO3 quote and said a dec is coming. No live social sync.",
  },
  {
    id: "inq-x-devon",
    platform: "x",
    firstName: "Devon",
    lastName: "Blake",
    email: "devon.blake@example.com",
    phone: "(407) 555-0172",
    city: "Winter Garden",
    state: "FL",
    zip: "34787",
    insuranceTypeDesired: "PA",
    excerpt: "X mention: shopping auto after a lapse. Asked if you write Orlando.",
  },
  {
    id: "inq-linkedin-nora",
    platform: "linkedin",
    firstName: "Nora",
    lastName: "Quincy",
    email: "nora.quincy@example.com",
    phone: "(305) 555-0130",
    city: "Miami",
    state: "FL",
    zip: "33131",
    insuranceTypeDesired: "GL",
    excerpt: "LinkedIn: marina vendor wants a GL certificate for Harbor-area work.",
  },
  {
    id: "inq-gbp-denise",
    platform: "google_business_profile",
    firstName: "Denise",
    lastName: "Ward",
    email: "denise.ward@example.com",
    phone: "(321) 555-0188",
    city: "Palm Bay",
    state: "FL",
    zip: "32905",
    insuranceTypeDesired: "HO",
    excerpt: "GBP message: saw the Palm Bay listing — can you quote our HO3 this week?",
  },
];

export function inquiryById(id: string): SocialInquirySeed | undefined {
  return SOCIAL_INQUIRY_SEEDS.find((row) => row.id === id);
}
