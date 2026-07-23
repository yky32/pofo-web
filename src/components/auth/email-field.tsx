"use client";

import { useEffect, useState } from "react";
import {
  FieldMessage,
  fieldInputClass,
} from "@/components/auth/field-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { emailFieldError, sanitizeEmailInput } from "@/lib/email";

export function EmailField({
  serverError,
  autoComplete = "email",
  id = "email",
  name = "email",
}: {
  serverError?: string;
  autoComplete?: string;
  id?: string;
  name?: string;
}) {
  const [value, setValue] = useState("");
  const [localError, setLocalError] = useState<string | undefined>();
  const [touched, setTouched] = useState(false);

  // Prefer fresh server errors after submit; clear local when server takes over.
  useEffect(() => {
    if (serverError) setLocalError(undefined);
  }, [serverError]);

  const error = localError ?? serverError;

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-stone-700">
        Email
      </Label>
      <Input
        id={id}
        name={name}
        type="email"
        inputMode="email"
        autoComplete={autoComplete}
        spellCheck={false}
        autoCapitalize="none"
        autoCorrect="off"
        placeholder="you@studio.com"
        value={value}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={fieldInputClass(!!error)}
        onChange={(e) => {
          const next = sanitizeEmailInput(e.target.value);
          setValue(next);
          if (touched || localError) {
            setLocalError(next ? emailFieldError(next) : undefined);
          }
        }}
        onBlur={() => {
          setTouched(true);
          setLocalError(value ? emailFieldError(value) : undefined);
        }}
      />
      {error ? <FieldMessage id={`${id}-error`}>{error}</FieldMessage> : null}
    </div>
  );
}
