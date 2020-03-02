"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
const events_1 = __importDefault(require("events"));
const player_1 = __importDefault(require("./player"));
const card_1 = __importDefault(require("./card"));
var RoomState;
(function (RoomState) {
    RoomState[RoomState["WaitingForPlayers"] = 0] = "WaitingForPlayers";
    RoomState[RoomState["Started"] = 1] = "Started";
    RoomState[RoomState["Done"] = 2] = "Done";
})(RoomState = exports.RoomState || (exports.RoomState = {}));
;
class Room extends events_1.default {
    constructor(name, password, secret, maxPlayers) {
        super();
        this.Name = "";
        this.Password = "";
        this.Secret = false;
        this.MaxPlayers = 6;
        this.Players = new Map();
        this.Cards = [];
        this._ID = utils_1.GenerateID();
        this._socketID = utils_1.GenerateID();
        this._hostKey = utils_1.GenerateID();
        this._state = RoomState.WaitingForPlayers;
        this.Name = name;
        this.Password = password;
        this.Secret = secret;
        this.MaxPlayers = (maxPlayers !== null && maxPlayers !== void 0 ? maxPlayers : 4);
        this.Cards = card_1.default.PlayCards();
    }
    get ID() {
        return this._ID;
    }
    /**
     * used to determine which socket is the host.
     */
    get HostKey() {
        return this._hostKey;
    }
    get SocketID() {
        return this._socketID;
    }
    set State(val) {
        this._state = val;
    }
    get State() {
        return this._state;
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
                callback([...this.Players.values()].map(x => ({ Name: x.Name, Cards: x.CardCount, Host: x.SocketID == this.HostID })));
            });
            socket.on("StartGame", callback => {
                if (socket.id == this.HostID) {
                    this.StartGame();
                    callback();
                }
                callback({ error: 403, message: "You are not the host." });
            });
            socket.on("disconnect", () => {
                this.Players.delete(socket.id);
                this.emit("update");
            });
        });
    }
    /**
     * Authenticate an player and store its name.
     * @param socket the socket that needs to be authenticated.
     */
    AuthenticatePlayer({ Name, HostKey }, socket) {
        var _a;
        if (this.Players.has(socket.id)) {
            socket.emit("Authenticated", { Host: socket.id == this.HostID });
            return;
        }
        if (((_a = Name) === null || _a === void 0 ? void 0 : _a.length) >= 3 && this.ConnectedPlayers < this.MaxPlayers) {
            this.Players.set(socket.id, new player_1.default(socket, Name));
            if (HostKey == this.HostKey && !this.HostID) {
                console.log(`Found host ${Name} of room ${this.ID}`);
                delete this._hostKey;
                this.HostID = socket.id;
            }
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
     * shuffles the game cards.
     */
    shuffleCards() {
        for (let i = this.Cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.Cards[i], this.Cards[j]] = [this.Cards[j], this.Cards[i]];
        }
    }
    /**
     * starts up the game
     */
    StartGame() {
        this.shuffleCards();
        Object.values(this.Players).forEach(player => {
            player.AddCard(...this.Cards.slice(0, 7));
        });
    }
    /**
     * Generates an object without the password.
     */
    toPublicObject() {
        var _a;
        return {
            ID: this._ID,
            Name: this.Name,
            Host: (_a = Object.values(this.Players).find(x => x.SocketID == this.HostID)) === null || _a === void 0 ? void 0 : _a.Name,
            HasPassword: this.Password != undefined && this.Password != "",
            State: this.State,
            Players: this.ConnectedPlayers,
            MaxPlayers: this.MaxPlayers
        };
    }
}
exports.default = Room;
