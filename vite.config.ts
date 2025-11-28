import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
	const base = mode === "production" ? "/nested-json-master/" : "/";

	return {
		base,
		build: {
			outDir: "dist",
			assetsDir: "assets",
		},
		server: {
			port: 3000,
			host: "0.0.0.0",
		},
		plugins: [react()],

		resolve: {
			alias: {
				"@": path.resolve(__dirname, "."),
			},
		},
	};
});
