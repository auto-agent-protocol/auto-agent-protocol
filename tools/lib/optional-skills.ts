/**
 * Cross-field rules of the AAP 4.0 additions that JSON Schema cannot express.
 * Publishers run them before sending and receivers before trusting a payload; they supplement schema validation.
 */

/** Rebates: program_id is unique within a listing, the listing is new, and an expired program is not presented. */
export function checkRebates(vehicle: Record<string, any>, now?: Date): string[] {
  const errors: string[] = [], rebates: any[] = vehicle.rebates ?? [];
  if (rebates.length && vehicle.condition !== "new") errors.push("rebates are allowed only on a new vehicle");
  const ids = rebates.map(rebate => rebate.program_id);
  if (new Set(ids).size !== ids.length) errors.push("rebates[].program_id must be unique within one listing");
  if (now) for (const rebate of rebates) if (rebate.expires_at && new Date(rebate.expires_at).getTime() < now.getTime()) errors.push(`rebate ${rebate.program_id} expired and must not be presented`);
  return errors;
}

/** The part of price that unconditional rebates already account for. Conditional rebates are never subtracted from price. */
export function rebateSavings(vehicle: Record<string, any>): { includedInPrice: number; possibleExtra: number } {
  let includedInPrice = 0, possibleExtra = 0;
  for (const rebate of vehicle.rebates ?? []) (rebate.is_conditional === false) ? includedInPrice += rebate.program_value : possibleExtra += rebate.program_value;
  return { includedInPrice, possibleExtra };
}

/** Trade-in valuation: an ordered range, an amount inside its range, and an offer that has not expired. */
export function checkValuation(valuation: Record<string, any>, now?: Date): string[] {
  const errors: string[] = [], { amount, amount_min: min, amount_max: max } = valuation;
  if (min !== undefined && max !== undefined && min > max) errors.push("valuation.amount_min must not exceed amount_max");
  if (amount !== undefined && min !== undefined && max !== undefined && (amount < min || amount > max)) errors.push("valuation.amount must lie inside its range");
  if (now && valuation.expires_at && new Date(valuation.expires_at).getTime() < now.getTime()) errors.push("valuation expired and must not be presented as current");
  return errors;
}

/** Consent grants (lead, trade-in and credit): expires_at follows granted_at, and an expired grant is never used. */
export function checkConsentWindow(consent: Record<string, any>, now?: Date): string[] {
  const errors: string[] = [], granted = new Date(consent.granted_at).getTime();
  if (consent.expires_at !== undefined && !(new Date(consent.expires_at).getTime() > granted)) errors.push("consent.expires_at must follow granted_at");
  if (now && consent.expires_at !== undefined && new Date(consent.expires_at).getTime() < now.getTime()) errors.push("consent expired");
  if (now && granted > now.getTime() + 60_000) errors.push("consent.granted_at is in the future");
  return errors;
}

/** Credit application against a deployment's declared capabilities, before any applicant data is sent. */
export function checkCreditApplicationAgainstCapabilities(request: Record<string, any>, capabilities: Record<string, any>): string[] {
  const errors: string[] = [], applicants = [request.applicant, request.co_applicant].filter(Boolean);
  if (request.application_type === "joint" && capabilities.joint_applications !== true) errors.push("this dealer does not accept joint applications");
  if (!(capabilities.currencies ?? ["USD"]).includes(request.currency ?? "USD")) errors.push("this dealer does not accept the application currency");
  for (const applicant of applicants) {
    if (!capabilities.inquiry_types.includes(applicant.consent?.authorized_inquiry)) errors.push("the authorized credit inquiry is not one this dealer runs");
    if (capabilities.national_id === "required" && !applicant.national_id) errors.push("this dealer requires a national_id for each applicant");
    if (capabilities.national_id === "not_accepted" && applicant.national_id) errors.push("this dealer does not accept a national_id through an agent");
  }
  return errors;
}
