// src/events/email.events.ts

import mailer from "../mail/mailer";
import { logger } from "../utils/logger";
import { Event } from "./event-bul.service";

export interface LoginInitiate {
  email: string;
  name: string;
  verificationUrl: string;
}
interface OtpSend2Fa {
  userId: string;
  email: string;
  name: string;
  otp: string;
}

export const emailEvents = (eventBus: any) => {
  /**
   * @Sent_email_verification
   */
  eventBus.subscribe(
    "email_verification:signup",
    async (event: Event<LoginInitiate>) => {
      const { email, name, verificationUrl } = event.payload;

      try {
        //  Send email
        await mailer.sendEmail(email, {
          subject: "Verify your email address",
          templateName: "verify-email",
          templateData: {
            name,
            verificationUrl,
          },
        });

        logger.info(`Email signup verification sent to ${email} successfully.`);
      } catch (err) {
        logger.error(
          `Failed to send email signup verification to ${email}:`,
          err,
        );
      }
    },
  );
  /**
   * @Sent_2FA_Login_OTP
   */
  eventBus.subscribe("auth:2fa_login_otp", async (event: Event<OtpSend2Fa>) => {
    const { email, name, otp } = event.payload;

    // 25 Mar, 2026
    const date = new Date().toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    try {
      //  Send email
      await mailer.sendEmail(email, {
        subject: "Your Two-Factor Authentication Code",
        templateName: "2fa-otp",
        templateData: {
          date,
          name,
          otp,
        },
      });

      logger.info(
        `✅ Email signup verification sent to ${email} successfully.`,
      );
    } catch (err) {
      logger.error(
        `❌ Failed to send email signup verification to ${email}:`,
        err,
      );
    }
  });
};
