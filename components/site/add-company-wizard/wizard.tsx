"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle2, Info, Plus, Send, Trash2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { COUNTRY_CODES, UPLOAD_MAX_BYTES } from "@/convex/lib/constants";
import {
  INPUT_LIMITS,
  validateCompany,
  validateSubmitter,
  type FieldErrors,
} from "@/convex/lib/companyInput";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CategoryIcon } from "@/components/site/category-icon";
import { t } from "@/lib/i18n/format";
import { localePath, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";
import { SelectField, TextAreaField, TextField } from "./fields";
import {
  GalleryPicker,
  readPickedImage,
  releaseImage,
  SingleImagePicker,
} from "./image-picker";
import {
  emptyFormState,
  fieldId,
  OPTIONAL_STEPS,
  STEP_FIELDS,
  STEP_KEYS,
  type FormState,
  type OfferingDraft,
  type PickedImage,
  type StepKey,
  type WizardCategory,
  type WizardImages,
  type WizardStrings,
} from "./types";

const DRAFT_KEY = "cd:add-company-draft:v1";
const DUPLICATE_DEBOUNCE_MS = 400;

type Status = "editing" | "uploading" | "sending" | "success";

/** Form fields whose validation error is filed under a different key. */
const ERROR_KEY_ALIASES: Record<string, string> = {
  hours: "openingHours",
  discountEnabled: "discountPercent",
};

type Action =
  | { type: "patch"; patch: Partial<FormState> }
  | { type: "restore"; state: FormState }
  | { type: "reset" };

function reducer(state: FormState, action: Action): FormState {
  switch (action.type) {
    case "patch":
      return { ...state, ...action.patch };
    case "restore":
      // Never clobber typing that beat the mount effect to it.
      return isDraftWorthKeeping(state)
        ? state
        : { ...action.state, restoredFromDraft: true };
    case "reset":
      return emptyFormState();
  }
}

/** Draft round-trip is defensive: a stale/corrupt blob must never break boot. */
function readDraft(): FormState | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FormState>;
    if (typeof parsed !== "object" || parsed === null) return null;
    const base = emptyFormState();
    return {
      ...base,
      ...parsed,
      // Arrays are the only shape a hand-edited draft can realistically break.
      categorySlugs: Array.isArray(parsed.categorySlugs)
        ? parsed.categorySlugs.filter((s): s is string => typeof s === "string")
        : base.categorySlugs,
      hours:
        Array.isArray(parsed.hours) && parsed.hours.length === 7
          ? parsed.hours
          : base.hours,
      offerings: Array.isArray(parsed.offerings) ? parsed.offerings : [],
    };
  } catch {
    return null;
  }
}

function isDraftWorthKeeping(state: FormState): boolean {
  return (
    state.name.trim().length > 0 ||
    state.city.trim().length > 0 ||
    state.descriptionSr.trim().length > 0
  );
}

function newOffering(): OfferingDraft {
  return {
    id: `o-${Math.random().toString(36).slice(2, 9)}`,
    type: "service",
    nameSr: "",
    descriptionSr: "",
  };
}

export function AddCompanyWizard({
  locale,
  categories,
  strings,
}: {
  locale: Locale;
  categories: WizardCategory[];
  strings: WizardStrings;
}) {
  const [state, dispatch] = useReducer(reducer, null, emptyFormState);
  const [images, setImages] = useState<WizardImages>({
    logo: null,
    cover: null,
    gallery: [],
  });
  const [stepIndex, setStepIndex] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>("editing");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");
  const [debouncedName, setDebouncedName] = useState("");

  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusFieldRef = useRef<string | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const generateUploadUrl = useMutation(api.submissions.generateUploadUrl);
  const submitSubmission = useMutation(api.submissions.submit);

  const step = STEP_KEYS[stepIndex];

  /**
   * Editing a field clears its error immediately instead of nagging on every
   * keystroke; the value is re-validated when the step is advanced anyway.
   */
  const patch = useCallback((value: Partial<FormState>) => {
    dispatch({ type: "patch", patch: value });
    setErrors((current) => {
      if (Object.keys(current).length === 0) return current;
      const next = { ...current };
      let changed = false;
      for (const touched of Object.keys(value)) {
        const errorKey = ERROR_KEY_ALIASES[touched] ?? touched;
        if (errorKey in next) {
          delete next[errorKey];
          changed = true;
        }
        // Offering rows produce indexed keys ("offerings.0.nameSr").
        if (touched === "offerings") {
          for (const key of Object.keys(next)) {
            if (key.startsWith("offerings")) {
              delete next[key];
              changed = true;
            }
          }
        }
      }
      return changed ? next : current;
    });
  }, []);

  // ---- draft persistence -------------------------------------------------
  // localStorage is only readable after hydration, so this cannot move into a
  // lazy initializer without desyncing the server-rendered markup.
  useEffect(() => {
    const draft = readDraft();
    if (draft && isDraftWorthKeeping(draft)) {
      dispatch({ type: "restore", state: draft });
    }
  }, []);

  useEffect(() => {
    if (status === "success") return;
    if (!isDraftWorthKeeping(state)) return;
    try {
      // restoredFromDraft is a UI flag, never part of the saved draft.
      window.localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ ...state, restoredFromDraft: false }),
      );
    } catch {
      // Private mode / quota — the wizard still works, it just won't resume.
    }
  }, [state, status]);

  // Object URLs are process-global; release them when the island unmounts.
  const imagesRef = useRef(images);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);
  useEffect(
    () => () => {
      const current = imagesRef.current;
      releaseImage(current.logo);
      releaseImage(current.cover);
      current.gallery.forEach(releaseImage);
    },
    [],
  );

  // ---- duplicate detection ----------------------------------------------
  useEffect(() => {
    const handle = window.setTimeout(
      () => setDebouncedName(state.name.trim()),
      DUPLICATE_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(handle);
  }, [state.name]);

  const duplicates = useQuery(
    api.submissions.checkDuplicate,
    debouncedName.length >= 3 ? { name: debouncedName, locale } : "skip",
  );

  // ---- validation --------------------------------------------------------
  const companyInput = useMemo(
    () => ({
      name: state.name,
      descriptionSr: state.descriptionSr,
      descriptionDe: state.descriptionDe,
      website: state.website,
      phone: state.phone,
      email: state.email,
      country: state.country,
      city: state.city,
      address: state.address,
      zip: state.zip,
      categorySlugs: state.categorySlugs,
      openingHours: state.hours
        .map((row, day) => ({ day, open: row.open, close: row.close, enabled: row.enabled }))
        .filter((row) => row.enabled)
        .map(({ day, open, close }) => ({ day, open, close })),
      offerings: state.offerings.map((offering, index) => ({
        type: offering.type,
        nameSr: offering.nameSr,
        descriptionSr: offering.descriptionSr,
        order: index,
      })),
      galleryCount: images.gallery.length,
      discountPercent: state.discountEnabled
        ? Number.parseInt(state.discountPercent, 10)
        : undefined,
      discountTermsSr: state.discountTermsSr,
    }),
    [state, images.gallery.length],
  );

  const errorMessage = useCallback(
    (key: string): string | undefined => {
      const code = errors[key];
      if (!code) return undefined;
      const messages = strings.errors as Record<string, string>;
      return messages[code] ?? messages.invalid;
    },
    [errors, strings.errors],
  );

  const focusFirstError = useCallback((found: FieldErrors) => {
    const first = Object.keys(found)[0];
    if (first) focusFieldRef.current = first;
  }, []);

  useEffect(() => {
    const key = focusFieldRef.current;
    if (!key) return;
    focusFieldRef.current = null;
    const element = document.getElementById(fieldId(key));
    if (element instanceof HTMLElement) {
      element.focus();
      element.scrollIntoView({ block: "center", behavior: shouldReduceMotion ? "auto" : "smooth" });
    }
  }, [errors, shouldReduceMotion]);

  const validateStep = useCallback(
    (target: StepKey): FieldErrors => {
      const all: FieldErrors =
        target === "submitter" || target === "review"
          ? {
              ...validateCompany(companyInput),
              ...validateSubmitter({
                submitterName: state.submitterName,
                submitterEmail: state.submitterEmail,
                submitterPhone: state.submitterPhone,
                submitterRole: state.submitterRole,
                consent: state.consent,
              }),
            }
          : validateCompany(companyInput);

      const belongs = STEP_FIELDS[target];
      return Object.fromEntries(
        Object.entries(all).filter(([key]) => belongs(key)),
      );
    },
    [companyInput, state],
  );

  const goToStep = useCallback(
    (index: number) => {
      setStepIndex(index);
      setErrors({});
      setSubmitError(null);
      // Move focus to the new panel heading so the change is announced.
      window.requestAnimationFrame(() => headingRef.current?.focus());
    },
    [],
  );

  const handleNext = useCallback(() => {
    const found = validateStep(step);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      focusFirstError(found);
      return;
    }
    goToStep(Math.min(stepIndex + 1, STEP_KEYS.length - 1));
  }, [focusFirstError, goToStep, step, stepIndex, validateStep]);

  // ---- image handling ----------------------------------------------------
  const pickError = useCallback(
    (code: string) => {
      setErrors((current) => ({ ...current, gallery: code }));
    },
    [],
  );

  const handleSinglePick = useCallback(
    async (kind: "logo" | "cover", file: File) => {
      const result = await readPickedImage(file);
      if (!result.ok) {
        pickError(result.error);
        return;
      }
      setErrors((current) => {
        if (!current.gallery) return current;
        const next = { ...current };
        delete next.gallery;
        return next;
      });
      setImages((current) => {
        releaseImage(current[kind]);
        return { ...current, [kind]: result.image };
      });
    },
    [pickError],
  );

  const handleGalleryPick = useCallback(
    async (files: File[]) => {
      const accepted: PickedImage[] = [];
      let failure: string | null = null;
      for (const file of files) {
        const result = await readPickedImage(file);
        if (result.ok) accepted.push(result.image);
        else failure = result.error;
      }
      if (accepted.length > 0) {
        setImages((current) => ({
          ...current,
          gallery: [...current.gallery, ...accepted].slice(
            0,
            INPUT_LIMITS.maxGallery,
          ),
        }));
      }
      setErrors((current) => {
        const next = { ...current };
        if (failure) next.gallery = failure;
        else delete next.gallery;
        return next;
      });
    },
    [],
  );

  // ---- submit ------------------------------------------------------------
  const uploadImage = useCallback(
    async (image: PickedImage, kind: "logo" | "cover" | "gallery", order: number) => {
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": image.file.type },
        body: image.file,
      });
      if (!response.ok) throw new Error("upload failed");
      const { storageId } = (await response.json()) as { storageId: string };
      return {
        storageId: storageId as Id<"_storage">,
        kind,
        width: image.width,
        height: image.height,
        order,
      };
    },
    [generateUploadUrl],
  );

  const handleSubmit = useCallback(async () => {
    const found = validateStep("review");
    if (Object.keys(found).length > 0) {
      setErrors(found);
      const firstBadStep = STEP_KEYS.findIndex((key) =>
        Object.keys(found).some((errorKey) => STEP_FIELDS[key](errorKey)),
      );
      if (firstBadStep >= 0 && firstBadStep !== stepIndex) {
        setStepIndex(firstBadStep);
      }
      focusFirstError(found);
      return;
    }

    setSubmitError(null);
    let media: Array<{
      storageId: Id<"_storage">;
      kind: "logo" | "cover" | "gallery";
      width: number;
      height: number;
      order: number;
    }> = [];

    try {
      setStatus("uploading");
      const uploads: Promise<(typeof media)[number]>[] = [];
      if (images.logo) uploads.push(uploadImage(images.logo, "logo", 0));
      if (images.cover) uploads.push(uploadImage(images.cover, "cover", 0));
      images.gallery.forEach((image, index) => {
        uploads.push(uploadImage(image, "gallery", index));
      });
      media = await Promise.all(uploads);
    } catch {
      setStatus("editing");
      setSubmitError(strings.errors.upload);
      return;
    }

    try {
      setStatus("sending");
      const result = await submitSubmission({
        payload: {
          name: state.name,
          descriptionSr: state.descriptionSr || undefined,
          descriptionDe: state.descriptionDe || undefined,
          website: state.website || undefined,
          phone: state.phone || undefined,
          email: state.email || undefined,
          openingHours: companyInput.openingHours,
          categorySlugs: state.categorySlugs,
          locations: [
            {
              country: state.country,
              city: state.city,
              address: state.address || undefined,
              zip: state.zip || undefined,
              isPrimary: true,
            },
          ],
          offerings: state.offerings.map((offering, index) => ({
            type: offering.type,
            nameSr: offering.nameSr,
            descriptionSr: offering.descriptionSr || undefined,
            order: index,
          })),
          media,
          discountOffer: state.discountEnabled
            ? {
                percent: Number.parseInt(state.discountPercent, 10),
                termsSr: state.discountTermsSr || undefined,
              }
            : undefined,
        },
        submitterName: state.submitterName,
        submitterEmail: state.submitterEmail,
        submitterPhone: state.submitterPhone || undefined,
        submitterRole: state.submitterRole || undefined,
        consent: state.consent,
        locale,
        website2: honeypot || undefined,
      });

      if (result.ok) {
        try {
          window.localStorage.removeItem(DRAFT_KEY);
        } catch {
          // Nothing to do — the draft simply outlives the submission.
        }
        setStatus("success");
        return;
      }

      setStatus("editing");
      if (result.error === "rate_limit") {
        setSubmitError(strings.errors.rateLimit);
        return;
      }
      if (result.fields) {
        setErrors(result.fields);
        const firstBadStep = STEP_KEYS.findIndex((key) =>
          Object.keys(result.fields ?? {}).some((errorKey) =>
            STEP_FIELDS[key](errorKey),
          ),
        );
        if (firstBadStep >= 0) setStepIndex(firstBadStep);
        focusFirstError(result.fields);
        setSubmitError(strings.errors.summary);
        return;
      }
      setSubmitError(strings.errors.generic);
    } catch {
      setStatus("editing");
      setSubmitError(strings.errors.generic);
    }
  }, [
    companyInput.openingHours,
    focusFirstError,
    honeypot,
    images,
    locale,
    state,
    stepIndex,
    strings.errors,
    submitSubmission,
    uploadImage,
    validateStep,
  ]);

  const discardDraft = useCallback(() => {
    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch {
      // Ignore — clearing the in-memory state below is what matters.
    }
    dispatch({ type: "reset" });
    setImages((current) => {
      releaseImage(current.logo);
      releaseImage(current.cover);
      current.gallery.forEach(releaseImage);
      return { logo: null, cover: null, gallery: [] };
    });
    setErrors({});
    setStepIndex(0);
  }, []);

  // ---- success -----------------------------------------------------------
  if (status === "success") {
    return (
      <div
        role="status"
        className="rounded-xl border border-border bg-sage-100 p-6 md:p-8"
      >
        <CheckCircle2 className="size-7 text-primary" aria-hidden="true" />
        <h2 className="mt-3 text-2xl">{strings.success.title}</h2>
        <p className="mt-2 max-w-xl text-muted-foreground">
          {t(strings.success.text, { email: state.submitterEmail })}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <Link href={strings.backHomeHref}>{strings.backHome}</Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              discardDraft();
              setStatus("editing");
            }}
          >
            {strings.success.addAnother}
          </Button>
        </div>
      </div>
    );
  }

  const busy = status === "uploading" || status === "sending";
  const progress = ((stepIndex + 1) / STEP_KEYS.length) * 100;

  return (
    <div className="rounded-xl border border-border bg-card p-5 md:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-2xl">{strings.title}</h2>
        <p className="text-sm text-muted-foreground">
          {t(strings.stepLabel, {
            current: stepIndex + 1,
            total: STEP_KEYS.length,
          })}
        </p>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        {strings.lead}
      </p>

      <div
        className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label={strings.progressLabel}
        aria-valuemin={1}
        aria-valuemax={STEP_KEYS.length}
        aria-valuenow={stepIndex + 1}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>

      <ol className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {STEP_KEYS.map((key, index) => (
          <li key={key}>
            <button
              type="button"
              onClick={() => goToStep(index)}
              disabled={busy}
              className={cn(
                "rounded-full px-1 py-0.5 transition-colors",
                index === stepIndex
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-current={index === stepIndex ? "step" : undefined}
            >
              {index + 1}. {strings.steps[key]}
            </button>
          </li>
        ))}
      </ol>

      {state.restoredFromDraft ? (
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-background p-3 text-sm">
          <Info className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="text-muted-foreground">{strings.restoredDraft}</span>
          <button
            type="button"
            onClick={discardDraft}
            className="underline underline-offset-2 hover:text-primary"
          >
            {strings.discardDraft}
          </button>
        </div>
      ) : null}

      <Separator className="my-6" />

      <motion.div
        key={step}
        initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <h3
          ref={headingRef}
          tabIndex={-1}
          className="text-xl outline-none"
        >
          {strings[step].title}
        </h3>
        <p className="mt-1 mb-5 text-sm text-muted-foreground">
          {strings[step].description}
          {OPTIONAL_STEPS.has(step) ? ` ${strings.optionalStep}` : ""}
        </p>

        {step === "basics" ? (
          <BasicsStep
            state={state}
            patch={patch}
            categories={categories}
            strings={strings}
            errorMessage={errorMessage}
            duplicates={duplicates ?? []}
            locale={locale}
          />
        ) : null}

        {step === "location" ? (
          <LocationStep
            state={state}
            patch={patch}
            strings={strings}
            errorMessage={errorMessage}
          />
        ) : null}

        {step === "contact" ? (
          <ContactStep
            state={state}
            patch={patch}
            strings={strings}
            errorMessage={errorMessage}
          />
        ) : null}

        {step === "offer" ? (
          <OfferStep
            state={state}
            patch={patch}
            images={images}
            strings={strings}
            errorMessage={errorMessage}
            onPickSingle={handleSinglePick}
            onPickGallery={handleGalleryPick}
            onRemoveSingle={(kind) =>
              setImages((current) => {
                releaseImage(current[kind]);
                return { ...current, [kind]: null };
              })
            }
            onRemoveGallery={(index) =>
              setImages((current) => {
                releaseImage(current.gallery[index]);
                return {
                  ...current,
                  gallery: current.gallery.filter((_, i) => i !== index),
                };
              })
            }
          />
        ) : null}

        {step === "submitter" ? (
          <SubmitterStep
            state={state}
            patch={patch}
            strings={strings}
            errorMessage={errorMessage}
            locale={locale}
            honeypot={honeypot}
            setHoneypot={setHoneypot}
          />
        ) : null}

        {step === "review" ? (
          <ReviewStep
            state={state}
            images={images}
            categories={categories}
            strings={strings}
            onEdit={goToStep}
          />
        ) : null}
      </motion.div>

      {submitError ? (
        <p role="alert" className="mt-5 text-sm text-destructive">
          {submitError}
        </p>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        {stepIndex > 0 ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => goToStep(stepIndex - 1)}
            disabled={busy}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {strings.back}
          </Button>
        ) : null}

        {step === "review" ? (
          <Button type="button" onClick={handleSubmit} disabled={busy}>
            <Send className="size-4" aria-hidden="true" />
            {status === "uploading"
              ? strings.uploading
              : status === "sending"
                ? strings.submitting
                : strings.submit}
          </Button>
        ) : (
          <Button type="button" onClick={handleNext} disabled={busy}>
            {strings.next}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        )}

        {OPTIONAL_STEPS.has(step) ? (
          <button
            type="button"
            onClick={() => goToStep(stepIndex + 1)}
            disabled={busy}
            className="text-sm text-muted-foreground underline underline-offset-2 hover:text-primary"
          >
            {strings.skip}
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

type StepProps = {
  state: FormState;
  patch: (value: Partial<FormState>) => void;
  strings: WizardStrings;
  errorMessage: (key: string) => string | undefined;
};

function BasicsStep({
  state,
  patch,
  categories,
  strings,
  errorMessage,
  duplicates,
  locale,
}: StepProps & {
  categories: WizardCategory[];
  duplicates: Array<{ slug: string; name: string; city: string }>;
  locale: Locale;
}) {
  const categoryError = errorMessage("categorySlugs");
  const atLimit = state.categorySlugs.length >= INPUT_LIMITS.maxCategories;

  return (
    <div className="space-y-6">
      <TextField
        fieldKey="name"
        label={strings.basics.name}
        placeholder={strings.basics.namePlaceholder}
        value={state.name}
        onChange={(name) => patch({ name })}
        maxLength={INPUT_LIMITS.name}
        autoComplete="organization"
        error={errorMessage("name")}
      />

      {duplicates.length > 0 ? (
        <div className="rounded-lg border border-terracotta-300 bg-terracotta-100 p-4 text-sm">
          <p className="font-medium">{strings.basics.duplicateWarning}</p>
          <ul className="mt-2 space-y-1">
            {duplicates.map((company) => (
              <li key={company.slug}>
                <Link
                  href={localePath(locale, `/firma/${company.slug}`)}
                  className="underline underline-offset-2 hover:text-primary"
                >
                  {company.name}
                </Link>
                {company.city ? (
                  <span className="text-muted-foreground"> — {company.city}</span>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-muted-foreground">
            {strings.basics.duplicateHint}
          </p>
        </div>
      ) : null}

      <fieldset>
        <legend className="text-sm leading-none font-medium">
          {strings.basics.categories}
        </legend>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {t(strings.basics.categoriesHint, { max: INPUT_LIMITS.maxCategories })}
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {categories.map((category) => {
            const checked = state.categorySlugs.includes(category.slug);
            return (
              <label
                key={category.slug}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors",
                  checked
                    ? "border-primary bg-accent"
                    : "border-border bg-background hover:border-neutral-400",
                  !checked && atLimit && "cursor-not-allowed opacity-50",
                )}
              >
                <input
                  type="checkbox"
                  className="size-5 accent-primary"
                  checked={checked}
                  disabled={!checked && atLimit}
                  onChange={() =>
                    patch({
                      categorySlugs: checked
                        ? state.categorySlugs.filter((s) => s !== category.slug)
                        : [...state.categorySlugs, category.slug],
                    })
                  }
                />
                <CategoryIcon
                  name={category.icon}
                  className="size-4 shrink-0 text-primary"
                />
                <span>{category.name}</span>
              </label>
            );
          })}
        </div>
        {categoryError ? (
          <p
            id={fieldId("categorySlugs")}
            role="alert"
            tabIndex={-1}
            className="mt-2 text-sm text-destructive outline-none"
          >
            {categoryError}
          </p>
        ) : null}
      </fieldset>

      <TextAreaField
        fieldKey="descriptionSr"
        label={strings.basics.descriptionSr}
        hint={t(strings.basics.descriptionSrHint, {
          min: INPUT_LIMITS.minDescriptionLength,
        })}
        value={state.descriptionSr}
        onChange={(descriptionSr) => patch({ descriptionSr })}
        maxLength={INPUT_LIMITS.description}
        showCounter
        error={errorMessage("descriptionSr")}
      />

      <TextAreaField
        fieldKey="descriptionDe"
        label={strings.basics.descriptionDe}
        optionalLabel={strings.optional}
        hint={strings.basics.descriptionDeHint}
        value={state.descriptionDe}
        onChange={(descriptionDe) => patch({ descriptionDe })}
        maxLength={INPUT_LIMITS.description}
        error={errorMessage("descriptionDe")}
      />
    </div>
  );
}

function LocationStep({ state, patch, strings, errorMessage }: StepProps) {
  return (
    <div className="space-y-6">
      <SelectField
        fieldKey="country"
        label={strings.location.country}
        value={state.country}
        onChange={(country) =>
          patch({ country: country as FormState["country"] })
        }
        options={COUNTRY_CODES.map((code) => ({
          value: code,
          label: strings.countries[code],
        }))}
        error={errorMessage("country")}
      />
      <TextField
        fieldKey="city"
        label={strings.location.city}
        placeholder={strings.location.cityPlaceholder}
        value={state.city}
        onChange={(city) => patch({ city })}
        maxLength={INPUT_LIMITS.city}
        autoComplete="address-level2"
        error={errorMessage("city")}
      />
      <div className="grid gap-6 sm:grid-cols-[1fr_10rem]">
        <TextField
          fieldKey="address"
          label={strings.location.address}
          optionalLabel={strings.optional}
          placeholder={strings.location.addressPlaceholder}
          value={state.address}
          onChange={(address) => patch({ address })}
          maxLength={INPUT_LIMITS.address}
          autoComplete="street-address"
          error={errorMessage("address")}
        />
        <TextField
          fieldKey="zip"
          label={strings.location.zip}
          optionalLabel={strings.optional}
          value={state.zip}
          onChange={(zip) => patch({ zip })}
          maxLength={INPUT_LIMITS.zip}
          autoComplete="postal-code"
          error={errorMessage("zip")}
        />
      </div>
    </div>
  );
}

function ContactStep({ state, patch, strings, errorMessage }: StepProps) {
  const hoursError = errorMessage("openingHours");

  return (
    <div className="space-y-6">
      <TextField
        fieldKey="website"
        label={strings.contact.website}
        optionalLabel={strings.optional}
        placeholder={strings.contact.websitePlaceholder}
        value={state.website}
        onChange={(website) => patch({ website })}
        maxLength={INPUT_LIMITS.website}
        inputMode="url"
        autoComplete="url"
        error={errorMessage("website")}
      />
      <div className="grid gap-6 sm:grid-cols-2">
        <TextField
          fieldKey="phone"
          label={strings.contact.phone}
          optionalLabel={strings.optional}
          value={state.phone}
          onChange={(phone) => patch({ phone })}
          type="tel"
          maxLength={INPUT_LIMITS.phone}
          autoComplete="tel"
          error={errorMessage("phone")}
        />
        <TextField
          fieldKey="email"
          label={strings.contact.email}
          optionalLabel={strings.optional}
          hint={strings.contact.emailHint}
          value={state.email}
          onChange={(email) => patch({ email })}
          type="email"
          maxLength={INPUT_LIMITS.email}
          autoComplete="email"
          error={errorMessage("email")}
        />
      </div>

      <fieldset>
        <legend className="text-sm leading-none font-medium">
          {strings.contact.hoursTitle}
        </legend>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {strings.contact.hoursHint}
        </p>
        <ul className="mt-3 space-y-2">
          {state.hours.map((row, day) => (
            <li
              key={day}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-background p-3"
            >
              <label className="flex min-w-40 cursor-pointer items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  className="size-5 accent-primary"
                  checked={row.enabled}
                  onChange={(event) =>
                    patch({
                      hours: state.hours.map((current, index) =>
                        index === day
                          ? { ...current, enabled: event.target.checked }
                          : current,
                      ),
                    })
                  }
                />
                <span>{strings.days[day]}</span>
              </label>
              <div
                className={cn(
                  "flex items-center gap-2 text-sm",
                  !row.enabled && "opacity-40",
                )}
              >
                <span className="text-muted-foreground">
                  {strings.contact.from}
                </span>
                <input
                  type="time"
                  value={row.open}
                  disabled={!row.enabled}
                  aria-label={`${strings.days[day]} — ${strings.contact.from}`}
                  onChange={(event) =>
                    patch({
                      hours: state.hours.map((current, index) =>
                        index === day
                          ? { ...current, open: event.target.value }
                          : current,
                      ),
                    })
                  }
                  className="h-10 rounded-full border bg-card px-3 text-sm"
                />
                <span className="text-muted-foreground">
                  {strings.contact.to}
                </span>
                <input
                  type="time"
                  value={row.close}
                  disabled={!row.enabled}
                  aria-label={`${strings.days[day]} — ${strings.contact.to}`}
                  onChange={(event) =>
                    patch({
                      hours: state.hours.map((current, index) =>
                        index === day
                          ? { ...current, close: event.target.value }
                          : current,
                      ),
                    })
                  }
                  className="h-10 rounded-full border bg-card px-3 text-sm"
                />
              </div>
            </li>
          ))}
        </ul>
        {hoursError ? (
          <p
            id={fieldId("openingHours")}
            role="alert"
            tabIndex={-1}
            className="mt-2 text-sm text-destructive outline-none"
          >
            {hoursError}
          </p>
        ) : null}
      </fieldset>
    </div>
  );
}

function OfferStep({
  state,
  patch,
  images,
  strings,
  errorMessage,
  onPickSingle,
  onPickGallery,
  onRemoveSingle,
  onRemoveGallery,
}: StepProps & {
  images: WizardImages;
  onPickSingle: (kind: "logo" | "cover", file: File) => void;
  onPickGallery: (files: File[]) => void;
  onRemoveSingle: (kind: "logo" | "cover") => void;
  onRemoveGallery: (index: number) => void;
}) {
  const imageHint = t(strings.offer.imageHint, {
    mb: Math.round(UPLOAD_MAX_BYTES / (1024 * 1024)),
  });

  return (
    <div className="space-y-8">
      <div className="grid gap-6 sm:grid-cols-2">
        <SingleImagePicker
          label={strings.offer.logo}
          hint={imageHint}
          value={images.logo}
          chooseLabel={strings.offer.chooseImage}
          removeLabel={strings.offer.removeImage}
          onPick={(file) => onPickSingle("logo", file)}
          onRemove={() => onRemoveSingle("logo")}
        />
        <SingleImagePicker
          label={strings.offer.cover}
          hint={imageHint}
          aspect="wide"
          value={images.cover}
          chooseLabel={strings.offer.chooseImage}
          removeLabel={strings.offer.removeImage}
          onPick={(file) => onPickSingle("cover", file)}
          onRemove={() => onRemoveSingle("cover")}
        />
      </div>

      <GalleryPicker
        label={strings.offer.gallery}
        hint={t(strings.offer.galleryHint, { max: INPUT_LIMITS.maxGallery })}
        values={images.gallery}
        chooseLabel={strings.offer.chooseImages}
        removeLabel={strings.offer.removeImage}
        max={INPUT_LIMITS.maxGallery}
        error={errorMessage("gallery")}
        onPick={onPickGallery}
        onRemove={onRemoveGallery}
      />

      <div>
        <h4 className="text-base font-medium">{strings.offer.offeringsTitle}</h4>
        <p className="mt-1 text-xs text-muted-foreground">
          {strings.offer.offeringsHint}
        </p>
        <ul className="mt-3 space-y-3">
          {state.offerings.map((offering, index) => (
            <li
              key={offering.id}
              className="rounded-lg border border-border bg-background p-4"
            >
              <div className="grid gap-4 sm:grid-cols-[9rem_1fr]">
                <SelectField
                  fieldKey={`offerings.${index}.type`}
                  label={strings.offer.offeringType}
                  value={offering.type}
                  onChange={(type) =>
                    patch({
                      offerings: state.offerings.map((current, i) =>
                        i === index
                          ? { ...current, type: type as OfferingDraft["type"] }
                          : current,
                      ),
                    })
                  }
                  options={[
                    { value: "service", label: strings.offer.offeringService },
                    { value: "product", label: strings.offer.offeringProduct },
                  ]}
                />
                <TextField
                  fieldKey={`offerings.${index}.nameSr`}
                  label={strings.offer.offeringName}
                  value={offering.nameSr}
                  onChange={(nameSr) =>
                    patch({
                      offerings: state.offerings.map((current, i) =>
                        i === index ? { ...current, nameSr } : current,
                      ),
                    })
                  }
                  maxLength={INPUT_LIMITS.offeringName}
                  error={errorMessage(`offerings.${index}.nameSr`)}
                />
              </div>
              <div className="mt-4">
                <TextAreaField
                  fieldKey={`offerings.${index}.descriptionSr`}
                  label={strings.offer.offeringDescription}
                  optionalLabel={strings.optional}
                  rows={2}
                  value={offering.descriptionSr}
                  onChange={(descriptionSr) =>
                    patch({
                      offerings: state.offerings.map((current, i) =>
                        i === index ? { ...current, descriptionSr } : current,
                      ),
                    })
                  }
                  maxLength={INPUT_LIMITS.offeringDescription}
                  error={errorMessage(`offerings.${index}.descriptionSr`)}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-3"
                onClick={() =>
                  patch({
                    offerings: state.offerings.filter((_, i) => i !== index),
                  })
                }
              >
                <Trash2 className="size-4" aria-hidden="true" />
                {strings.offer.removeOffering}
              </Button>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() =>
            patch({ offerings: [...state.offerings, newOffering()] })
          }
        >
          <Plus className="size-4" aria-hidden="true" />
          {strings.offer.addOffering}
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-background p-4">
        <h4 className="text-base font-medium">{strings.offer.discountTitle}</h4>
        <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            className="size-5 accent-primary"
            checked={state.discountEnabled}
            onChange={(event) =>
              patch({ discountEnabled: event.target.checked })
            }
          />
          <span>{strings.offer.discountToggle}</span>
        </label>
        {state.discountEnabled ? (
          <div className="mt-4 space-y-4">
            <TextField
              fieldKey="discountPercent"
              label={strings.offer.discountPercent}
              value={state.discountPercent}
              onChange={(discountPercent) => patch({ discountPercent })}
              type="number"
              inputMode="numeric"
              min={INPUT_LIMITS.discountMin}
              max={INPUT_LIMITS.discountMax}
              className="max-w-32"
              error={errorMessage("discountPercent")}
            />
            <TextAreaField
              fieldKey="discountTermsSr"
              label={strings.offer.discountTerms}
              optionalLabel={strings.optional}
              rows={2}
              value={state.discountTermsSr}
              onChange={(discountTermsSr) => patch({ discountTermsSr })}
              maxLength={INPUT_LIMITS.discountTerms}
              error={errorMessage("discountTermsSr")}
            />
          </div>
        ) : null}
        <p className="mt-3 text-xs text-muted-foreground">
          {strings.offer.discountNote}
        </p>
      </div>
    </div>
  );
}

function SubmitterStep({
  state,
  patch,
  strings,
  errorMessage,
  locale,
  honeypot,
  setHoneypot,
}: StepProps & {
  locale: Locale;
  honeypot: string;
  setHoneypot: (value: string) => void;
}) {
  const consentError = errorMessage("consent");

  return (
    <div className="space-y-6">
      {/* Hidden from humans and assistive tech; bots fill it. */}
      <div className="absolute -left-[9999px] top-auto" aria-hidden="true">
        <label>
          website2
          <input
            type="text"
            name="website2"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(event) => setHoneypot(event.target.value)}
          />
        </label>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <TextField
          fieldKey="submitterName"
          label={strings.submitter.name}
          value={state.submitterName}
          onChange={(submitterName) => patch({ submitterName })}
          maxLength={INPUT_LIMITS.submitterName}
          autoComplete="name"
          error={errorMessage("submitterName")}
        />
        <TextField
          fieldKey="submitterEmail"
          label={strings.submitter.email}
          hint={strings.submitter.emailHint}
          value={state.submitterEmail}
          onChange={(submitterEmail) => patch({ submitterEmail })}
          type="email"
          maxLength={INPUT_LIMITS.email}
          autoComplete="email"
          error={errorMessage("submitterEmail")}
        />
        <TextField
          fieldKey="submitterPhone"
          label={strings.submitter.phone}
          optionalLabel={strings.optional}
          value={state.submitterPhone}
          onChange={(submitterPhone) => patch({ submitterPhone })}
          type="tel"
          maxLength={INPUT_LIMITS.phone}
          autoComplete="tel"
          error={errorMessage("submitterPhone")}
        />
        <TextField
          fieldKey="submitterRole"
          label={strings.submitter.role}
          optionalLabel={strings.optional}
          placeholder={strings.submitter.rolePlaceholder}
          value={state.submitterRole}
          onChange={(submitterRole) => patch({ submitterRole })}
          maxLength={INPUT_LIMITS.submitterRole}
          error={errorMessage("submitterRole")}
        />
      </div>

      <div>
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input
            id={fieldId("consent")}
            type="checkbox"
            className="mt-0.5 size-5 shrink-0 accent-primary"
            checked={state.consent}
            aria-invalid={consentError ? true : undefined}
            onChange={(event) => patch({ consent: event.target.checked })}
          />
          <span>
            {strings.submitter.consent}{" "}
            <Link
              href={localePath(locale, strings.privacyHref)}
              className="underline underline-offset-2 hover:text-primary"
            >
              {strings.submitter.privacyLink}
            </Link>
          </span>
        </label>
        {consentError ? (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {consentError}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ReviewStep({
  state,
  images,
  categories,
  strings,
  onEdit,
}: {
  state: FormState;
  images: WizardImages;
  categories: WizardCategory[];
  strings: WizardStrings;
  onEdit: (index: number) => void;
}) {
  const empty = strings.review.empty;
  const categoryNames = state.categorySlugs
    .map((slug) => categories.find((c) => c.slug === slug)?.name ?? slug)
    .join(", ");
  const imageCount =
    (images.logo ? 1 : 0) + (images.cover ? 1 : 0) + images.gallery.length;
  const openDays = state.hours.filter((row) => row.enabled).length;

  const sections: Array<{
    step: number;
    title: string;
    rows: Array<[string, string]>;
  }> = [
    {
      step: 0,
      title: strings.steps.basics,
      rows: [
        [strings.basics.name, state.name || empty],
        [strings.basics.categories, categoryNames || empty],
        [strings.basics.descriptionSr, state.descriptionSr || empty],
        [strings.basics.descriptionDe, state.descriptionDe || empty],
      ],
    },
    {
      step: 1,
      title: strings.steps.location,
      rows: [
        [strings.location.country, strings.countries[state.country]],
        [strings.location.city, state.city || empty],
        [strings.location.address, state.address || empty],
        [strings.location.zip, state.zip || empty],
      ],
    },
    {
      step: 2,
      title: strings.steps.contact,
      rows: [
        [strings.contact.website, state.website || empty],
        [strings.contact.phone, state.phone || empty],
        [strings.contact.email, state.email || empty],
        [
          strings.contact.hoursTitle,
          openDays > 0
            ? state.hours
                .map((row, day) =>
                  row.enabled
                    ? `${strings.days[day]} ${row.open}–${row.close}`
                    : null,
                )
                .filter(Boolean)
                .join(" · ")
            : empty,
        ],
      ],
    },
    {
      step: 3,
      title: strings.steps.offer,
      rows: [
        [
          strings.offer.gallery,
          imageCount > 0
            ? t(strings.review.imagesCount, { count: imageCount })
            : empty,
        ],
        [
          strings.offer.offeringsTitle,
          state.offerings.length > 0
            ? t(strings.review.offeringsCount, {
                count: state.offerings.length,
              })
            : empty,
        ],
        [
          strings.offer.discountTitle,
          state.discountEnabled ? `${state.discountPercent}%` : empty,
        ],
      ],
    },
    {
      step: 4,
      title: strings.steps.submitter,
      rows: [
        [strings.submitter.name, state.submitterName || empty],
        [strings.submitter.email, state.submitterEmail || empty],
        [strings.submitter.phone, state.submitterPhone || empty],
        [strings.submitter.role, state.submitterRole || empty],
      ],
    },
  ];

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <section
          key={section.step}
          className="rounded-lg border border-border bg-background p-4"
        >
          <div className="flex items-baseline justify-between gap-3">
            <h4 className="text-base font-medium">{section.title}</h4>
            <button
              type="button"
              onClick={() => onEdit(section.step)}
              className="text-sm text-primary underline underline-offset-2"
            >
              {strings.review.edit}
            </button>
          </div>
          <dl className="mt-3 grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[minmax(0,12rem)_1fr]">
            {section.rows.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="break-words whitespace-pre-wrap">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
