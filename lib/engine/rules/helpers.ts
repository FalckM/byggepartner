import type { BuildContext } from "../context";
import type { FixSuggestion, RuleId, RuleResult, Severity } from "../report";

/** A rule is a pure function of the build context (spec 7.2). Returns [] when not applicable. */
export type Rule = {
  id: RuleId;
  /** Short plain-language title, used in the "we checked 19 things" list and compatibility map. */
  title: string;
  check: (ctx: BuildContext) => RuleResult[];
};

export function ok(
  ruleId: RuleId,
  severity: Severity,
  involved: string[],
  messagePlain: string,
  messageTechnical: string,
): RuleResult {
  return { ruleId, severity, passed: true, involved, messagePlain, messageTechnical };
}

export function fail(
  ruleId: RuleId,
  severity: Severity,
  involved: string[],
  messagePlain: string,
  messageTechnical: string,
  fixSuggestion?: FixSuggestion,
): RuleResult {
  return { ruleId, severity, passed: false, involved, messagePlain, messageTechnical, fixSuggestion };
}
