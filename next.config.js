/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
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
        hostname: "",
      },
      {
        protocol: "http",
        hostname: "",
      },
    ],
    unoptimized: true, // Esto permite usar cualquier URL de imagen sin configuración adicional
  },
}

module.exports = nextConfig