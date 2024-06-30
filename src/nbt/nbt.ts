import * as pako from "https://deno.land/x/pako@v2.0.3/pako.js";
import { ByteReader, ByteWriter, Type } from "../util/byte.ts";

function write_nbt_string(writer: ByteWriter, value: any) {
    if (!(typeof value === "string"))
        throw new Error("ByteWriter tried to write a string, but got something that wasn't a string.");
    if (value === null || value.length === 0)
        return writer; // Skip it
    writer.write(Type.SHORT, value.length);
    for (const byte of value.split('').map(c => c.charCodeAt(0))) {
        writer.write(Type.BYTE, byte);
    }
    return writer;
}

function read_nbt_string(reader: ByteReader) {
    const length = reader.read(Type.SHORT) as number;
    const bytes = reader.read_bytes(length);
    return String.fromCharCode(...bytes);
}

export enum NBT_Type {
	END,
	BYTE,
	SHORT,
	INTEGER,
	LONG,
	FLOAT,
	DOUBLE,
	BYTE_ARRAY,
	STRING,
	LIST,
	COMPOUND,
	INTEGER_ARRAY,
	LONG_ARRAY
}

function read_name(reader: ByteReader, should_read_name: boolean) {
	return !should_read_name ? null : read_nbt_string(reader);
}

export abstract class NBT_Tag {
	public constructor(public name: string | null = null) {}
	static from_reader(_reader: ByteReader, _should_read_name: boolean): NBT_Tag {
		throw new Error("TODO: Implement from_reader for this tag");
	}
	abstract to_bytes(): Uint8Array;
}

export class NBT_End extends NBT_Tag {
	public constructor(public readonly name: string = "") {
		super();
	}

	static from_reader(reader: ByteReader, _should_read_name: boolean) {
		const name = read_name(reader, false); // TODO: Shouldn't have a name supposidely?
		return new NBT_End(name!);
	}

	override to_bytes() {
		const writer = new ByteWriter();
		writer.write(Type.BYTE, NBT_Type.END);
		return writer.build();
	}
}

export class NBT_Byte extends NBT_Tag {
	public constructor(public readonly name: string | null, public readonly value: number) {
		super();
	}

	static from_reader(reader: ByteReader, should_read_name: boolean) {
		const name = read_name(reader, should_read_name);
		const byte = reader.read(Type.BYTE) as number;
		return new NBT_Byte(name, byte);
	}

	override to_bytes() {
		const writer = new ByteWriter();
		writer.write(Type.BYTE, NBT_Type.BYTE);
		write_nbt_string(writer, this.name!);
		writer.write(Type.BYTE, this.value);
		return writer.build();
	}
}

export class NBT_Short extends NBT_Tag {
	public constructor(public readonly name: string | null, public readonly value: number) {
		super();
	}

	static from_reader(reader: ByteReader, should_read_name: boolean) {
		const name = read_name(reader, should_read_name);
		return new NBT_Short(name, reader.read(Type.SHORT) as number);
	}

	override to_bytes() {
		const writer = new ByteWriter();
		writer.write(Type.BYTE, NBT_Type.SHORT);
		write_nbt_string(writer, this.name!);
		writer.write(Type.SHORT, this.value);
		return writer.build();
	}
}

export class NBT_Integer extends NBT_Tag {
	public constructor(public readonly name: string | null, public readonly value: number) {
		super();
	}

	static from_reader(reader: ByteReader, should_read_name: boolean) {
		const name = read_name(reader, should_read_name);
		const value = reader.read(Type.INTEGER) as number;
		return new NBT_Integer(name, value);
	}

	override to_bytes() {
		const writer = new ByteWriter();
		writer.write(Type.BYTE, NBT_Type.INTEGER);
		write_nbt_string(writer, this.name!);
		writer.write(Type.INTEGER, this.value);
		return writer.build();
	}
}

export class NBT_Long extends NBT_Tag {
	public constructor(public readonly name: string | null, public readonly value: bigint) {
		super();
	}

	static from_reader(reader: ByteReader, should_read_name: boolean) {
		const name = read_name(reader, should_read_name);
		const value = reader.read(Type.LONG) as bigint;
		return new NBT_Long(name, value);
	}

	override to_bytes() {
		const writer = new ByteWriter();
		writer.write(Type.BYTE, NBT_Type.LONG);
		write_nbt_string(writer, this.name!);
		writer.write(Type.LONG, this.value);
		return writer.build();
	}
}

export class NBT_Float extends NBT_Tag {
	public constructor(public readonly name: string | null, public readonly value: number) {
		super();
	}

	static from_reader(reader: ByteReader, should_read_name: boolean) {
		const name = read_name(reader, should_read_name);
		const value = reader.read(Type.FLOAT) as number;
		return new NBT_Float(name, value);
	}

	override to_bytes() {
		const writer = new ByteWriter();
		writer.write(Type.BYTE, NBT_Type.FLOAT);
		write_nbt_string(writer, this.name!);
		writer.write(Type.FLOAT, this.value);
		return writer.build();
	}
}

export class NBT_Double extends NBT_Tag {
	public constructor(public readonly name: string | null, public readonly value: number) {
		super();
	}

	static from_reader(reader: ByteReader, should_read_name: boolean) {
		const name = read_name(reader, should_read_name);
		const value = reader.read(Type.DOUBLE) as number;
		return new NBT_Double(name, value);
	}

	override to_bytes() {
		const writer = new ByteWriter();
		writer.write(Type.BYTE, NBT_Type.DOUBLE);
		write_nbt_string(writer, this.name!);
		writer.write(Type.DOUBLE, this.value);
		return writer.build();
	}
}

export class NBT_Byte_Array extends NBT_Tag {
	public constructor(public readonly name: string | null, public readonly size: number, public readonly bytes: Uint8Array) {
		super();
	}

	static from_reader(reader: ByteReader, should_read_name: boolean) {
		const name = read_name(reader, should_read_name);
		const size = reader.read(Type.INTEGER) as number;
		const bytes = reader.read_bytes(size);
		return new NBT_Byte_Array(name, size, bytes);
	}

	override to_bytes() {
		const writer = new ByteWriter().write(Type.BYTE, NBT_Type.BYTE_ARRAY);
		write_nbt_string(writer, this.name!);
		writer.write(Type.INTEGER, this.size);
		writer.append(this.bytes);
		return writer.build();
	}
}

export class NBT_String extends NBT_Tag {
	public constructor(public readonly name: string | null, public readonly value: string) {
		super();
	}

	static from_reader(reader: ByteReader, should_read_name: boolean) {
		const name = read_name(reader, should_read_name);
		const value = read_nbt_string(reader);
		return new NBT_String(name, value);
	}

	override to_bytes() {
		const writer = new ByteWriter().write(Type.BYTE, NBT_Type.STRING);
		write_nbt_string(writer, this.name!);
		write_nbt_string(writer, this.value);
		return writer.build();
	}
}

export class NBT_List extends NBT_Tag {
	public constructor(
		public readonly name: string | null,
		public readonly type_id: number,
		public readonly size: number,
		public readonly tags: NBT_Tag[]
	) {
		super();
	}

	static from_reader(reader: ByteReader, should_read_name: boolean) {
		const name = read_name(reader, should_read_name);
		const type_id = reader.read(Type.BYTE) as number;
		const size = reader.read(Type.INTEGER) as number;
		const tags: NBT_Tag[] = new Array(size).fill(null).map(_ => read_nbt_tag(reader, false, type_id));
		return new NBT_List(name, type_id, size, tags);
	}

	override to_bytes() {
		if (this.size != this.tags.length) {
			throw new Error("NBT List has inconsistent size than the length of tags it contains.");
		}
		const writer = new ByteWriter;
		writer.write(Type.BYTE, NBT_Type.LIST);
		write_nbt_string(writer, this.name!);
		writer.write(Type.BYTE, this.type_id);
		writer.write(Type.INTEGER, this.size);
		for (const tag of this.tags) {
			// NOTE: In a list, there is no need for the type id as they should all be the same in a list
			const bytes = [...tag.to_bytes()];
			const type_id = bytes.shift();
			if (type_id != this.type_id) {
				throw new Error("NBT List contains a different type than the list type.");
			}
			writer.append(bytes);
		}
		return writer.build();
	}
}

export class NBT_Compound extends NBT_Tag {
	public constructor(public readonly name: string | null, public readonly tags: NBT_Tag[]) {
		super();
	}

	get(name: string) {
		return this.tags.filter((tag) => !(tag instanceof NBT_End)).find((tag: NBT_Tag) => tag.name === name);
	}

	static from_reader(reader: ByteReader, should_read_name: boolean) {
		const name = read_name(reader, should_read_name);
		const tags: NBT_Tag[] = [];
		let tag: NBT_Tag;
		while (true) {	
			tag = read_nbt_tag(reader);
			if (tag instanceof NBT_End)
				break;
			tags.push(tag);
		}
		return new NBT_Compound(name, tags);
	}

	override to_bytes() {
		const writer = new ByteWriter;
		writer.write(Type.BYTE, NBT_Type.COMPOUND);
		write_nbt_string(writer, this.name!);
		for (const tag of this.tags) {
			writer.append(tag.to_bytes());
		}
		writer.append(new NBT_End().to_bytes());
		return writer.build();
	}
}

export class NBT_Integer_Array extends NBT_Tag {
	public constructor(public readonly name: string | null, public readonly values: number[]) {
		super();
	}

	static from_reader(reader: ByteReader, should_read_name: boolean) {
		const name = read_name(reader, should_read_name);
		const values: number[] = [];
		const length = reader.read(Type.INTEGER) as number;
		for (let i = 0; i < length; ++i) {
			values.push(reader.read(Type.INTEGER) as number);
		}
		return new NBT_Integer_Array(name, values);
	}

	override to_bytes() {
		const writer = new ByteWriter;
		writer.write(Type.BYTE, NBT_Type.INTEGER_ARRAY);
		write_nbt_string(writer, this.name!);
		writer.write(Type.INTEGER, this.values.length);
		for (let i = 0; i < this.values.length; ++i) {
			writer.write(Type.INTEGER, this.values[i]);
		}
		return writer.build();
	}
}

export class NBT_Long_Array extends NBT_Tag {
	public constructor(public readonly name: string | null, public readonly values: bigint[]) {
		super();
	}

	static from_reader(reader: ByteReader, should_read_name: boolean) {
		const name = read_name(reader, should_read_name);
		const values: bigint[] = [];
		const length = reader.read(Type.INTEGER) as number;
		for (let i = 0; i < length; ++i) {
			values.push(reader.read(Type.LONG) as bigint);
		}
		return new NBT_Long_Array(name, values);
	}

	override to_bytes() {
		const writer = new ByteWriter;
		writer.write(Type.BYTE, NBT_Type.LONG_ARRAY);
		write_nbt_string(writer, this.name!);
		writer.write(Type.INTEGER, this.values.length);
		for (let i = 0; i < this.values.length; ++i) {
			writer.write(Type.LONG, this.values[i]);
		}
		return writer.build();
	}
}

export function read_nbt_tag(reader: ByteReader, should_read_name: boolean = true, type_id: number = reader.read(Type.BYTE) as number): NBT_Tag {
	switch (type_id) {
		case NBT_Type.END: return new NBT_End();
		case NBT_Type.BYTE: return NBT_Byte.from_reader(reader, should_read_name);
		case NBT_Type.SHORT: return NBT_Short.from_reader(reader, should_read_name);
		case NBT_Type.INTEGER: return NBT_Integer.from_reader(reader, should_read_name);
		case NBT_Type.LONG: return NBT_Long.from_reader(reader, should_read_name);
		case NBT_Type.FLOAT: return NBT_Float.from_reader(reader, should_read_name);
		case NBT_Type.DOUBLE: return NBT_Double.from_reader(reader, should_read_name);
		case NBT_Type.BYTE_ARRAY: return NBT_Byte_Array.from_reader(reader, should_read_name);
		case NBT_Type.STRING: return NBT_String.from_reader(reader, should_read_name);
		case NBT_Type.LIST: return NBT_List.from_reader(reader, should_read_name);
		case NBT_Type.COMPOUND: return NBT_Compound.from_reader(reader, should_read_name);		
		case NBT_Type.INTEGER_ARRAY: return NBT_Integer_Array.from_reader(reader, should_read_name);
		case NBT_Type.LONG_ARRAY: return NBT_Long_Array.from_reader(reader, should_read_name);
		default: throw new Error(`Unexpected byte ${type_id} at offset ${reader.cursor}`);
	}
}

export function is_gzip_compressed(bytes: Uint8Array) {
	try {
		pako.ungzip(bytes);
		return true;
	} catch (_error: unknown) {
		return false;
	}
}

export function decompress(bytes: Uint8Array): Uint8Array {
	return is_gzip_compressed(bytes) ? pako.ungzip(bytes) as Uint8Array : bytes;
}

export function parse_nbt_file(bytes: Uint8Array | number[]) {
	const compound = read_nbt_tag(new ByteReader(decompress(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes))), true);
	if (!(compound instanceof NBT_Compound)) {
		console.error("Possible Bedrock Bozo detected!");
		throw new SyntaxError("NBT expected to start with compound tag but received something else.");
	}
	return compound;
}