import MinecraftServer from "./server.ts";

export const server = new MinecraftServer();
await server.listen();