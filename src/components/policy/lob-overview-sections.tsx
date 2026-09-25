import Link from "next/link";
import { ERRORS_OMISSIONS_SHORT, isErrorsOmissionsProduct } from "@/lib/policy/eo";
import {
  buildLobOverviewSections,
  lobOverviewFamilyLabel,
  resolveLobOverviewFamily,
  type LobOverviewInput,
} from "@/lib/policy/lob-overview";

export function LobOverviewSections({
  input,
  readOnly = false,
}: {
  input: LobOverviewInput;
  readOnly?: boolean;
}) {
  const family = resolveLobOverviewFamily(input);
  if (family === "other" || family === "auto") return null;
  const sections = buildLobOverviewSections(input);
  const familyLabel = isErrorsOmissionsProduct(input.formType, input.policySubType, input.policyType)
    ? ERRORS_OMISSIONS_SHORT
    : lobOverviewFamilyLabel(family);

  return (
    <div className="space-y-4" data-ff-policy-lob-overview={family}>
      <p className="text-sm text-muted-foreground" data-ff-policy-lob-family="">
        Line template · {familyLabel}
        {readOnly ? " · read-only for agents" : ""}
      </p>
      {sections.map((section) => (
        <section key={section.id} className="ff-card space-y-3 p-4" data-ff-lob-section={section.id}>
          <h2 className="text-base font-semibold text-navy">{section.title}</h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {section.fields.map((row) => (
              <div key={row.key} data-ff-lob-field={row.key} data-empty={row.empty ? "true" : "false"}>
                <dt className="text-helper text-muted-foreground">{row.label}</dt>
                <dd className="font-medium text-navy">
                  {row.href && !row.empty ? (
                    <Link href={row.href} className="text-primary hover:underline">
                      {row.value}
                    </Link>
                  ) : (
                    row.value
                  )}
                </dd>
                {row.empty && row.hint ? null : null}
              </div>
            ))}
          </dl>
          {section.pointer ? (
            <p className="text-sm text-muted-foreground">
              <Link href={section.pointer.href} className="text-primary hover:underline">
                {section.pointer.label}
              </Link>
            </p>
          ) : null}
        </section>
      ))}
    </div>
  );
}
