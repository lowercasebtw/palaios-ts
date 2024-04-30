import Server from "./server.ts";
export const server = new Server("0.0.0.0", 25565);
server.listen();