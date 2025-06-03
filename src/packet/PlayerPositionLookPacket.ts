import Types, { double, float, ReadableBuffer, WritableBuffer } from "../util/byte.ts";
import PacketHandler from "./PacketHandler.ts";
import PacketType from "./PacketType.ts";
import PlayerLookPacket from "./PlayerLookPacket.ts";
import { Vec3d } from "../util/mth.ts";

export default class PlayerPositionLookPacket extends PlayerLookPacket {
	constructor(
		private position: Vec3d,
		private stance: double,
		yaw: float,
		pitch: float,
		onGround: boolean,
	) {
		super(yaw, pitch, onGround);
	}

	override write(writer: WritableBuffer) {
		Types.DOUBLE.write(writer, this.position.x);
		Types.DOUBLE.write(writer, this.position.y);
		Types.DOUBLE.write(writer, this.stance);
		Types.DOUBLE.write(writer, this.position.z);
		super.write(writer);
	}

	override read(reader: ReadableBuffer) {
		const x = Types.DOUBLE.read(reader);
		const y = Types.DOUBLE.read(reader);
		this.stance = Types.DOUBLE.read(reader);
		const z = Types.DOUBLE.read(reader);
		this.position = new Vec3d(x, y, z);
		super.read(reader);
	}

	override async handle(handler: PacketHandler) {
		await handler.onPlayerPositionLook(this);
	}

	override getType(): PacketType {
		return PacketType.PLAYER_POSITION_LOOK;
	}

	getPosition() {
		return this.position;
	}

	getStance() {
		return this.stance;
	}
}
