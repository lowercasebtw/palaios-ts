import { Buffer } from "https://deno.land/std@0.177.0/node/buffer.ts";

// https://wiki.vg/Data_types

/**
 * Packets cannot be larger than 221 − 1 or 2097151 bytes
 * (the maximum that can be sent in a 3-byte VarInt).
 * Moreover, the length field must not be longer than 3 bytes, even if the encoded value
 * is within the limit. Unnecessarily long encodings at 3 bytes or below are still allowed.
 * For compressed packets, this applies to the Packet Length field, i.e. the compressed length.
 */
export const MAX_BYTES_ALLOWED = 2097151;

export type int = number;
export type byte = number;
export type float = number;
export type double = number;
export type long = bigint;
export type short = number;

export class ReadableBuffer {
	private readonly bytes: Uint8Array;
	public cursor: number;

	constructor(bytes: Uint8Array) {
		this.bytes = bytes;
		this.cursor = 0;
	}

	get size() {
		return this.bytes.length;
	}

	atEnd() {
		return this.cursor >= this.bytes.length;
	}

	read() {
		return this.bytes[this.cursor++];
	}

	reads(count: number) {
		const bytes = this.bytes.slice(this.cursor, this.cursor + count);
		this.cursor += count;
		return bytes;
	}
}

export class WritableBuffer {
	private readonly bytes: number[];

	constructor() {
		this.bytes = [];
	}

	get size() {
		return this.bytes.length;
	}

	write(...values: byte[]) {
		for (const byte of values) {
			this.bytes.push(byte);
		}
	}

	build() {
		return new Uint8Array(this.bytes);
	}
}

export abstract class Type<T> {
	abstract read(buffer: ReadableBuffer): T;
	abstract readLE(buffer: ReadableBuffer): T;
	abstract write(buffer: WritableBuffer, value: T): WritableBuffer;
}

class BooleanType implements Type<boolean> {
	read(buffer: ReadableBuffer): boolean {
		return buffer.read() != 0;
	}

	readLE(buffer: ReadableBuffer): boolean {
		return this.read(buffer);
	}

	write(buffer: WritableBuffer, value: boolean): WritableBuffer {
		buffer.write(value ? 1 : 0);
		return buffer;
	}
}

class ByteType implements Type<byte> {
	read(buffer: ReadableBuffer): byte {
		return Types.UNSIGNED_BYTE.read(buffer) & 255;
	}

	readLE(buffer: ReadableBuffer): byte {
		return this.read(buffer);
	}

	write(buffer: WritableBuffer, value: byte): WritableBuffer {
		return Types.UNSIGNED_BYTE.write(buffer, value & 255);
	}
}

class UnsignedByteType implements Type<byte> {
	read(buffer: ReadableBuffer): byte {
		return buffer.read();
	}

	readLE(buffer: ReadableBuffer): byte {
		return this.read(buffer);
	}

	write(buffer: WritableBuffer, value: byte): WritableBuffer {
		buffer.write(value);
		return buffer;
	}
}

class ShortType implements Type<short> {
	read(buffer: ReadableBuffer): short {
		return Types.UNSIGNED_SHORT.read(buffer) & 32767;
	}

	readLE(buffer: ReadableBuffer): short {
		return this.read(buffer);
	}

	write(buffer: WritableBuffer, value: short): WritableBuffer {
		return Types.UNSIGNED_SHORT.write(buffer, value & 32767);
	}
}

class UnsignedShortType implements Type<short> {
	read(buffer: ReadableBuffer): short {
		return Buffer.from(buffer.reads(2)).readInt16BE();
	}

	readLE(buffer: ReadableBuffer): short {
		return Buffer.from(buffer.reads(2)).readInt16LE();
	}

	write(buffer: WritableBuffer, value: short): WritableBuffer {
		const buf = Buffer.alloc(2);
		buf.writeInt16BE(value);
		for (const byte of new Uint8Array(buf)) {
			buffer.write(byte);
		}
		return buffer;
	}
}

class IntegerType implements Type<int> {
	read(buffer: ReadableBuffer): int {
		return Buffer.from(buffer.reads(4)).readInt32BE();
	}

	readLE(buffer: ReadableBuffer): int {
		return Buffer.from(buffer.reads(4)).readInt32LE();
	}

	write(buffer: WritableBuffer, value: int): WritableBuffer {
		const buf = Buffer.alloc(4);
		buf.writeInt32BE(value);
		for (const byte of new Uint8Array(buf)) {
			buffer.write(byte);
		}
		return buffer;
	}
}

class FloatType implements Type<float> {
	read(buffer: ReadableBuffer): float {
		return Buffer.from(buffer.reads(4)).readFloatBE();
	}

	readLE(buffer: ReadableBuffer): float {
		return Buffer.from(buffer.reads(4)).readFloatLE();
	}

	write(buffer: WritableBuffer, value: float): WritableBuffer {
		const buf = Buffer.alloc(4);
		buf.writeFloatBE(value);
		for (const byte of new Uint8Array(buf)) {
			buffer.write(byte);
		}
		return buffer;
	}
}

class LongType implements Type<long> {
	read(buffer: ReadableBuffer): long {
		return Buffer.from(buffer.reads(8)).readBigInt64BE(); // longs are bing int 64
	}

	readLE(buffer: ReadableBuffer): long {
		return Buffer.from(buffer.reads(8)).readBigInt64LE();
	}

	write(buffer: WritableBuffer, value: long): WritableBuffer {
		const buf = Buffer.alloc(8);
		buf.writeBigInt64BE(value);
		for (const byte of new Uint8Array(buf)) {
			buffer.write(byte);
		}
		return buffer;
	}
}

class DoubleType implements Type<double> {
	read(buffer: ReadableBuffer): double {
		return Buffer.from(buffer.reads(8)).readDoubleBE();
	}

	readLE(buffer: ReadableBuffer): double {
		return Buffer.from(buffer.reads(8)).readDoubleLE();
	}

	write(buffer: WritableBuffer, value: double): WritableBuffer {
		const buf = Buffer.alloc(8);
		buf.writeDoubleBE(value);
		for (const byte of new Uint8Array(buf)) {
			buffer.write(byte);
		}
		return buffer;
	}
}

// https://wiki.vg/VarInt_And_VarLong
const SEGMENT_BITS = 0x7f;
const CONTINUE_BIT = 0x80;

class VarIntType implements Type<number> {
	read(buffer: ReadableBuffer): number {
		let value = 0;
		let position = 0;
		let currentByte: number;
		while (true) {
			currentByte = Types.BYTE.read(buffer);
			value |= (currentByte & SEGMENT_BITS) << position;
			if ((currentByte & CONTINUE_BIT) === 0) break;
			position += 7;
			if (position >= 32) throw new Error("VarInt is too big");
		}
		return value;
	}

	readLE(buffer: ReadableBuffer): number {
		return this.read(buffer);
	}

	write(buffer: WritableBuffer, value: number): WritableBuffer {
		while (true) {
			if (((value as number) & ~SEGMENT_BITS) === 0) {
				Types.BYTE.write(buffer, value);
				return buffer;
			}
			Types.BYTE.write(
				buffer,
				((value as number) & SEGMENT_BITS) | CONTINUE_BIT,
			);
			(value as number) >>>= 7;
		}
	}
}

class VarLongType implements Type<bigint> {
	read(buffer: ReadableBuffer): bigint {
		let value = 0n;
		let position = 0;
		let currentByte: number;
		while (true) {
			currentByte = Types.BYTE.read(buffer);
			value |= BigInt((currentByte & SEGMENT_BITS) << position);
			if ((currentByte & CONTINUE_BIT) === 0) break;
			position += 7;
			if (position >= 64) throw new Error("VarLong is too big");
		}
		return value;
	}

	readLE(buffer: ReadableBuffer): bigint {
		return this.read(buffer);
	}

	write(buffer: WritableBuffer, value: bigint): WritableBuffer {
		throw new Error("TODO: var long");
	}
}

const Types = Object.freeze({
	BOOLEAN: new BooleanType(),
	BYTE: new ByteType(),
	UNSIGNED_BYTE: new UnsignedByteType(),
	SHORT: new ShortType(),
	UNSIGNED_SHORT: new UnsignedShortType(),
	INTEGER: new IntegerType(),
	FLOAT: new FloatType(),
	LONG: new LongType(),
	DOUBLE: new DoubleType(),
	VAR_INT: new VarIntType(),
	VAR_LONG: new VarLongType(),
});

export default Types;
