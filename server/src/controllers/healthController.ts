import type { Request, Response } from "express";

export function healthController(_req: Request, res: Response) {
  return res.json({ success: true });
}
