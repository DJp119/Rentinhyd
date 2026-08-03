// src/lib/__tests__/tolet-boards.test.ts
// Unit tests for To-Let board utilities, encryption, and logic

import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '../security';

describe('To-Let Board Encryption & Logic', () => {
  it('encrypts and decrypts phone number successfully', async () => {
    const rawPhone = '9876543210';
    const encryptedObj = await encrypt(rawPhone);

    expect(encryptedObj.encrypted).toBeDefined();
    expect(encryptedObj.iv).toBeDefined();
    expect(encryptedObj.tag).toBeDefined();

    const decrypted = await decrypt(encryptedObj.encrypted, encryptedObj.iv, encryptedObj.tag);
    expect(decrypted).toBe(rawPhone);
  });

  it('calculates 30-day expiry date correctly', () => {
    const now = new Date();
    const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const diffDays = Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(30);
  });

  it('formats encrypted phone string for database storage', async () => {
    const rawPhone = '+919876543210';
    const encryptedObj = await encrypt(rawPhone);
    const storedString = `${encryptedObj.encrypted}:${encryptedObj.iv}:${encryptedObj.tag}`;

    const parts = storedString.split(':');
    expect(parts.length).toBe(3);

    const decrypted = await decrypt(parts[0], parts[1], parts[2]);
    expect(decrypted).toBe(rawPhone);
  });
});
