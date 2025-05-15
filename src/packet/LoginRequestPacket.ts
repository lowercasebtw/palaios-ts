import Types, { byte, ReadableBuffer, WritableBuffer } from "../util/byte.ts";
import AbstractPacket from "./AbstractPacket.ts";
import PacketHandler from "./PacketHandler.ts";
import PacketType from "./PacketType.ts";
import {
	Difficulty,
	DimensionType,
	Gamemode,
	WorldType,
} from "../util/types.ts";

export default class LoginRequestPacket extends AbstractPacket {
	constructor(
		private protocolVersion: number,
		private username: string,
		private worldType: WorldType,
		private gameMode: Gamemode,
		private dimensionType: DimensionType,
		private difficulty: Difficulty,
		private tabListCount: byte,
	) {
		super();
	}

	override write(writer: WritableBuffer) {
		Types.INTEGER.write(writer, this.protocolVersion);
		this.writePacketString(writer, this.username);
		this.writePacketString(writer, this.worldType);
		Types.INTEGER.write(writer, this.gameMode);
		Types.INTEGER.write(writer, this.dimensionType);
		Types.BYTE.write(writer, this.difficulty);
		Types.BYTE.write(writer, 0);
		Types.BYTE.write(writer, this.tabListCount);
	}

	override read(reader: ReadableBuffer) {
		this.protocolVersion = Types.INTEGER.read(reader);
		this.username = this.readPacketString(reader);
		this.worldType = this.readPacketString(reader) as WorldType;
		this.gameMode = Types.INTEGER.read(reader) as Gamemode;
		this.dimensionType = Types.INTEGER.read(reader) as DimensionType;
		this.difficulty = Types.BYTE.read(reader);
		Types.BYTE.read(reader);
		this.tabListCount = Types.BYTE.read(reader);
	}

	override async handle(handler: PacketHandler) {
		await handler.onLoginRequest(this);
	}

	override getType(): PacketType {
		return PacketType.LOGIN_REQUEST;
	}

	getProtocolVersion() {
		return this.protocolVersion;
	}

	getUsername() {
		return this.username;
	}

	getWorldType() {
		return this.worldType;
	}

	getGameMode() {
		return this.gameMode;
	}

	getDimensionType() {
		return this.dimensionType;
	}

	getDifficulty() {
		return this.difficulty;
	}

	getTabListCount() {
		return this.tabListCount;
	}
}
