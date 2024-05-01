import Server from "./server.ts";
export const server = new Server();
await server.listen();