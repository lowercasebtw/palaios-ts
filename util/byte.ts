// https://wiki.vg/Data_types

import { un_spaceify } from "./util.ts";

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
    BYTE,
    UNSIGNED_BYTE,
    STRING,
    VAR_INT,
    VAR_LONG
}

// https://wiki.vg/VarInt_And_VarLong
const SEGMENT_BITS = 0x7F;
const CONTINUE_BIT = 0x80;

// TODO: Very Big Chance, this function is severly wrong
function getBytesForNumberSized(num: number, size: number) {
    const bytes: number[] = [];
    let i = size;
    do {
        bytes[--i] = num & 255;
        num = num >> size;
    } while (i)
    return bytes;
}

export class ByteWriter {
    private _bytes: number[];
    public constructor() {
        this._bytes = [];
    }

    *[Symbol.iterator]() {
        for (let i = 0; i < this._bytes.length; ++i)
            yield this._bytes[i];
    }

    append(other: ByteWriter) {
        this._bytes.push(...other);
        return this;
    }

    write(type: Type, value: boolean | number | string) {
        switch (type) {
            case Type.BOOLEAN: {
                this._bytes.push((value as boolean) == false ? 0 : 1);
            } break;
            case Type.INT:
            case Type.FLOAT: {
                this._bytes.push(...getBytesForNumberSized((value as number), 4));
            } break;
            case Type.LONG:
            case Type.DOUBLE: {
                this._bytes.push(...getBytesForNumberSized((value as number), 8));
            } break;
            case Type.SHORT: {
                // this._bytes.push(...getBytesForNumberSized((value as number), 2));
                // TODO: Fix, ^ breaks it
                this._bytes.push((value as number), 0);
            } break;
            case Type.BYTE:
            case Type.UNSIGNED_BYTE: {
                this._bytes.push((value as number));
            } break;
            case Type.STRING: {
                const string = value as string;
                this.write(Type.SHORT, string.length);
                for (let i = 0; i < string.length; ++i) {
                    this.write(Type.BYTE, string[i].charCodeAt(0));
                    if (i != string.length - 1)
                        this.write(Type.BYTE, 0);
                }
            }  break;
            case Type.VAR_INT: 
            case Type.VAR_LONG: {
                while (true) {
                    if (((value as number) & ~SEGMENT_BITS) == 0) {
                        this.write(Type.BYTE, value);
                        return;
                    }
                    this.write(Type.BYTE, ((value as number) & SEGMENT_BITS) | CONTINUE_BIT);            
                    (value as number) >>>= 7;
                }
            }
            default: {
                throw new Error("unknown type to write");
            } 
        }
    }

    build() {
        return new Uint8Array(this._bytes);
    }

    async push(conn: Deno.Conn) {
        const writer = new ByteWriter();
        writer.append(this);
        return await conn.write(writer.build());
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

    read(type: Type): boolean | number | string {
        switch (type) {
            case Type.BOOLEAN: {
                return this.read(Type.BYTE) == 0 ? false : true;
            }
            case Type.INT:
            case Type.FLOAT: {
                let v = 0;
                for (let i = 0; i < 4; ++i)
                    v += this.read(Type.BYTE) as number;
                return v;
            }
            case Type.LONG:
            case Type.DOUBLE: {
                let v = 0;
                for (let i = 0; i < 8; ++i)
                    v += this.read(Type.BYTE) as number;
                return v;
            }
            case Type.SHORT: {
                let v = 0;
                for (let i = 0; i < 2; ++i)
                    v += this.read(Type.BYTE) as number;
                return v;
            }
            case Type.BYTE:
            case Type.UNSIGNED_BYTE: {
                return this._bytes[this._cursor++];
            }
            case Type.STRING: {
                const length = this.read(Type.SHORT) as number + 6;
                let string = "";
                for (let i = 0; i < length; ++i)
                    string += String.fromCharCode(this.read(Type.BYTE) as number);
                return un_spaceify(string);
            }
            case Type.VAR_INT: 
            case Type.VAR_LONG: {
                let value = 0;
                let position = 0;
                let currentByte: number;
                while (true) {
                    currentByte = this.read(Type.BYTE) as number;
                    value |= (currentByte & SEGMENT_BITS) << position;
                    if ((currentByte & CONTINUE_BIT) == 0) 
                        break;
                    position += 7;
                    if (position >= 32) 
                        throw new Error("VarInt is too big");
                }
                return value;
            }
            default: {
                throw new Error("unknown type to read");
            }
        }
    }

    readBytes(count: number): Uint8Array | null {
        if (this.length - this.cursor <= 0)
            return null;
        this._cursor += count;
        return this._bytes.slice(this._cursor - count, this._cursor);
    }
}