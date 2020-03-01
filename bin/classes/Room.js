"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
const events_1 = __importDefault(require("events"));
const player_1 = __importDefault(require("./player"));
var RoomState;
(function (RoomState) {
    RoomState[RoomState["WaitingForPlayers"] = 0] = "WaitingForPlayers";
    RoomState[RoomState["Started"] = 1] = "Started";
    RoomState[RoomState["Done"] = 2] = "Done";
})(RoomState = exports.RoomState || (exports.RoomState = {}));
;
class Room extends events_1.default {
    constructor(name, password, secret, creatorID, maxPlayers) {
        super();
        this.Name = "";
        this.Password = "";
        this.Secret = false;
        this.MaxPlayers = 6;
        this.Players = {};
        this.CardsInPlay = [];
        this._ID = utils_1.GenerateID();
        this._socketID = utils_1.GenerateID();
        this.CreatorID = creatorID;
        this.State = RoomState.WaitingForPlayers;
        this.Name = name;
        this.Password = password;
        this.Secret = secret;
        this.MaxPlayers = (maxPlayers !== null && maxPlayers !== void 0 ? maxPlayers : 4);
    }
    get ID() {
        return this._ID;
    }
    get SocketID() {
        return this._socketID;
    }
    get ConnectedPlayers() {
        var _a;
        return _a = Object.keys(this.Players).length, (_a !== null && _a !== void 0 ? _a : 0);
    }
    startupSocket(io) {
        console.log(`starting up socket for ${this.Name}`);
        io.in(this.SocketID).on("connection", socket => {
            console.log(`Got connection from ${socket.id} to room ${this.Name}`);
            socket.emit("Authenticate", (res) => this.AuthenticatePlayer(res, socket));
            socket.on("info", callback => {
                console.log("info for " + this.Name);
                callback(this.toPublicObject());
            });
            socket.on("listPlayers", callback => {
                console.log("sending player info");
                callback(Object.values(this.Players).map(x => ({ Name: x.Name, Cards: x.Cards.length })));
            });
            socket.on("disconnect", () => {
                delete this.Players[socket.id];
                this.emit("update");
            });
        });
    }
    /**
     * Authenticate an player and store its name.
     * @param socket the socket that needs to be authenticated.
     */
    AuthenticatePlayer({ Name }, socket) {
        var _a;
        if (((_a = Name) === null || _a === void 0 ? void 0 : _a.length) >= 3 && this.ConnectedPlayers < this.MaxPlayers) {
            this.Players[socket.id] = new player_1.default(socket, Name);
            socket.emit("Authenticated");
            this.emit("update");
            return;
        }
        else if (this.ConnectedPlayers >= this.MaxPlayers)
            socket.emit("Disconnect", { reason: "Room is full." });
        else
            socket.emit("Disconnect", { reason: "Authenticating with invalid name." });
        setTimeout(() => socket.disconnect(false), 500);
    }
    /**
     * Generates an object without the password.
     */
    toPublicObject() {
        return {
            ID: this._ID,
            Name: this.Name,
            HasPassword: this.Password != undefined && this.Password != "",
            State: this.State,
            Players: this.ConnectedPlayers,
            MaxPlayers: this.MaxPlayers
        };
    }
}
exports.default = Room;
