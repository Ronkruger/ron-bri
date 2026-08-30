import path from "path";
import dotenv from "dotenv";

// Always use the monorepo root environment file, regardless of the process cwd.
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
