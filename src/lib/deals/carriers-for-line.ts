import { writesDealLine } from "@/lib/domain";

export type LineCarrierOption = {
  id: string;
  name: string;
  writtenLines?: string[] | null;
};

/** Manual lookup only lists carriers that write this deal's line. */
export function carriersForDealLine(
  carriers: LineCarrierOption[],
  dealLine: string,
): LineCarrierOption[] {
  return carriers.filter((carrier) => writesDealLine(carrier.writtenLines ?? [], dealLine));
}
