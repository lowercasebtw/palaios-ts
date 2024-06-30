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
    SHORT,
    INTEGER,
    FLOAT,
    DOUBLE,
    LONG,
    STRING,
    BYTE,
    UNSIGNED_BYTE,
    VAR_INT,
    VAR_LONG
}

// https://wiki.vg/VarInt_And_VarLong
const SEGMENT_BITS = 0x7F;
const CONTINUE_BIT = 0x80;

export class ByteReader {
    private _bytes: number[];
    private _cursor: number;
    public constructor(bytes: number[] | Uint8Array) {
        this._bytes = (bytes instanceof Uint8Array ? [...bytes] : bytes);
        this._cursor = 0;
    }

    get cursor() { return this._cursor; }

    at_end() { return this._cursor >= this._bytes.length; }

    read(type: Type): boolean | number | bigint | string {
        switch (type) {
            case Type.BOOLEAN: {
                return this.read(Type.BYTE) != 0;
            }

            case Type.SHORT: return Buffer.from(this.read_bytes(2)).readInt16BE();
            case Type.INTEGER: return Buffer.from(this.read_bytes(4)).readInt32BE();
            case Type.FLOAT: return Buffer.from(this.read_bytes(4)).readFloatBE();
            case Type.DOUBLE: return Buffer.from(this.read_bytes(8)).readDoubleBE();
            case Type.LONG: return Buffer.from(this.read_bytes(8)).readBigInt64BE(); // longs are bing int 64

            case Type.STRING: {
                const length = this.read(Type.SHORT) as number;
                if (length === 0)
                    return "";
                let string = "";
                for (let i = 0; i < length; ++i)
                    string += String.fromCharCode(this.read(Type.SHORT) as number);
                return string;
            }

            case Type.BYTE:
            case Type.UNSIGNED_BYTE: {
                return this.read_bytes(1)[0];
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
            }

            default: {
                throw new Error("Failed to read. Unknown type: " + type);
            }
        }
    }

    read_bytes(size: number) {
        if (this._cursor + size > this._bytes.length)
            throw new Error("Index out of bounds");
        const bytes = new Uint8Array(this._bytes.slice(this._cursor, this._cursor + size));
        this._cursor += size;
        return bytes;
    }
}

export class ByteWriter {
    private _bytes: number[];
    public constructor() {
        this._bytes = [];
    }

    get length() { return this._bytes.length; }
    
    append(other: ByteWriter | Uint8Array | number[]): ByteWriter {
        this._bytes.push(...(other instanceof ByteWriter ? other.build() : other));
        return this;
    }

    write(type: Type, value: boolean | number | bigint | string): ByteWriter {
        switch (type) {
            case Type.BOOLEAN: {
                this._bytes.push((value as boolean) === false ? 0 : 1);
            } break;

            case Type.SHORT: {
                const buffer = Buffer.alloc(2);
                buffer.writeInt16BE(value as number);
                this.append(new Uint8Array(buffer));
            } break;

            case Type.INTEGER: {
                const buffer = Buffer.alloc(4);
                buffer.writeInt32BE(value as number);
                this.append(new Uint8Array(buffer));
            } break;

            case Type.FLOAT: {
                const buffer = Buffer.alloc(4);
                buffer.writeFloatBE(value as number);
                this.append(new Uint8Array(buffer));
            } break;

            case Type.DOUBLE: {
                const buffer = Buffer.alloc(8);
                buffer.writeDoubleBE(value as number);
                this.append(new Uint8Array(buffer));
            } break;

            case Type.LONG: {
                const buffer = Buffer.alloc(8);
                buffer.writeBigInt64BE(value as bigint);
                this.append(new Uint8Array(buffer));
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

// NBT
export class NBTByteReader {
    private _bytes: number[];
    private _cursor: number;
    constructor(bytes: number[] | Uint8Array) {
        this._bytes = (bytes instanceof Uint8Array ? [...bytes] : bytes);
        this._cursor = 0;
    }

    get cursor() { return this._cursor; }

    at_end() { return this._cursor >= this._bytes.length; }

    read(type: Type): number | bigint | string {
        switch (type) {
            case Type.SHORT: return Buffer.from(this.read_bytes(2)).readInt16BE();
            case Type.INTEGER: return Buffer.from(this.read_bytes(4)).readInt32BE();
            case Type.FLOAT: return Buffer.from(this.read_bytes(4)).readFloatBE();
            case Type.DOUBLE: return Buffer.from(this.read_bytes(8)).readDoubleBE();
            case Type.LONG: return Buffer.from(this.read_bytes(8)).readBigInt64BE(); // longs are bing int 64
            case Type.BYTE: return this.read_bytes(1)[0];
            case Type.STRING: {
                const length = this.read(Type.SHORT) as number;
                const bytes = this.read_bytes(length);
                return String.fromCharCode(...bytes);
            }
            default: {
                throw new Error("Failed to read. Unknown type: " + type);
            }
        }
    }

    read_bytes(size: number) {
        if (this._cursor + size > this._bytes.length)
            throw new Error("Index out of bounds");
        const bytes = new Uint8Array(this._bytes.slice(this._cursor, this._cursor + size));
        this._cursor += size;
        return bytes;
    }
}

export class NBTByteWriter {
    private _bytes: number[];
    constructor() {
        this._bytes = [];
    }

    append(other: Uint8Array | number[]): NBTByteWriter {
        this._bytes.push(...other);
        return this;
    }

    write(type: Type, value: number | bigint | string): NBTByteWriter {
        switch (type) {
            case Type.SHORT: {
                const buffer = Buffer.alloc(2);
                buffer.writeInt16BE(value as number);
                this.append(new Uint8Array(buffer));
                return this;
            }
            
            case Type.INTEGER: {
                const buffer = Buffer.alloc(4);
                buffer.writeInt32BE(value as number);
                this.append(new Uint8Array(buffer));
                return this;
            }
            
            case Type.FLOAT: {
                const buffer = Buffer.alloc(4);
                buffer.writeFloatBE(value as number);
                this.append(new Uint8Array(buffer));
                return this;
            }
            
            case Type.DOUBLE: {
                const buffer = Buffer.alloc(8);
                buffer.writeDoubleBE(value as number);
                this.append(new Uint8Array(buffer));
                return this;
            }
            
            // NOTE: Longs are Big Int 64
            case Type.LONG: {
                const buffer = Buffer.alloc(8);
                buffer.writeBigInt64BE(value as bigint);
                this.append(new Uint8Array(buffer));
                return this;
            }

            case Type.BYTE: {
                this._bytes.push(value as number);
                return this;
            }
            
            case Type.STRING: {
                if (!(typeof value === "string"))
                    throw new Error("ByteWriter tried to write a string, but got something that wasn't a string.");
                if (value === null || value.length === 0)
                    return this; // Skip it
                this.write(Type.SHORT, value.length);
                for (const byte of value.split('').map(c => c.charCodeAt(0))) {
                    this.write(Type.BYTE, byte);
                }
                return this;
            }

            default: {
                throw new Error("Failed to read. Unknown type: " + type);
            }
        }
    }

    build() {
        return new Uint8Array(this._bytes);
    }
}