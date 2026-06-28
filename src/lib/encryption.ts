import CryptoJS from "crypto-js";

const MASTER_KEY = process.env.ENCRYPTION_MASTER_KEY || "default-dev-key-change-in-production-immediately";

function deriveKey(conversationId: string): string {
  return CryptoJS.SHA256(MASTER_KEY + conversationId).toString();
}

export function encrypt(
  plaintext: string,
  conversationId: string
): { ciphertext: string; iv: string } {
  const key = deriveKey(conversationId);
  const iv = CryptoJS.lib.WordArray.random(16);
  const encrypted = CryptoJS.AES.encrypt(plaintext, CryptoJS.enc.Hex.parse(key), {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return {
    ciphertext: encrypted.ciphertext.toString(CryptoJS.enc.Base64),
    iv: iv.toString(CryptoJS.enc.Hex),
  };
}

export function decrypt(
  ciphertext: string,
  iv: string,
  conversationId: string
): string {
  try {
    const key = deriveKey(conversationId);
    const decrypted = CryptoJS.AES.decrypt(
      CryptoJS.lib.CipherParams.create({
        ciphertext: CryptoJS.enc.Base64.parse(ciphertext),
      }),
      CryptoJS.enc.Hex.parse(key),
      {
        iv: CryptoJS.enc.Hex.parse(iv),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      }
    );
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch {
    console.error("Decryption failed");
    return "[Encrypted message]";
  }
}
