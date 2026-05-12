import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly encryptionKey: string;
  private readonly encryptionSalt: string;
  private keyCache: Buffer | null = null;

  constructor(private readonly configService: ConfigService) {
    this.encryptionKey = this.configService.get<string>('encryptionKey')!;
    this.encryptionSalt = this.configService.get<string>('encryptionSalt')!;

    if (!this.encryptionKey || !this.encryptionSalt) {
      throw new Error(
        'ENCRYPTION_KEY y ENCRYPTION_SALT son requeridas. Defínelas en tu archivo .env',
      );
    }

    this.logger.log('EncryptionService inicializado correctamente');
  }

  private async deriveKey(): Promise<Buffer> {
    if (this.keyCache) {
      return this.keyCache;
    }

    const scryptAsync = promisify(scrypt);
    this.keyCache = (await scryptAsync(
      this.encryptionKey,
      this.encryptionSalt,
      32,
    )) as Buffer;

    return this.keyCache;
  }

  async encrypt(plainText: string): Promise<string> {
    const iv = randomBytes(16);
    const key = await this.deriveKey();
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plainText, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return (
      iv.toString('hex') +
      ':' +
      encrypted.toString('hex') +
      ':' +
      authTag.toString('hex')
    );
  }

  async decrypt(encryptedText: string): Promise<string> {
    const parts = encryptedText.split(':');

    if (parts.length === 3) {
      const [ivHex, encryptedHex, authTagHex] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const encrypted = Buffer.from(encryptedHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const key = await this.deriveKey();
      const decipher = createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]);

      return decrypted.toString('utf8');
    }

    // Legacy CBC format (iv:encrypted — no auth tag): try to decrypt
    if (parts.length === 2) {
      const [ivHex, encryptedHex] = parts;
      try {
        const iv = Buffer.from(ivHex, 'hex');
        const encrypted = Buffer.from(encryptedHex, 'hex');
        const key = await this.deriveKey();
        const decipher = createDecipheriv('aes-256-cbc', key, iv);
        const decrypted = Buffer.concat([
          decipher.update(encrypted),
          decipher.final(),
        ]);

        return decrypted.toString('utf8');
      } catch {
        throw new Error(
          'Formato de texto encriptado inválido o clave incorrecta',
        );
      }
    }

    throw new Error(
      'Formato de texto encriptado inválido. Se esperaba "iv:encrypted:authTag" o "iv:encrypted"',
    );
  }
}
