import PacketType from "./PacketType.ts";
import AbstractPacket from "./AbstractPacket.ts";
import KeepAlivePacket from "./KeepAlivePacket.ts";
import ServerListPingPacket from "./ServerListPingPacket.ts";
import LoginRequestPacket from "./LoginRequestPacket.ts";
import HandshakePacket from "./HandshakePacket.ts";
import ChatMessagePacket from "./ChatMessagePacket.ts";
import UpdateTimePacket from "./UpdateTimePacket.ts";
import PluginMessagePacket from "./PluginMessagePacket.ts";
import PlayerAbilitiesPacket from "./PlayerAbilitiesPacket.ts";
import SetWindowItemsPacket from "./SetWindowItemsPacket.ts";
import PlayerPacket from "./PlayerPacket.ts";
import PlayerPositionPacket from "./PlayerPositionPacket.ts";
import PlayerLookPacket from "./PlayerLookPacket.ts";
import PlayerPositionLookPacket from "./PlayerPositionLookPacket.ts";
import AnimationPacket from "./AnimationPacket.ts";

export default class Packets {
	public static readonly INSTANCE = new Packets();

	private packets: Map<PacketType, AbstractPacket> = new Map();

	private constructor() {
		this.packets = new Map();
		this.packets.set(
			PacketType.KEEP_ALIVE,
			KeepAlivePacket as any,
		);
		this.packets.set(
			PacketType.LOGIN_REQUEST,
			LoginRequestPacket as any,
		);
		this.packets.set(
			PacketType.HANDSHAKE,
			HandshakePacket as any,
		);
		this.packets.set(
			PacketType.CHAT_MESSAGE,
			ChatMessagePacket as any,
		);
		this.packets.set(
			PacketType.UPDATE_TIME,
			UpdateTimePacket as any,
		);
		this.packets.set(
			PacketType.PLAYER,
			PlayerPacket as any,
		);
		this.packets.set(
			PacketType.PLAYER_POSITION,
			PlayerPositionPacket as any,
		);
		this.packets.set(
			PacketType.PLAYER_LOOK,
			PlayerLookPacket as any,
		);
		this.packets.set(
			PacketType.PLAYER_POSITION_LOOK,
			PlayerPositionLookPacket as any,
		);
		this.packets.set(
			PacketType.ANIMATION,
			AnimationPacket as any,
		);
		// SPAWN_NAMED_ENTITY
		// DESTROY_ENTITY = 29,
		// ENTITY = 30,
		// REL_ENTITY_MOVE_LOOK = 33,
		this.packets.set(
			PacketType.SET_WINDOW_ITEMS,
			SetWindowItemsPacket as any,
		);
		this.packets.set(
			PacketType.PLAYER_ABILITIES,
			PlayerAbilitiesPacket as any,
		);
		this.packets.set(
			PacketType.PLUGIN_MESSAGE,
			PluginMessagePacket as any,
		);
		this.packets.set(
			PacketType.SERVER_LIST_PING,
			ServerListPingPacket as any,
		);
		this.packets.set(
			PacketType.KICK_DISCONNECT,
			KeepAlivePacket as any,
		);
	}

	getPacket(type: PacketType) {
		return this.packets.get(type);
	}
}
