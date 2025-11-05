import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import netlify from '@astrojs/netlify';

// https://astro.build/config
export default defineConfig({
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: false,
    }),
  ],
  output: 'hybrid',
  adapter: netlify(),
  site: 'https://texaslobby.org',
  server: {
    port: 4321,
  },
  vite: {
    optimizeDeps: {
      exclude: ['@supabase/supabase-js'],
    },
  },
});
