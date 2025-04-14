/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      "firebasestorage.googleapis.com",
      "d2j6dbq0eux0bg.cloudfront.net",
      "www.carnave.com.ar",
      "www.lavanguardia.com",
      "dhb3yazwboecu.cloudfront.net",
      "granjaelpaisanito.com.ar",
      "cache-mcd-middleware.mcdonaldscupones.com",
      "admin.tiendapower.com",
      "www.directodelavega.com",
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**", // Esto permite cualquier hostname con HTTPS
      },
      {
        protocol: "http",
        hostname: "**", // Esto permite cualquier hostname con HTTP
      },
    ],
    unoptimized: true, // Esto permite usar cualquier URL de imagen sin configuración adicional
  },
  // Disable ESLint during build to prevent failures
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig