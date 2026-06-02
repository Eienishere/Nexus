/**
 * Nexus Backup Decryption Tool
 * 
 * Decrypts .enc backup files created by the Nexus server.
 * 
 * Usage:
 *   node decrypt_backup.js <backup_file.enc> [output_file.db]
 * 
 * Environment:
 *   DB_ENCRYPTION_KEY and BACKUP_KDF_SALT must be set in .env or as environment variables.
 * 
 * File Format:
 *   [12-byte IV][16-byte AuthTag][...AES-256-GCM encrypted data...]
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

function readRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Error: ${name} is not set.`);
    console.error("Set it in your .env file or as an environment variable.");
    process.exit(1);
  }
  return value;
}

function readKdfIterations() {
  const value = Number(process.env.BACKUP_KDF_ITERATIONS || 100_000);
  if (!Number.isInteger(value) || value < 100_000) {
    console.error("Error: BACKUP_KDF_ITERATIONS must be an integer >= 100000.");
    process.exit(1);
  }
  return value;
}

function deriveKey(passphrase, salt, iterations) {
  return crypto.pbkdf2Sync(passphrase, salt, iterations, 32, "sha512");
}

function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error("Usage: node decrypt_backup.js <backup_file.enc> [output_file.db]");
    console.error("");
    console.error("Example:");
    console.error("  node decrypt_backup.js backups/nexus_backup_2026-04-16_15-30.enc restored.db");
    process.exit(1);
  }

  const inputFile = args[0];
  const outputFile = args[1] || inputFile.replace(/\.enc$/, "_restored.db");

  if (!fs.existsSync(inputFile)) {
    console.error(`Error: File not found: ${inputFile}`);
    process.exit(1);
  }

  const passphrase = readRequiredEnv("DB_ENCRYPTION_KEY");
  const kdfSalt = readRequiredEnv("BACKUP_KDF_SALT");
  const kdfIterations = readKdfIterations();

  console.log(`[Decrypt] Reading encrypted backup: ${inputFile}`);
  const fileData = fs.readFileSync(inputFile);

  if (fileData.length < 28) {
    console.error("Error: File is too small to be a valid encrypted backup.");
    process.exit(1);
  }

  // Extract components: [IV (12)] [AuthTag (16)] [Encrypted Data (...)]
  const iv = fileData.subarray(0, 12);
  const authTag = fileData.subarray(12, 28);
  const encryptedData = fileData.subarray(28);

  console.log(`[Decrypt] IV: ${iv.toString("hex")}`);
  console.log(`[Decrypt] AuthTag: ${authTag.toString("hex")}`);
  console.log(`[Decrypt] Encrypted data size: ${encryptedData.length} bytes`);

  // Derive the same key that was used when the backup was encrypted.
  const key = deriveKey(passphrase, kdfSalt, kdfIterations);

  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);

    fs.writeFileSync(outputFile, decrypted);
    console.log(`[Decrypt] Successfully decrypted to: ${outputFile}`);
    console.log(`[Decrypt] Output size: ${decrypted.length} bytes`);
    console.log("");
    console.log("NOTE: The restored .db file is STILL encrypted with SQLCipher.");
    console.log("To read it, you need an SQLCipher-compatible tool with the same key.");
  } catch (err) {
    console.error("Decryption FAILED. Possible causes:");
    console.error("  - Wrong DB_ENCRYPTION_KEY");
    console.error("  - Corrupted backup file");
    console.error(`  - Error: ${err.message}`);
    process.exit(1);
  } finally {
    key.fill(0); // Wipe key from memory
  }
}

main();
