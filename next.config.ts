import type { NextConfig } from "next";

const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: false,
  skipWaiting: true
});

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // @ts-ignore
  allowedDevOrigins: ["superadjacently-acerous-marylynn.ngrok-free.dev"],
};

export default withPWA(nextConfig);
