import { provisionAndMigrate } from "./fixtures/db";

export default async function globalSetup(): Promise<void> {
  await provisionAndMigrate();
}
