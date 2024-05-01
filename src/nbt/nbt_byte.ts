import { Buffer } from "https://deno.land/std@0.177.0/node/buffer.ts";

export class ByteReader {
    private _bytes: number[];
    private _cursor: number;

    constructor(bytes: number[] | Uint8Array) {
        this._bytes = (bytes instanceof Uint8Array ? [...bytes] : bytes);
        this._cursor = 0;
    }

    get cursor() { return this._cursor; }

    get bytes() { return this._bytes; }

    at_end() { return this._cursor >= this._bytes.length; }

    read_short() {
        const bytes = this.read_bytes(2);
		return Buffer.from(bytes).readInt16BE();
    }

    read_integer() {
        const bytes = this.read_bytes(4);
		return Buffer.from(bytes).readInt32BE();
    }

    read_float() {
        const bytes = this.read_bytes(4);
		return Buffer.from(bytes).readFloatBE();
    }

    read_double() {
        const bytes = this.read_bytes(8);
		return Buffer.from(bytes).readDoubleBE();
    }

    read_long() {
        const bytes = this.read_bytes(8);
		return Buffer.from(bytes).readBigInt64BE(); // longs are bing int 64
    }

    read_string() {
        const length = this.read_short();
        const bytes = this.read_bytes(length);
        return String.fromCharCode(...bytes);
    }

    read_byte() {
        return this._bytes[this._cursor++];
    }

    read_bytes(size: number) {
        const bytes = new Uint8Array(this._bytes.slice(this._cursor, this._cursor + size));
        this._cursor += size;
        return bytes;
    }
}