import argon2 from "argon2";

export class PasswordUtil {
  /**
   * Argon2 configuration for production
   */
  private static options: argon2.Options & { raw?: false } = {
    type: argon2.argon2id, // best variant
    memoryCost: 2 ** 16, // 64 MB
    timeCost: 3, // iterations
    parallelism: 1,
  };

  /**
   * Hash user password
   */
  static async hash(password: string): Promise<string> {
    if (!password) {
      throw new Error("Password is required");
    }

    return argon2.hash(password, this.options);
  }

  /**
   * Compare password with stored hash
   */
  static async compare(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    if (!password || !hashedPassword) {
      return false;
    }

    try {
      return await argon2.verify(hashedPassword, password);
    } catch {
      return false;
    }
  }

  /**
   * Check if hash needs rehash (when algorithm config changes)
   */
  static needsRehash(hash: string): boolean {
    return argon2.needsRehash(hash, this.options);
  }
}
