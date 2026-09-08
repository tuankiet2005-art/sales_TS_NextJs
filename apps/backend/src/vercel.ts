import "./load-env.js";

import { createApp } from "./app.js";

/** Default export for Vercel serverless (single Express function for all /api routes). */
export default await createApp();
