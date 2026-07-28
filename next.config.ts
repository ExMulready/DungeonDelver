import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits a self-contained server bundle so the Docker runtime stage can ship
  // without node_modules. Ignored by Vercel, which builds its own output.
  output: "standalone",

  /* Intentionally no `serverExternalPackages`. Marking a package external makes
     the bundler symlink it into .next/node_modules, and this project lives on
     an exFAT volume, which has no symlink support at all — the build panics
     with "failed to create junction point". The tree is pure JavaScript (see
     src/lib/auth/password.ts for why there is no native argon2), so everything
     bundles cleanly instead. */
};

export default nextConfig;
