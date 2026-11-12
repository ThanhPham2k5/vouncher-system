"use client";

import FingerprintJS from "@fingerprintjs/fingerprintjs";

// Cache promise để chỉ tính fingerprint một lần cho mỗi lần tải trang
let cached: Promise<string> | null = null;

export function getDeviceFingerprint(): Promise<string> {
  if (!cached) {
    cached = FingerprintJS.load()
      .then((fp) => fp.get())
      .then((result) => result.visitorId)
      .catch(() => "");
  }
  return cached;
}
