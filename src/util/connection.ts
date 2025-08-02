import { Logger } from "../logger/Logger.ts";
import AbstractPacket from "../packet/AbstractPacket.ts";
import ChatMessagePacket from "../packet/ChatMessagePacket.ts";
import EntityTeleportPacket from "../packet/EntityTeleportPacket.ts";
import HandshakePacket from "../packet/HandshakePacket.ts";
import KeepAlivePacket from "../packet/KeepAlivePacket.ts";
import KickDisconnectPacket from "../packet/KickDisconnectPacket.ts";
import LoginRequestPacket from "../packet/LoginRequestPacket.ts";
import PacketType from "../packet/PacketType.ts";
import PlayerAbilitiesPacket from "../packet/PlayerAbilitiesPacket.ts";
import PlayerListItemPacket from "../packet/PlayerListItemPacket.ts";
import PlayerLookPacket from "../packet/PlayerLookPacket.ts";
import PlayerPacket from "../packet/PlayerPacket.ts";
import PlayerPositionLookPacket from "../packet/PlayerPositionLookPacket.ts";
import PlayerPositionPacket from "../packet/PlayerPositionPacket.ts";
import PluginMessagePacket from "../packet/PluginMessagePacket.ts";
import ServerListPingPacket from "../packet/ServerListPingPacket.ts";
import SetWindowItemsPacket from "../packet/SetWindowItemsPacket.ts";
import SpawnNamedEntityPacket from "../packet/SpawnNamedEntityPacket.ts";
import UpdateTimePacket from "../packet/UpdateTimePacket.ts";
import MinecraftServer from "../server.ts";
import ServerPacketHandler from "../serverPacketHandler.ts";
import Types, { ReadableBuffer, WritableBuffer } from "../util/byte.ts";
import { Client } from "./tcp.ts";

// TODO: Redo this
const PACKET_ID_TO_CLASS: Record<PacketType, CallableFunction | null> = {
	[PacketType.KEEP_ALIVE]: KeepAlivePacket as any,
	[PacketType.LOGIN_REQUEST]: LoginRequestPacket as any,
	[PacketType.HANDSHAKE]: HandshakePacket as any,
	[PacketType.CHAT_MESSAGE]: ChatMessagePacket as any,
	[PacketType.UPDATE_TIME]: UpdateTimePacket as any,
	[PacketType.PLAYER_INVENTORY]: null,
	[PacketType.SPAWN_POSITION]: null,
	[PacketType.USE_ENTITY]: null,
	[PacketType.UPDATE_HEALTH]: null,
	[PacketType.RESPAWN]: null,
	[PacketType.PLAYER]: PlayerPacket as any,
	[PacketType.PLAYER_POSITION]: PlayerPositionPacket as any,
	[PacketType.PLAYER_LOOK]: PlayerLookPacket as any,
	[PacketType.PLAYER_POSITION_LOOK]: PlayerPositionLookPacket as any,
	[PacketType.PLAYER_DIG]: null,
	[PacketType.PLAYER_PLACE]: null,
	[PacketType.HELD_ITEM_CHANGE]: null,
	[PacketType.SLEEP]: null,
	[PacketType.ANIMATION]: null,
	[PacketType.ENTITY_ACTION]: null,
	[PacketType.SPAWN_NAMED_ENTITY]: SpawnNamedEntityPacket as any,
	[PacketType.PICKUP_SPAWN]: null,
	[PacketType.COLLECT_ITEM]: null,
	[PacketType.VEHICLE_SPAWN]: null,
	[PacketType.MOB_SPAWN]: null,
	[PacketType.ENTITY_PAINTING]: null,
	[PacketType.ENTITIY_EXPERIENCE_ORB]: null,
	[PacketType.ENTITY_VELOCITY]: null,
	[PacketType.DESTROY_ENTITY]: null,
	[PacketType.ENTITY]: null,
	[PacketType.REL_ENTITY_MOVE]: null,
	[PacketType.ENTITY_LOOK]: null,
	[PacketType.REL_ENTITY_MOVE_LOOK]: null,
	[PacketType.ENTITY_TELEPORT]: EntityTeleportPacket as any,
	[PacketType.ENTITY_HEAD_ROTATION]: null,
	[PacketType.ENTITY_STATUS]: null,
	[PacketType.ATTACH_ENTITY]: null,
	[PacketType.ENTITY_METADATA]: null,
	[PacketType.ENTITY_EFFECT]: null,
	[PacketType.REMOVE_ENTITY_EFFECT]: null,
	[PacketType.EXPERIENCE]: null,
	[PacketType.PRE_CHUNK]: null,
	[PacketType.CHUNK_DATA]: null,
	[PacketType.MULTI_BLOCK_CHANGE]: null,
	[PacketType.BLOCK_CHANGE]: null,
	[PacketType.PLAY_NOTEBLOCK]: null,
	[PacketType.EXPLOSION]: null,
	[PacketType.DOOR_CHANGE]: null,
	[PacketType.BED]: null,
	[PacketType.WEATHER]: null,
	[PacketType.OPEN_WINDOW]: null,
	[PacketType.CLOSE_WINDOW]: null,
	[PacketType.CLICK_WINDOW]: null,
	[PacketType.SET_SLOT]: null,
	[PacketType.SET_WINDOW_ITEMS]: SetWindowItemsPacket as any,
	[PacketType.UPDATE_PROGRESS_BAR]: null,
	[PacketType.TRANSACTION]: null,
	[PacketType.CREATIVE_SET_SLOT]: null,
	[PacketType.ENCHANT_ITEM]: null,
	[PacketType.UPDATE_SIGN]: null,
	[PacketType.MAP_DATA]: null,
	[PacketType.TILE_ENTITY_DATA]: null,
	[PacketType.STATISTIC]: null,
	[PacketType.PLAYER_LIST_ITEM]: PlayerListItemPacket as any,
	[PacketType.PLAYER_ABILITIES]: PlayerAbilitiesPacket as any,
	[PacketType.PLUGIN_MESSAGE]: PluginMessagePacket as any,
	[PacketType.SERVER_LIST_PING]: ServerListPingPacket as any,
	[PacketType.KICK_DISCONNECT]: KickDisconnectPacket as any
};
// TODO: Redo this

export default class ClientConnection {
	private static LAST_CONNECTION_ID = 0;
	public readonly id: number;
	private readonly client: Client;
	private readonly handler: ServerPacketHandler;

	public constructor(server: MinecraftServer, client: Client) {
		this.id = ClientConnection.LAST_CONNECTION_ID++;
		this.client = client;
		this.handler = new ServerPacketHandler(server, this);
	}

	getClient() {
		return this.client;
	}

	isPlaying() {
		return this.handler.isPlaying();
	}

	getPlayer() {
		return this.handler.getPlayer();
	}

	async handle(reader: ReadableBuffer) {
		const packet_id = Types.BYTE.read(reader);
		const packetType = Object.values(PacketType).find((entry) => entry == packet_id);
		if (packetType === undefined) {
			Logger.warn("Recieved unknown packet type with id " + packet_id);
			return;
		}

		const packetClass = PACKET_ID_TO_CLASS[packetType as PacketType];
		if (packetClass == null) {
			Logger.warn("TODO Packet: " + packetType);
			return;
		}

		// eugh
		const packet = new (packetClass as any)();
		packet.read(reader);
		try {
			await packet.handle(this.handler);
		} catch (error) {
			await this.kick("Kicked! Reason: " + (error as Error).message);
		}
	}

	async sendPacket(packet: AbstractPacket) {
		const writer = new WritableBuffer();
		Types.BYTE.write(writer, packet.getType());
		packet.write(writer);
		await this.client.write(writer.build());
	}

	async kick(message: string) {
		await this.sendPacket(new KickDisconnectPacket(message));
		this.client.close();
	}

	close() {
	}

	// async sendHealthUpdate() {
	// 	// Should this happen?
	// 	if (this.player == null) return;
	// 	const writer = new WritableBuffer();
	// 	Types.BYTE.write(writer, PacketType.UPDATE_HEALTH);
	// 	Types.SHORT.write(writer, this.player.getHealth());
	// 	Types.SHORT.write(writer, this.player.getHungerLevel());
	// 	Types.FLOAT.write(writer, this.player.getSaturation());
	// 	await this.client.write(writer.build());
	// }
}
