/**
 * Admin office / territory / company-wide book filters.
 * Other bots should import from here — do not copy IDs into domain.ts.
 */
export {
  agentIdsForOffice,
  agentIdsForTerritory,
  bookScopeLabel,
  bookScopeOptions,
  bookScopeQueryValue,
  COMPANY_BOOK_SCOPE,
  filterByBookScope,
  isCompanyBookScope,
  parseBookScopeParam,
  resolveBookAgentIds,
  type BookScopeInput,
  type BookScopeKind,
  type BookScopeOption,
} from "./book-scope";
export {
  listAgentRoster,
  listBookScopeOptions,
  listOffices,
  listTerritories,
  loadOrgCatalog,
  resolveBookScope,
} from "./queries";
