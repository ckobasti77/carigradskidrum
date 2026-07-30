"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { CheckCircle2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Locale } from "@/lib/i18n/config";

export type InquiryStrings = {
  title: string;
  subtitle: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  submit: string;
  sending: string;
  success: string;
  errorRateLimit: string;
  errorGeneric: string;
  privacyNote: string;
};

export function InquiryForm({
  companyId,
  locale,
  strings,
}: {
  companyId: string;
  locale: Locale;
  strings: InquiryStrings;
}) {
  const submit = useMutation(api.inquiries.submit);
  const [status, setStatus] = useState<
    "idle" | "sending" | "success" | "rate_limit" | "error"
  >("idle");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setStatus("sending");
    try {
      const result = await submit({
        companyId: companyId as Id<"companies">,
        name: String(data.get("name") ?? ""),
        email: String(data.get("email") ?? ""),
        phone: String(data.get("phone") ?? "") || undefined,
        message: String(data.get("message") ?? ""),
        locale,
        website2: String(data.get("website2") ?? "") || undefined,
      });
      if (result.ok) {
        setStatus("success");
        form.reset();
      } else {
        setStatus(result.error === "rate_limit" ? "rate_limit" : "error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div
        role="status"
        className="flex items-start gap-2 rounded-lg border border-border bg-secondary/40 p-4 text-sm"
      >
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        {strings.success}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <h2 className="font-semibold">{strings.title}</h2>
        <p className="text-sm text-muted-foreground">{strings.subtitle}</p>
      </div>

      {/* Honeypot — hidden from humans and assistive tech; bots fill it. */}
      <div className="absolute -left-[9999px] top-auto" aria-hidden="true">
        <label>
          website2
          <input type="text" name="website2" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="inquiry-name">{strings.name}</Label>
        <Input id="inquiry-name" name="name" required maxLength={200} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="inquiry-email">{strings.email}</Label>
        <Input id="inquiry-email" name="email" type="email" required maxLength={320} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="inquiry-phone">{strings.phone}</Label>
        <Input id="inquiry-phone" name="phone" type="tel" maxLength={40} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="inquiry-message">{strings.message}</Label>
        <Textarea id="inquiry-message" name="message" required rows={4} maxLength={4000} />
      </div>

      {(status === "rate_limit" || status === "error") && (
        <p role="alert" className="text-sm text-destructive">
          {status === "rate_limit" ? strings.errorRateLimit : strings.errorGeneric}
        </p>
      )}

      <Button type="submit" disabled={status === "sending"} className="w-full">
        {status === "sending" ? strings.sending : strings.submit}
      </Button>
      <p className="text-xs text-muted-foreground">{strings.privacyNote}</p>
    </form>
  );
}
