import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { Response, Request } from 'express';
import { ConfigService } from './config.service';

@Injectable()
export class SecurityService {
  constructor(private readonly config: ConfigService) {}

  private deriveAesKey(): Buffer {
    const rawKey = this.config.ENCRYPTION_KEY || this.config.SECRET_KEY;
    return crypto.createHash('sha256').update(rawKey, 'utf8').digest();
  }

  hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const derived = crypto.scryptSync(password, salt, 64).toString('hex');
    return `scrypt$${salt}$${derived}`;
  }

  verifyPassword(plainPassword: string, hashedPassword: string): boolean {
    if (!plainPassword || !hashedPassword) return false;
    if (hashedPassword.startsWith('scrypt$')) {
      const parts = hashedPassword.split('$');
      if (parts.length !== 3) return false;
      const [, salt, hashHex] = parts;
      const derived = crypto.scryptSync(plainPassword, salt, 64);
      const expected = Buffer.from(hashHex, 'hex');
      if (derived.length !== expected.length) return false;
      return crypto.timingSafeEqual(derived, expected);
    }
    return false;
  }

  encryptSecret(secretText: string): string {
    if (!secretText) return '';
    const key = this.deriveAesKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([
      cipher.update(secretText, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return `v1:${iv.toString('base64url')}:${tag.toString('base64url')}:${encrypted.toString('base64url')}`;
  }

  decryptSecret(encryptedText: string): string {
    if (!encryptedText) return '';
    try {
      if (encryptedText.startsWith('v1:')) {
        const [, ivB64, tagB64, dataB64] = encryptedText.split(':');
        const key = this.deriveAesKey();
        const iv = Buffer.from(ivB64, 'base64url');
        const tag = Buffer.from(tagB64, 'base64url');
        const encrypted = Buffer.from(dataB64, 'base64url');
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(tag);
        const decrypted = Buffer.concat([
          decipher.update(encrypted),
          decipher.final(),
        ]);
        return decrypted.toString('utf8');
      }
      return '';
    } catch {
      return '';
    }
  }

  maskSecret(secretText: string): string {
    if (!secretText) return '';
    const length = secretText.length;
    if (length <= 8) return '****';
    const prefixLen = Math.min(6, Math.floor(length / 4));
    const suffixLen = Math.min(4, Math.floor(length / 4));
    return `${secretText.slice(0, prefixLen)}...${secretText.slice(length - suffixLen)}`;
  }

  hashSessionToken(token: string): string {
    return crypto
      .createHmac('sha256', this.config.internalSigningKey)
      .update(token, 'utf8')
      .digest('hex');
  }

  randomTokenUrlSafe(bytes = 36): string {
    return crypto.randomBytes(bytes).toString('base64url');
  }

  signJwtHs256(payload: Record<string, any>, secret: string): string {
    const header = Buffer.from(
      JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
    ).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signingInput = `${header}.${body}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(signingInput)
      .digest('base64url');
    return `${signingInput}.${signature}`;
  }

  verifyJwtHs256(
    token: string,
    secret: string,
  ): { valid: boolean; expired?: boolean; payload?: Record<string, any> } {
    if (!token || typeof token !== 'string') return { valid: false };
    const parts = token.split('.');
    if (parts.length !== 3) return { valid: false };
    const [headerB64, bodyB64, sigB64] = parts;
    const signingInput = `${headerB64}.${bodyB64}`;
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(signingInput)
      .digest('base64url');

    const sigBuf = Buffer.from(sigB64);
    const expBuf = Buffer.from(expectedSig);
    if (
      sigBuf.length !== expBuf.length ||
      !crypto.timingSafeEqual(sigBuf, expBuf)
    ) {
      return { valid: false };
    }

    try {
      const payload = JSON.parse(
        Buffer.from(bodyB64, 'base64url').toString('utf8'),
      );
      if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
        return { valid: false, expired: true, payload };
      }
      return { valid: true, payload };
    } catch {
      return { valid: false };
    }
  }

  signJwtRs256(payload: Record<string, any>, privateKeyPem: string): string {
    const header = Buffer.from(
      JSON.stringify({ alg: 'RS256', typ: 'JWT' }),
    ).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signingInput = `${header}.${body}`;
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(signingInput);
    signer.end();
    const signature = signer.sign(privateKeyPem, 'base64url');
    return `${signingInput}.${signature}`;
  }

  parseCookies(req: Request): Record<string, string> {
    const list: Record<string, string> = {};
    const cookieHeader = req.headers?.cookie;
    if (!cookieHeader) return list;
    cookieHeader.split(';').forEach((cookie) => {
      const parts = cookie.split('=');
      const key = parts.shift()?.trim();
      if (key) {
        const val = parts.join('=').trim();
        try {
          list[key] = decodeURIComponent(val);
        } catch {
          list[key] = val;
        }
      }
    });
    return list;
  }

  setSessionCookies(res: Response, rawToken: string): string {
    const maxAgeMs = this.config.SESSION_TTL_HOURS * 3600 * 1000;
    const csrf = this.randomTokenUrlSafe(24);
    res.cookie(this.config.SESSION_COOKIE_NAME, rawToken, {
      maxAge: maxAgeMs,
      httpOnly: true,
      secure: this.config.cookieSecure,
      sameSite: 'lax',
      path: '/',
    });
    res.cookie(this.config.CSRF_COOKIE_NAME, csrf, {
      maxAge: maxAgeMs,
      httpOnly: false,
      secure: this.config.cookieSecure,
      sameSite: 'lax',
      path: '/',
    });
    return csrf;
  }

  clearSessionCookies(res: Response): void {
    res.clearCookie(this.config.SESSION_COOKIE_NAME, { path: '/' });
    res.clearCookie(this.config.CSRF_COOKIE_NAME, { path: '/' });
  }

  getClientIp(req?: Request): string | null {
    if (!req) return null;
    const fwd = req.headers['x-forwarded-for'];
    if (typeof fwd === 'string' && fwd.trim()) {
      return fwd.split(',')[0].trim().slice(0, 45);
    }
    return (req.ip || req.socket?.remoteAddress || '').slice(0, 45) || null;
  }
}
