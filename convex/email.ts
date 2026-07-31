import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { FALLBACK_INQUIRY_RECIPIENT } from "./lib/constants";
import { deploymentEnv } from "./lib/env";

/**
 * Resend REST API via fetch (default Convex runtime — no "use node" needed).
 * Without RESEND_API_KEY the send is skipped with a log line so dev
 * environments work end-to-end minus the actual delivery.
 */
async function sendEmail(args: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}) {
  const apiKey = deploymentEnv.RESEND_API_KEY;
  const from =
    deploymentEnv.EMAIL_FROM ?? "Carigradski Drum <onboarding@resend.dev>";
  if (!apiKey) {
    console.log(
      `[email] RESEND_API_KEY not set — skipping send to ${args.to}: ${args.subject}`,
    );
    return { skipped: true };
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [args.to],
      subject: args.subject,
      html: args.html,
      reply_to: args.replyTo,
    }),
  });
  if (!response.ok) {
    const body = await response.text();
    console.error(`[email] Resend error ${response.status}: ${body}`);
    return { skipped: false, ok: false };
  }
  return { skipped: false, ok: true };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Shared chrome so every transactional mail looks like the same brand. */
function layout(body: string) {
  return `
      <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;color:#3d332b">
        <h2 style="color:#a5502f">Carigradski Drum</h2>
        ${body}
        <p style="color:#8a7f74;font-size:12px">carigradskidrum.com</p>
      </div>`;
}

function siteOrigin() {
  return deploymentEnv.SITE_URL ?? "https://carigradskidrum.com";
}

export const sendInquiryRelay = internalAction({
  args: { inquiryId: v.id("inquiries") },
  handler: async (ctx, args) => {
    const data = await ctx.runQuery(internal.inquiries.getForRelay, {
      inquiryId: args.inquiryId,
    });
    if (!data) return null;

    const { inquiry, company } = data;
    const siteUrl = deploymentEnv.SITE_URL ?? "https://carigradskidrum.com";
    const profileUrl = `${siteUrl}/${inquiry.locale}/firma/${company.slug}`;
    const to = company.email ?? FALLBACK_INQUIRY_RECIPIENT;

    const subject =
      inquiry.locale === "de"
        ? `Neue Anfrage über Carigradski Drum — ${company.name}`
        : `Novi upit preko Carigradski Drum — ${company.name}`;

    const intro =
      inquiry.locale === "de"
        ? `Sie haben eine neue Anfrage über Ihr Profil <a href="${profileUrl}">${escapeHtml(company.name)}</a> erhalten.`
        : `Stigao vam je novi upit preko profila <a href="${profileUrl}">${escapeHtml(company.name)}</a>.`;

    const html = `
      <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;color:#3d332b">
        <h2 style="color:#a5502f">Carigradski Drum</h2>
        <p>${intro}</p>
        <table style="border-collapse:collapse;width:100%;font-size:14px">
          <tr><td style="padding:6px 12px 6px 0;color:#8a7f74">Ime</td><td style="padding:6px 0">${escapeHtml(inquiry.name)}</td></tr>
          <tr><td style="padding:6px 12px 6px 0;color:#8a7f74">Email</td><td style="padding:6px 0"><a href="mailto:${escapeHtml(inquiry.email)}">${escapeHtml(inquiry.email)}</a></td></tr>
          ${inquiry.phone ? `<tr><td style="padding:6px 12px 6px 0;color:#8a7f74">Telefon</td><td style="padding:6px 0">${escapeHtml(inquiry.phone)}</td></tr>` : ""}
        </table>
        <p style="white-space:pre-wrap;background:#faf7f2;border:1px solid #eee3d5;border-radius:8px;padding:12px;font-size:14px">${escapeHtml(inquiry.message)}</p>
        <p style="color:#8a7f74;font-size:12px">carigradskidrum.com</p>
      </div>`;

    await sendEmail({ to, subject, html, replyTo: inquiry.email });
    return null;
  },
});

/** Operator alert: a new company submission is waiting in the review queue. */
export const sendSubmissionAlert = internalAction({
  args: { submissionId: v.id("companySubmissions") },
  handler: async (ctx, args) => {
    const data = await ctx.runQuery(internal.submissions.getForNotification, {
      submissionId: args.submissionId,
    });
    if (!data) return null;

    const to = deploymentEnv.OPERATOR_EMAIL ?? FALLBACK_INQUIRY_RECIPIENT;
    const reviewUrl = `${siteOrigin()}/admin/submissions/${data.id}`;

    const html = layout(`
        <p>Nova prijava firme čeka proveru.</p>
        <table style="border-collapse:collapse;width:100%;font-size:14px">
          <tr><td style="padding:6px 12px 6px 0;color:#8a7f74">Firma</td><td style="padding:6px 0">${escapeHtml(data.companyName)}</td></tr>
          <tr><td style="padding:6px 12px 6px 0;color:#8a7f74">Grad</td><td style="padding:6px 0">${escapeHtml(data.city)}</td></tr>
          <tr><td style="padding:6px 12px 6px 0;color:#8a7f74">Podnosilac</td><td style="padding:6px 0">${escapeHtml(data.submitterName)}</td></tr>
          <tr><td style="padding:6px 12px 6px 0;color:#8a7f74">Email</td><td style="padding:6px 0"><a href="mailto:${escapeHtml(data.submitterEmail)}">${escapeHtml(data.submitterEmail)}</a></td></tr>
          ${data.submitterPhone ? `<tr><td style="padding:6px 12px 6px 0;color:#8a7f74">Telefon</td><td style="padding:6px 0">${escapeHtml(data.submitterPhone)}</td></tr>` : ""}
        </table>
        <p><a href="${reviewUrl}" style="display:inline-block;background:#c67139;color:#f5ead8;padding:10px 20px;border-radius:999px;text-decoration:none;font-size:14px">Otvori prijavu</a></p>`);

    await sendEmail({
      to,
      subject: `Nova prijava firme — ${data.companyName}`,
      html,
      replyTo: data.submitterEmail,
    });
    return null;
  },
});

/** Receipt to the person who filed the submission. */
export const sendSubmissionReceipt = internalAction({
  args: { submissionId: v.id("companySubmissions") },
  handler: async (ctx, args) => {
    const data = await ctx.runQuery(internal.submissions.getForNotification, {
      submissionId: args.submissionId,
    });
    if (!data) return null;

    const de = data.locale === "de";
    const html = layout(
      de
        ? `<p>Hallo ${escapeHtml(data.submitterName)},</p>
           <p>wir haben Ihre Eintragung für <strong>${escapeHtml(data.companyName)}</strong> erhalten. Unser Team prüft sie und meldet sich innerhalb von zwei Werktagen bei Ihnen.</p>
           <p>Sie müssen nichts weiter tun.</p>`
        : `<p>Poštovani/a ${escapeHtml(data.submitterName)},</p>
           <p>primili smo prijavu firme <strong>${escapeHtml(data.companyName)}</strong>. Proveravamo podatke i javljamo vam se u roku od dva radna dana.</p>
           <p>Ne morate ništa dalje da radite.</p>`,
    );

    await sendEmail({
      to: data.submitterEmail,
      subject: de
        ? `Wir haben Ihre Eintragung erhalten — ${data.companyName}`
        : `Primili smo vašu prijavu — ${data.companyName}`,
      html,
    });
    return null;
  },
});

/** Decision mail: approved (with the live profile link) or rejected (reason). */
export const sendSubmissionDecision = internalAction({
  args: { submissionId: v.id("companySubmissions") },
  handler: async (ctx, args) => {
    const data = await ctx.runQuery(internal.submissions.getForNotification, {
      submissionId: args.submissionId,
    });
    if (!data) return null;
    // "spam" is never answered — replying confirms a live inbox to a spammer.
    if (data.status !== "approved" && data.status !== "rejected") return null;

    const de = data.locale === "de";
    const approved = data.status === "approved";
    const profileUrl = data.companySlug
      ? `${siteOrigin()}/${data.locale}/firma/${data.companySlug}`
      : siteOrigin();

    const html = layout(
      approved
        ? de
          ? `<p>Hallo ${escapeHtml(data.submitterName)},</p>
             <p><strong>${escapeHtml(data.companyName)}</strong> ist jetzt im Verzeichnis veröffentlicht.</p>
             <p><a href="${profileUrl}" style="display:inline-block;background:#c67139;color:#f5ead8;padding:10px 20px;border-radius:999px;text-decoration:none;font-size:14px">Profil ansehen</a></p>`
          : `<p>Poštovani/a ${escapeHtml(data.submitterName)},</p>
             <p><strong>${escapeHtml(data.companyName)}</strong> je objavljena u direktorijumu.</p>
             <p><a href="${profileUrl}" style="display:inline-block;background:#c67139;color:#f5ead8;padding:10px 20px;border-radius:999px;text-decoration:none;font-size:14px">Pogledajte profil</a></p>`
        : de
          ? `<p>Hallo ${escapeHtml(data.submitterName)},</p>
             <p>wir konnten die Eintragung für <strong>${escapeHtml(data.companyName)}</strong> leider nicht veröffentlichen.</p>
             ${data.rejectReason ? `<p style="white-space:pre-wrap;background:#faf7f2;border:1px solid #eee3d5;border-radius:8px;padding:12px;font-size:14px">${escapeHtml(data.rejectReason)}</p>` : ""}
             <p>Antworten Sie einfach auf diese E-Mail, wenn Sie Fragen haben.</p>`
          : `<p>Poštovani/a ${escapeHtml(data.submitterName)},</p>
             <p>nažalost nismo mogli da objavimo prijavu za <strong>${escapeHtml(data.companyName)}</strong>.</p>
             ${data.rejectReason ? `<p style="white-space:pre-wrap;background:#faf7f2;border:1px solid #eee3d5;border-radius:8px;padding:12px;font-size:14px">${escapeHtml(data.rejectReason)}</p>` : ""}
             <p>Odgovorite na ovaj email ako imate pitanja.</p>`,
    );

    const subject = approved
      ? de
        ? `Ihre Firma ist online — ${data.companyName}`
        : `Vaša firma je objavljena — ${data.companyName}`
      : de
        ? `Zu Ihrer Eintragung — ${data.companyName}`
        : `O vašoj prijavi — ${data.companyName}`;

    await sendEmail({ to: data.submitterEmail, subject, html });
    return null;
  },
});
