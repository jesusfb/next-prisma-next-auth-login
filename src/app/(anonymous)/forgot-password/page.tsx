import React from "react";
import ForgotPasswordForm from "@/components/forms/auth/forgot-password-form/ForgotPasswordForm";

export async function generateMetadata() {
  return {
    title: "Forgot password",
  };
}
export default function ForgotPasswordPage({
  searchParams,
}: {
  searchParams?: { callbackUrl: string | undefined };
}) {
  const callbackUrl = searchParams?.callbackUrl || "/dashboard";
  return <ForgotPasswordForm callbackUrl={callbackUrl} />;
}
