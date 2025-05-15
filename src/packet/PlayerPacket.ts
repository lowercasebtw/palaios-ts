import Types, { ReadableBuffer, WritableBuffer } from "../util/byte.ts";
import AbstractPacket from "./AbstractPacket.ts";
import PacketHandler from "./PacketHandler.ts";
import PacketType from "./PacketType.ts";

export default class PlayerPacket extends AbstractPacket {
	constructor(private onGround: boolean) {
		super();
	}

	override write(writer: WritableBuffer) {
		Types.BOOLEAN.write(writer, this.onGround);
	}

	override read(reader: ReadableBuffer) {
		this.onGround = Types.BOOLEAN.read(reader);
	}

	override async handle(handler: PacketHandler) {
		await handler.onPlayer(this);
	}

	override getType(): PacketType {
		return PacketType.PLAYER;
	}

	isOnGround() {
		return this.onGround;
	}
}
