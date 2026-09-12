import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],

  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          minSize: 20_000,
          maxSize: 280_000,

          groups: [
            {
              name: "react-vendor",
              test:
                /node_modules[\\/](react|react-dom|react-router|react-router-dom)[\\/]/,
              priority: 60,
              maxSize: 280_000,
            },
            {
              name: "supabase-vendor",
              test:
                /node_modules[\\/]@supabase[\\/]/,
              priority: 55,
              maxSize: 280_000,
            },
            {
              name: "charts-vendor",
              test:
                /node_modules[\\/](recharts|victory-vendor|d3-[^\\/]+)[\\/]/,
              priority: 50,
              maxSize: 280_000,
            },
            {
              name: "pdf-vendor",
              test:
                /node_modules[\\/](jspdf|html2canvas|dompurify|fflate|canvg|svg-pathdata|stackblur-canvas)[\\/]/,
              priority: 45,
              maxSize: 280_000,
            },
            {
              name: "icons-vendor",
              test:
                /node_modules[\\/]lucide-react[\\/]/,
              priority: 40,
              maxSize: 280_000,
            },
            {
              name: "vendor",
              test: /node_modules[\\/]/,
              priority: 10,
              maxSize: 280_000,
            },
            {
              name: "common",
              minShareCount: 2,
              minSize: 10_000,
              priority: 5,
            },
          ],
        },
      },
    },
  },
});