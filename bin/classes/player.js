"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const card_1 = __importDefault(require("./card"));
const utils_1 = require("../utils");
class Player {
    constructor(name, socket, room) {
        this._cards = [];
        this._ID = utils_1.GenerateID();
        this._name = name;
        this._room = room;
        this._socket = socket;
        if (this._socket !== undefined)
            this.setupEvents();
    }
    get Host() {
        var _a;
        return ((_a = this._room) === null || _a === void 0 ? void 0 : _a.host) == this;
    }
    set ID(val) {
        this._ID = val;
    }
    get ID() {
        return this._ID;
    }
    get SocketID() {
        var _a;
        return (_a = this._socket) === null || _a === void 0 ? void 0 : _a.id;
    }
    get CardCount() {
        return this._cards.length;
    }
    get Name() {
        return this._name;
    }
    get RoomID() {
        var _a;
        return (_a = this._room) === null || _a === void 0 ? void 0 : _a.ID;
    }
    set Socket(socket) {
        this._socket = socket;
        if (this._room)
            this.setupEvents();
    }
    clearCards() {
        this._cards = [];
    }
    joinRoom(room, socket) {
        this._room = room;
        this._socket = socket;
        this.setupEvents();
    }
    leaveRoom(room) {
        if (this._room != room)
            throw new Error("Player wasn't in this room.");
        this._room = undefined;
        this._socket = undefined;
    }
    addCard(source, ...Card) {
        if (!this._room || !this._socket)
            throw new Error("Player hasn't joined a room.");
        this._cards.push(...Card);
        this._socket.emit("AddedCard", { Card, source });
    }
    removeCard(card) {
        let index = this._cards.findIndex(x => card.Equals(x));
        if (index < 0)
            throw new Error("Card was not found.");
        this._cards.splice(index, 1);
    }
    hasCard(match) {
        return this._cards.some(card => card.Equals(match));
    }
    setupEvents() {
        if (!this._room || !this._socket)
            throw new Error("Player hasn't joined a room.");
        this._socket.on("GetCard", (callback) => {
            callback(this._cards);
        });
        this._socket.on("TakeCard", () => {
            this.takeCard();
        });
        this._socket.on("ThrowCard", (_card, callback) => {
            this.throwCard(_card, callback);
        });
        this._socket.on("CalledUno", () => {
            if (!this._room || !this._socket)
                throw new Error("Player hasn't joined a room.");
            this._room.log(`${this.Name} called unum.`);
            this._socket.broadcast.emit("CalledUno", this.toPublicObject());
        });
        this._socket.on("MissedUno", () => {
            if (!this._room || !this._socket)
                throw new Error("Player hasn't joined a room.");
            this._room.log(`${this.Name} missed unum.`);
            this.addCard("stock", this._room.pickCard());
        });
    }
    /**
     * This method updates its client with all data such as cards and the pile.
     */
    sendData() {
        var _a, _b, _c, _d;
        (_a = this._socket) === null || _a === void 0 ? void 0 : _a.emit("data", { cards: this._cards, pile: (_b = this._room) === null || _b === void 0 ? void 0 : _b.recentCard, roomState: (_c = this._room) === null || _c === void 0 ? void 0 : _c.State, turn: ((_d = this._room) === null || _d === void 0 ? void 0 : _d.currentPlayer) == this });
    }
    throwCard(_card, callback) {
        if (!this._room || !this._socket)
            throw new Error("Player hasn't joined a room.");
        let card = new card_1.default(_card);
        if (!this.hasCard(_card) || this._room.currentPlayer != this) {
            callback(false);
            this._socket.emit("Disconnect", { error: 423, reason: "Cheating is not allowed." });
            this._socket.disconnect(true);
            this._room.warn(this.Name + " is cheating.");
        }
        if (card.CanMatch(this._room.recentCard)) {
            this._room.addToPile(card);
            this.removeCard(card);
            callback(true);
            if (this.CardCount == 1) {
                this._room.log(`${this.Name} has unum.`);
                this._socket.emit("CallUno");
            }
            this._socket.emit("EndTurn");
            if (this.CardCount == 0) {
                this._room.endGame(this);
                return;
            }
            if (card.Sign == "skip")
                this._room.nextTurn();
            else if (card.Sign == "reverse")
                this._room.changeDirection();
            this._room.endTurn(card.Penalty);
        }
        else
            callback(false);
    }
    takeCard() {
        if (!this._room || !this._socket)
            throw new Error("Player hasn't joined a room.");
        if (this._cards.some(card => { var _a; return card.CanMatch((_a = this._room) === null || _a === void 0 ? void 0 : _a.recentCard); })) {
            this._room.warn("Player " + this.Name + " has matching cards, but tried to draw anyway.");
            this._socket.emit("InvalidDraw");
            return;
        }
        let card = this._room.pickCard();
        let cards = [card];
        while (!card.CanMatch(this._room.recentCard)) {
            card = this._room.pickCard();
            cards.push(card);
        }
        this.addCard("stock", ...cards);
    }
    takeTurn() {
        if (!this._room || !this._socket)
            throw new Error("Player hasn't joined a room.");
        this._socket.emit("Turn");
    }
    toPublicObject() {
        return { ID: this.ID, Name: this.Name, Cards: this.CardCount, Host: this.Host };
    }
}
exports.default = Player;
//# sourceMappingURL=player.js.map