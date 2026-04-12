import cors from "cors";
import express from "express";
import multer from "multer";

import { createAnalyzeRoutes } from "./routes/analyzeRoutes.js";
import { healthRoutes } from "./routes/healthRoutes.js";
import { importBrowserContextRoutes } from "./routes/importBrowserContext.js";
import { createImportRoutes } from "./routes/importRoutes.js";
import { createTranscriptionRoutes } from "./routes/transcriptionRoutes.js";
import {
  FfmpegAudioExtractionService,
  type AudioExtractionService
} from "./services/transcription/audioExtractionService.js";
import type { AnalysisProvider } from "./services/transcription/analysisProvider.js";
import type { TranscriptionProvider } from "./services/transcription/transcriptionProvider.js";
import type { ArticleOcrProvider } from "./services/articleOcr/articleOcrProvider.js";
import {
  createAnalysisProvider,
  createTranscriptionProvider
} from "./services/transcription/providerSelection.js";
import { createArticleOcrProvider } from "./services/articleOcr/providerSelection.js";
import { resolveAllowedAppOrigins } from "./utils/env.js";
import { createHttpErrorResponse } from "./utils/httpErrorHandler.js";
import { logger } from "./utils/logger.js";

interface AppDependencies {
  analysisProvider?: AnalysisProvider;
  transcriptionProvider?: TranscriptionProvider;
  articleOcrProvider?: ArticleOcrProvider;
  audioExtractionService?: AudioExtractionService;
}

function isLocalDevelopmentOrigin(origin: string) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

function isThisProjectsVercelOrigin(origin: string) {
  return /^https:\/\/short-video-knowledge-archiver(?:-[a-z0-9]+)?\.vercel\.app$/i.test(origin);
}

export function isAllowedCorsOrigin(origin: string | undefined, allowedAppOrigins = resolveAllowedAppOrigins()) {
  if (!origin) {
    return true;
  }

  const isLocalOrigin = isLocalDevelopmentOrigin(origin);
  const isPreviewOrigin = isThisProjectsVercelOrigin(origin);
  const isConfiguredOrigin = allowedAppOrigins.includes(origin);
  const allowed = isLocalOrigin || isPreviewOrigin || isConfiguredOrigin;

  logger.info("CORS decision", {
    origin,
    allowedAppOrigins,
    isLocalOrigin,
    isPreviewOrigin,
    isConfiguredOrigin,
    allowed
  });

  return allowed;
}

export function createApp(dependencies: AppDependencies = {}) {
  const app = express();
  const allowedAppOrigins = resolveAllowedAppOrigins();
  const corsOptions: cors.CorsOptions = {
    origin(origin, callback) {
      if (isAllowedCorsOrigin(origin, allowedAppOrigins)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    }
  };
  const analysisProvider = dependencies.analysisProvider || createAnalysisProvider();
  const transcriptionProvider = dependencies.transcriptionProvider || createTranscriptionProvider();
  const articleOcrProvider = dependencies.articleOcrProvider || createArticleOcrProvider();
  const audioExtractionService =
    dependencies.audioExtractionService || new FfmpegAudioExtractionService();

  app.use(cors(corsOptions));
  app.options("/api/transcribe/file", cors(corsOptions));
  app.use(express.json({ limit: "1mb" }));

  app.use("/api", healthRoutes);
  app.use("/api", createAnalyzeRoutes(analysisProvider));
  app.use("/api", createImportRoutes(articleOcrProvider));
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
