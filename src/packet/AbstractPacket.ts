import Types, { ReadableBuffer, WritableBuffer } from "../util/byte.ts";
import PacketHandler from "./PacketHandler.ts";
import PacketType from "./PacketType.ts";

// https://wiki.vg/index.php?title=Protocol&oldid=932

export default abstract class AbstractPacket {
	abstract read(reader: ReadableBuffer): void;

	abstract write(writer: WritableBuffer): void;

	abstract handle(handler: PacketHandler): Promise<void>;

	abstract getType(): PacketType;

	protected writePacketString(writer: WritableBuffer, message: string) {
		Types.SHORT.write(writer, message.length);
		for (let i = 0; i < message.length; ++i) {
			Types.SHORT.write(writer, message[i].charCodeAt(0));
		}

		return writer;
	}

	protected readPacketString(reader: ReadableBuffer) {
		const length = Types.SHORT.read(reader) as number;
		let string = "";
		for (let i = 0; i < length; ++i) {
			string += String.fromCharCode(Types.SHORT.read(reader) as number);
		}

		return string;
	}
}
