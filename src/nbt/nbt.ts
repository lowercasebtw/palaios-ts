import { ByteReader } from "./nbt_byte.ts";
import { decompress } from "../util/util.ts";

export enum NBT_Type {
	END,
	BYTE,
	SHORT,
	INT,
	LONG,
	FLOAT,
	DOUBLE,
	BYTE_ARRAY,
	STRING,
	LIST,
	COMPOUND
}

// stub
function read_name(reader: ByteReader, should_read_name: boolean) {
	return !should_read_name ? null : reader.read_string();
}

export class NBT_Tag {
	constructor(public name: string | null = null) {}
	static from_reader(_reader: ByteReader, _should_read_name: boolean) {}
}

export class NBT_End extends NBT_Tag {
	constructor(public readonly name: string | null) {
		super();
	}

	static from_reader(reader: ByteReader, should_read_name: boolean) {
		const name = read_name(reader, should_read_name);
		return new NBT_End(name);
	}
}

export class NBT_Byte extends NBT_Tag {
	constructor(
		public readonly name: string | null,
		public readonly byte: number
	) {
		super();
	}

	static from_reader(reader: ByteReader, should_read_name: boolean) {
		const name = read_name(reader, should_read_name);
		return new NBT_Byte(name, reader.read_byte());
	}
}

export class NBT_Short extends NBT_Tag {
	constructor(
		public readonly name: string | null,
		public readonly value: number
	) {
		super();
	}

	static from_reader(reader: ByteReader, should_read_name: boolean) {
		const name = read_name(reader, should_read_name);
		return new NBT_Short(name, reader.read_short());
	}
}

export class NBT_Int extends NBT_Tag {
	constructor(
		public readonly name: string | null,
		public readonly value: number
	) {
		super();
	}

	static from_reader(reader: ByteReader, should_read_name: boolean) {
		const name = read_name(reader, should_read_name);
		return new NBT_Int(name, reader.read_integer());
	}
}

export class NBT_Long extends NBT_Tag {
	constructor(
		public readonly name: string | null,
		public readonly value: bigint
	) {
		super();
	}

	static from_reader(reader: ByteReader, should_read_name: boolean) {
		const name = read_name(reader, should_read_name);
		return new NBT_Long(name, reader.read_long());
	}
}

export class NBT_Float extends NBT_Tag {
	constructor(
		public readonly name: string | null,
		public readonly value: number
	) {
		super();
	}

	static from_reader(reader: ByteReader, should_read_name: boolean) {
		const name = read_name(reader, should_read_name);
		return new NBT_Float(name, reader.read_float());
	}
}

export class NBT_Double extends NBT_Tag {
	constructor(
		public readonly name: string | null,
		public readonly value: number
	) {
		super();
	}

	static from_reader(reader: ByteReader, should_read_name: boolean) {
		const name = read_name(reader, should_read_name);
		return new NBT_Float(name, reader.read_double());
	}
}

export class NBT_Byte_Array extends NBT_Tag {
	constructor(
		public readonly name: string | null,
		public readonly size: number,
		public readonly bytes: Uint8Array
	) {
		super();
	}

	static from_reader(reader: ByteReader, should_read_name: boolean) {
		const name = read_name(reader, should_read_name);
		const size = reader.read_integer();
		const bytes = reader.read_bytes(size);
		return new NBT_Byte_Array(name, size, bytes);
	}

	to_bytes() {
		return new Uint8Array([NBT_Type.BYTE_ARRAY]);
	}
}

export class NBT_String extends NBT_Tag {
	constructor(
		public readonly name: string | null,
		public readonly data: string
	) {
		super();
	}

	static from_reader(reader: ByteReader, should_read_name: boolean) {
		const name = read_name(reader, should_read_name);
		return new NBT_String(name, reader.read_string());
	}
}

export class NBT_List extends NBT_Tag {
	constructor(
		public readonly name: string | null,
		public readonly type_id: number,
		public readonly size: number,
		public readonly tags: NBT_Tag[]
	) {
		super();
	}

	static from_reader(reader: ByteReader, should_read_name: boolean) {
		const name = read_name(reader, should_read_name);
		const type_id = reader.read_byte();
		const size = reader.read_integer();
		const tags = [];
		for (let i = 0; i < size; ++i)
			tags.push(read_nbt_tag(reader, false, type_id));
		return new NBT_List(name, type_id, size, tags);
	}
}

export class NBT_Compound extends NBT_Tag {
	constructor(
		public readonly name: string | null,
		public readonly tags: NBT_Tag[]
	) {
		super();
	}

	get(name: string) {
		return this.tags.filter((tag) => !(tag instanceof NBT_End)).find((tag: NBT_Tag) => tag.name === name);
	}

	static from_reader(reader: ByteReader, should_read_name: boolean) {
		const name = read_name(reader, should_read_name);
		const tags = [];
		for (;;) {	
			const tag = read_nbt_tag(reader, true);
			if (tag instanceof NBT_End) 
				break;
			tags.push(tag);
		}
		return new NBT_Compound(name, tags);
	}
}

export function read_nbt_tag(
	reader: ByteReader,
	should_read_name: boolean,
	type_id?: number
): NBT_Tag {
	const type = type_id ?? reader.read_byte();
	switch (type) {
		case NBT_Type.END: return new NBT_End(null);
		case NBT_Type.BYTE: return NBT_Byte.from_reader(reader, should_read_name);
		case NBT_Type.SHORT: return NBT_Short.from_reader(reader, should_read_name);
		case NBT_Type.INT: return NBT_Int.from_reader(reader, should_read_name);
		case NBT_Type.LONG: return NBT_Long.from_reader(reader, should_read_name);
		case NBT_Type.FLOAT: return NBT_Float.from_reader(reader, should_read_name);
		case NBT_Type.DOUBLE: return NBT_Double.from_reader(reader, should_read_name);
		case NBT_Type.BYTE_ARRAY: return NBT_Byte_Array.from_reader(reader, should_read_name);
		case NBT_Type.STRING: return NBT_String.from_reader(reader, should_read_name);
		case NBT_Type.LIST: return NBT_List.from_reader(reader, should_read_name);
		case NBT_Type.COMPOUND: return NBT_Compound.from_reader(reader, should_read_name);
		default: throw new Error(`Unexpected byte ${type} at data index ${reader.cursor}`);
	}
}

export function parse_nbt(bytes: Uint8Array | number[]) {
	const compound = read_nbt_tag(new ByteReader(decompress((bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)))), true);
	if (!(compound instanceof NBT_Compound))
		throw new SyntaxError("NBT expected to start with compound tag but received something else.");
	return compound;
}
