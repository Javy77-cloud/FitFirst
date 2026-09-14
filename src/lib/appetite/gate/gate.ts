import { appointedForCarrier, NOT_APPOINTED_RULE } from "./appointments";
import {
  HAGERTY_SLUG,
  NONSTANDARD_AUTO_SLUGS,
  defaultFlHoIndex,
  isAppointmentGated,
  isHoDpLine,
  resolveFlHoOrder,
} from "./fl-ho-order";
import { lineMatchesOffered, occupancyLineMatch } from "./lines";
import { applyStateRule, matchStateRule } from "./state-rules";
import { anyTokenHits, firstMatchingToken } from "./tokens";
import type {
  AppetiteCarrier,
  MasterRiskSnapshot,
  QuoteGateDecision,
  QuoteGateOptions,
  QuoteGateResult,
} from "./types";

function dirtyAutoRisk(snap: MasterRiskSnapshot): boolean {
  const f = snap.autoFlags;
  return f.dui || f.sr22 || f.lapse || f.tickets || Boolean(snap.dirtyMvr);
}

function collectorPath(snap: MasterRiskSnapshot): boolean {
  if (snap.isCollectorAuto) return true;
  const line = snap.line.toUpperCase();
  return line.includes("COLLECTOR") || line.includes("CLASSIC_AUTO");
}

function stateAllowed(carrier: AppetiteCarrier, state: string | null): boolean {
  if (!state) return true;
  // Empty list means unconfirmed footprint (33+/45+/other) — do not invent a skip.
  if (carrier.statesAvailable.length === 0) return true;
  return carrier.statesAvailable.includes(state.toUpperCase());
}

function lineAllowed(carrier: AppetiteCarrier, snap: MasterRiskSnapshot): { ok: boolean; rule: string | null } {
  const occupancyOk = occupancyLineMatch(carrier.linesOffered, snap);
  const offeredOk = lineMatchesOffered(snap.line, carrier.linesOffered) || occupancyOk;
  if (!offeredOk) return { ok: false, rule: "line_not_offered" };

  const notOfferedHit = firstMatchingToken(carrier.linesNotOffered, snap);
  if (notOfferedHit) return { ok: false, rule: notOfferedHit };
  if (carrier.linesNotOffered.some((token) => lineMatchesOffered(snap.line, [token]) && !occupancyOk)) {
    const exact = carrier.linesNotOffered.find((token) => lineMatchesOffered(snap.line, [token]));
    if (exact) return { ok: false, rule: exact };
  }
  return { ok: true, rule: null };
}

function flHoEligible(
  carrierId: string,
  snap: MasterRiskSnapshot,
): boolean {
  if (carrierId === "foremost") {
    return snap.isMobile || snap.isVacant || snap.isManufactured;
  }
  if (carrierId === "tapco" || carrierId === "cabrillo") {
    return snap.admittedDeclinedCount > 0;
  }
  return true;
}

function sortKey(
  decision: QuoteGateDecision,
  snap: MasterRiskSnapshot,
  flOrder: string[],
): [number, number, number, number, string] {
  const statusRank = decision.status === "Quote" ? 0 : decision.status === "Maybe" ? 1 : 2;
  const isFlHo = snap.state?.toUpperCase() === "FL" && isHoDpLine(snap.line);
  let fl = 500;
  if (isFlHo && flHoEligible(decision.carrierId, snap)) {
    const idx = flOrder.indexOf(decision.carrierId);
    if (idx >= 0) fl = idx;
    else {
      const seeded = defaultFlHoIndex(decision.carrierId);
      if (seeded != null) fl = seeded;
    }
  }
  const band = decision.appointmentGated ? 3 : decision.preferredHit ? 0 : decision.cautionHit ? 2 : 1;
  return [statusRank, fl, band, decision.rank, decision.carrierId];
}

/**
 * Quote-gate — Yes / Maybe / Skip-Decline before any portal opens.
 *
 * Nationals + per-state overlays (State Farm / Allstate CA HO closed, Progressive
 * no new DP-3) are applied here. Citizens is a normal catalog row — no last-resort
 * ranking. Bot decline learning is out of scope.
 */
export function runQuoteGate(
  snapshot: MasterRiskSnapshot,
  carriers: AppetiteCarrier[],
  options: QuoteGateOptions = {},
): QuoteGateResult {
  const flOrder = resolveFlHoOrder(options.flHoOrder);
  const stateRules = options.stateRules ?? [];
  const appointedByCarrier = options.appointedByCarrier ?? null;
  const rateable = carriers.filter((c) => c.rateable);
  const collector = collectorPath(snapshot);
  const nonstandardAuto = !collector && dirtyAutoRisk(snapshot);
  const decisions: QuoteGateDecision[] = [];

  for (const raw of rateable) {
    const overlay = matchStateRule(stateRules, raw.carrierId, snapshot.state, snapshot.line);
    const carrier = applyStateRule(raw, overlay);
    const appointmentGated = isAppointmentGated(carrier.carrierId);

    if (collector && carrier.carrierId !== HAGERTY_SLUG) {
      decisions.push({
        carrierId: carrier.carrierId,
        legalName: carrier.legalName,
        status: "Skip-Decline",
        matchingRule: "hagerty_only_path",
        rank: 0,
        preferredHit: false,
        cautionHit: false,
        appointmentGated,
      });
      continue;
    }

    if (nonstandardAuto && !(NONSTANDARD_AUTO_SLUGS as readonly string[]).includes(carrier.carrierId)) {
      decisions.push({
        carrierId: carrier.carrierId,
        legalName: carrier.legalName,
        status: "Skip-Decline",
        matchingRule: "nonstandard_auto_only",
        rank: 0,
        preferredHit: false,
        cautionHit: false,
        appointmentGated,
      });
      continue;
    }

    if (!stateAllowed(carrier, snapshot.state)) {
      decisions.push({
        carrierId: carrier.carrierId,
        legalName: carrier.legalName,
        status: "Skip-Decline",
        matchingRule: "state_not_available",
        rank: 0,
        preferredHit: false,
        cautionHit: false,
        appointmentGated,
      });
      continue;
    }

    const line = lineAllowed(carrier, snapshot);
    if (!line.ok) {
      decisions.push({
        carrierId: carrier.carrierId,
        legalName: carrier.legalName,
        status: "Skip-Decline",
        matchingRule: line.rule ?? "line_not_offered",
        rank: 0,
        preferredHit: false,
        cautionHit: false,
        appointmentGated,
      });
      continue;
    }

    if (carrier.catPosture === "closed_new_biz") {
      decisions.push({
        carrierId: carrier.carrierId,
        legalName: carrier.legalName,
        status: "Skip-Decline",
        matchingRule: "closed_new_biz",
        rank: 0,
        preferredHit: false,
        cautionHit: false,
        appointmentGated,
      });
      continue;
    }

    const hard = firstMatchingToken(carrier.hardDeclines, snapshot);
    if (hard) {
      decisions.push({
        carrierId: carrier.carrierId,
        legalName: carrier.legalName,
        status: "Skip-Decline",
        matchingRule: hard,
        rank: 0,
        preferredHit: false,
        cautionHit: false,
        appointmentGated,
      });
      continue;
    }

    // Appetite-eligible first; appointment is a separate skip — not a fake appetite decline.
    if (appointedForCarrier(carrier.carrierId, appointedByCarrier) === false) {
      decisions.push({
        carrierId: carrier.carrierId,
        legalName: carrier.legalName,
        status: "Skip-Decline",
        matchingRule: NOT_APPOINTED_RULE,
        rank: 0,
        preferredHit: false,
        cautionHit: false,
        appointmentGated,
      });
      continue;
    }

    const preferredHit = anyTokenHits(carrier.preferredSignals, snapshot);
    const cautionHit = anyTokenHits(carrier.softCautions, snapshot);
    const maybe = appointmentGated || (cautionHit && !preferredHit);
    decisions.push({
      carrierId: carrier.carrierId,
      legalName: carrier.legalName,
      status: maybe ? "Maybe" : "Quote",
      matchingRule: appointmentGated
        ? "appointment_gated"
        : preferredHit
          ? firstMatchingToken(carrier.preferredSignals, snapshot)
          : cautionHit
            ? firstMatchingToken(carrier.softCautions, snapshot)
            : null,
      rank: 0,
      preferredHit,
      cautionHit,
      appointmentGated,
    });
  }

  const ranked = decisions
    .map((row, i) => ({ ...row, rank: i }))
    .sort((a, b) => {
      const ka = sortKey(a, snapshot, flOrder);
      const kb = sortKey(b, snapshot, flOrder);
      for (let i = 0; i < ka.length; i += 1) {
        if (ka[i] < kb[i]) return -1;
        if (ka[i] > kb[i]) return 1;
      }
      return 0;
    })
    .map((row, i) => ({ ...row, rank: i }));

  return {
    decisions: ranked,
    quote: ranked.filter((d) => d.status === "Quote"),
    maybe: ranked.filter((d) => d.status === "Maybe"),
    skipDecline: ranked.filter((d) => d.status === "Skip-Decline"),
  };
}

export function skipDeclineCarrierIds(result: QuoteGateResult): string[] {
  return result.skipDecline.map((d) => d.carrierId);
}
