"use client";

import { useId, useState } from "react";
import styles from "./auth-form.module.css";

/**
 * Password entry with a reveal control, shared by every auth surface that takes
 * one: login, registration, password update and deletion re-authentication.
 *
 * Composed once rather than repeated four times so the accessible name, the
 * autocomplete semantics and the "never submit the toggle" rule cannot drift
 * apart between flows.
 *
 * The revealed state lives only in this component for the lifetime of the
 * input. Nothing is persisted, logged, or copied anywhere: toggling swaps the
 * input `type`, which is the browser's own mechanism, and the submitted value
 * is always the input's value.
 */
export function AuthPasswordField({
  id,
  name,
  label,
  autoComplete,
  placeholder,
  invalid,
  describedBy,
  disabled,
  labelAccessory,
  children,
}: {
  id: string;
  name: string;
  label: string;
  /** `current-password` when proving an existing password, `new-password` when setting one. */
  autoComplete: "current-password" | "new-password";
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
  disabled?: boolean;
  /** Rendered beside the label — the login "forgot password" link. */
  labelAccessory?: React.ReactNode;
  /** Field error, rendered under the control. */
  children?: React.ReactNode;
}) {
  const [revealed, setRevealed] = useState(false);
  const toggleId = useId();

  return (
    <div className={styles.field}>
      <span className={styles.fieldLabelRow}>
        <label htmlFor={id}>{label}</label>
        {labelAccessory}
      </span>

      <span className={styles.passwordControl}>
        <input
          id={id}
          name={name}
          type={revealed ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          disabled={disabled}
          className={styles.passwordInput}
        />
        {/*
          Keep the reveal control outside the input's associated label. If this
          button is nested in that label, its name becomes part of the input's
          accessible name (for example, "Mật khẩu Hiện mật khẩu").

          type="button" also matters: inside a form a bare <button> submits, so
          a reveal control that omitted it would post the credential on click.
        */}
        <button
          type="button"
          id={toggleId}
          className={styles.passwordToggle}
          onClick={() => setRevealed((current) => !current)}
          aria-controls={id}
          aria-pressed={revealed}
          // The name changes with state so a screen reader announces the
          // action available now, not the current condition.
          aria-label={revealed ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          disabled={disabled}
        >
          <span aria-hidden="true">{revealed ? "Ẩn" : "Hiện"}</span>
        </button>
      </span>

      {children}
    </div>
  );
}
