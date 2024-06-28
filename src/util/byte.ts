import { Buffer } from "https://deno.land/std@0.177.0/node/buffer.ts";

// https://wiki.vg/Data_types

export class ByteUtil {
    /**
     * Packets cannot be larger than 221 − 1 or 2097151 bytes 
     * (the maximum that can be sent in a 3-byte VarInt). 
     * Moreover, the length field must not be longer than 3 bytes, even if the encoded value 
     * is within the limit. Unnecessarily long encodings at 3 bytes or below are still allowed. 
     * For compressed packets, this applies to the Packet Length field, i.e. the compressed length.
     */
    static readonly MAX_BYTES_ALLOWED = 2097151;

    // TODO: wont need probably in the future
    // @Deprecated
    static as_bytes(bytes: string) {
        return new Uint8Array([...bytes].map(c => c.charCodeAt(0)));
    }

    // TODO: wont need probably in the future
    // @Deprecated
    static as_string(bytes: Uint8Array, null_terminated = false) {
        let string = "";
        for (let i = null_terminated ? 3 : 0; i < bytes.length; ++i)
            string += String.fromCharCode(bytes[i]);
        return string;
    }
}

export enum Type {
    BOOLEAN,
    INT,
    FLOAT,
    DOUBLE,
    LONG,
    SHORT,
    STRING,
    BYTE,
    UNSIGNED_BYTE,
    VAR_INT,
    VAR_LONG
}

// https://wiki.vg/VarInt_And_VarLong
const SEGMENT_BITS = 0x7F;
const CONTINUE_BIT = 0x80;

export class ByteWriter {
    private _bytes: number[];
    public constructor() {
        this._bytes = [];
    }

    get length() { return this._bytes.length; }
    
    *[Symbol.iterator]() {
        for (let i = 0; i < this._bytes.length; ++i)
            yield this._bytes[i];
    }

    append(other: ByteWriter | Uint8Array | number[]): ByteWriter {
        this._bytes.push(...other);
        return this;
    }

    write(type: Type, value: boolean | number | bigint | string): ByteWriter {
        switch (type) {
            case Type.BOOLEAN: {
                this._bytes.push((value as boolean) === false ? 0 : 1);
            } break;

            case Type.SHORT: {
                const buf = Buffer.alloc(2);
                buf.writeInt16BE(value as number);
                this.append(new Uint8Array(buf.buffer));
            } break;

            case Type.INT: {
                const buf = Buffer.alloc(4);
                buf.writeInt32BE(value as number);
                this.append(new Uint8Array(buf.buffer));
            } break;

            case Type.FLOAT: {
                const buf = Buffer.alloc(4);
                buf.writeFloatBE(value as number);
                this.append(new Uint8Array(buf.buffer));
            } break;

            case Type.DOUBLE: {
                const buf = Buffer.alloc(8);
                buf.writeDoubleBE(value as number);
                this.append(new Uint8Array(buf.buffer));
            } break;

            case Type.LONG: {
                const buf = Buffer.alloc(8);
                buf.writeBigInt64BE(value as bigint);
                this.append(new Uint8Array(buf.buffer));
            } break;

            case Type.STRING: {
                const message = value as string;
                this.write(Type.SHORT, message.length);
                for (let i = 0; i < message.length; ++i) {
                    this.write(Type.SHORT, message[i].charCodeAt(0));
                }
            } break;

            case Type.BYTE:
            case Type.UNSIGNED_BYTE: {
                this._bytes.push((value as number));
            } break;

            case Type.VAR_INT:
            case Type.VAR_LONG: {
                while (true) {
                    if (((value as number) & ~SEGMENT_BITS) === 0) {
                        this.write(Type.BYTE, value);
                        return this;
                    }
                    this.write(Type.BYTE, ((value as number) & SEGMENT_BITS) | CONTINUE_BIT);
                    (value as number) >>>= 7;
                }
            }

            default: throw new Error("unknown type to write");
        }

        return this;
    }

    build() {
        return new Uint8Array(this._bytes);
    }
}

export class ByteReader {
    private _cursor: number;
    private _bytes: Uint8Array;
    public constructor(bytes: Uint8Array) {
        this._cursor = 0;
        this._bytes = bytes;
    }

    at_end() { return this._cursor >= this._bytes.length; }

    get length() { return this._bytes.length; }

    get cursor() { return this._cursor; }

    read(type: Type): boolean | number | bigint | string {
        switch (type) {
            case Type.BOOLEAN: {
                return this.read(Type.BYTE) != 0;
            }

            case Type.SHORT: {
                const bytes = this.read_bytes(2);
                if (bytes === null)
                    throw new Error("Tried reading short, found null");
                return Buffer.from(bytes).readInt16BE();
            }

            case Type.INT: {
                const bytes = this.read_bytes(4);
                if (bytes === null)
                    throw new Error("Tried reading integer, found null");
                return Buffer.from(bytes).readInt32BE();
            }

            case Type.FLOAT: {
                const bytes = this.read_bytes(4);
                if (bytes === null)
                    throw new Error("Tried reading float, found null");
                return Buffer.from(bytes).readFloatBE();
            }

            case Type.DOUBLE: {
                const bytes = this.read_bytes(8);
                if (bytes === null)
                    throw new Error("Tried reading double, found null");
                return Buffer.from(bytes).readDoubleBE();
            }

            case Type.LONG: {
                const bytes = this.read_bytes(8);
                if (bytes === null)
                    throw new Error("Tried reading long, found null");
                return Buffer.from(bytes).readBigInt64BE(); // longs are bing int 64
            }

            case Type.STRING: {
                const length = this.read(Type.SHORT) as number;
                if (length === 0)
                    return "";
                let string = "";
                for (let i = 0; i < length; ++i) {
                    string += String.fromCharCode(this.read(Type.SHORT) as number);
                }
                return string;
            }

            case Type.BYTE:
            case Type.UNSIGNED_BYTE: {
                return this._bytes[this._cursor++];
            }

            case Type.VAR_INT:
            case Type.VAR_LONG: {
                let value = 0;
                let position = 0;
                let currentByte: number;
                while (true) {
                    currentByte = this.read(Type.BYTE) as number;
                    value |= (currentByte & SEGMENT_BITS) << position;
                    if ((currentByte & CONTINUE_BIT) === 0)
                        break;
                    position += 7;
                    if (position >= 32)
                        throw new Error("VarInt is too big");
                }
                return value;
                // const bytes = this.read_bytes(8);
                // return Buffer.from(bytes).readBigInt64BE(); // longs are bing int 64
            }

            default: throw new Error("unknown type to read");
        }
    }

    read_bytes(count: number): Uint8Array | null {
        if (this._cursor + count > this._bytes.length)
            return null;
        const bytes = this._bytes.slice(this._cursor, this._cursor + count);
        this._cursor += count;
        return bytes;
    }
}