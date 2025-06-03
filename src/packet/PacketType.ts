import { int } from "../util/byte.ts";
import AbstractPacket from "./AbstractPacket.ts";
import KeepAlivePacket from "./KeepAlivePacket.ts";
import LoginRequestPacket from "./LoginRequestPacket.ts";
import HandshakePacket from "./HandshakePacket.ts";
import ChatMessagePacket from "./ChatMessagePacket.ts";
import UpdateTimePacket from "./UpdateTimePacket.ts";
import PlayerPacket from "./PlayerPacket.ts";
import PlayerLookPacket from "./PlayerLookPacket.ts";
import PlayerPositionPacket from "./PlayerPositionPacket.ts";
import PlayerPositionLookPacket from "./PlayerPositionLookPacket.ts";
import KickDisconnectPacket from "./KickDisconnectPacket.ts";
import ServerListPingPacket from "./ServerListPingPacket.ts";
import PluginMessagePacket from "./PluginMessagePacket.ts";
import PlayerAbilitiesPacket from "./PlayerAbilitiesPacket.ts";
import PlayerListItemPacket from "./PlayerListItemPacket.ts";
import SetWindowItemsPacket from "./SetWindowItemsPacket.ts";
import EntityTeleportPacket from "./EntityTeleportPacket.ts";
import RelEntityMoveLookPacket from "./RelEntityMoveLookPacket.ts";
import SpawnNamedEntityPacket from "./SpawnNamedEntityPacket.ts";
import AnimationPacket from "./AnimationPacket.ts";

export default class PacketType {
	public static readonly KEEP_ALIVE = new PacketType(0, KeepAlivePacket as any);
	public static readonly LOGIN_REQUEST = new PacketType(1, LoginRequestPacket as any);
	public static readonly HANDSHAKE = new PacketType(2, HandshakePacket as any);
	public static readonly CHAT_MESSAGE = new PacketType(3, ChatMessagePacket as any);
	public static readonly UPDATE_TIME = new PacketType(4, UpdateTimePacket as any);
	public static readonly PLAYER_INVENTORY = new PacketType(5, null);
	public static readonly SPAWN_POSITION = new PacketType(6, null);
	public static readonly USE_ENTITY = new PacketType(7, null);
	public static readonly UPDATE_HEALTH = new PacketType(8, null);
	public static readonly RESPAWN = new PacketType(9, null);
	public static readonly PLAYER = new PacketType(10, PlayerPacket as any);
	public static readonly PLAYER_POSITION = new PacketType(11, PlayerPositionPacket as any);
	public static readonly PLAYER_LOOK = new PacketType(12, PlayerLookPacket as any);
	public static readonly PLAYER_POSITION_LOOK = new PacketType(13, PlayerPositionLookPacket as any);
	public static readonly PLAYER_DIG = new PacketType(14, null);
	public static readonly PLAYER_PLACE = new PacketType(15, null);
	public static readonly HELD_ITEM_CHANGE = new PacketType(16, null);
	public static readonly SLEEP = new PacketType(17, null);
	public static readonly ANIMATION = new PacketType(18, AnimationPacket as any);
	public static readonly ENTITY_ACTION = new PacketType(19, null);
	public static readonly SPAWN_NAMED_ENTITY = new PacketType(20, SpawnNamedEntityPacket as any);
	public static readonly PICKUP_SPAWN = new PacketType(21, null);
	public static readonly COLLECT_ITEM = new PacketType(22, null);
	public static readonly VEHICLE_SPAWN = new PacketType(23, null);
	public static readonly MOB_SPAWN = new PacketType(24, null);
	public static readonly ENTITY_PAINTING = new PacketType(25, null);
	public static readonly ENTITIY_EXPERIENCE_ORB = new PacketType(26, null);
	public static readonly ENTITY_VELOCITY = new PacketType(28, null);
	public static readonly DESTROY_ENTITY = new PacketType(29, null);
	public static readonly ENTITY = new PacketType(30, null);
	public static readonly REL_ENTITY_MOVE = new PacketType(31, null);
	public static readonly ENTITY_LOOK = new PacketType(32, null);
	public static readonly REL_ENTITY_MOVE_LOOK = new PacketType(33, RelEntityMoveLookPacket as any);
	public static readonly ENTITY_TELEPORT = new PacketType(34, EntityTeleportPacket as any);
	public static readonly ENTITY_HEAD_ROTATION = new PacketType(35, null);
	public static readonly ENTITY_STATUS = new PacketType(38, null);
	public static readonly ATTACH_ENTITY = new PacketType(39, null);
	public static readonly ENTITY_METADATA = new PacketType(40, null);
	public static readonly ENTITY_EFFECT = new PacketType(41, null);
	public static readonly REMOVE_ENTITY_EFFECT = new PacketType(42, null);
	public static readonly EXPERIENCE = new PacketType(43, null);
	public static readonly PRE_CHUNK = new PacketType(50, null);
	public static readonly CHUNK_DATA = new PacketType(51, null);
	public static readonly MULTI_BLOCK_CHANGE = new PacketType(52, null);
	public static readonly BLOCK_CHANGE = new PacketType(53, null);
	public static readonly PLAY_NOTEBLOCK = new PacketType(54, null);
	public static readonly EXPLOSION = new PacketType(60, null);
	public static readonly DOOR_CHANGE = new PacketType(61, null);
	public static readonly BED = new PacketType(70, null);
	public static readonly WEATHER = new PacketType(71, null);
	public static readonly OPEN_WINDOW = new PacketType(100, null);
	public static readonly CLOSE_WINDOW = new PacketType(101, null);
	public static readonly CLICK_WINDOW = new PacketType(102, null);
	public static readonly SET_SLOT = new PacketType(103, null);
	public static readonly SET_WINDOW_ITEMS = new PacketType(104, SetWindowItemsPacket as any);
	public static readonly UPDATE_PROGRESS_BAR = new PacketType(105, null);
	public static readonly TRANSACTION = new PacketType(106, null);
	public static readonly CREATIVE_SET_SLOT = new PacketType(107, null);
	public static readonly ENCHANT_ITEM = new PacketType(108, null);
	public static readonly UPDATE_SIGN = new PacketType(130, null);
	public static readonly MAP_DATA = new PacketType(131, null);
	public static readonly TILE_ENTITY_DATA = new PacketType(132, null);
	public static readonly STATISTIC = new PacketType(200, null);
	public static readonly PLAYER_LIST_ITEM = new PacketType(201, PlayerListItemPacket as any);
	public static readonly PLAYER_ABILITIES = new PacketType(202, PlayerAbilitiesPacket as any);
	public static readonly PLUGIN_MESSAGE = new PacketType(250, PluginMessagePacket  as any);
	public static readonly SERVER_LIST_PING = new PacketType(254, ServerListPingPacket as any);
	public static readonly KICK_DISCONNECT = new PacketType(255, KickDisconnectPacket as any);

	private static _entries: PacketType[] = [];

	private constructor(private id: int, private packetClass: AbstractPacket | null) {
		PacketType._entries.push(this);
	}

	static entries() {
		return this._entries;
	}

	getId() {
		return this.id;
	}

	getPacketClass() {
		return this.packetClass;
	}
}
