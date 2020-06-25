import Room from "./Room";
import Logger from "../logger";
import PlayerManager from "./PlayerManager";
import Player from "./player";
export default class RoomManager {
	private static rooms: Room[] = [];
	private static Socket: SocketIO.Namespace;
	private static Server: SocketIO.Server;

	public static get Rooms() {
		return this.rooms;
	}

	static initialize(IO: SocketIO.Server) {
		this.Server = IO;
		this.Socket = IO.of("/rooms");
		this.Socket.on("connection", socket => {

			socket.on("disconnect", () => {
				try {
					PlayerManager.leavePlayer(socket);
				}
				//player doesn't exist
				catch { }
			});

			socket.on("NewPlayer", ({ name, ID }, callback) => {
				const player = PlayerManager.joinPlayer(name, true, ID);
				player.Socket = socket;
				callback(player.ID);
			});

			socket.on("GetRooms", callback => {
				let result =
					this.Rooms
						.filter(x => !x.secret)
						.map(x => x.toPublicObject());
				callback(result);
			});

			socket.on("CreateRoom", (room, callback) => {
				if (typeof room == 'object') {

					if (room.Name == "") {
						callback({ error: 412, message: "Name is not correctly filled in." });

						return;
					}

					else if (room.maxPlayers < 2 || room.maxPlayers > 10) {
						callback({ error: 412, message: "Too many or too less players to make a game." });
						return;
					}
					const player = PlayerManager.getPlayer(room.Host) as Player;
					let newRoom = RoomManager.CreateRoom(room.Name, room.Password, room.Secret, player, room.MaxPlayers);
					callback({
						Room: newRoom.toPublicObject()
					});
				}
			});

			socket.on("Authenticate", (roomID, password, callback) => {
				let room = this.rooms.find(x => x.ID == roomID);
				if (room) {
					if (room.password == (password ?? ""))
						callback({ SocketID: room.SocketID });
					else callback({ error: 401, message: "Password is incorrect." })
				}
				else callback({ error: 404, message: "Room not found." });
			});
			socket.on("Join", (socketID) => {
				socket.join(socketID);
			})
		});
	}

	public static CreateRoom(Name: string, password: string, secret: boolean, Host: Player, maxPlayers?: number) {
		let room = new Room(Name, password, secret, Host, maxPlayers);

		room.startupSocket(this.Server.of("/" + room.SocketID));
		Logger.Log(`[Lobby] Created new room ${room.ID} ${room.name}`);
		this.rooms.unshift(room);
		if (!room.secret)
			room.on("update", () => this.SendUpdate());

		room.on("delete", () => this.Clean());
		return room;
	}

	public static SendUpdate() {
		Logger.Log("[lobby] sending update");
		this.Socket.emit("update",
			this.Rooms
				.filter(x => !x.secret)
				.map(x => x.toPublicObject()
				));
	}

	public static Clean() {
		this.Rooms.filter(x => x.playerCount == 0).forEach(x => this.RemoveRoom(x.ID));
	}

	public static RemoveRoom(ID: string) {
		Logger.Log(`[lobby] Removed room ${ID}`);
		this.Socket.emit("RemovedRoom", ID);
		this.rooms = this.rooms.filter(x => x.ID != ID);
	}
}