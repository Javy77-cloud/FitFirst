/** Labels only. Same column starts as the Policies Stack card. No sort controls. */
export function PolicyStackColumnHeader() {
  return (
    <div className="ff-policy-stack-header" data-ff-policy-stack-header="" role="row">
      <span className="ff-policy-stack-header-name" data-ff-policy-stack-col="name">
        Name
      </span>
      <span data-ff-policy-stack-col="form">Form</span>
      <span data-ff-policy-stack-col="carrier">Carrier</span>
      <span data-ff-policy-stack-col="status">Status</span>
      <span data-ff-policy-stack-col="premium">Premium</span>
      <span className="ff-policy-stack-header-open" data-ff-policy-stack-col="open" aria-hidden="true" />
    </div>
  );
}
