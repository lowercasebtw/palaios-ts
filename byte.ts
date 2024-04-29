// https://wiki.vg/VarInt_And_VarLong

const SEGMENT_BITS = 0x7F;
const CONTINUE_BIT = 0x80;

/**
 * Packets cannot be larger than 221 − 1 or 2097151 bytes 
 * (the maximum that can be sent in a 3-byte VarInt). 
 * Moreover, the length field must not be longer than 3 bytes, even if the encoded value 
 * is within the limit. Unnecessarily long encodings at 3 bytes or below are still allowed. 
 * For compressed packets, this applies to the Packet Length field, i.e. the compressed length.
 */
export const MAX_BYTES_ALLOWED = 2097151; 

export class ByteWriter {
    private bytes: number[];
    private prepend_length: boolean;
    public constructor(prepend_length: boolean) {
        this.bytes = [];
        this.prepend_length = prepend_length;
    }

    *[Symbol.iterator]() {
        for (let i = 0; i < this.bytes.length; ++i)
            yield this.bytes[i];
    }

    append(other: ByteWriter) {
        this.bytes.push(...other);
        return this;
    }

    writeByte(value: number) {
        this.bytes.push(value);
        // TODO: is a temp fix?
        this.bytes.push(0x00);
    }

    writeString(data: string) {
        // TODO: this is wrong. needs to be rewritten
        const arr: number[] = [];
        for (let i = 0; i < data.length; ++i) {
            arr.push(data[i].charCodeAt(0));
            if (i != data.length)
                arr.push(0x00);
        }
        this.bytes.push(...arr);
    }

    writeVarInt(value: number) {
        while (true) {
            if ((value & ~SEGMENT_BITS) == 0) {
                this.bytes.push(value);
                return;
            }
    
            this.bytes.push((value & SEGMENT_BITS) | CONTINUE_BIT);
    
            // Note: >>> means that the sign bit is shifted with the rest of the number rather than being left alone
            value >>>= 7;
        }
    }

    // TODO: could be wrong
    writeVarLong = this.writeVarInt;

    build() {
        return new Uint8Array(this.bytes);
    }

    async write(conn: Deno.Conn) {
        const writer = new ByteWriter(false);
        if (this.prepend_length)
            writer.writeVarInt(this.bytes.length);
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

    readByte(): number {
        return this.at_end() ? 0 : this._bytes[this._cursor++];
    }

    readString(): string {
        const length = this.readVarInt();
        let str = "";
        for (let i = 0; i < length; ++i)
            str += String.fromCharCode(this.readByte());
        return str;
    }

    readVarInt(): number {
        let value = 0;
        let position = 0;
        let currentByte;
        while (true) {
            currentByte = this.readByte();
            value |= (currentByte & SEGMENT_BITS) << position;
            if ((currentByte & CONTINUE_BIT) == 0) 
                break;
            position += 7;
            if (position >= 32) 
                throw new Error("VarInt is too big");
        }
        return value;
    }

    // TODO: could be wrong
    readVarLong = this.readVarInt;

    read(count: number): Uint8Array | null {
        if (this.length - this.cursor <= 0)
            return null;
        this._cursor += count;
        return this._bytes.slice(this._cursor - count, this._cursor);
    }
}