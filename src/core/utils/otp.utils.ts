import crypto from "crypto";

export class OtpUtils {
  /**
   * Generate numeric OTP
   */
  static generateOtp(length = 6): string {
    const digits = "0123456789";
    const bytes = crypto.randomBytes(length);

    return Array.from(bytes)
      .map((b) => digits[b % digits.length])
      .join("");
  }
}
