"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
const events_1 = require("events");
const player_1 = __importDefault(require("./player"));
const card_1 = __importDefault(require("./card"));
const logger_1 = __importDefault(require("../logger"));
var RoomState;
(function (RoomState) {
    RoomState[RoomState["WaitingForPlayers"] = 0] = "WaitingForPlayers";
    RoomState[RoomState["Started"] = 1] = "Started";
    RoomState[RoomState["Done"] = 2] = "Done";
})(RoomState = exports.RoomState || (exports.RoomState = {}));
;
var GameDirection;
(function (GameDirection) {
    GameDirection[GameDirection["ClockWise"] = 0] = "ClockWise";
    GameDirection[GameDirection["CounterClockWise"] = 1] = "CounterClockWise";
})(GameDirection = exports.GameDirection || (exports.GameDirection = {}));
;
class Room extends events_1.EventEmitter {
    constructor(name, password, secret, maxPlayers) {
        super();
        this.Name = "";
        this.Password = "";
        this.Secret = false;
        this.MaxPlayers = 6;
        this.Players = new Map();
        this.direction = GameDirection.ClockWise;
        this.Stack = [];
        this.Pile = [];
        this._ID = utils_1.GenerateID();
        this._socketID = utils_1.GenerateID();
        this._hostKey = utils_1.GenerateID();
        this._state = RoomState.WaitingForPlayers;
        this.Name = name;
        this.Password = password;
        this.Secret = secret;
        this.MaxPlayers = (maxPlayers !== null && maxPlayers !== void 0 ? maxPlayers : 4);
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
    get CurrentPlayer() {
        if (this.currentTurn !== undefined)
            return [...this.Players.values()][this.currentTurn];
    }
    get ConnectedPlayers() {
        return this.Players.size;
    }
    get RecentCard() {
        return this.Pile[this.Pile.length - 1];
    }
    startupSocket(io) {
        this.Log(`starting up socket for ${this.Name}`);
        this.socket = io;
        this.socket.on("connection", socket => {
            socket.emit("Authenticate", (res) => this.AuthenticatePlayer(res, socket));
            socket.on("RoomInfo", callback => {
                callback(this.toPublicObject());
            });
            socket.on("ListPlayers", callback => {
                callback([...this.Players.values()].map(x => x.toPublicObject()));
            });
            socket.on("StartGame", callback => {
                if (socket.id == this.HostID) {
                    this.StartGame();
                    socket.broadcast.emit("StartGame");
                    if (callback)
                        callback({});
                }
                if (callback)
                    callback({ error: 403, message: "You are not the host." });
            });
            socket.on("disconnect", () => {
                var _a, _b;
                let player = this.Players.get(socket.id);
                this.Log(((_a = player) === null || _a === void 0 ? void 0 : _a.Name) + " left");
                socket.broadcast.emit("PlayerLeft", (_b = player) === null || _b === void 0 ? void 0 : _b.toPublicObject());
                this.Players.delete(socket.id);
                if (this.Players.size == 0)
                    this.emit("delete");
                else
                    this.emit("update");
            });
        });
    }
    EndGame(winner) {
        var _a;
        (_a = this.socket) === null || _a === void 0 ? void 0 : _a.emit('EndGame', winner.toPublicObject());
        this.Log(`Game ended, player ${winner.Name} has won!`);
        this._state = RoomState.Done;
        this.emit("update");
    }
    /**
     * Authenticate an player and store its name.
     * @param socket the socket that needs to be authenticated.
     */
    AuthenticatePlayer({ Name, HostKey }, socket) {
        var _a, _b;
        if (this.Players.has(socket.id)) {
            socket.emit("Authenticated", { Host: (_a = this.Players.get(socket.id)) === null || _a === void 0 ? void 0 : _a.Host, Room: this.toPublicObject(), Players: [...this.Players.values()].map(x => x.toPublicObject()) });
            return;
        }
        if (this.ConnectedPlayers >= this.MaxPlayers) {
            socket.emit("Disconnect", { error: 429, reason: "Room is full." });
            return;
        }
        if (this.State != RoomState.WaitingForPlayers) {
            socket.emit("Disconnect", { error: 409, reason: "Game is already started." });
        }
        if (((_b = Name) === null || _b === void 0 ? void 0 : _b.length) >= 3) {
            let newPlayer = new player_1.default(socket, Name, this);
            if (HostKey == this.HostKey && !this.HostID) {
                this.Log(`${Name} is the host.`);
                delete this._hostKey;
                this.HostID = socket.id;
                newPlayer.Host = true;
                socket.emit("HostFound", newPlayer.toPublicObject());
            }
            this.Players.set(socket.id, newPlayer);
            this.Log(`Player ${newPlayer.Name} joined.`);
            socket.emit("Authenticated", { Host: this.HostID == socket.id, Room: this.toPublicObject(), Players: [...this.Players.values()].map(x => x.toPublicObject()) });
            socket.broadcast.emit("PlayerJoined", newPlayer.toPublicObject());
            this.emit("update");
            return;
        }
        socket.emit("Disconnect", { error: 417, reason: "Authenticating with invalid name." });
        setTimeout(() => socket.disconnect(false), 500);
    }
    AddToPile(...card) {
        var _a;
        this.Pile.push(...card);
        (_a = this.socket) === null || _a === void 0 ? void 0 : _a.emit("Pile", card);
    }
    /**
     * shuffles the game cards.
     */
    shuffleCards() {
        for (let i = this.Stack.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.Stack[i], this.Stack[j]] = [this.Stack[j], this.Stack[i]];
        }
    }
    pickCard() {
        var _a;
        if (this.Stack.length == 0) {
            this.Stack = card_1.default.PlayCards();
            this.Pile = [this.RecentCard];
            (_a = this.socket) === null || _a === void 0 ? void 0 : _a.emit("ClearStock");
            this.shuffleCards();
        }
        //@ts-ignore
        return this.Stack.pop();
    }
    /**
     * starts up the game
     */
    StartGame() {
        var _a, _b;
        this.Log(`Game started`);
        this.State = RoomState.Started;
        this.emit("update");
        this.Stack = card_1.default.PlayCards();
        this.Pile = [];
        this.shuffleCards();
        this.Players.forEach(player => {
            player.ClearCards();
            let Cards = this.Stack.slice(0, 7);
            this.Stack = this.Stack.slice(7);
            player.AddCard("stock", ...Cards);
        });
        let startCard = this.Stack.pop();
        while (((_a = startCard) === null || _a === void 0 ? void 0 : _a.Color) == "wild") {
            this.Stack.push(startCard);
            startCard = this.Stack.pop();
        }
        if (startCard)
            this.AddToPile(startCard);
        this.currentTurn = 0;
        (_b = this.CurrentPlayer) === null || _b === void 0 ? void 0 : _b.TakeTurn();
    }
    ChangeDirection() {
        var _a;
        if (this.direction == GameDirection.ClockWise)
            this.direction = GameDirection.CounterClockWise;
        else
            this.direction = GameDirection.ClockWise;
        this.Log("Direction changed to " + GameDirection[this.direction]);
        (_a = this.socket) === null || _a === void 0 ? void 0 : _a.emit("ChangeDirection", this.direction);
    }
    SkipTurn() {
        if (this.currentTurn === undefined)
            throw new Error("Game isn't started yet.");
        if (this.direction == GameDirection.ClockWise) {
            if (this.currentTurn < this.Players.size - 1)
                this.currentTurn++;
            else
                this.currentTurn = 0;
        }
        else {
            if (this.currentTurn > 0)
                this.currentTurn--;
            else
                this.currentTurn = this.Players.size;
        }
    }
    NextTurn(penalty) {
        var _a;
        if (this.currentTurn === undefined)
            throw new Error("Game isn't started yet.");
        let players = [...this.Players.values()];
        if (this.direction == GameDirection.ClockWise) {
            if (this.currentTurn < this.Players.size - 1)
                this.currentTurn++;
            else
                this.currentTurn = 0;
        }
        else {
            if (this.currentTurn > 0)
                this.currentTurn--;
            else
                this.currentTurn = this.Players.size - 1;
        }
        this.Log(`It's player ${(_a = players[this.currentTurn]) === null || _a === void 0 ? void 0 : _a.Name} turn.`);
        if (penalty)
            for (let i = penalty; i >= 0; i--)
                players[this.currentTurn].AddCard("stock", this.pickCard());
        players[this.currentTurn].TakeTurn();
        return players[this.currentTurn];
    }
    /**
     * Generates an object without the password.
     */
    toPublicObject() {
        var _a;
        return {
            ID: this._ID,
            Name: this.Name,
            Host: (_a = [...this.Players.values()].find(x => x.SocketID == this.HostID)) === null || _a === void 0 ? void 0 : _a.Name,
            HasPassword: this.Password != undefined && this.Password != "",
            State: this.State,
            Secret: this.Secret,
            Players: this.ConnectedPlayers,
            MaxPlayers: this.MaxPlayers
        };
    }
    //#debug
    Log(...message) {
        logger_1.default.Log;
        logger_1.default.Log(`[${this.ID} - "${this.Name}"] ${message}`);
    }
    Warn(...message) {
        logger_1.default.Warn(`[${this.ID} - "${this.Name}"] ${message}`);
    }
}
exports.default = Room;
