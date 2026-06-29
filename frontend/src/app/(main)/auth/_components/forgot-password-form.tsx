"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Eye, EyeOff, ArrowLeft, Check, Mail, Lock, ChevronRight, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const emailSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});

const otpSchema = z.object({
  otp: z.string().length(6, { message: "OTP must be 6 digits." }),
});

const passwordSchema = z.object({
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string().min(6, { message: "Confirm Password must be at least 6 characters." }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

type EmailData = z.infer<typeof emailSchema>;
type OtpData = z.infer<typeof otpSchema>;
type PasswordData = z.infer<typeof passwordSchema>;

export function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<"email" | "otp" | "password">("email");
  const [resetToken, setResetToken] = useState("");
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const emailForm = useForm<EmailData>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const otpForm = useForm<OtpData>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  const passwordForm = useForm<PasswordData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onEmailSubmit = async (data: EmailData) => {
    setIsSending(true);
    try {
      const res = await fetch(`${API_BASE}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.detail || "Failed to send OTP");
        return;
      }
      setEmail(data.email);
      toast.success("OTP sent to your email!");
      setStep("otp");
      setResendCooldown(60);
      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) { clearInterval(timer); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsSending(false);
    }
  };

  const onResendOtp = async () => {
    if (!email || resendCooldown > 0) return;
    setIsSending(true);
    try {
      const res = await fetch(`${API_BASE}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.detail || "Failed to resend OTP");
        return;
      }
      toast.success("New OTP sent to your email!");
      otpForm.reset();
      setResendCooldown(60);
      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) { clearInterval(timer); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsSending(false);
    }
  };

  const onOtpSubmit = async (data: OtpData) => {
    setIsVerifying(true);
    try {
      const res = await fetch(`${API_BASE}/verify-forgot-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: data.otp }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.detail || "Invalid OTP");
        return;
      }
      setResetToken(result.reset_token);
      toast.success("OTP verified! Set your new password.");
      setStep("password");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsVerifying(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordData) => {
    try {
      const res = await fetch(`${API_BASE}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, password: data.password }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.detail || "Failed to reset password");
        return;
      }
      toast.success("Password reset successful! You can now log in.");
      onBack();
    } catch {
      toast.error("Something went wrong");
    }
  };

  const steps = [
    { key: "email", label: "Email" },
    { key: "otp", label: "Verify" },
    { key: "password", label: "New Password" },
  ];
  const currentIdx = steps.findIndex(s => s.key === step);

  return (
    <div className="flex flex-col gap-5">
      {/* Progress Steps */}
      <div className="flex items-center justify-between px-2">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
              i < currentIdx ? "bg-green-500 text-white" :
              i === currentIdx ? "bg-blue-600 text-white" :
              "bg-neutral-800 text-neutral-500"
            }`}>
              {i < currentIdx ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${
              i === currentIdx ? "text-white" : "text-neutral-500"
            }`}>{s.label}</span>
            {i < steps.length - 1 && (
              <div className={`w-8 h-px mx-1 ${i < currentIdx ? "bg-green-500" : "bg-neutral-700"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Enter Email */}
      {step === "email" && (
        <form noValidate onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="flex flex-col gap-4">
          <div className="text-center space-y-1">
            <p className="text-sm text-muted-foreground">Enter your registered email address</p>
          </div>
          <FieldGroup className="gap-4">
            <Controller
              control={emailForm.control}
              name="email"
              render={({ field, fieldState }) => (
                <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                  <FieldLabel>Email Address</FieldLabel>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                    </div>
                    <Input
                      {...field}
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      aria-invalid={fieldState.invalid}
                      className="pl-10"
                    />
                  </div>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>
          <Button className="w-full" type="submit" disabled={isSending}>
            {isSending ? "Sending OTP..." : "Send Reset Code"}
            {!isSending && <ChevronRight className="w-4 h-4 ml-1" />}
          </Button>
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to login
          </button>
        </form>
      )}

      {/* Step 2: Verify OTP */}
      {step === "otp" && (
        <form noValidate onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="flex flex-col gap-4">
          <div className="text-center space-y-1">
            <p className="text-sm text-muted-foreground">Enter the 6-digit code sent to</p>
            <p className="text-sm font-semibold text-foreground">{email}</p>
          </div>
          <FieldGroup className="gap-4">
            <Controller
              control={otpForm.control}
              name="otp"
              render={({ field, fieldState }) => (
                <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                  <FieldLabel>Verification Code</FieldLabel>
                  <Input
                    {...field}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    className="text-center text-lg tracking-[0.5em] font-mono"
                    autoComplete="one-time-code"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>
          <Button className="w-full" type="submit" disabled={isVerifying}>
            {isVerifying ? "Verifying..." : "Verify Code"}
          </Button>
          <div className="flex justify-center">
            <button
              type="button"
              onClick={onResendOtp}
              disabled={resendCooldown > 0 || isSending}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSending ? "animate-spin" : ""}`} />
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setStep("email")}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
        </form>
      )}

      {/* Step 3: New Password */}
      {step === "password" && (
        <form noValidate onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="flex flex-col gap-4">
          <div className="text-center space-y-1">
            <p className="text-sm text-muted-foreground">Set your new password</p>
          </div>
          <FieldGroup className="gap-4">
            <Controller
              control={passwordForm.control}
              name="password"
              render={({ field, fieldState }) => (
                <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                  <FieldLabel>New Password</FieldLabel>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <Lock className="h-4 w-4" />
                    </div>
                    <Input
                      {...field}
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      aria-invalid={fieldState.invalid}
                      className="pl-10 pr-10"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onMouseDown={() => setShowPassword(true)}
                      onMouseUp={() => setShowPassword(false)}
                      onMouseLeave={() => setShowPassword(false)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              control={passwordForm.control}
              name="confirmPassword"
              render={({ field, fieldState }) => (
                <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                  <FieldLabel>Confirm Password</FieldLabel>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <Lock className="h-4 w-4" />
                    </div>
                    <Input
                      {...field}
                      type={showConfirm ? "text" : "password"}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      aria-invalid={fieldState.invalid}
                      className="pl-10 pr-10"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onMouseDown={() => setShowConfirm(true)}
                      onMouseUp={() => setShowConfirm(false)}
                      onMouseLeave={() => setShowConfirm(false)}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>
          <Button className="w-full" type="submit" disabled={passwordForm.formState.isSubmitting}>
            {passwordForm.formState.isSubmitting ? "Resetting..." : "Reset Password"}
          </Button>
        </form>
      )}
    </div>
  );
}
