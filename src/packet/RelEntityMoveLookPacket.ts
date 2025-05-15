import Types, { ReadableBuffer, WritableBuffer } from "../util/byte.ts";
import AbstractPacket from "./AbstractPacket.ts";
import PacketHandler from "./PacketHandler.ts";
import PacketType from "./PacketType.ts";

export default class RelEntityMoveLookPacket extends AbstractPacket {
	constructor(
		private entityId: number,
		private x: number,
		private y: number,
		private z: number,
		private yaw: number,
		private pitch: number,
	) {
		super();
	}

	override write(writer: WritableBuffer) {
		Types.INTEGER.write(writer, this.entityId);
		Types.BYTE.write(writer, this.x);
		Types.BYTE.write(writer, this.y);
		Types.BYTE.write(writer, this.z);
		Types.BYTE.write(writer, this.yaw);
		Types.BYTE.write(writer, this.pitch);
	}

	override read(reader: ReadableBuffer) {
	}

	override async handle(handler: PacketHandler) {
		await handler.onRelEntityMoveLook(this);
	}

	override getType(): PacketType {
		return PacketType.REL_ENTITY_MOVE_LOOK;
	}
}
