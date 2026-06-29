import Link from "next/link";

import { Globe } from "lucide-react";

import { APP_CONFIG } from "@/config/app-config";

import { ClientLoginForm } from "../../_components/client-login-form";

export default function LoginV2() {
  return (
    <>
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[380px]">
        <div className="space-y-2 text-center">
          <h1 className="font-medium text-3xl">Welcome back</h1>
          <p className="text-muted-foreground text-sm">Sign in to access your trading dashboard</p>
        </div>
        <ClientLoginForm />
        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link prefetch={false} className="text-foreground font-medium hover:underline" href="register">
            Register
          </Link>
        </p>
      </div>

      <div className="absolute bottom-5 flex w-full justify-between px-10">
        <div className="text-sm">{APP_CONFIG.copyright}</div>
        <div className="flex items-center gap-1 text-sm">
          <Globe className="size-4 text-muted-foreground" />
          ENG
        </div>
      </div>
    </>
  );
}
