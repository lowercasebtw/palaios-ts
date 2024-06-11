import { ByteUtil } from "./byte.ts";

export default class ClientConnection {
    private static LAST_CONNECTION_ID = 0;

    private _id: number;
    private _connection: Deno.Conn;
    private _handler_id: number | null;
    
    public constructor(connection: Deno.Conn) {
        this._id = ClientConnection.LAST_CONNECTION_ID++;
        this._connection = connection;
        this._handler_id = null;
    }

    get id() { return this._id; }

    get writable() { return this._connection.writable.locked; }

    get address() { return (this._connection.localAddr as Deno.NetAddr); }

    disconnect() {
        if (this._handler_id != null)
            clearInterval(this._handler_id);
        this._connection.close();
        this._id = -1;
    }

    setHandler(handler_id: number) {
        if (this._handler_id != null)
            clearInterval(this._handler_id);
        this._handler_id = handler_id;
    }

    async read(read_bytes_count: number = ByteUtil.MAX_BYTES_ALLOWED) {
        if (read_bytes_count <= 0) 
            return new Uint8Array;
        const array = new Uint8Array(read_bytes_count);
        const byte_count = await this._connection.read(array) as number;
        return array.slice(0, byte_count);
    }

    async write(bytes: Uint8Array) {
        await this._connection.write(bytes);
    }
}