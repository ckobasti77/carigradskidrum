"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { adminMutation } from "@/lib/admin/convex";
import {
  ADMIN_COOKIE,
  checkPassword,
  createSessionValue,
  SESSION_COOKIE_OPTIONS,
} from "@/lib/admin/session";
import { fromDateInputValue } from "@/lib/admin/format";

/**
 * Every mutation the admin panel performs. Server Actions are public HTTP
 * endpoints, so authorization is re-checked inside adminMutation on each call
 * rather than being inherited from the layout that rendered the form.
 *
 * Public-site caches are invalidated here (not through the /api/revalidate
 * round trip) because we are already inside Next.js — revalidateTag is
 * immediate and cannot fail on a network hop. Next 16 requires the second
 * cacheLife argument.
 */

const DIRECTORY_TAGS = ["directory", "categories"] as const;

function revalidatePublic(slug?: string | null) {
  for (const tag of DIRECTORY_TAGS) revalidateTag(tag, "max");
  if (slug) revalidateTag(`company:${slug}`, "max");
  revalidatePath("/sitemap.xml");
}

/** Redirect helper so a form post can report its outcome on the next render. */
function backTo(path: string, params: Record<string, string>): never {
  const query = new URLSearchParams(params).toString();
  redirect(query ? `${path}?${query}` : path);
}

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optional(formData: FormData, key: string): string | undefined {
  const value = str(formData, key);
  return value ? value : undefined;
}

function num(formData: FormData, key: string): number | undefined {
  const value = str(formData, key);
  if (!value) return undefined;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export type LoginState = { error?: string };

export async function login(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  if (!checkPassword(password)) {
    return { error: "Pogrešna lozinka." };
  }
  const value = await createSessionValue();
  if (!value) {
    return { error: "ADMIN_SESSION_SECRET nije podešen na serveru." };
  }
  const store = await cookies();
  store.set(ADMIN_COOKIE, value, SESSION_COOKIE_OPTIONS);
  redirect("/admin");
}

export async function logout(): Promise<void> {
  const store = await cookies();
  store.set(ADMIN_COOKIE, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
  redirect("/admin/login");
}

// ---------------------------------------------------------------------------
// Submissions
// ---------------------------------------------------------------------------

export async function approveSubmission(formData: FormData): Promise<void> {
  const submissionId = str(formData, "submissionId") as Id<"companySubmissions">;
  const categorySlugs = formData
    .getAll("categorySlugs")
    .filter((value): value is string => typeof value === "string");

  const result = await adminMutation(api.admin.approveSubmission, {
    submissionId,
    slug: optional(formData, "slug"),
    name: optional(formData, "name"),
    categorySlugs: categorySlugs.length > 0 ? categorySlugs : undefined,
    discountPercent: num(formData, "discountPercent"),
    featured: formData.get("featured") === "on",
  });

  if (!result.ok) {
    backTo(`/admin/submissions/${submissionId}`, { error: result.error ?? "greska" });
  }
  revalidatePublic(result.slug);
  backTo(`/admin/submissions/${submissionId}`, { ok: "approved" });
}

export async function rejectSubmission(formData: FormData): Promise<void> {
  const submissionId = str(formData, "submissionId") as Id<"companySubmissions">;
  const status = str(formData, "status") === "spam" ? "spam" : "rejected";

  const result = await adminMutation(api.admin.rejectSubmission, {
    submissionId,
    status,
    reason: optional(formData, "reason"),
  });

  backTo(`/admin/submissions/${submissionId}`, {
    [result.ok ? "ok" : "error"]: result.ok ? status : (result.error ?? "greska"),
  });
}

export async function saveSubmissionNote(formData: FormData): Promise<void> {
  const submissionId = str(formData, "submissionId") as Id<"companySubmissions">;
  await adminMutation(api.admin.setSubmissionNote, {
    submissionId,
    adminNote: str(formData, "adminNote"),
  });
  backTo(`/admin/submissions/${submissionId}`, { ok: "note" });
}

// ---------------------------------------------------------------------------
// Companies
// ---------------------------------------------------------------------------

export async function updateCompany(formData: FormData): Promise<void> {
  const companyId = str(formData, "companyId") as Id<"companies">;
  const categorySlugs = formData
    .getAll("categorySlugs")
    .filter((value): value is string => typeof value === "string");
  const discountEnabled = formData.get("discountEnabled") === "on";

  const result = await adminMutation(api.admin.updateCompany, {
    companyId,
    name: str(formData, "name"),
    slug: str(formData, "slug"),
    descriptionSr: optional(formData, "descriptionSr"),
    descriptionDe: optional(formData, "descriptionDe"),
    website: optional(formData, "website"),
    phone: optional(formData, "phone"),
    email: optional(formData, "email"),
    categorySlugs,
    country: str(formData, "country") as "AT" | "RS" | "HR" | "BA",
    city: str(formData, "city"),
    address: optional(formData, "address"),
    zip: optional(formData, "zip"),
    discountPercent: discountEnabled ? num(formData, "discountPercent") : undefined,
    discountTermsSr: discountEnabled ? optional(formData, "discountTermsSr") : undefined,
  });

  if (!result.ok) {
    backTo(`/admin/companies/${companyId}`, { error: result.error ?? "greska" });
  }
  revalidatePublic(result.slug);
  backTo(`/admin/companies/${companyId}`, { ok: "saved" });
}

export async function setCompanyStatus(formData: FormData): Promise<void> {
  const companyId = str(formData, "companyId") as Id<"companies">;
  const result = await adminMutation(api.admin.setCompanyStatus, {
    companyId,
    status: str(formData, "status") as
      | "draft"
      | "pending"
      | "published"
      | "suspended",
  });
  revalidatePublic(result.slug);
  backTo(`/admin/companies/${companyId}`, { ok: "status" });
}

export async function setCompanyFeatured(formData: FormData): Promise<void> {
  const companyId = str(formData, "companyId") as Id<"companies">;
  const result = await adminMutation(api.admin.setCompanyFeatured, {
    companyId,
    featured: str(formData, "featured") === "true",
  });
  revalidatePublic(result.slug);
  backTo(`/admin/companies/${companyId}`, { ok: "featured" });
}

export async function deleteCompanyMedia(formData: FormData): Promise<void> {
  const companyId = str(formData, "companyId") as Id<"companies">;
  const result = await adminMutation(api.admin.deleteMedia, {
    mediaId: str(formData, "mediaId") as Id<"media">,
  });
  revalidatePublic(result.slug);
  backTo(`/admin/companies/${companyId}`, { ok: "media" });
}

export async function deleteCompany(formData: FormData): Promise<void> {
  // Typing the company name is the confirmation step — a lone button is far
  // too easy to hit for an irreversible cascade delete.
  const expected = str(formData, "expectedName");
  const typed = str(formData, "confirmName");
  const companyId = str(formData, "companyId") as Id<"companies">;
  if (!expected || typed !== expected) {
    backTo(`/admin/companies/${companyId}`, { error: "confirm" });
  }

  const result = await adminMutation(api.admin.deleteCompany, { companyId });
  revalidatePublic(result.slug);
  backTo("/admin/companies", { ok: "deleted" });
}

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

export async function activateSubscription(formData: FormData): Promise<void> {
  const companyId = str(formData, "companyId") as Id<"companies">;
  const plan = str(formData, "plan") === "monthly_45" ? "monthly_45" : "yearly_365";
  const periodStart = fromDateInputValue(
    str(formData, "periodStart"),
    Date.now(),
  );
  const months = num(formData, "months");

  const result = await adminMutation(api.admin.activateSubscription, {
    companyId,
    plan,
    periodStart,
    months: months !== undefined ? Math.round(months) : undefined,
    note: optional(formData, "note"),
  });

  if (!result.ok) {
    backTo("/admin/subscriptions", { error: result.error ?? "greska" });
  }
  revalidatePublic(result.slug);
  backTo(str(formData, "returnTo") || "/admin/subscriptions", { ok: "activated" });
}

export async function updateSubscription(formData: FormData): Promise<void> {
  const subscriptionId = str(formData, "subscriptionId") as Id<"subscriptions">;
  const statusValue = str(formData, "status");
  const result = await adminMutation(api.admin.updateSubscription, {
    subscriptionId,
    plan: optional(formData, "plan") as "yearly_365" | "monthly_45" | undefined,
    status: statusValue
      ? (statusValue as "active" | "past_due" | "canceled" | "expired")
      : undefined,
    cancelAtPeriodEnd: formData.has("cancelAtPeriodEnd")
      ? formData.get("cancelAtPeriodEnd") === "on"
      : undefined,
    extendMonths: num(formData, "extendMonths"),
    note: formData.has("note") ? str(formData, "note") : undefined,
  });

  if (!result.ok) {
    backTo("/admin/subscriptions", { error: result.error ?? "greska" });
  }
  revalidatePublic(result.slug);
  backTo(str(formData, "returnTo") || "/admin/subscriptions", { ok: "updated" });
}

export async function deleteSubscription(formData: FormData): Promise<void> {
  const result = await adminMutation(api.admin.deleteSubscription, {
    subscriptionId: str(formData, "subscriptionId") as Id<"subscriptions">,
  });
  revalidatePublic(result.slug);
  backTo(str(formData, "returnTo") || "/admin/subscriptions", { ok: "deleted" });
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export async function recordPayment(formData: FormData): Promise<void> {
  const amount = num(formData, "amountEur");
  const returnTo = str(formData, "returnTo") || "/admin/payments";
  if (amount === undefined || amount <= 0) {
    backTo(returnTo, { error: "invalid_amount" });
  }

  const subscriptionId = optional(formData, "subscriptionId");
  const result = await adminMutation(api.admin.recordPayment, {
    companyId: str(formData, "companyId") as Id<"companies">,
    subscriptionId: subscriptionId
      ? (subscriptionId as Id<"subscriptions">)
      : undefined,
    amountEur: amount,
    method: str(formData, "method") as "bank" | "cash" | "card" | "stripe",
    paidAt: fromDateInputValue(str(formData, "paidAt"), Date.now()),
    invoiceNo: optional(formData, "invoiceNo"),
    note: optional(formData, "note"),
  });

  backTo(returnTo, {
    [result.ok ? "ok" : "error"]: result.ok ? "payment" : (result.error ?? "greska"),
  });
}

export async function deletePayment(formData: FormData): Promise<void> {
  await adminMutation(api.admin.deletePayment, {
    paymentId: str(formData, "paymentId") as Id<"payments">,
  });
  backTo(str(formData, "returnTo") || "/admin/payments", { ok: "payment_deleted" });
}

// ---------------------------------------------------------------------------
// Inquiries
// ---------------------------------------------------------------------------

export async function setInquiryStatus(formData: FormData): Promise<void> {
  await adminMutation(api.admin.setInquiryStatus, {
    inquiryId: str(formData, "inquiryId") as Id<"inquiries">,
    status: str(formData, "status") === "read" ? "read" : "new",
  });
  backTo(str(formData, "returnTo") || "/admin/inquiries", {});
}
