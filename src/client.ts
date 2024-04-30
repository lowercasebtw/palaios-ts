import { ByteWriter, Type } from "./util/byte.ts";
import { PacketType } from "./packet.ts";

const server = await Deno.connect({
    port: 25565
});

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

// handshake
{
    console.log('(handshake) client -> server')
    const handshake_str = "nomuea;localhost:25565";
    const writer = new ByteWriter();
    writer.write(Type.BYTE, PacketType.HANDSHAKE);
    writer.write(Type.BYTE, handshake_str.length);
    writer.write(Type.STRING, handshake_str);
    await writer.push(server);
}

console.log('(handshake) server -> client')
const handshake_data = new Uint8Array(20);
const handshake_length = await server.read(handshake_data) as number;
console.log(handshake_data.slice(0, handshake_length));

await sleep(1.2 * 1000);

// Login
const username = "nomuea";

console.log('(login req) client -> server')
// java.io.IOException: Received string length longer than maximum allowed (110 > 16)
//         at lx.a(SourceFile:197)
{
    const writer = new ByteWriter();
    writer.write(Type.BYTE, PacketType.LOGIN_REQUEST);
    writer.write(Type.BYTE, 29);
    writer.write(Type.BYTE, username.length);
    writer.write(Type.STRING, username);
    await writer.push(server);
}

// await sleep(3 * 1000);

// Message
// console.log('(message) client -> server')
// const message = "b";
// await server.write(new Uint8Array([
//     0x03, 0x00,
//     message.length,
//     ...zeros_string_bytes(message)
// ]));

while (true) {
    await sleep(1 * 1000)
    server.write(new Uint8Array([0x00, Math.floor(Math.random() * 10000)]));
}
