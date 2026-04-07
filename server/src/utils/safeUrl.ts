import { isIP } from "node:net";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata",
  "metadata.google.internal",
  "metadata.aliyun.internal",
  "100.100.100.200",
  "169.254.169.254"
]);

function isPrivateIpv4(hostname: string) {
  if (hostname.startsWith("10.")) {
    return true;
  }

  if (hostname.startsWith("127.")) {
    return true;
  }

  if (hostname.startsWith("192.168.")) {
    return true;
  }

  if (hostname.startsWith("169.254.")) {
    return true;
  }

  const match = hostname.match(/^172\.(\d{1,3})\./);
  if (!match) {
    return false;
  }

  const octet = Number(match[1]);
  return octet >= 16 && octet <= 31;
}

function isPrivateIpv6(hostname: string) {
  const normalized = hostname.toLowerCase();

  return normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80");
}

function isBlockedHost(hostname: string) {
  const normalized = hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(normalized) || normalized.endsWith(".localhost")) {
    return true;
  }

  if (normalized === "0.0.0.0" || normalized === "::1") {
    return true;
  }

  const ipVersion = isIP(normalized);
  if (ipVersion === 4) {
    return isPrivateIpv4(normalized);
  }

  if (ipVersion === 6) {
    return isPrivateIpv6(normalized);
  }

  return false;
}

export function ensureSafeUrl(target: URL) {
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return false;
  }

  return !isBlockedHost(target.hostname);
}
