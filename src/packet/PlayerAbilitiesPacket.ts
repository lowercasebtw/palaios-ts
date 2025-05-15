import Types, { ReadableBuffer, WritableBuffer } from "../util/byte.ts";
import AbstractPacket from "./AbstractPacket.ts";
import PacketHandler from "./PacketHandler.ts";
import PacketType from "./PacketType.ts";

export default class PlayerAbilitiesPacket extends AbstractPacket {
	constructor(
		private invulnerable: boolean,
		private is_flying: boolean,
		private can_fly: boolean,
		private instant_destroy: boolean,
	) {
		super();
	}

	override write(writer: WritableBuffer) {
		Types.BOOLEAN.write(writer, this.invulnerable);
		Types.BOOLEAN.write(writer, this.is_flying);
		Types.BOOLEAN.write(writer, this.can_fly);
		Types.BOOLEAN.write(writer, this.instant_destroy);
	}

	override read(reader: ReadableBuffer) {
		this.invulnerable = Types.BOOLEAN.read(reader);
		this.is_flying = Types.BOOLEAN.read(reader);
		this.can_fly = Types.BOOLEAN.read(reader);
		this.instant_destroy = Types.BOOLEAN.read(reader);
	}

	override async handle(handler: PacketHandler) {
		await handler.onPlayerAbilities(this);
	}

	override getType(): PacketType {
		return PacketType.PLAYER_ABILITIES;
	}

	isInvulnerable() {
		return this.invulnerable;
	}

	isFlying() {
		return this.is_flying;
	}

	canFly() {
		return this.can_fly;
	}

	canInstantDestroy() {
		return this.instant_destroy;
	}
}
