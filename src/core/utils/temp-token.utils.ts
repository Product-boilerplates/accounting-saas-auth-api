import jwt from "jsonwebtoken";
import { jwtConfig } from "../../config";

class TempTokenUtils {
  private readonly secret = jwtConfig.access.secret;
  private readonly expiry = "5m"; // temp token short lived

  generateTempToken(payload: object): string {
    return jwt.sign({ ...payload, type: "2fa_temp" }, this.secret, {
      expiresIn: this.expiry,
    });
  }

  verifyTempToken<T = any>(token: string): T {
    return jwt.verify(token, this.secret) as T;
  }
}

export default new TempTokenUtils();
