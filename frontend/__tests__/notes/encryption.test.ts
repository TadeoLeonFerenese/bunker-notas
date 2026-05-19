import { encryption } from '../../src/notes/encryption';

describe('Encryption Utils', () => {
  it('Should define encrypt and decrypt', () => {
    expect(typeof encryption.encrypt).toBe('function');
    expect(typeof encryption.decrypt).toBe('function');
  });

  it('Should encrypt and decrypt correctly', () => {
    const originalText = 'Mensaje secreto en el Bunker';
    const encrypted = encryption.encrypt(originalText);
    const decrypted = encryption.decrypt(encrypted);
    expect(decrypted).toBe(originalText);
  });
});
