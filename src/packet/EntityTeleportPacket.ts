import Types, { byte, ReadableBuffer, WritableBuffer } from "../util/byte.ts";
import AbstractPacket from "./AbstractPacket.ts";
import PacketHandler from "./PacketHandler.ts";
import PacketType from "./PacketType.ts";
import { Vec3d } from "../util/mth.ts";

export default class EntityTeleportPacket extends AbstractPacket {
	constructor(
		private entityId: number,
		private position: Vec3d,
		private yaw: byte,
		private pitch: byte,
	) {
		super();
	}

	override write(writer: WritableBuffer) {
		Types.INTEGER.write(writer, this.entityId);
		Types.INTEGER.write(writer, this.position.x);
		Types.INTEGER.write(writer, this.position.y);
		Types.INTEGER.write(writer, this.position.z);
		Types.BYTE.write(writer, this.yaw);
		Types.BYTE.write(writer, this.pitch);
	}

	override read(reader: ReadableBuffer) {
		this.entityId = Types.INTEGER.read(reader);
		this.position = new Vec3d(
			Types.INTEGER.read(reader),
			Types.INTEGER.read(reader),
			Types.INTEGER.read(reader),
		);
		this.yaw = Types.BYTE.read(reader);
		this.pitch = Types.BYTE.read(reader);
	}

	override async handle(handler: PacketHandler) {
		// await handler.onEntityTeleport(this);
	}

	override getType(): PacketType {
		return PacketType.ENTITY_TELEPORT;
	}

	getPosition() {
		return this.position;
	}

	getYaw() {
		return this.yaw;
	}

	getPitch() {
		return this.pitch;
	}
}
