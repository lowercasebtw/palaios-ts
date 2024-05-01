import { ByteUtil } from "./byte.ts";

export default class ClientConnection {
    private static LAST_CONNECTION_ID = 0;

    private _id: number;
    private _connection: Deno.Conn;
    private _handler_id: number | null;
    private _closed: boolean;
    
    public constructor(connection: Deno.Conn) {
        this._id = ClientConnection.LAST_CONNECTION_ID++;
        this._connection = connection;
        this._handler_id = null;
        this._closed = false;
    }

    get id() { return this._id; }

    get writable() { return this._connection.writable; }

    get address() { return (this._connection.localAddr as Deno.NetAddr); }

    disconnect() {
        if (this._handler_id != null)
            clearInterval(this._handler_id);
        this._connection.close();
        this._closed = true;
    }

    isOpen() {
        return this._closed;
    }

    setHandler(handler_id: number) {
        if (this._handler_id != null)
            clearInterval(this._handler_id);
        this._handler_id = handler_id;
    }

    async read() {
        // if (!this.isOpen())
        //     throw new Error("Connection is closed.");
        const array = new Uint8Array(ByteUtil.MAX_BYTES_ALLOWED);
        const byte_count = await this._connection.read(array) as number;
        return array.slice(0, byte_count);
    }

    async write(bytes: Uint8Array) {
        // if (!this.isOpen())
        //     throw new Error("Connection is closed.");
        if (!this.writable)
            throw new Error("Client is not writable.");
        await this._connection.write(bytes);
    }
}