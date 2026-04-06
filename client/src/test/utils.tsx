import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import App from "../app/App";
import { folderRepository } from "../db/repositories/folderRepository";
import { recordRepository } from "../db/repositories/recordRepository";
import { tagRepository } from "../db/repositories/tagRepository";
import type { Folder, RecordItem, Tag } from "../types/domain";

interface SeedOptions {
  folders?: Folder[];
  tags?: Tag[];
  records?: RecordItem[];
}

export async function seedAppState(options: SeedOptions = {}) {
  if (options.folders?.length) {
    for (const folder of options.folders) {
      await folderRepository.create(folder);
    }
  }

  if (options.tags?.length) {
    for (const tag of options.tags) {
      await tagRepository.create(tag);
    }
  }

  if (options.records?.length) {
    for (const record of options.records) {
      await recordRepository.create(record);
    }
  }
}

export async function renderApp(options: SeedOptions = {}) {
  await seedAppState(options);
  const view = render(<App />);
  await screen.findByRole("button", { name: /新建记录|New record/ });
  return {
    user: userEvent.setup(),
    ...view
  };
}

export function iso(value: string) {
  return new Date(value).toISOString();
}
