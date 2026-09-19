-- Canonicalize known free-text / form-code LOBs onto the agency master codes.
-- Unknown values stay on the record (Settings → Lines flags them as orphans).
--> statement-breakpoint
UPDATE "deals" SET "line_of_business" = 'HO', "updated_at" = now()
WHERE upper(trim("line_of_business")) IN (
  'HO3','HO4','HO5','HO6','HO8','HOMEOWNERS','HOME','HOMEOWNER','RENTERS','LANDLORD','DP','DP1','DP3','MHO','MDP','MH','DWELLING'
);
--> statement-breakpoint
UPDATE "policies" SET "line_of_business" = 'HO', "updated_at" = now()
WHERE upper(trim("line_of_business")) IN (
  'HO3','HO4','HO5','HO6','HO8','HOMEOWNERS','HOME','HOMEOWNER','RENTERS','LANDLORD','DP','DP1','DP3','MHO','MDP','MH','DWELLING'
);
--> statement-breakpoint
UPDATE "deals" SET "line_of_business" = 'AUTO', "updated_at" = now()
WHERE upper(trim("line_of_business")) IN (
  'PA','PERSONAL AUTO','CAR','MOTORCYCLE','CA','COMMERCIAL AUTO','COMMERCIAL_AUTO'
);
--> statement-breakpoint
UPDATE "policies" SET "line_of_business" = 'AUTO', "updated_at" = now()
WHERE upper(trim("line_of_business")) IN (
  'PA','PERSONAL AUTO','CAR','MOTORCYCLE','CA','COMMERCIAL AUTO','COMMERCIAL_AUTO'
);
--> statement-breakpoint
UPDATE "deals" SET "line_of_business" = 'RV', "updated_at" = now()
WHERE upper(trim("line_of_business")) IN ('REC','REC RV','REC_RV','BOAT','BOAT/WATERCRAFT','WATERCRAFT');
--> statement-breakpoint
UPDATE "policies" SET "line_of_business" = 'RV', "updated_at" = now()
WHERE upper(trim("line_of_business")) IN ('REC','REC RV','REC_RV','BOAT','BOAT/WATERCRAFT','WATERCRAFT');
--> statement-breakpoint
UPDATE "deals" SET "line_of_business" = 'WC', "updated_at" = now()
WHERE upper(trim("line_of_business")) IN ('WORKERS_COMP','WORKERS COMP','WORKERS'' COMP','WORK COMP');
--> statement-breakpoint
UPDATE "policies" SET "line_of_business" = 'WC', "updated_at" = now()
WHERE upper(trim("line_of_business")) IN ('WORKERS_COMP','WORKERS COMP','WORKERS'' COMP','WORK COMP');
--> statement-breakpoint
UPDATE "deals" SET "line_of_business" = 'LIFE', "updated_at" = now()
WHERE upper(trim("line_of_business")) IN ('TERM LIFE','WHOLE LIFE','IUL','FINAL EXPENSE','UNIVERSAL LIFE');
--> statement-breakpoint
UPDATE "policies" SET "line_of_business" = 'LIFE', "updated_at" = now()
WHERE upper(trim("line_of_business")) IN ('TERM LIFE','WHOLE LIFE','IUL','FINAL EXPENSE','UNIVERSAL LIFE');
--> statement-breakpoint
UPDATE "deals" SET "line_of_business" = 'HEALTH', "updated_at" = now()
WHERE upper(trim("line_of_business")) IN ('MARKETPLACE','MEDICARE','MEDICARE ADVANTAGE','ACA','MEDIGAP','SUPPLEMENTAL');
--> statement-breakpoint
UPDATE "policies" SET "line_of_business" = 'HEALTH', "updated_at" = now()
WHERE upper(trim("line_of_business")) IN ('MARKETPLACE','MEDICARE','MEDICARE ADVANTAGE','ACA','MEDIGAP','SUPPLEMENTAL');
