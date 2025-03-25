import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";

// Only load SSL certs in development
const loadHttpsConfig = () => {
  if (process.env.NODE_ENV !== 'development') return undefined;
  
  try {
    const certPath = `${process.env.HOME}/.localhost_ssl`;
    return {
      key: fs.readFileSync(`${certPath}/localhost-key.pem`),
      cert: fs.readFileSync(`${certPath}/localhost.pem`),
    };
  } catch (error) {
    console.warn('Could not load SSL certificates. Falling back to HTTP.');
    return undefined;
  }
};

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    https: loadHttpsConfig(), // Will be undefined in production
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Explicit production build settings
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  preview: {
    port: 8080,
  }
});