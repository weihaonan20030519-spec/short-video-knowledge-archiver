import type {
  BrowserContextPayload,
  BrowserContextImportResultDto,
  BrowserContextImportSessionState,
  BrowserContextImportSessionStatus
} from "../schemas/browserContextImportSchemas.js";

interface BrowserContextSessionRecord {
  sessionToken: string;
  createdAt: number;
  expiresAt: number;
  status: Exclude<BrowserContextImportSessionStatus, "expired">;
  result: BrowserContextImportResultDto | null;
  payload: BrowserContextPayload | null;
}

const DEFAULT_SESSION_TTL_MS = 5 * 60 * 1000;

export class ImportSessionStore {
  private readonly sessions = new Map<string, BrowserContextSessionRecord>();
  private latestPendingToken: string | null = null;

  constructor(private readonly ttlMs = DEFAULT_SESSION_TTL_MS) {}

  createSession() {
    this.cleanupExpiredSessions();

    const sessionToken = crypto.randomUUID();
    const now = Date.now();
    const expiresAt = now + this.ttlMs;
    const record: BrowserContextSessionRecord = {
      sessionToken,
      createdAt: now,
      expiresAt,
      status: "pending",
      result: null,
      payload: null
    };

    this.sessions.set(sessionToken, record);
    this.latestPendingToken = sessionToken;

    return {
      sessionToken,
      expiresAt: new Date(expiresAt).toISOString()
    };
  }

  getActivePendingSession() {
    this.cleanupExpiredSessions();

    if (!this.latestPendingToken) {
      return null;
    }

    const session = this.sessions.get(this.latestPendingToken);
    if (!session || session.status !== "pending") {
      return null;
    }

    return {
      sessionToken: session.sessionToken,
      expiresAt: new Date(session.expiresAt).toISOString()
    };
  }

  getSessionState(sessionToken: string): BrowserContextImportSessionState | null {
    const record = this.sessions.get(sessionToken);
    if (!record) {
      this.cleanupExpiredSessions();
      return null;
    }

    if (record.expiresAt <= Date.now()) {
      this.sessions.delete(sessionToken);
      if (this.latestPendingToken === sessionToken) {
        this.latestPendingToken = null;
      }
      return {
        sessionToken,
        status: "expired",
        expiresAt: new Date(record.expiresAt).toISOString(),
        result: null
      };
    }

    this.cleanupExpiredSessions();

    return {
      sessionToken: record.sessionToken,
      status: record.status,
      expiresAt: new Date(record.expiresAt).toISOString(),
      result: record.result
    };
  }

  submitResult(sessionToken: string, result: BrowserContextImportResultDto, payload?: BrowserContextPayload | null) {
    const record = this.sessions.get(sessionToken);
    if (!record) {
      return null;
    }

    record.status = "ready";
    record.result = result;
    record.payload = payload ?? record.payload;
    if (this.latestPendingToken === sessionToken) {
      this.latestPendingToken = null;
    }

    return this.getSessionState(sessionToken);
  }

  failSession(sessionToken: string) {
    const record = this.sessions.get(sessionToken);
    if (!record) {
      return null;
    }

    record.status = "failed";
    record.result = null;
    if (this.latestPendingToken === sessionToken) {
      this.latestPendingToken = null;
    }

    return this.getSessionState(sessionToken);
  }

  getSessionPayload(sessionToken: string) {
    const record = this.sessions.get(sessionToken);
    if (!record) {
      return null;
    }

    if (record.expiresAt <= Date.now()) {
      this.sessions.delete(sessionToken);
      if (this.latestPendingToken === sessionToken) {
        this.latestPendingToken = null;
      }
      return null;
    }

    return record.payload;
  }

  private cleanupExpiredSessions() {
    const now = Date.now();

    for (const [token, session] of this.sessions.entries()) {
      if (session.expiresAt <= now) {
        this.sessions.delete(token);
        if (this.latestPendingToken === token) {
          this.latestPendingToken = null;
        }
      }
    }
  }
}

export const importSessionStore = new ImportSessionStore();
