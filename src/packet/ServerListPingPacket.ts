import { ReadableBuffer } from "../util/byte.ts";
import PacketHandler from "./PacketHandler.ts";
import PacketType from "./PacketType.ts";
import KickDisconnectPacket from "./KickDisconnectPacket.ts";

export default class ServerListPingPacket extends KickDisconnectPacket {
	constructor(reason: string) {
		super(reason);
	}

	override read(reader: ReadableBuffer) {
	}

	override async handle(handler: PacketHandler) {
		await handler.onServerListPing(this);
	}

	override getType(): PacketType {
		return PacketType.SERVER_LIST_PING;
	}
}
