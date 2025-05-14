import KeepAlivePacket from "./KeepAlivePacket.ts";
import ServerListPingPacket from "./ServerListPingPacket.ts";
import KickDisconnectPacket from "./KickDisconnectPacket.ts";
import LoginRequestPacket from "./LoginRequestPacket.ts";
import HandshakePacket from "./HandshakePacket.ts";
import ChatMessagePacket from "./ChatMessagePacket.ts";
import PlayerPacket from "./PlayerPacket.ts";
import PlayerPositionPacket from "./PlayerPositionPacket.ts";
import PlayerLookPacket from "./PlayerLookPacket.ts";
import PlayerPositionLookPacket from "./PlayerPositionLookPacket.ts";
import AnimationPacket from "./AnimationPacket.ts";
import PluginMessagePacket from "./PluginMessagePacket.ts";
import PlayerAbilitiesPacket from "./PlayerAbilitiesPacket.ts";
import SetWindowItemsPacket from "./SetWindowItemsPacket.ts";
import UpdateTimePacket from "./UpdateTimePacket.ts";

export default abstract class PacketHandler {
	abstract onKeepAlive(packet: KeepAlivePacket): Promise<void>;
	abstract onLoginRequest(packet: LoginRequestPacket): Promise<void>;
	abstract onHandshake(packet: HandshakePacket): Promise<void>;
	abstract onChatMessage(packet: ChatMessagePacket): Promise<void>;
	abstract onUpdateTime(packet: UpdateTimePacket): Promise<void>;
	abstract onPlayer(packet: PlayerPacket): Promise<void>;
	abstract onPlayerPosition(packet: PlayerPositionPacket): Promise<void>;
	abstract onPlayerLook(packet: PlayerLookPacket): Promise<void>;
	abstract onPlayerPositionLook(packet: PlayerPositionLookPacket): Promise<void>;
	abstract onAnimation(packet: AnimationPacket): Promise<void>;
	abstract onSetWindowItems(packet: SetWindowItemsPacket): Promise<void>;
	abstract onPlayerAbilities(packet: PlayerAbilitiesPacket): Promise<void>;
	abstract onPluginMessage(packet: PluginMessagePacket): Promise<void>;
	abstract onServerListPing(packet: ServerListPingPacket): Promise<void>;
	abstract onKickDisconnect(packet: KickDisconnectPacket): Promise<void>;
}
