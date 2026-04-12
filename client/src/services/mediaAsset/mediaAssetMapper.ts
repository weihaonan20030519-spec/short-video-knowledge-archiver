import type {
  AppLanguage,
  MediaAsset,
  MediaAssetAvailability,
  RecordItem
} from "../../types/domain";
import type { ClientTranscriptionResult } from "../transcription/transcriptionTypes";
import { getMessages } from "../../lib/i18n";

export function buildDefaultMediaAsset(overrides: Partial<MediaAsset> = {}): MediaAsset {
  return {
    storageMode: "none",
    rootId: null,
    relativePath: null,
    fileName: null,
    mimeType: null,
    size: null,
    duration: null,
    sourceType: null,
    availability: "not_archived",
    lastVerifiedAt: null,
    lastKnownError: null,
    ...overrides
  };
}

export function buildMediaAssetFromTranscriptionResult(
  transcriptionResult?: ClientTranscriptionResult | null
): MediaAsset {
  if (!transcriptionResult) {
    return buildDefaultMediaAsset();
  }

  return buildDefaultMediaAsset({
    fileName: transcriptionResult.transcriptMeta.fileName,
    mimeType: transcriptionResult.transcriptMeta.mimeType,
    size: transcriptionResult.transcriptMeta.size,
    duration: transcriptionResult.transcriptMeta.duration ?? null,
    sourceType: transcriptionResult.sourceType,
    availability: "not_archived"
  });
}

export function getSafeMediaAsset(record: Pick<RecordItem, "mediaAsset"> | null | undefined): MediaAsset {
  if (!record?.mediaAsset) {
    return buildDefaultMediaAsset();
  }

  return buildDefaultMediaAsset(record.mediaAsset);
}

export function getMediaAssetDisplayState(
  language: AppLanguage,
  mediaAsset: MediaAsset
): {
  storageLabel: string;
  availabilityLabel: string;
  availabilityDescription: string;
} {
  const messages = getMessages(language).mediaAsset;

  const storageLabel =
    mediaAsset.storageMode === "local_archive_dir"
      ? messages.storageMode.local_archive_dir
      : messages.storageMode.none;

  const availabilityMessages: Record<
    MediaAssetAvailability,
    { label: string; description: string }
  > = {
    ready: {
      label: messages.availability.ready,
      description: messages.availabilityDescription.ready
    },
    missing: {
      label: messages.availability.missing,
      description: messages.availabilityDescription.missing
    },
    permission_required: {
      label: messages.availability.permission_required,
      description: messages.availabilityDescription.permission_required
    },
    write_failed: {
      label: messages.availability.write_failed,
      description: messages.availabilityDescription.write_failed
    },
    not_archived: {
      label: messages.availability.not_archived,
      description: messages.availabilityDescription.not_archived
    }
  };

  return {
    storageLabel,
    availabilityLabel: availabilityMessages[mediaAsset.availability].label,
    availabilityDescription: availabilityMessages[mediaAsset.availability].description
  };
}
