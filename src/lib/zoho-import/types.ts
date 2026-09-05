export const ZOHO_MODULES = [
  "Contacts",
  "Accounts",
  "Leads",
  "Deals",
  "Vendors",
  "Policies",
  "Tasks",
] as const;

export type ZohoModule = (typeof ZOHO_MODULES)[number];

export type ZohoRecord = Record<string, unknown>;

export type ImportFolderScan = {
  dir: string;
  files: Array<{
    module: ZohoModule;
    filename: string;
    path: string;
    bytes: number;
  }>;
  extraFiles: string[];
  missingModules: ZohoModule[];
};

export type WipeCounts = Record<string, number>;

export type WipeResult = {
  kept: {
    users: number;
    tenants: number;
    carriers: number;
    carrierAppointments: number;
  };
  deleted: WipeCounts;
  anaRemoved: boolean;
};

export type ModuleImportCounts = {
  module: ZohoModule;
  fitfirst: string;
  read: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
};

export type UnmatchedField = {
  module: ZohoModule;
  field: string;
  count: number;
};

export type ImportError = {
  module: ZohoModule;
  zohoId: string | null;
  message: string;
};

export type ImportReport = {
  folder: string;
  counts: ModuleImportCounts[];
  unmatched: UnmatchedField[];
  errors: ImportError[];
  carriersKept: number;
  carriersAdded: number;
  carriersMergedLines: number;
  owners: {
    adminId: string;
    adminEmail: string;
    fallbackAssigned: number;
    mapped: number;
    nullOwnersFilled: number;
  };
};
