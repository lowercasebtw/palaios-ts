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
    BYTE,
    STRING,
    VAR_INT,
    VAR_LONG
}

// https://wiki.vg/VarInt_And_VarLong
const SEGMENT_BITS = 0x7F;
const CONTINUE_BIT = 0x80;

export class ByteWriter {
    private bytes: number[];
    public constructor() {
        this.bytes = [];
    }

    *[Symbol.iterator]() {
        for (let i = 0; i < this.bytes.length; ++i)
            yield this.bytes[i];
    }

    append(other: ByteWriter) {
        this.bytes.push(...other);
        return this;
    }

    write(type: Type, value: number | string) {
        switch (type) {
            case Type.BYTE: {
                this.bytes.push((value as number), 0x00); // 0x00 is WRONG
            } break;
            case Type.STRING: {
                const length = (value as string).length;
                const buf = new ArrayBuffer(length * 2);
                const bufView = new Uint16Array(buf);
                for (let i = 0, strLen = length; i < strLen; i++) 
                    bufView[i] = (value as string).charCodeAt(i);
                const bytes = new Uint8Array(buf);
                this.bytes.push(...bytes.slice(0, bytes.length - 1));
            } break;
            case Type.VAR_INT: 
            case Type.VAR_LONG: {
                while (true) {
                    if (((value as number) & ~SEGMENT_BITS) == 0) {
                        this.bytes.push((value as number));
                        return;
                    }
                    this.bytes.push(((value as number) & SEGMENT_BITS) | CONTINUE_BIT);
                    (value as number) >>>= 7;
                }
            }
            default: {
                throw new Error("unknown type to write");
            } 
        }
    }

    build() {
        return new Uint8Array(this.bytes);
    }

    async push(conn: Deno.Conn, prepend_length = true) {
        const writer = new ByteWriter();
        if (prepend_length)
            writer.write(Type.VAR_INT, this.bytes.length);
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

    read(type: Type): number | string {
        switch (type) {
            case Type.BYTE: {
                return this.at_end() ? 0 : this._bytes[this._cursor++];
            }
            case Type.STRING: {
                // wrong
                const length = this.read(Type.BYTE) as number;
                let str = "";
                for (let i = 0; i < length; ++i)
                    str += String.fromCharCode(this.read(Type.BYTE) as number);
                return str;
            }
            case Type.VAR_INT: 
            case Type.VAR_LONG: {
                let value = 0;
                let position = 0;
                let currentByte;
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