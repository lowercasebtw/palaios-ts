import Types, { ReadableBuffer, WritableBuffer } from "../util/byte.ts";
import AbstractPacket from "./AbstractPacket.ts";
import PacketHandler from "./PacketHandler.ts";
import PacketType from "./PacketType.ts";

export enum UpdateType {
	ADD,
	REMOVE,
}

export default class PlayerListItemPacket extends AbstractPacket {
	constructor(private username: string, private update_type: UpdateType) {
		super();
	}

	override write(writer: WritableBuffer) {
		this.writePacketString(writer, this.username);
		Types.BOOLEAN.write(
			writer,
			this.update_type == UpdateType.ADD,
		);
		Types.SHORT.write(writer, 0); // TODO: Ping
	}

	override read(reader: ReadableBuffer) {
	}

	override async handle(handler: PacketHandler) {
		await handler.onPlayerListItem(this);
	}

	override getType(): PacketType {
		return PacketType.PLAYER_LIST_ITEM;
	}
}
