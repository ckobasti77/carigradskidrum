"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation } from "convex/react";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  CircleHelp,
  CreditCard,
  Handshake,
  LifeBuoy,
  LoaderCircle,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import {
  CONTACT_INPUT_LIMITS,
  CONTACT_TOPICS,
  type ContactTopic,
} from "@/convex/lib/contactInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Locale } from "@/lib/i18n/config";

type ContactFormStrings = {
  eyebrow: string;
  title: string;
  lead: string;
  topicLabel: string;
  topics: Record<ContactTopic, string>;
  name: string;
  email: string;
  phone: string;
  optional: string;
  message: string;
  messagePlaceholder: string;
  requiredNote: string;
  submit: string;
  sending: string;
  successTitle: string;
  success: string;
  sendAnother: string;
  errorInvalid: string;
  errorRateLimit: string;
  errorGeneric: string;
  privacyPrefix: string;
  privacyLink: string;
};

const topicIcons = {
  company: Building2,
  card: CreditCard,
  partnership: Handshake,
  support: LifeBuoy,
  other: CircleHelp,
} satisfies Record<ContactTopic, typeof Building2>;

type SubmitStatus = "idle" | "sending" | "success" | "invalid" | "rate_limit" | "error";

export function ContactForm({
  locale,
  privacyHref,
  strings,
}: {
  locale: Locale;
  privacyHref: string;
  strings: ContactFormStrings;
}) {
  const submit = useMutation(api.contact.submit);
  const [status, setStatus] = useState<SubmitStatus>("idle");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setStatus("sending");

    try {
      const result = await submit({
        name: String(data.get("name") ?? ""),
        email: String(data.get("email") ?? ""),
        phone: String(data.get("phone") ?? "") || undefined,
        topic: String(data.get("topic") ?? "company") as ContactTopic,
        message: String(data.get("message") ?? ""),
        locale,
        website2: String(data.get("website2") ?? "") || undefined,
      });

      if (result.ok) {
        form.reset();
        setStatus("success");
        return;
      }

      if (result.error === "rate_limit") setStatus("rate_limit");
      else if (result.error === "invalid") setStatus("invalid");
      else setStatus("error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="flex min-h-[34rem] flex-col justify-between rounded-xl border border-sage-300 bg-sage-100 p-6 shadow-sm sm:p-8">
        <div>
          <span className="flex size-14 items-center justify-center rounded-full bg-sage-700 text-sage-100">
            <CheckCircle2 className="size-7" aria-hidden="true" />
          </span>
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.16em] text-sage-800">
            {strings.eyebrow}
          </p>
          <h2 className="mt-3 max-w-md text-3xl tracking-tight sm:text-4xl">
            {strings.successTitle}
          </h2>
          <p className="mt-4 max-w-lg text-muted-foreground">
            {strings.success}
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="mt-10 self-start"
          onClick={() => setStatus("idle")}
        >
          {strings.sendAnother}
          <ArrowRight aria-hidden="true" />
        </Button>
      </div>
    );
  }

  const errorMessage =
    status === "invalid"
      ? strings.errorInvalid
      : status === "rate_limit"
        ? strings.errorRateLimit
        : status === "error"
          ? strings.errorGeneric
          : null;

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-neutral-300 bg-card p-5 shadow-md sm:p-8"
    >
      <div className="border-b border-border pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-terracotta-700">
          {strings.eyebrow}
        </p>
        <h2 className="mt-3 text-2xl tracking-tight sm:text-3xl">
          {strings.title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{strings.lead}</p>
      </div>

      {/* Honeypot: present for bots, absent from the accessibility tree. */}
      <input
        type="text"
        name="website2"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        hidden
      />

      <fieldset disabled={status === "sending"} className="mt-6 space-y-6">
        <div>
          <legend className="text-sm font-semibold text-foreground">
            {strings.topicLabel}
          </legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {CONTACT_TOPICS.map((topic, index) => {
              const Icon = topicIcons[topic];
              return (
                <div key={topic} className={topic === "other" ? "sm:col-span-2" : undefined}>
                  <input
                    className="peer sr-only"
                    type="radio"
                    id={`contact-topic-${topic}`}
                    name="topic"
                    value={topic}
                    defaultChecked={index === 0}
                  />
                  <label
                    htmlFor={`contact-topic-${topic}`}
                    className="flex min-h-12 cursor-pointer items-center gap-3 rounded-md border border-border bg-background/45 px-4 py-3 text-sm transition-colors hover:border-neutral-400 hover:bg-accent peer-checked:border-terracotta-500 peer-checked:bg-terracotta-100 peer-checked:text-terracotta-900 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-terracotta"
                  >
                    <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
                    <span className="font-semibold">{strings.topics[topic]}</span>
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="contact-name">{strings.name}</Label>
            <Input
              id="contact-name"
              name="name"
              autoComplete="name"
              required
              minLength={CONTACT_INPUT_LIMITS.nameMin}
              maxLength={CONTACT_INPUT_LIMITS.nameMax}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-email">{strings.email}</Label>
            <Input
              id="contact-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              maxLength={CONTACT_INPUT_LIMITS.emailMax}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact-phone">
            {strings.phone}{" "}
            <span className="font-normal text-muted-foreground">
              ({strings.optional})
            </span>
          </Label>
          <Input
            id="contact-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={CONTACT_INPUT_LIMITS.phoneMax}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact-message">{strings.message}</Label>
          <Textarea
            id="contact-message"
            name="message"
            required
            minLength={CONTACT_INPUT_LIMITS.messageMin}
            maxLength={CONTACT_INPUT_LIMITS.messageMax}
            rows={6}
            placeholder={strings.messagePlaceholder}
          />
        </div>
      </fieldset>

      <div className="mt-6" aria-live="polite">
        {errorMessage ? (
          <p
            id="contact-form-error"
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            {errorMessage}
          </p>
        ) : null}
      </div>

      <div className="mt-5 flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-md text-xs text-muted-foreground">
          {strings.privacyPrefix}{" "}
          <Link className="font-semibold text-terracotta-700 underline-offset-4 hover:underline" href={privacyHref}>
            {strings.privacyLink}
          </Link>
        </p>
        <Button
          type="submit"
          size="lg"
          className="w-full sm:w-auto"
          disabled={status === "sending"}
          aria-describedby={errorMessage ? "contact-form-error" : undefined}
        >
          {status === "sending" ? (
            <>
              <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
              {strings.sending}
            </>
          ) : (
            <>
              {strings.submit}
              <ArrowRight aria-hidden="true" />
            </>
          )}
        </Button>
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground sm:text-right">
        {strings.requiredNote}
      </p>
    </form>
  );
}
