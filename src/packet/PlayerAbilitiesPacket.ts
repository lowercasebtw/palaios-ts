import { ReadableBuffer, WritableBuffer } from "../util/byte.ts";
import AbstractPacket from "./AbstractPacket.ts";
import PacketHandler from "./PacketHandler.ts";
import PacketType from "./PacketType.ts";

export default class PlayerAbilitiesPacket extends AbstractPacket {
	constructor() {
		super();
	}

	override write(writer: WritableBuffer) {
	}

	override read(reader: ReadableBuffer) {
	}

	override async handle(handler: PacketHandler) {
		await handler.onPlayerAbilities(this);
	}

	override getType(): PacketType {
		return PacketType.PLAYER_ABILITIES;
	}
}
