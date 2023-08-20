import { pino } from "pino";

import config from "./config.js";

const logger = pino({
  level: config.LOG_LEVEL,
});

export default logger;
