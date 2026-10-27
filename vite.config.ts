import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "/altmacro/",
  plugins: [tailwindcss(), svelte()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
