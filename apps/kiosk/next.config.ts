import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ワークスペースの TS パッケージを Next 側でトランスパイルする。
  transpilePackages: ["@open-punch/ui"],
};

export default nextConfig;
