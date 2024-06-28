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
		return Buffer.from(this.read(2)).readInt16BE();
    }

    read_integer() {
        return Buffer.from(this.read(4)).readInt32BE();
    }

    read_float() {
        return Buffer.from(this.read(4)).readFloatBE();
    }

    read_double() {
        return Buffer.from(this.read(8)).readDoubleBE();
    }

    read_long() {
        return Buffer.from(this.read(8)).readBigInt64BE(); // longs are bing int 64
    }

    read_string() {
        const length = this.read_short();
        const bytes = this.read(length);
        return String.fromCharCode(...bytes);
    }

    read_byte() {
        return this.read(1)[0];
    }

    read(size: number) {
        if (this._cursor + size > this._bytes.length)
            throw new Error("Index out of bounds");
        const bytes = new Uint8Array(this._bytes.slice(this._cursor, this._cursor + size));
        this._cursor += size;
        return bytes;
    }
}

export class ByteWriter {
    private _bytes: number[];
    constructor() {
        this._bytes = [];
    }

    append(other: Uint8Array | number[]): ByteWriter {
        this._bytes.push(...other);
        return this;
    }

    write_short(value: number): ByteWriter {
        const buffer = Buffer.alloc(2);
        buffer.writeInt16BE(value);
        this.append(new Uint8Array(buffer));
        return this;
    }
    
    write_integer(value: number): ByteWriter {
        const buffer = Buffer.alloc(4);
        buffer.writeInt32BE(value);
        this.append(new Uint8Array(buffer));
        return this;
    }

    write_float(value: number): ByteWriter {
        const buffer = Buffer.alloc(4);
        buffer.writeFloatBE(value);
        this.append(new Uint8Array(buffer));
        return this;
    }

    write_double(value: number): ByteWriter {
        const buffer = Buffer.alloc(8);
        buffer.writeDoubleBE(value);
        this.append(new Uint8Array(buffer));
        return this;
    }

    write_long(value: bigint): ByteWriter {
        const buffer = Buffer.alloc(8);
        buffer.writeBigInt64BE(value);
        this.append(new Uint8Array(buffer));
        return this;
    }

    write_string(value: string | null): ByteWriter {
        if (value === null || value.length === 0)
            return this;
        this.write_short(value.length);
        for (const byte of value.split('').map(c => c.charCodeAt(0))) {
            this.write_byte(byte);
        }
        return this;
    }

    write_byte(value: number): ByteWriter {
        this._bytes.push(value);
        return this;
    }

    build(): Uint8Array {
        return new Uint8Array(this._bytes);
    }
}