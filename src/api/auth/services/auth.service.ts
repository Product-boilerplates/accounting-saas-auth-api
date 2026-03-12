import crypto from "crypto";
import { authService } from ".";
import { OtpType } from "../../../../generated/prisma";
import { BaseService } from "../../../core/base";
import {
  throwUnauthorized,
  throwValidation,
} from "../../../core/errors/errors";
import { eventBus } from "../../../core/events/event-bul.service";
import { OtpUtils, PasswordUtil } from "../../../core/utils";
import { ServiceReturnDto } from "../../../core/utils/responseHandler";
import tempTokenUtils from "../../../core/utils/temp-token.utils";
import { authConfig } from "../auth.config";
import { authConstants } from "../auth.constants";
import {
  GetServiceTokenPayload,
  RefreshTokenDto,
  RegisterServicePayload,
  SERVICE_GRANT_TYPE,
  VerifyOtpDto,
} from "../auth.types";
import { AuthUtils } from "../utils";
import { randomToken } from "../utils/hash.util";
import {
  generateAccessToken,
  generateServiceToken,
  verifyAccessToken,
} from "../utils/token.util";
import { cacheService } from "../../../core/cache";

export class AuthService extends BaseService {
  /**
   * Signup
   */
  async signup(payload: any) {
    const { name, email, password, username } = payload;

    const exists = await this.db.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });

    if (exists) {
      throwValidation("User already exists");
    }

    const passwordHash = await PasswordUtil.hash(password);

    const verifyToken = randomToken(32);
    const verifyExpires = new Date(
      Date.now() + authConfig.EMAIL_VERIFY_EXPIRES_MS,
    );

    const user = await this.db.user.create({
      data: {
        name,
        email,
        username: username || AuthUtils.generateUsername(name),
        password_hash: passwordHash,
        verification_token: verifyToken,
        verification_expires: verifyExpires,
      },
    });

    const link = `${process.env.CLIENT_URL}/verify-email?token=${verifyToken}`;

    eventBus.publish("email_verification:signup", {
      email: user.email,
      name: user.name,
      verificationLink: link,
    });

    return { message: "Registration successful. Check email." };
  }

  /**
   * Signin
   */
  async signin(payload: any): Promise<any> {
    const { identifier, password, trustDevice } = payload;

    const user = await this.db.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
    });

    // Prevent user enumeration
    if (!user) {
      return this.throwUnauthorized("Invalid credentials");
    }

    if (user.status !== "ACTIVE") {
      this.throwUnauthorized("Account is not active");
    }

    const isPasswordValid = await PasswordUtil.compare(
      password,
      user.password_hash,
    );

    if (!isPasswordValid) {
      return this.throwUnauthorized("Invalid credentials");
    }

    /**
     * Handle 2FA flow
     */
    if (user.two_fa_enabled) {
      const otp = OtpUtils.generateOtp();

      await this.optStore(user.id, otp);

      eventBus.publish("auth:2fa_login_otp", {
        email: user.email,
        name: user.name,
        otp,
      });

      const tempToken = tempTokenUtils.generateTempToken({
        id: user.id,
      });

      return {
        message: "Two-factor authentication required",
        data: {
          twoFactorRequired: true,
          tempToken,
        },
      };
    }

    /**
     * Generate tokens
     */
    const accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      username: user.username,
    });

    const refreshToken = await authService.refreshToken.createToken(user.id);

    /**
     * Trusted device
     */
    let trustedDeviceToken: string | null = null;

    if (trustDevice) {
      trustedDeviceToken = await authService.trustedDevice.markTrusted(user.id);
    }

    /**
     * Final response
     */

    return {
      message: "Signin successful",
      data: {
        tokens: {
          accessToken,
          refreshToken,
        },
        device: {
          trustedDeviceToken,
        },
      },
    };
  }

  async verify2fa(payload: VerifyOtpDto) {
    const { tempToken, otp } = payload;

    const decoded = tempTokenUtils.verifyTempToken<{ id: string }>(tempToken);

    const valid = await this.otpVerify(decoded.id, otp);

    if (!valid) {
      return throwUnauthorized("Invalid OTP");
    }

    /**
     * Generate tokens
     */
    const accessToken = generateAccessToken({
      id: decoded.id,
      // email: decoded.email,
      // username: decoded.username,
    });

    const refreshToken = await authService.refreshToken.createToken(decoded.id);

    return {
      message: "Signin successful",
      data: {
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    };
  }

  /**
   * Refresh token
   */
  async refresh(payload: RefreshTokenDto) {
    const { refreshToken } = payload;

    const result = await authService.refreshToken.rotate(refreshToken);

    const accessToken = generateAccessToken({ id: result.userId });

    return {
      message: "Token refreshed successfully",
      data: {
        tokens: {
          accessToken,
          refreshToken: result.refreshToken,
          type: "Bearer",
          expiresIn: 900,
        },
      },
    };
  }

  async signout(userId: string, payload: any) {
    if (payload.refreshToken)
      await authService.refreshToken.revoke(payload.refreshToken);

    if (payload.trustedDeviceToken)
      await authService.trustedDevice.revoke(payload.trustedDeviceToken);

    // Revoke access token in Redis (key: "revoked:<token>", value: "1")
    if (payload?.accessToken) {
      const decoded: any = verifyAccessToken(payload?.accessToken);
      const ttl = decoded.exp * 1000 - Date.now();

      if (ttl > 0) {
        await cacheService.set(`revoked:${payload?.accessToken}`, { PX: ttl });
      }
    }

    // 3️⃣ Optional: publish logout event (for logging, analytics, or audit)
    eventBus.publish("auth:user_logout", { userId });

    // 4️⃣ Response
    return {
      success: true,
      statusCode: 200,
      message: "Logout successful",
      data: {},
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  // ---------------------------
  // ✉️ Verify Email
  // ---------------------------
  verifyEmail = async (payload: any) => {
    const user = await this.db.user.findFirst({
      where: { verification_token: payload.token },
    });

    if (!user) {
      return this.throwError("Invalid verification token.");
    }

    if (user.verification_expires && user.verification_expires < new Date()) {
      throw new Error("Verification link expired. Please register again.");
    }

    await this.db.user.update({
      where: { id: user.id },
      data: {
        status: "ACTIVE",
        verification_token: null,
        verification_expires: null,
      },
    });

    return { message: "Email verified successfully. You can now sign in." };
  };

  /**
   * OAuth2 Client Credentials Grant
   */
  async getToken(payload: GetServiceTokenPayload): Promise<ServiceReturnDto> {
    const { clientId, clientSecret, grantType } = payload;

    if (grantType !== SERVICE_GRANT_TYPE) {
      return this.throwError(
        `Invalid grant type. Expected '${SERVICE_GRANT_TYPE}'.`,
      );
    }

    const serviceClient = await this.db.serviceClient.findUnique({
      where: { client_id: clientId },
    });

    if (!serviceClient || !serviceClient.is_active) {
      return this.throwUnauthorized("Invalid client credentials.");
    }

    const incomingHash = crypto
      .createHash("sha256")
      .update(clientSecret)
      .digest("hex");

    /**
     * Timing-safe comparison to prevent side-channel attacks
     */
    const isSecretValid = crypto.timingSafeEqual(
      Buffer.from(incomingHash),
      Buffer.from(serviceClient.client_secret_hash),
    );

    if (!isSecretValid) {
      return this.throwUnauthorized("Invalid client credentials.");
    }

    const accessToken = generateServiceToken({
      serviceId: serviceClient.id,
      clientId: serviceClient.client_id,
      name: serviceClient.name,
    });

    return {
      statusCode: 200,
      message: "Access token generated successfully.",
      data: {
        accessToken,
        tokenType: "Bearer",
        expiresIn: authConstants.SERVICE_TOKEN_EXPIRES_IN,
      },
    };
  }

  /**
   * Register internal or third-party service
   */
  async registerService(
    payload: RegisterServicePayload,
  ): Promise<ServiceReturnDto> {
    const { name, description } = payload;

    const clientId = `svc_${crypto.randomBytes(8).toString("hex")}`;
    const clientSecret = crypto.randomBytes(32).toString("hex");

    const clientSecretHash = crypto
      .createHash("sha256")
      .update(clientSecret)
      .digest("hex");

    const serviceClient = await this.db.serviceClient.create({
      data: {
        name,
        description,
        client_id: clientId,
        client_secret_hash: clientSecretHash,
        is_active: true,
      },
    });

    /**
     * IMPORTANT:
     * clientSecret is returned ONLY once.
     * Never store or show again.
     */
    return {
      statusCode: 201,
      message: "Service client registered successfully.",
      data: {
        clientId: serviceClient.client_id,
        clientSecret,
        name: serviceClient.name,
      },
    };
  }

  // * Resend verify email
  // * Forgot password
  // * Change password
  // * Profile update

  /*-------------------*/
  /*-----Private--------*/
  /*-------------------*/
  private async optStore(
    userId: string,
    otp: string,
    type: OtpType = "LOGIN_2FA",
  ) {
    const otpHash = await PasswordUtil.hash(otp);

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await this.db.authOtp.create({
      data: {
        user_id: userId,
        type,
        otp_hash: otpHash,
        expires_at: expiresAt,
      },
    });
  }

  private async otpVerify(
    userId: string,
    otp: string,
    type: OtpType = "LOGIN_2FA",
  ) {
    const record = await this.db.authOtp.findFirst({
      where: {
        user_id: userId,
        type,
        consumed_at: null,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    if (!record) return false;

    if (record.expires_at < new Date()) return false;

    if (record.attempts >= 5) return false;

    const valid = await PasswordUtil.compare(otp, record.otp_hash);

    await this.db.authOtp.update({
      where: { id: record.id },
      data: {
        attempts: { increment: 1 },
        consumed_at: valid ? new Date() : null,
      },
    });

    return valid;
  }
}
