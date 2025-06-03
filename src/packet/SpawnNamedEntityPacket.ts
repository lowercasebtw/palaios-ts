import Types, { byte, int, ReadableBuffer, WritableBuffer } from "../util/byte.ts";
import AbstractPacket from "./AbstractPacket.ts";
import PacketHandler from "./PacketHandler.ts";
import PacketType from "./PacketType.ts";
import { Vec3d } from "../util/mth.ts";

export default class SpawnNamedEntityPacket extends AbstractPacket {
	constructor(
		private entityId: int,
		private username: string,
		private position: Vec3d,
		private yaw: byte,
		private pitch: byte,
		private currentHeldItem: byte,
	) {
		super();
	}

	override write(writer: WritableBuffer) {
		Types.INTEGER.write(writer, this.entityId);
		this.writePacketString(writer, this.username);
		Types.INTEGER.write(writer, this.position.x);
		Types.INTEGER.write(writer, this.position.y);
		Types.INTEGER.write(writer, this.position.z);
		Types.BYTE.write(writer, this.yaw);
		Types.BYTE.write(writer, this.pitch);
		Types.SHORT.write(writer, this.currentHeldItem);
	}

	override read(reader: ReadableBuffer) {
		this.entityId = Types.INTEGER.read(reader);
		this.username = this.readPacketString(reader);
		this.position = new Vec3d(
			Types.INTEGER.read(reader),
			Types.INTEGER.read(reader),
			Types.INTEGER.read(reader),
		);
		this.yaw = Types.BYTE.read(reader);
		this.pitch = Types.BYTE.read(reader);
		this.currentHeldItem = Types.SHORT.read(reader);
	}

	override async handle(handler: PacketHandler) {
		// await handler.onSpawnNamedEntity(this);
	}

	override getType(): PacketType {
		return PacketType.SPAWN_NAMED_ENTITY;
	}

	getEntityId() {
		return this.entityId;
	}

	getUsername() {
		return this.username;
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

	getCurrentHeldItem() {
		return this.currentHeldItem;
	}
}
