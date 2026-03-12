import { Request, Response } from "express";
import { BaseController } from "../../core/base";
import { cacheService } from "../../core/cache";
import { authService } from "./services";

export class AuthController extends BaseController {
  constructor() {
    super();
  }

  signup = this.asyncHandler(async (req: Request, res: Response) => {
    const { body } = req.validatedData;

    const data = await authService.auth.signup(body);

    this.sendResponse(res, data);
  });

  signin = this.asyncHandler(async (req: Request, res: Response) => {
    const { body } = req.validatedData;

    const data = await authService.auth.signin(body);

    this.sendResponse(res, data);
  });

  verify2fa = this.asyncHandler(async (req: Request, res: Response) => {
    const { body } = req.validatedData;

    const data = await authService.auth.verify2fa(body);

    this.sendResponse(res, data);
  });

  resendVerification = this.asyncHandler(
    async (req: Request, res: Response) => {
      const data = await authService.auth.refresh(req.body);

      this.sendResponse(res, data);
    },
  );

  signout = this.asyncHandler(async (req: Request, res: Response) => {
    const accessToken = req.headers.authorization?.split(" ")[1];
    const trustedDeviceToken = req.headers?.trusteddevicetoken;
    const refreshToken = req.headers?.refreshtoken;

    const payload = {
      accessToken,
      refreshToken,
      trustedDeviceToken: trustedDeviceToken || "",
    };

    const data = await authService.auth.signout(
      req.user?.id as string,
      payload,
    );

    const cacheKey = `user-permissions:${req.user?.id}`;
    await cacheService.del(cacheKey);

    this.sendResponse(res, data);
  });

  refreshToken = this.asyncHandler(async (req: Request, res: Response) => {
    const data = await authService.auth.refresh(req.body);

    this.sendResponse(res, data);
  });

  verifyEmail = this.asyncHandler(async (req: Request, res: Response) => {
    const { body } = req.validatedData;

    const data = await authService.auth.verifyEmail(body);

    this.sendResponse(res, data);
  });
}
