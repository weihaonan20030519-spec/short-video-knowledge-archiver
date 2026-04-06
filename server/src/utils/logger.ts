export const logger = {
  info: (...args: unknown[]) => {
    console.info("[server]", ...args);
  },
  error: (...args: unknown[]) => {
    console.error("[server]", ...args);
  }
};
