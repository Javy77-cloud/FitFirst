import { WaitHold } from "@/components/desk/wait-hold";
import {
  CREATE_POLICY_BUSY_COPY,
  CREATE_POLICY_BUSY_TITLE,
} from "@/lib/policy/dec-prompt";

/** Declaration modal hold — shared WaitHold, create-policy test id. */
export function CreatePolicyBusyPanel() {
  return (
    <WaitHold
      title={CREATE_POLICY_BUSY_TITLE}
      message={CREATE_POLICY_BUSY_COPY}
      data-ff-create-policy-busy=""
    />
  );
}
