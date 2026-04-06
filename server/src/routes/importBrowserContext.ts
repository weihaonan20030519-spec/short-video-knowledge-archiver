import { Router } from "express";

import {
  createBrowserContextSessionController,
  getActiveBrowserContextSessionController,
  getBrowserContextSessionController,
  refetchBrowserContextTrackController,
  submitBrowserContextImportController
} from "../controllers/importBrowserContextController.js";

export const importBrowserContextRoutes = Router();

importBrowserContextRoutes.post("/import/browser-context/session", createBrowserContextSessionController);
importBrowserContextRoutes.get("/import/browser-context/session/active", getActiveBrowserContextSessionController);
importBrowserContextRoutes.get("/import/browser-context/session/:token", getBrowserContextSessionController);
importBrowserContextRoutes.post("/import/browser-context/session/:token/track", refetchBrowserContextTrackController);
importBrowserContextRoutes.post("/import/browser-context/submit", submitBrowserContextImportController);
