import multer from "multer";

export function createHttpErrorResponse(error: unknown) {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return {
      status: 413,
      body: {
        success: false as const,
        data: null,
        error: {
          code: "FILE_TOO_LARGE",
          message: "The uploaded file exceeds the allowed size limit"
        }
      }
    };
  }

  if (error instanceof Error) {
    return {
      status: 500,
      body: {
        success: false as const,
        data: null,
        error: {
          code: "INTERNAL_ERROR",
          message: error.message
        }
      }
    };
  }

  return {
    status: 500,
    body: {
      success: false as const,
      data: null,
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error"
      }
    }
  };
}
