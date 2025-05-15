import Types, { double, float, ReadableBuffer, WritableBuffer } from "../util/byte.ts";
import PacketHandler from "./PacketHandler.ts";
import PacketType from "./PacketType.ts";
import PlayerLookPacket from "./PlayerLookPacket.ts";
import { Vec3d } from "../util/mth.ts";

export default class PlayerPositionLookPacket extends PlayerLookPacket {
	constructor(
		private x: double,
		private y: double,
		private stance: double,
		private z: double,
		yaw: float,
		pitch: float,
		onGround: boolean,
	) {
		super(yaw, pitch, onGround);
	}

	override write(writer: WritableBuffer) {
		Types.DOUBLE.write(writer, this.x);
		Types.DOUBLE.write(writer, this.y);
		Types.DOUBLE.write(writer, this.stance);
		Types.DOUBLE.write(writer, this.z);
		super.write(writer);
	}

	override read(reader: ReadableBuffer) {
		this.x = Types.DOUBLE.read(reader);
		this.y = Types.DOUBLE.read(reader);
		this.stance = Types.DOUBLE.read(reader);
		this.z = Types.DOUBLE.read(reader);
		super.read(reader);
	}

	override async handle(handler: PacketHandler) {
		await handler.onPlayerPositionLook(this);
	}

	override getType(): PacketType {
		return PacketType.PLAYER_POSITION_LOOK;
	}

	getPosition() {
		return new Vec3d(this.x, this.y, this.z);
	}

	getStance() {
		return this.stance;
	}
}
