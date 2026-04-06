import multer from "multer";
import { describe, expect, it } from "vitest";

import { createHttpErrorResponse } from "./httpErrorHandler.js";

describe("createHttpErrorResponse", () => {
  it("maps multer size errors to FILE_TOO_LARGE", () => {
    const response = createHttpErrorResponse(new multer.MulterError("LIMIT_FILE_SIZE"));

    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe("FILE_TOO_LARGE");
  });
});
