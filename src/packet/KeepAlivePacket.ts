import Types, { int, ReadableBuffer, WritableBuffer } from "../util/byte.ts";
import AbstractPacket from "./AbstractPacket.ts";
import PacketHandler from "./PacketHandler.ts";
import PacketType from "./PacketType.ts";

export default class KeepAlivePacket extends AbstractPacket {
	constructor(private id: int) {
		super();
	}

	override write(writer: WritableBuffer) {
		Types.INTEGER.write(writer, this.id);
	}

	override read(reader: ReadableBuffer) {
		this.id = Types.INTEGER.read(reader);
	}

	override async handle(handler: PacketHandler) {
		await handler.onKeepAlive(this);
	}

	override getType(): PacketType {
		return PacketType.KEEP_ALIVE;
	}

	getId() {
		return this.id;
	}
}
