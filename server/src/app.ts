import cors from "cors";
import express from "express";
import multer from "multer";

import { createAnalyzeRoutes } from "./routes/analyzeRoutes.js";
import { healthRoutes } from "./routes/healthRoutes.js";
import { importBrowserContextRoutes } from "./routes/importBrowserContext.js";
import { importRoutes } from "./routes/importRoutes.js";
import { createTranscriptionRoutes } from "./routes/transcriptionRoutes.js";
import {
  FfmpegAudioExtractionService,
  type AudioExtractionService
} from "./services/transcription/audioExtractionService.js";
import type { AnalysisProvider } from "./services/transcription/analysisProvider.js";
import type { TranscriptionProvider } from "./services/transcription/transcriptionProvider.js";
import {
  createAnalysisProvider,
  createTranscriptionProvider
} from "./services/transcription/providerSelection.js";
import { createHttpErrorResponse } from "./utils/httpErrorHandler.js";

interface AppDependencies {
  analysisProvider?: AnalysisProvider;
  transcriptionProvider?: TranscriptionProvider;
  audioExtractionService?: AudioExtractionService;
}

export function createApp(dependencies: AppDependencies = {}) {
  const app = express();
  const analysisProvider = dependencies.analysisProvider || createAnalysisProvider();
  const transcriptionProvider = dependencies.transcriptionProvider || createTranscriptionProvider();
  const audioExtractionService =
    dependencies.audioExtractionService || new FfmpegAudioExtractionService();

  app.use(
    cors({
      origin: true
    })
  );
  app.use(express.json({ limit: "1mb" }));

  app.use("/api", healthRoutes);
  app.use("/api", createAnalyzeRoutes(analysisProvider));
  app.use("/api", importRoutes);
  app.use("/api", importBrowserContextRoutes);
  app.use(
    "/api",
    createTranscriptionRoutes({
      transcriptionProvider,
      audioExtractionService
    })
  );

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const response = createHttpErrorResponse(error);
    return res.status(response.status).json(response.body);
  });

  return app;
}
