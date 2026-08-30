const path = require("path");
const { spawnSync } = require("child_process");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const prismaBinary = path.resolve(
  __dirname,
  "../../node_modules/.bin",
  process.platform === "win32" ? "prisma.cmd" : "prisma"
);

const result = spawnSync(prismaBinary, process.argv.slice(2), {
  env: process.env,
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
