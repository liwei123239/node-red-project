import { env } from "@node-red-project/env/web";
import { createAuthClient } from "better-auth/react";

const getBaseUrl = (): string => {
  if (env.VITE_SERVER_URL) {
    return env.VITE_SERVER_URL;
  }
  return globalThis.location.origin;
};

export const authClient = createAuthClient({
  baseURL: getBaseUrl(),
});
