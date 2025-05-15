import Types, { float, ReadableBuffer, WritableBuffer } from "../util/byte.ts";
import PacketHandler from "./PacketHandler.ts";
import PacketType from "./PacketType.ts";
import PlayerPacket from "./PlayerPacket.ts";

export default class PlayerLookPacket extends PlayerPacket {
	constructor(
		private yaw: float,
		private pitch: float,
		onGround: boolean,
	) {
		super(onGround);
	}

	override write(writer: WritableBuffer) {
		Types.FLOAT.write(writer, this.yaw);
		Types.FLOAT.write(writer, this.pitch);
		super.write(writer);
	}

	override read(reader: ReadableBuffer) {
		this.yaw = Types.FLOAT.read(reader);
		this.pitch = Types.FLOAT.read(reader);
		super.read(reader);
	}

	override async handle(handler: PacketHandler) {
		await handler.onPlayerLook(this);
	}

	override getType(): PacketType {
		return PacketType.PLAYER_LOOK;
	}

	getYaw() {
		return this.yaw;
	}

	getPitch() {
		return this.pitch;
	}
}
