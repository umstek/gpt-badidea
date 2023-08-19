import { pino } from "pino";

import config from "./config.js";

const logger = pino({
  level: config.LOG_LEVEL,
  ...(config.NODE_ENV === "development" && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
      },
    },
  }),
});

export default logger;
