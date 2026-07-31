/**
 * Field wrappers for the wizard: label + control + hint + error, with the
 * aria wiring done once so no step component can forget it.
 *
 * Ids come from `fieldId(errorKey)`, which is also what the wizard focuses
 * when a step fails validation — one naming scheme, no lookup table.
 */
import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { fieldId } from "./types";

type FieldShellProps = {
  fieldKey: string;
  label: string;
  hint?: string;
  optionalLabel?: string;
  error?: string;
  children: (props: {
    id: string;
    "aria-invalid": boolean | undefined;
    "aria-describedby": string | undefined;
  }) => ReactNode;
};

export function FieldShell({
  fieldKey,
  label,
  hint,
  optionalLabel,
  error,
  children,
}: FieldShellProps) {
  const id = fieldId(fieldKey);
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {optionalLabel ? (
          <span className="text-xs font-normal text-muted-foreground">
            ({optionalLabel})
          </span>
        ) : null}
      </Label>
      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
      })}
      {hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type TextFieldProps = {
  fieldKey: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  optionalLabel?: string;
  error?: string;
  placeholder?: string;
  type?: "text" | "email" | "tel" | "url" | "number";
  maxLength?: number;
  inputMode?: "text" | "email" | "tel" | "url" | "numeric";
  autoComplete?: string;
  min?: number;
  max?: number;
  className?: string;
};

export function TextField({
  value,
  onChange,
  placeholder,
  type = "text",
  maxLength,
  inputMode,
  autoComplete,
  min,
  max,
  className,
  ...shell
}: TextFieldProps) {
  return (
    <FieldShell {...shell}>
      {(aria) => (
        <Input
          {...aria}
          name={shell.fieldKey}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          inputMode={inputMode}
          autoComplete={autoComplete}
          min={min}
          max={max}
          className={cn(shell.error && "border-destructive", className)}
        />
      )}
    </FieldShell>
  );
}

type TextAreaFieldProps = {
  fieldKey: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  optionalLabel?: string;
  error?: string;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  /** Shows "123 / 4000" under the control once the user is past halfway. */
  showCounter?: boolean;
};

export function TextAreaField({
  value,
  onChange,
  placeholder,
  rows = 5,
  maxLength,
  showCounter,
  ...shell
}: TextAreaFieldProps) {
  const nearLimit =
    showCounter && maxLength !== undefined && value.length > maxLength / 2;

  return (
    <FieldShell {...shell}>
      {(aria) => (
        <>
          <Textarea
            {...aria}
            name={shell.fieldKey}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            rows={rows}
            maxLength={maxLength}
            className={cn(shell.error && "border-destructive")}
          />
          {nearLimit ? (
            <p className="text-right text-xs tabular-nums text-muted-foreground">
              {value.length} / {maxLength}
            </p>
          ) : null}
        </>
      )}
    </FieldShell>
  );
}

/** Native select styled like the shadcn trigger — no portal, no extra JS. */
export function SelectField({
  value,
  onChange,
  options,
  ...shell
}: {
  fieldKey: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  hint?: string;
  optionalLabel?: string;
  error?: string;
}) {
  return (
    <FieldShell {...shell}>
      {(aria) => (
        <select
          {...aria}
          name={shell.fieldKey}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            "flex h-12 w-full rounded-full border bg-card px-5 text-base transition-colors hover:border-neutral-400 focus-visible:border-primary",
            shell.error && "border-destructive",
          )}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </FieldShell>
  );
}
