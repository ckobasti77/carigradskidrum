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
