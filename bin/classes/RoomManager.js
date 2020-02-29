"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Room_1 = __importDefault(require("./Room"));
class RoomManager {
    static get Rooms() {
        return this.rooms;
    }
    static Initialize(IO) {
        this.Server = IO;
        this.Socket = IO.of("/rooms");
        this.Socket.on("connection", socket => {
            console.log(`Got connection from ${socket.id}`);
            socket.on("GetRooms", callback => {
                let result = this.Rooms
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
                    let newRoom = RoomManager.CreateRoom(room.Name, room.Password, room.Secret, socket.id, room.MaxPlayers);
                    callback(newRoom.toPublicObject());
                }
            });
            socket.on("Authenticate", (roomID, password, callback) => {
                let room = this.rooms.find(x => x.ID == roomID);
                if (room) {
                    if (room.Password == ((password !== null && password !== void 0 ? password : "")))
                        callback({ SocketID: room.SocketID });
                    else
                        callback({ error: 401, message: "Password is incorrect." });
                }
                else
                    callback({ error: 404, message: "Room not found." });
            });
            socket.on("Join", (socketID) => {
                socket.join(socketID);
            });
        });
    }
    static CreateRoom(Name, password, secret, creatorID, maxPlayers) {
        let room = new Room_1.default(Name, password, secret, creatorID, maxPlayers);
        room.startupGame(this.Server.of("/" + room.SocketID));
        room.on("update", () => this.SendUpdate());
        console.log(`Created new room ${room.ID} ${room.Name} for ${room.CreatorID}`);
        this.rooms.unshift(room);
        if (!room.Secret) {
            room.on("update", () => this.SendUpdate());
        }
        return room;
    }
    static SendUpdate() {
        console.log("[lobby] sending update");
        this.Socket.emit("update", this.Rooms
            .filter(x => !x.Secret)
            .map(x => x.toPublicObject()));
    }
    static Clean() {
        this.Rooms.filter(x => x.ConnectedPlayers == 0).forEach(x => this.RemoveRoom(x.ID));
    }
    static RemoveRoom(ID) {
        console.log(`Removed room ${ID}`);
        this.Socket.emit("RemovedRoom", ID);
        this.rooms = this.rooms.filter(x => x.ID != ID);
    }
}
exports.RoomManager = RoomManager;
RoomManager.rooms = [];
