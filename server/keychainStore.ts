/**
 * keychainStore.ts — OS-level secure credential storage for Nexus
 *
 * Uses Windows Credential Manager via PowerShell (no native dependencies).
 * On macOS/Linux, falls back to the `security` CLI / `secret-tool` respectively.
 *
 * Stores the autologin key as a hex-encoded credential rather than a plaintext
 * file on disk, eliminating the nexus_autologin.bin security vulnerability.
 */

import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execFileAsync = promisify(execFile);

const SERVICE_NAME = "nexus-app";
const ACCOUNT_NAME = "autologin-key";

// ─── Platform-specific implementations ────────────────────────────────────

/**
 * Save a credential to the OS keychain.
 */
async function platformSave(service: string, account: string, value: string): Promise<void> {
  if (process.platform === "win32") {
    // Use PowerShell to store in Windows Credential Manager
    // First remove any existing entry, then add new one
    const removeScript = `
      $ErrorActionPreference = 'SilentlyContinue'
      cmdkey /delete:${service}/${account} 2>$null
    `;
    try {
      await execFileAsync("powershell.exe", ["-NoProfile", "-Command", removeScript]);
    } catch { /* OK if not found */ }

    const addScript = `
      cmdkey /generic:${service}/${account} /user:${account} /pass:${value}
    `;
    const { stderr } = await execFileAsync("powershell.exe", ["-NoProfile", "-Command", addScript]);
    if (stderr && stderr.includes("ERROR")) {
      throw new Error(`Credential Manager save failed: ${stderr}`);
    }
  } else if (process.platform === "darwin") {
    // macOS Keychain
    await execFileAsync("security", [
      "add-generic-password",
      "-U",  // update if exists
      "-s", service,
      "-a", account,
      "-w", value,
    ]);
  } else {
    // Linux — secret-tool (libsecret)
    const child = require("child_process").spawn("secret-tool", [
      "store", "--label", `${service}/${account}`,
      "service", service,
      "account", account,
    ]);
    child.stdin.write(value);
    child.stdin.end();
    await new Promise<void>((resolve, reject) => {
      child.on("close", (code: number) => code === 0 ? resolve() : reject(new Error(`secret-tool exited with ${code}`)));
    });
  }
}

/**
 * Load a credential from the OS keychain. Returns null if not found.
 */
async function platformLoad(service: string, account: string): Promise<string | null> {
  try {
    if (process.platform === "win32") {
      // Query Windows Credential Manager via PowerShell + CredentialManagement
      const script = `
        $cred = Get-StoredCredential -Target '${service}/${account}' -ErrorAction SilentlyContinue
        if ($cred) {
          $cred.GetNetworkCredential().Password
        } else {
          # Fallback: use cmdkey /list and vaultcmd
          $output = cmdkey /list:${service}/${account} 2>&1
          if ($output -match 'User:') {
            # cmdkey doesn't expose passwords directly, use .NET
            Add-Type -AssemblyName 'System.Runtime.InteropServices'
            $creds = [System.Runtime.InteropServices.Marshal]
            ''
          } else {
            ''
          }
        }
      `;
      // Simpler approach: use Windows Data Protection API (DPAPI) via PowerShell
      // Since cmdkey doesn't let us read passwords back, we use DPAPI directly
      const dpApiScript = `
        $path = [System.IO.Path]::Combine($env:LOCALAPPDATA, 'Nexus', 'autologin.dpapi')
        if (Test-Path $path) {
          $encrypted = [System.IO.File]::ReadAllBytes($path)
          $decrypted = [System.Security.Cryptography.ProtectedData]::Unprotect($encrypted, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser)
          [System.Text.Encoding]::UTF8.GetString($decrypted)
        } else {
          ''
        }
      `;
      const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-Command", dpApiScript]);
      const result = stdout.trim();
      return result || null;
    } else if (process.platform === "darwin") {
      const { stdout } = await execFileAsync("security", [
        "find-generic-password",
        "-s", service,
        "-a", account,
        "-w",
      ]);
      return stdout.trim() || null;
    } else {
      const { stdout } = await execFileAsync("secret-tool", [
        "lookup",
        "service", service,
        "account", account,
      ]);
      return stdout.trim() || null;
    }
  } catch {
    return null;
  }
}

/**
 * Delete a credential from the OS keychain.
 */
async function platformDelete(service: string, account: string): Promise<void> {
  try {
    if (process.platform === "win32") {
      // Remove DPAPI file
      const script = `
        $path = [System.IO.Path]::Combine($env:LOCALAPPDATA, 'Nexus', 'autologin.dpapi')
        if (Test-Path $path) {
          # Overwrite with random data before deleting
          $size = (Get-Item $path).Length
          $random = New-Object byte[] $size
          (New-Object System.Security.Cryptography.RNGCryptoServiceProvider).GetBytes($random)
          [System.IO.File]::WriteAllBytes($path, $random)
          Remove-Item $path -Force
        }
      `;
      await execFileAsync("powershell.exe", ["-NoProfile", "-Command", script]);
    } else if (process.platform === "darwin") {
      await execFileAsync("security", [
        "delete-generic-password",
        "-s", service,
        "-a", account,
      ]);
    } else {
      await execFileAsync("secret-tool", [
        "clear",
        "service", service,
        "account", account,
      ]);
    }
  } catch { /* OK if not found */ }
}

// ─── Windows DPAPI-based save (since cmdkey can't read passwords back) ────

async function dpApiSave(value: string): Promise<void> {
  const script = `
    Add-Type -AssemblyName 'System.Security'
    $dir = [System.IO.Path]::Combine($env:LOCALAPPDATA, 'Nexus')
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $path = [System.IO.Path]::Combine($dir, 'autologin.dpapi')
    $bytes = [System.Text.Encoding]::UTF8.GetBytes('${value}')
    $encrypted = [System.Security.Cryptography.ProtectedData]::Protect($bytes, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser)
    [System.IO.File]::WriteAllBytes($path, $encrypted)
  `;
  await execFileAsync("powershell.exe", ["-NoProfile", "-Command", script]);
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Save the autologin key to OS-level secure storage.
 * On Windows, uses DPAPI (Data Protection API) — encrypted by the user's login credentials.
 */
export async function saveAutologinKey(key: Buffer): Promise<void> {
  const hexValue = key.toString("hex");
  if (process.platform === "win32") {
    await dpApiSave(hexValue);
  } else {
    await platformSave(SERVICE_NAME, ACCOUNT_NAME, hexValue);
  }
  console.log("[Keychain] Autologin key saved to OS secure storage.");
}

/**
 * Load the autologin key from OS-level secure storage.
 * Returns a 32-byte Buffer or null if not found.
 */
export async function loadAutologinKey(): Promise<Buffer | null> {
  const hex = await platformLoad(SERVICE_NAME, ACCOUNT_NAME);
  if (!hex || hex.length !== 64) return null; // 32 bytes = 64 hex chars
  return Buffer.from(hex, "hex");
}

/**
 * Delete the autologin key from OS-level secure storage.
 */
export async function deleteAutologinKey(): Promise<void> {
  await platformDelete(SERVICE_NAME, ACCOUNT_NAME);
  console.log("[Keychain] Autologin key removed from OS secure storage.");
}

/**
 * Check if an autologin key exists in OS-level secure storage.
 */
export async function isAutologinEnabled(): Promise<boolean> {
  const hex = await platformLoad(SERVICE_NAME, ACCOUNT_NAME);
  return !!hex && hex.length === 64;
}

/**
 * Migrate from file-based autologin to OS keychain.
 * Reads the nexus_autologin.bin file, stores it in the OS keychain,
 * then securely wipes and deletes the file.
 *
 * @returns true if migration occurred, false if no file found
 */
export async function migrateFromFile(filePath: string): Promise<boolean> {
  if (!fs.existsSync(filePath)) return false;

  try {
    const keyData = fs.readFileSync(filePath);
    if (keyData.length !== 32) {
      console.warn("[Keychain] Migration skipped: autologin file has invalid length.");
      return false;
    }

    // Save to OS keychain
    await saveAutologinKey(keyData);

    // Securely wipe the file: overwrite with random data, then delete
    const randomData = require("crypto").randomBytes(keyData.length);
    fs.writeFileSync(filePath, randomData);
    fs.unlinkSync(filePath);

    console.log("[Keychain] Successfully migrated autologin key from file to OS keychain.");
    return true;
  } catch (err) {
    console.error("[Keychain] Migration error:", err);
    return false;
  }
}
