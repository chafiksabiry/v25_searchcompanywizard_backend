export type KybDocType = 'kbis' | 'address_proof' | 'manager_id';
export const KYB_DOC_TYPES: KybDocType[] = ['kbis', 'address_proof', 'manager_id'];

/** What the vision model reads from a document (see kybAiService). */
export interface KybExtraction {
  documentType: 'company_registration' | 'address_proof' | 'identity_document' | 'other';
  legible: boolean;
  tamperingSuspected: boolean;
  companyName?: string | null;
  registrationNumber?: string | null;
  address?: string | null;
  personName?: string | null;
  representatives?: string[] | null;
  issueDate?: string | null; // YYYY-MM-DD
  expiryDate?: string | null; // YYYY-MM-DD
}

export type KybReasonCode =
  | 'illegible'
  | 'wrong_type'
  | 'suspected_tampering'
  | 'name_mismatch'
  | 'date_missing'
  | 'too_old'
  | 'address_mismatch'
  | 'expired'
  | 'person_missing'
  | 'representative_mismatch';

export interface KybEvaluation {
  status: 'verified' | 'rejected';
  reason?: KybReasonCode;
}

export const MAX_DOCUMENT_AGE_DAYS = 90;

const LEGAL_FORMS =
  /\b(sas|sasu|sarl|eurl|sa|snc|scs|sci|selarl|ltd|limited|llc|fzc|fze|fz-llc|inc|corp|gmbh|bv|nv|spa|srl|plc|co|company|international)\b/g;

export function normalizeName(value?: string | null): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(LEGAL_FORMS, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokens(value?: string | null): string[] {
  return normalizeName(value).split(' ').filter((t) => t.length > 1);
}

/** Every significant token of the shorter name appears in the longer one. */
export function namesMatch(a?: string | null, b?: string | null): boolean {
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.length || !tb.length) return false;
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  return short.every((t) => long.includes(t));
}

/** Person names are compared as an unordered set of tokens (first/last name order varies). */
export function personNamesMatch(a?: string | null, b?: string | null): boolean {
  const clean = (v?: string | null) =>
    String(v || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter((t) => t.length > 1);
  const ta = clean(a);
  const tb = clean(b);
  if (!ta.length || !tb.length) return false;
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  return short.length >= 2 ? short.every((t) => long.includes(t)) : false;
}

function ageInDays(isoDate: string, now: Date): number | null {
  const d = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((now.getTime() - d.getTime()) / 86_400_000);
}

const addressTokens = (v?: string | null) =>
  normalizeName(v)
    .split(' ')
    .filter((t) => t.length > 2);

/** At least a postal code or two significant tokens (street/city) in common. */
export function addressesMatch(a?: string | null, b?: string | null): boolean {
  const postal = (v?: string | null): string[] => String(v || '').match(/\b\d{4,6}\b/g) ?? [];
  const pa = postal(a);
  const pb = postal(b);
  if (pa.some((p) => pb.includes(p))) return true;
  const ta = addressTokens(a);
  const tb = addressTokens(b);
  return ta.filter((t) => tb.includes(t)).length >= 2;
}

export interface KybContext {
  companyName: string;
  companyAddress?: string | null;
  now?: Date;
  /** Representatives read on the registration extract, used to cross-check the ID. */
  representatives?: string[];
}

export function evaluateKybDocument(
  type: KybDocType,
  x: KybExtraction,
  ctx: KybContext
): KybEvaluation {
  const now = ctx.now ?? new Date();
  const fail = (reason: KybReasonCode): KybEvaluation => ({ status: 'rejected', reason });

  if (!x.legible) return fail('illegible');
  if (x.tamperingSuspected) return fail('suspected_tampering');

  const expectedType =
    type === 'kbis' ? 'company_registration' : type === 'address_proof' ? 'address_proof' : 'identity_document';
  if (x.documentType !== expectedType) return fail('wrong_type');

  const checkFresh = (): KybEvaluation | null => {
    if (!x.issueDate) return fail('date_missing');
    const age = ageInDays(x.issueDate, now);
    if (age === null) return fail('date_missing');
    if (age > MAX_DOCUMENT_AGE_DAYS || age < -1) return fail('too_old');
    return null;
  };

  if (type === 'kbis') {
    if (!namesMatch(x.companyName, ctx.companyName)) return fail('name_mismatch');
    const stale = checkFresh();
    if (stale) return stale;
  } else if (type === 'address_proof') {
    const stale = checkFresh();
    if (stale) return stale;
    if (ctx.companyAddress && !addressesMatch(x.address, ctx.companyAddress)) return fail('address_mismatch');
  } else {
    if (!x.personName) return fail('person_missing');
    if (x.expiryDate) {
      const left = ageInDays(x.expiryDate, now);
      if (left === null || left > 0) return fail('expired');
    }
    const reps = (ctx.representatives || []).filter(Boolean);
    if (reps.length && !reps.some((r) => personNamesMatch(r, x.personName))) {
      return fail('representative_mismatch');
    }
  }
  return { status: 'verified' };
}
