const LOCAL_API_BASE_URL = "http://localhost:3001";

function readConfiguredApiBaseUrl() {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  return configured ? configured.replace(/\/+$/, "") : null;
}

export function getApiBaseUrl() {
  const configured = readConfiguredApiBaseUrl();
  if (configured) {
    return configured;
  }

  if (import.meta.env.DEV || import.meta.env.MODE === "test") {
    return LOCAL_API_BASE_URL;
  }

  throw new Error(
    "VITE_API_BASE_URL is required in production builds so the frontend does not fall back to localhost."
  );
}

