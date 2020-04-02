import Room from "./Room";
export class RoomManager {
	private static rooms: Room[] = [];
	private static Socket: SocketIO.Namespace;
	private static Server: SocketIO.Server;
	public static get Rooms() {
		return this.rooms;
	}
	static Initialize(IO: SocketIO.Server) {
		this.Server = IO;
		this.Socket = IO.of("/rooms");

		this.Socket.on("connection", socket => {
			console.log(`Got connection from ${socket.id}`);
			socket.on("GetRooms", callback => {
				let result =
					this.Rooms
						.filter(x => !x.Secret)
						.map(x => x.toPublicObject());
				callback(result);
			});

			socket.on("CreateRoom", (room, callback) => {
				console.log("CreateRoom");
				if (typeof room == 'object') {

					if (room.Name == "") {
						callback({ error: 412, message: "Name is not correctly filled in." });

						return;
					}

					else if (room.maxPlayers < 2 || room.maxPlayers > 10) {
						callback({ error: 412, message: "Too many or too less players to make a game." });
						return;
					}

					let newRoom = RoomManager.CreateRoom(room.Name, room.Password, room.Secret, room.MaxPlayers);
					callback({
						Room: newRoom.toPublicObject(),
						HostKey: newRoom.HostKey
					});
				}
			});

			socket.on("Authenticate", (roomID, password, callback) => {
				let room = this.rooms.find(x => x.ID == roomID);
				if (room) {
					if (room.Password == (password ?? ""))
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
	public static CreateRoom(Name: string, password: string, secret: boolean, maxPlayers?: number) {
		let room = new Room(Name, password, secret, maxPlayers);

		room.startupSocket(this.Server.of("/" + room.SocketID));
		room.on("update", () => this.SendUpdate());
		console.log(`Created new room ${room.ID} ${room.Name} for ${room.HostID}`);
		this.rooms.unshift(room);
		if (!room.Secret) {
			room.on("update", () => this.SendUpdate());
		}
		room.on("delete", () => this.Clean());
		return room;
	}

	public static SendUpdate() {
		console.log("[lobby] sending update");
		this.Socket.emit("update",
			this.Rooms
				.filter(x => !x.Secret)
				.map(x => x.toPublicObject()
				));
	}
	
	public static Clean() {
		this.Rooms.filter(x => x.ConnectedPlayers == 0).forEach(x => this.RemoveRoom(x.ID));
	}

	public static RemoveRoom(ID: string) {
		console.log(`Removed room ${ID}`);
		this.Socket.emit("RemovedRoom", ID);
		this.rooms = this.rooms.filter(x => x.ID != ID);
	}
}