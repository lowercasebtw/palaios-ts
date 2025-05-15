import Types, { ReadableBuffer, WritableBuffer } from "../util/byte.ts";
import AbstractPacket from "./AbstractPacket.ts";
import PacketHandler from "./PacketHandler.ts";
import PacketType from "./PacketType.ts";

export default class UpdateTimePacket extends AbstractPacket {
	constructor(private time: bigint) {
		super();
	}

	override write(writer: WritableBuffer) {
		Types.LONG.write(writer, this.time);
	}

	override read(reader: ReadableBuffer) {
	}

	override async handle(handler: PacketHandler) {
		await handler.onUpdateTime(this);
	}

	override getType(): PacketType {
		return PacketType.UPDATE_TIME;
	}
}
