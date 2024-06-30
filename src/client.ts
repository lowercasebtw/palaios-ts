import { Level, Logger } from "./logger/Logger.ts";
import { PacketType } from "./packet.ts";
import { ByteUtil } from "./util/byte.ts";
import { ByteReader } from "./util/byte.ts";
import { ByteWriter, Type } from "./util/byte.ts";

const server = await Deno.connect({ port: 25565 });

class State {
    private _closed: boolean;
    private _recipient: Deno.TcpConn;
    constructor(recipient: Deno.TcpConn) {
        this._closed = false;
        this._recipient = recipient;
    }

    isClosed() {
        return this._closed;
    }

    write(p: Uint8Array) {
        if (this._closed)
            return 0;
        return this._recipient.write(p);
    }

    read(p: Uint8Array) {
        if (this._closed)
            return 0;
        try {
            return this._recipient.read(p);
        } catch(e) {
            return 0;
        }
    }

    close() {
        this._closed = true;
        this._recipient.close();
    }
}

const state = new State(server);

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

// handshake
{
    Logger.log(Level.INFO, '(handshake) client -> server')
    const handshake_str = "lowerdeez;localhost:25565";
    await state.write(new ByteWriter()
                            .write(Type.BYTE, PacketType.HANDSHAKE)
                            .write(Type.STRING, handshake_str)
                            .build());
}

Logger.log(Level.INFO, '(handshake) server -> client')
const handshake_data = new Uint8Array(20);
const handshake_length = await state.read(handshake_data) as number;
Logger.log(Level.INFO, handshake_data.slice(0, handshake_length));

await sleep(1.2 * 1000);

// Login
const username = "BobIsCool";

Logger.log(Level.INFO, '(login req) client -> server')
// java.io.IOException: Received string length longer than maximum allowed (110 > 16)
//         at lx.a(SourceFile:197)
{
    // await state.write(new ByteWriter()
    //                         .write(Type.BYTE, PacketType.LOGIN_REQUEST)
    //                         .write(Type.INTEGER, 29)
    //                         .write(Type.STRING, "bob")
    //                         .write(Type.STRING, "")
    //                         .write(Type.INTEGER, 0)
    //                         .write(Type.INTEGER, 0)
    //                         .write(Type.BYTE, 0)
    //                         .write(Type.BYTE, 0)
    //                         .write(Type.BYTE, 0)
    //                         .build());

    // b1.7.3
    await state.write(new ByteWriter()
                            .write(Type.BYTE, PacketType.LOGIN_REQUEST)
                            .write(Type.INTEGER, 14)
                            .write(Type.STRING, username)
                            .write(Type.LONG, BigInt(0))
                            .write(Type.BYTE, 0)
                            .build());
}

// await sleep(1.25 * 1000);
// await state.write(new ByteWriter()
//                         .write(Type.BYTE, PacketType.CHAT_MESSAGE)
//                         .write(Type.STRING, "hiya")
//                         .build());

Logger.log(Level.INFO, '(message) client -> server')
// await sleep(1 * 1000);
// await state.write(new ByteWriter()
//                         .write(Type.BYTE, PacketType.CHAT_MESSAGE)
//                         .write(Type.STRING, "/login alexisurmom")
//                         .build());

// await sleep(3 * 1000);

// Message
let ticks = 0;
while (true) {
    if (!state.isClosed()) {
        let data = new Uint8Array(ByteUtil.MAX_BYTES_ALLOWED);
        const data_len = await state.read(data) as number;
        data = data.slice(0, data_len);
        const reader = new ByteReader(data);
        if (data[0] != 0 && !reader.at_end()) {
            const packet_id = reader.read(Type.BYTE) as number;
            
            if (packet_id == PacketType.KICK_DISCONNECT) {
                state.close();
                console.log(reader.read(Type.STRING) as string);
                // await sleep(1 * 1000);
                // Deno.exit(0);
            }

            if (packet_id == PacketType.CHAT_MESSAGE) {
                const message = reader.read(Type.STRING) as string;
                console.log(message);
                if (!message.includes(username)) {
                    const parts = message.split(" ");
                    parts.shift();
                    await state.write(new ByteWriter()
                                            .write(Type.BYTE, PacketType.CHAT_MESSAGE)
                                            .write(Type.STRING, parts.join(''))
                                            .build());
                }
            }

            // console.log('SERVER SENT ' + PacketType[packet_id])
        }

        ticks++;
        if (ticks % 20 == 0) {
            await state.write(
                new ByteWriter()
                    .write(Type.BYTE, PacketType.KEEP_ALIVE)
                    .build()
            );
        }
    }
}
