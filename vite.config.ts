import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const appBuildId = new Date().toISOString();

export default defineConfig(() => {
  return {
    base: "/frontend-alamcen/",
    plugins: [react()],
    define: {
      __APP_BUILD_ID__: JSON.stringify(appBuildId)
    },
    test: {
      environment: "node",
      include: ["src/**/*.test.ts"]
    }
  };
});
