"use client";

import {
  createContext,
  useContext,
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";
import { IconAlert, IconCheck, IconChevronDown, IconEye, IconEyeOff } from "./icons";

/* -------------------------------------------------------------------------
   Field wrapper — owns the label/description/error wiring for every control.
   ------------------------------------------------------------------------- */

type FieldContextValue = {
  inputId: string;
  describedBy: string | undefined;
  invalid: boolean;
};

const FieldContext = createContext<FieldContextValue | null>(null);

export function useFieldContext() {
  return useContext(FieldContext);
}

export function Field({
  label,
  hint,
  error,
  optional,
  required,
  children,
  className,
  /** Renders the label visually hidden but still available to screen readers. */
  hideLabel,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  optional?: boolean;
  required?: boolean;
  children: ReactNode;
  className?: string;
  hideLabel?: boolean;
}) {
  const uid = useId();
  const inputId = `f-${uid}`;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <FieldContext.Provider value={{ inputId, describedBy, invalid: Boolean(error) }}>
      <div className={cn("min-w-0", className)}>
        <div className={cn("flex items-baseline justify-between gap-2", hideLabel && "sr-only")}>
          <label htmlFor={inputId} className="block text-sm font-semibold text-ink-800">
            {label}
            {required ? (
              <span className="text-danger-600 ml-0.5" aria-hidden="true">
                *
              </span>
            ) : null}
            {required ? <span className="sr-only"> (required)</span> : null}
          </label>
          {optional ? (
            <span className="text-xs font-medium text-ink-500">Optional</span>
          ) : null}
        </div>
        <div className={cn(!hideLabel && "mt-1.5")}>{children}</div>
        {hint && !error ? (
          <p id={hintId} className="mt-1.5 text-xs leading-relaxed text-ink-500">
            {hint}
          </p>
        ) : null}
        {error ? (
          <p
            id={errorId}
            className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-danger-700"
          >
            <IconAlert className="mt-px shrink-0 text-[0.9rem]" />
            <span>{error}</span>
          </p>
        ) : null}
      </div>
    </FieldContext.Provider>
  );
}

/* -------------------------------------------------------------------------
   Controls
   ------------------------------------------------------------------------- */

const controlBase =
  "w-full rounded-xl border bg-ink-100 text-ink-900 placeholder:text-ink-400 " +
  "transition-[border-color,box-shadow] duration-150 " +
  "disabled:bg-ink-50 disabled:text-ink-500 disabled:cursor-not-allowed " +
  "read-only:bg-ink-50";

const controlSizes = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-3.5 text-[0.9375rem]",
  lg: "h-13 px-4 text-base",
} as const;

function controlState(invalid: boolean) {
  return invalid
    ? "border-danger-400 focus:border-danger-500 focus-visible:outline-danger-600"
    : "border-ink-300 hover:border-ink-400 focus:border-brand-500";
}

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  size?: keyof typeof controlSizes;
  leadingIcon?: ReactNode;
  trailingSlot?: ReactNode;
};

export function Input({
  size = "md",
  className,
  leadingIcon,
  trailingSlot,
  id,
  ...props
}: InputProps) {
  const field = useFieldContext();
  const invalid = field?.invalid ?? false;

  const input = (
    <input
      id={id ?? field?.inputId}
      aria-describedby={field?.describedBy}
      aria-invalid={invalid || undefined}
      className={cn(
        controlBase,
        controlSizes[size],
        controlState(invalid),
        leadingIcon && "pl-10",
        trailingSlot && "pr-11",
        className,
      )}
      {...props}
    />
  );

  if (!leadingIcon && !trailingSlot) return input;

  return (
    <div className="relative">
      {leadingIcon ? (
        <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-[1.05rem] text-ink-400">
          {leadingIcon}
        </span>
      ) : null}
      {input}
      {trailingSlot ? (
        <span className="absolute inset-y-0 right-1.5 grid place-items-center">
          {trailingSlot}
        </span>
      ) : null}
    </div>
  );
}

export function PasswordInput({
  showLabel = "Show password",
  hideLabel = "Hide password",
  ...props
}: InputProps & { showLabel?: string; hideLabel?: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <Input
      {...props}
      type={visible ? "text" : "password"}
      trailingSlot={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? hideLabel : showLabel}
          aria-pressed={visible}
          className="grid h-8 w-8 place-items-center rounded-lg text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-700"
        >
          {visible ? <IconEyeOff /> : <IconEye />}
        </button>
      }
    />
  );
}

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  /** Shows a live character counter and enforces the limit. */
  maxLength?: number;
  value?: string;
};

export function Textarea({ className, maxLength, value, id, ...props }: TextareaProps) {
  const field = useFieldContext();
  const invalid = field?.invalid ?? false;
  const used = typeof value === "string" ? value.length : undefined;
  const counterId = maxLength ? `${field?.inputId ?? id}-count` : undefined;

  return (
    <div>
      <textarea
        id={id ?? field?.inputId}
        aria-describedby={cn(field?.describedBy, counterId) || undefined}
        aria-invalid={invalid || undefined}
        maxLength={maxLength}
        value={value}
        className={cn(
          controlBase,
          controlState(invalid),
          "min-h-28 resize-y px-3.5 py-3 text-[0.9375rem] leading-relaxed",
          className,
        )}
        {...props}
      />
      {maxLength ? (
        <p
          id={counterId}
          className={cn(
            "mt-1 text-right text-xs tabular-nums",
            used !== undefined && used > maxLength * 0.9 ? "text-warning-700" : "text-ink-500",
          )}
        >
          {used ?? 0} / {maxLength}
        </p>
      ) : null}
    </div>
  );
}

export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
  size?: keyof typeof controlSizes;
  /** Rendered as a disabled first option so the control is never empty. */
  placeholder?: string;
};

export function Select({
  className,
  children,
  size = "md",
  placeholder,
  id,
  ...props
}: SelectProps) {
  const field = useFieldContext();
  const invalid = field?.invalid ?? false;
  return (
    <div className="relative">
      <select
        id={id ?? field?.inputId}
        aria-describedby={field?.describedBy}
        aria-invalid={invalid || undefined}
        className={cn(
          controlBase,
          controlSizes[size],
          controlState(invalid),
          "cursor-pointer appearance-none pr-10",
          className,
        )}
        {...props}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {children}
      </select>
      <IconChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-500" />
    </div>
  );
}

export function Checkbox({
  label,
  description,
  className,
  error,
  id,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: ReactNode;
  description?: ReactNode;
  error?: string | null;
}) {
  const uid = useId();
  const inputId = id ?? `cb-${uid}`;
  const descId = description ? `${inputId}-desc` : undefined;
  const errId = error ? `${inputId}-err` : undefined;

  return (
    <div className={className}>
      <div className="flex gap-3">
        <input
          id={inputId}
          type="checkbox"
          aria-describedby={cn(descId, errId) || undefined}
          aria-invalid={error ? true : undefined}
          className={cn(
            "mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded-md border-2 text-brand-600",
            "transition-colors disabled:cursor-not-allowed disabled:opacity-50",
            error ? "border-danger-400" : "border-ink-300",
          )}
          {...props}
        />
        <div className="min-w-0">
          <label
            htmlFor={inputId}
            className="block cursor-pointer text-sm font-medium leading-snug text-ink-800"
          >
            {label}
          </label>
          {description ? (
            <p id={descId} className="mt-0.5 text-xs leading-relaxed text-ink-500">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {error ? (
        <p id={errId} className="mt-1.5 flex items-start gap-1.5 pl-8 text-xs font-medium text-danger-700">
          <IconAlert className="mt-px shrink-0 text-[0.9rem]" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

export function Switch({
  label,
  description,
  checked,
  onChange,
  disabled,
  name,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  name?: string;
}) {
  const uid = useId();
  const descId = description ? `sw-${uid}-desc` : undefined;
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <span id={`sw-${uid}-label`} className="block text-sm font-semibold text-ink-800">
          {label}
        </span>
        {description ? (
          <p id={descId} className="mt-0.5 text-xs leading-relaxed text-ink-500">
            {description}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        name={name}
        aria-checked={checked}
        aria-labelledby={`sw-${uid}-label`}
        aria-describedby={descId}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors duration-200",
          "disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-brand-600" : "bg-ink-300",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 grid h-5 w-5 place-items-center rounded-full bg-ink-950 shadow-e1",
            "transition-transform duration-200",
            checked && "translate-x-5",
          )}
        >
          {checked ? <IconCheck className="text-[0.7rem] text-brand-700" /> : null}
        </span>
      </button>
    </div>
  );
}

/** Large selectable card used for parking type, vehicle size, and similar. */
export function RadioCard({
  name,
  value,
  checked,
  onChange,
  icon,
  title,
  description,
  disabled,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  icon?: ReactNode;
  title: string;
  description?: string;
  disabled?: boolean;
}) {
  const uid = useId();
  const id = `rc-${uid}`;
  return (
    <div className="relative">
      <input
        id={id}
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange(value)}
        className="peer sr-only"
      />
      <label
        htmlFor={id}
        className={cn(
          "flex h-full cursor-pointer flex-col gap-1.5 rounded-xl border-2 p-4 transition-all duration-150",
          "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-600",
          "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
          checked
            ? "border-brand-600 bg-brand-50 shadow-e1"
            : "border-ink-200 bg-ink-100 hover:border-ink-400 hover:bg-ink-200",
        )}
      >
        {icon ? (
          <span className={cn("text-xl", checked ? "text-brand-700" : "text-ink-500")}>
            {icon}
          </span>
        ) : null}
        <span className={cn("text-sm font-bold", checked ? "text-brand-900" : "text-ink-900")}>
          {title}
        </span>
        {description ? (
          <span className="text-xs leading-relaxed text-ink-600">{description}</span>
        ) : null}
      </label>
    </div>
  );
}

/** Compact multi-select pill group (amenities, vehicle sizes, days). */
export function TogglePill({
  pressed,
  onToggle,
  children,
  disabled,
}: {
  pressed: boolean;
  onToggle: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-all duration-150",
        "disabled:cursor-not-allowed disabled:opacity-50",
        pressed
          ? "border-brand-600 bg-brand-600 text-white"
          : "border-ink-300 bg-ink-100 text-ink-700 hover:border-ink-400 hover:bg-ink-200",
      )}
    >
      {pressed ? <IconCheck className="text-[0.85rem]" /> : null}
      {children}
    </button>
  );
}

/**
 * Summary of every validation error in a form. Focus is moved here on failed
 * submit so keyboard and screen-reader users are not left hunting for the
 * first bad field.
 */
export function FormErrorSummary({
  errors,
  title = "Please fix the following before continuing",
  id = "form-error-summary",
}: {
  errors: Array<{ field: string; message: string }>;
  title?: string;
  id?: string;
}) {
  if (errors.length === 0) return null;
  return (
    <div
      id={id}
      role="alert"
      tabIndex={-1}
      className="rounded-xl border border-danger-200 bg-danger-50 p-4 focus-visible:outline-danger-600"
    >
      <p className="flex items-center gap-2 text-sm font-bold text-danger-800">
        <IconAlert className="text-[1.05rem]" />
        {title}
      </p>
      <ul className="mt-2 space-y-1 pl-7">
        {errors.map((e) => (
          <li key={e.field} className="list-disc text-sm text-danger-700 marker:text-danger-400">
            {e.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Fieldset({
  legend,
  description,
  children,
  className,
  error,
}: {
  legend: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  error?: string | null;
}) {
  const uid = useId();
  const descId = description ? `fs-${uid}-desc` : undefined;
  const errId = error ? `fs-${uid}-err` : undefined;
  return (
    <fieldset className={cn("min-w-0", className)} aria-describedby={cn(descId, errId) || undefined}>
      <legend className="text-sm font-semibold text-ink-800">{legend}</legend>
      {description ? (
        <p id={descId} className="mt-1 text-xs leading-relaxed text-ink-500">
          {description}
        </p>
      ) : null}
      <div className="mt-3">{children}</div>
      {error ? (
        <p id={errId} className="mt-2 flex items-start gap-1.5 text-xs font-medium text-danger-700">
          <IconAlert className="mt-px shrink-0 text-[0.9rem]" />
          <span>{error}</span>
        </p>
      ) : null}
    </fieldset>
  );
}
