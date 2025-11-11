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
  output: 'server',
  adapter: netlify({
    edgeMiddleware: false,
  }),
  site: 'https://texaslobby.org',
  server: {
    port: 4321,
  },
  vite: {
    ssr: {
      noExternal: ['@supabase/supabase-js'],
    },
  },
});
