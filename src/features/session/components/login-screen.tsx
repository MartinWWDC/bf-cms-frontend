"use client";

import { type FormEvent, type ReactNode, useEffect, useId, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeftIcon, CopyIcon, KeyRoundIcon, ShieldCheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

import { Brand } from "@/components/layout/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useHydrated } from "@/hooks/use-hydrated";
import { setAuthToken } from "@/lib/api/auth-token";
import { getApiErrorCode, isApiError } from "@/lib/api/client";
import { useErrorMessage } from "@/lib/api/use-error-message";

import { useAuthToken } from "../hooks/use-auth-token";
import { safeNextPath } from "../lib/permissions";
import { useLogin, useVerifyTwoFactor } from "../mutations";
import { type IssuedSession, isIssuedSession, type LoginChallenge } from "../types";
import { RecoveryCodes } from "./recovery-codes";

type Step =
  | { name: "password"; notice?: string }
  | { name: "code"; challenge: LoginChallenge }
  | { name: "setup"; challenge: LoginChallenge }
  | { name: "recovery"; session: IssuedSession };

/**
 * Sign-in: password, then a two-factor code (`conventions.md` section 2).
 * On the first login the second step is the authenticator setup, followed by the recovery
 * codes, which are shown only once.
 *
 * Must be rendered inside `<Suspense>`: it reads `?next=` from the URL.
 */
export function LoginScreen() {
  const t = useTranslations("login");
  const router = useRouter();
  const searchParams = useSearchParams();
  const hydrated = useHydrated();
  const token = useAuthToken();
  const next = safeNextPath(searchParams.get("next"));
  const [step, setStep] = useState<Step>({ name: "password" });

  // Already signed in (or just signed in): leave the login page.
  useEffect(() => {
    if (hydrated && token !== null) router.replace(next);
  }, [hydrated, token, next, router]);

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-sidebar px-4 py-10 text-sidebar-foreground">
      <Brand />
      <div className="w-full max-w-sm rounded-xl bg-card p-6 text-card-foreground shadow-sm ring-1 ring-foreground/10">
        {step.name === "password" ? (
          <PasswordStep
            notice={step.notice}
            onChallenge={(challenge) =>
              setStep(
                challenge.challenge === "two_factor_setup" ? { name: "setup", challenge } : { name: "code", challenge },
              )
            }
          />
        ) : null}
        {step.name === "code" || step.name === "setup" ? (
          <CodeStep
            challenge={step.challenge}
            setup={step.name === "setup"}
            onBack={(notice) => setStep({ name: "password", notice })}
            onRecoveryCodes={(session) => setStep({ name: "recovery", session })}
          />
        ) : null}
        {step.name === "recovery" ? (
          <div className="flex flex-col gap-4">
            <StepHeader icon={<KeyRoundIcon />} title={t("recoveryTitle")} description={t("recoveryDescription")} />
            <RecoveryCodes codes={step.session.recovery_codes ?? []} />
            <Button onClick={() => setAuthToken(step.session.token, step.session.expires_at)}>
              {t("recoveryContinue")}
            </Button>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function StepHeader({ icon, title, description }: { icon?: ReactNode; title: string; description: string }) {
  return (
    <header className="flex flex-col gap-1.5">
      {icon ? (
        <span className="mb-1 flex size-9 items-center justify-center rounded-full border bg-muted text-muted-foreground [&_svg]:size-4">
          {icon}
        </span>
      ) : null}
      <h1 className="font-heading text-xl leading-tight font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
    </header>
  );
}

function FormError({ id, children }: { id: string; children: ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {children}
    </p>
  );
}

function PasswordStep({
  notice,
  onChallenge,
}: {
  notice?: string;
  onChallenge: (challenge: LoginChallenge) => void;
}) {
  const t = useTranslations("login");
  const errorMessage = useErrorMessage();
  const login = useLogin();
  const errorId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    login.mutate(
      { email: email.trim(), password },
      {
        // A session instead of a challenge means the admin is already signed in.
        onSuccess: (result) => {
          if (!isIssuedSession(result)) onChallenge(result);
        },
      },
    );
  };

  const fieldError =
    login.isError && isApiError(login.error)
      ? (login.error.fields.email?.[0] ?? login.error.fields.password?.[0])
      : undefined;
  const error = login.isError ? (fieldError ?? errorMessage(login.error)) : notice;

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <StepHeader title={t("title")} description={t("description")} />
      <FormError id={errorId}>{error}</FormError>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="login-email">{t("email")}</Label>
        <Input
          id="login-email"
          type="email"
          autoComplete="username"
          autoFocus
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={Boolean(login.isError && isApiError(login.error) && login.error.fields.email)}
          aria-describedby={error ? errorId : undefined}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="login-password">{t("password")}</Label>
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      <Button type="submit" disabled={login.isPending || !email || !password}>
        {login.isPending ? t("signingIn") : t("continue")}
      </Button>
    </form>
  );
}

function CodeStep({
  challenge,
  setup,
  onBack,
  onRecoveryCodes,
}: {
  challenge: LoginChallenge;
  setup: boolean;
  onBack: (notice?: string) => void;
  onRecoveryCodes: (session: IssuedSession) => void;
}) {
  const t = useTranslations("login");
  const errorMessage = useErrorMessage();
  const verify = useVerifyTwoFactor();
  const errorId = useId();
  const [code, setCode] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    verify.mutate(
      { challenge_token: challenge.challenge_token, code: code.trim(), setup, hold: setup },
      {
        onSuccess: (session) => {
          // After setup the recovery codes must be shown before the admin is let in.
          if (setup && session.recovery_codes?.length) onRecoveryCodes(session);
          else if (setup) setAuthToken(session.token, session.expires_at);
        },
        onError: (error) => {
          setCode("");
          // The challenge is used up or expired: start again from the password.
          if (getApiErrorCode(error) === "invalid_challenge") onBack(errorMessage(error));
        },
      },
    );
  };

  const copySecret = async () => {
    if (!challenge.setup) return;
    try {
      await navigator.clipboard.writeText(challenge.setup.secret);
      toast.success(t("secretCopied"));
    } catch {
      toast.error(t("copyFailed"));
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <StepHeader
        icon={<ShieldCheckIcon />}
        title={setup ? t("setupTitle") : t("codeTitle")}
        description={setup ? t("setupDescription") : t("codeDescription")}
      />

      {setup && challenge.setup ? (
        <div className="flex flex-col gap-2 rounded-lg border bg-muted/50 p-3">
          {/* The QR code carries the secret: it is drawn in the browser and never sent anywhere. */}
          <div className="flex justify-center rounded-md bg-white p-3">
            <QRCodeSVG value={challenge.setup.otpauth_uri} size={176} level="M" title={t("qrLabel")} />
          </div>
          <p className="text-xs text-muted-foreground">{t("qrHint")}</p>
          <p className="font-mono text-[0.6875rem] tracking-wider text-muted-foreground uppercase">{t("setupKey")}</p>
          <div className="flex items-start gap-2">
            <code className="min-w-0 flex-1 font-mono text-sm break-all select-all">{challenge.setup.secret}</code>
            <Button type="button" variant="outline" size="icon-sm" aria-label={t("copySecret")} onClick={copySecret}>
              <CopyIcon />
            </Button>
          </div>
          <a
            href={challenge.setup.otpauth_uri}
            className="text-sm underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("openAuthenticator")}
          </a>
        </div>
      ) : null}

      <FormError id={errorId}>
        {verify.isError
          ? // A message about the code itself says more than the general validation text.
            ((isApiError(verify.error) && verify.error.fields.code?.[0]) || errorMessage(verify.error))
          : null}
      </FormError>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="login-code">{t("code")}</Label>
        <Input
          id="login-code"
          autoComplete="one-time-code"
          inputMode={setup ? "numeric" : "text"}
          autoFocus
          required
          value={code}
          onChange={(event) => setCode(event.target.value)}
          aria-invalid={verify.isError}
          aria-describedby={verify.isError ? errorId : undefined}
          className="font-mono tracking-widest"
        />
        {setup ? null : <p className="text-xs text-muted-foreground">{t("recoveryHint")}</p>}
      </div>

      <Button type="submit" disabled={verify.isPending || code.trim().length < 6}>
        {verify.isPending ? t("signingIn") : t("verify")}
      </Button>
      <Button type="button" variant="ghost" onClick={() => onBack()}>
        <ArrowLeftIcon />
        {t("back")}
      </Button>
    </form>
  );
}
