"use server";

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { APP_NAME } from "@/settings";
import ResetPassword from "@/email/auth/ResetPassword";
import {
  ForgotPasswordFormDataInputs,
  ForgotPasswordFormDataSchema,
} from "@/components/forms/auth/forgot-password-form/schema";
import { isPasswordResetTokenExpired } from "@/lib/db";
import { generateResetToken } from "@/lib/crypto";

export async function handleForgotPasswordAction(
  values: ForgotPasswordFormDataInputs | unknown,
) {
  const inputRequest = ForgotPasswordFormDataSchema.safeParse(values);
  if (!inputRequest.success) {
    return {
      success: false,
      error: inputRequest.error.message,
    };
  }

  const input = inputRequest.data;

  const user = await prisma.user.findFirst({ where: { email: input.email } });
  if (!user) {
    return {
      success: false,
      error: "Account not found",
    };
  }
  if (user.password === null) {
    return {
      success: false,
      error:
        "Account does not have password, please login with the provider you used for this email.",
    };
  }

  const existingToken = await prisma.passwordResetToken.findFirst({
    where: {
      userId: user.id,
    },
  });

  if (existingToken) {
    if (!isPasswordResetTokenExpired(existingToken)) {
      try {
        await sendEmail({
          to: input.email,
          subject: `Password reset request on ${APP_NAME}`,
          body: ResetPassword({
            token: existingToken,
            name: user.name || user.email,
          }),
        });
      } catch (error) {
        console.error(error);
        return {
          success: false,
          error: "Could not reset password, please try again",
        };
      }
      return {
        success: true,
      };
    }
    await prisma.passwordResetToken.delete({ where: { id: existingToken.id } });
  }

  const resetToken = await generateResetToken();
  const now = new Date();
  const expiresAt = now.setHours(now.getHours() + 12);

  try {
    await prisma.$transaction(async (tx) => {
      const token = await tx.passwordResetToken.create({
        data: {
          token: resetToken,
          userId: user.id,
          expiresAt: new Date(expiresAt),
        },
      });
      await sendEmail({
        to: input.email,
        subject: `Password reset request on ${APP_NAME}`,
        body: ResetPassword({ token, name: user.name || user.email }),
      });
    });
  } catch (error) {
    console.error(error);
    return {
      success: false,
      error: "Could not reset password, please try again",
    };
  }

  return {
    success: true,
  };
}
