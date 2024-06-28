import { Level, Logger } from "./logger/Logger.ts";
import { PacketType } from "./packet.ts";
import { ByteWriter, Type } from "./util/byte.ts";

const server = await Deno.connect({ port: 25565 });

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

// handshake
{
    Logger.log(Level.INFO, '(handshake) client -> server')
    const handshake_str = "lowerdeez;localhost:25565";
    await server.write(new ByteWriter()
                            .write(Type.BYTE, PacketType.HANDSHAKE)
                            .write(Type.BYTE, handshake_str.length)
                            .write(Type.STRING, handshake_str)
                            .build());
}

Logger.log(Level.INFO, '(handshake) server -> client')
const handshake_data = new Uint8Array(20);
const handshake_length = await server.read(handshake_data) as number;
Logger.log(Level.INFO, handshake_data.slice(0, handshake_length));

await sleep(1.2 * 1000);

// Login
const username = "nomuea";

Logger.log(Level.INFO, '(login req) client -> server')
// java.io.IOException: Received string length longer than maximum allowed (110 > 16)
//         at lx.a(SourceFile:197)
{
    await server.write(new ByteWriter()
                        .write(Type.BYTE, PacketType.LOGIN_REQUEST)
                        .write(Type.BYTE, 29)
                        .write(Type.BYTE, username.length)
                        .write(Type.STRING, username)
                        .build());
}

// await sleep(3 * 1000);

// Message
Logger.log(Level.INFO, '(message) client -> server')
while (true) {
    await sleep(1 * 1000)
    await server.write(
        new ByteWriter()
            .write(Type.BYTE, PacketType.KEEP_ALIVE)
            .write(Type.INT, Math.floor(Math.random() * 10000))
            .build()
    );
}
