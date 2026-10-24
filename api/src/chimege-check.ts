import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { env } from "./config.ts";
import { synthesize } from "./modules/learning/chimege.ts";

// `pnpm --filter education_api chimege:check` — verifies the Chimege token and
// TTS endpoint from this machine.

const run = async () => {
  if (!env.CHIMEGE_TOKEN) {
    console.error("✗ CHIMEGE_TOKEN is not set in .env");
    process.exit(1);
  }
  try {
    const { audio, mimeType } = await synthesize("Сайн байна уу");
    const file = join(tmpdir(), "chimege-test.wav");
    writeFileSync(file, Buffer.from(audio, "base64"));
    console.log(`✓ TTS works (${mimeType}, ${Math.round((audio.length * 3) / 4 / 1024)} KB) → ${file}`);
  } catch (error) {
    console.error(`✗ TTS: ${error instanceof Error ? error.message : String(error)}`);
    console.error("  Set CHIMEGE_TTS_URL in .env if your Chimege account uses a different endpoint.");
    process.exit(1);
  }
};

void run();
