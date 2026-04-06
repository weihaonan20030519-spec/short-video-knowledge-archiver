import type { Request, Response } from "express";

import { adaptBrowserContextPayload } from "../services/browserContextImportAdapter.js";
import { importSessionStore } from "../services/importSessionStore.js";
import { hydrateSelectedTrackContent } from "../services/browserContextTrackResolver.js";
import {
  browserContextSessionSubmitSchema,
  browserContextTrackRefetchSchema
} from "../schemas/browserContextImportSchemas.js";

export async function createBrowserContextSessionController(_req: Request, res: Response) {
  return res.json({
    success: true,
    data: importSessionStore.createSession(),
    error: null
  });
}

export async function getActiveBrowserContextSessionController(_req: Request, res: Response) {
  return res.json({
    success: true,
    data: importSessionStore.getActivePendingSession(),
    error: null
  });
}

export async function getBrowserContextSessionController(req: Request, res: Response) {
  const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
  const session = importSessionStore.getSessionState(token);

  return res.json({
    success: true,
    data:
      session || {
        sessionToken: token,
        status: "expired",
        expiresAt: new Date().toISOString(),
        result: null
      },
    error: null
  });
}

export async function submitBrowserContextImportController(req: Request, res: Response) {
  try {
    const input = browserContextSessionSubmitSchema.parse(req.body);
    const result = adaptBrowserContextPayload(input.payload);
    const session = importSessionStore.submitResult(input.sessionToken, result, input.payload);

    if (!session) {
      return res.status(404).json({
        success: false,
        data: null,
        error: {
          code: "SESSION_NOT_FOUND",
          message: "The import session could not be found."
        }
      });
    }

    return res.json({
      success: true,
      data: session,
      error: null
    });
  } catch (error) {
    const sessionToken = typeof req.body?.sessionToken === "string" ? req.body.sessionToken : null;
    if (sessionToken) {
      importSessionStore.failSession(sessionToken);
    }

    return res.status(400).json({
      success: false,
      data: null,
      error: {
        code: "INVALID_BROWSER_CONTEXT_PAYLOAD",
        message: error instanceof Error ? error.message : "Invalid browser context payload."
      }
    });
  }
}

export async function refetchBrowserContextTrackController(req: Request, res: Response) {
  const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;

  try {
    const { trackId } = browserContextTrackRefetchSchema.parse(req.body);
    const payload = importSessionStore.getSessionPayload(token);

    if (!payload) {
      return res.status(404).json({
        success: false,
        data: null,
        error: {
          code: "SESSION_NOT_FOUND",
          message: "The import session could not be found."
        }
      });
    }

    const hydrated = await hydrateSelectedTrackContent(payload, trackId);
    const nextResult = adaptBrowserContextPayload(hydrated.payload);

    if (hydrated.refetched && hydrated.foundTrack && !hydrated.foundTrack.contentText) {
      nextResult.warningCodes = Array.from(new Set([...nextResult.warningCodes, "SELECTED_TRACK_REFETCH_FAILED"]));
    }

    const session = importSessionStore.submitResult(token, nextResult, hydrated.payload);
    return res.json({
      success: true,
      data: session,
      error: null
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      data: null,
      error: {
        code: "INVALID_BROWSER_CONTEXT_PAYLOAD",
        message: error instanceof Error ? error.message : "Invalid browser context payload."
      }
    });
  }
}
