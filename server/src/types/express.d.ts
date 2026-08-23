import type { Sensor, User } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: User;
      sessionId?: string;
      sensor?: Sensor;
      sensorAuth?: "device" | "legacy";
    }
  }
}

export {};
