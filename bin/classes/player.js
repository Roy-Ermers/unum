"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const card_1 = __importDefault(require("./card"));
const utils_1 = require("../utils");
class Player {
    constructor(socket, name, room) {
        this._cards = [];
        this.Host = false;
        this._ID = utils_1.GenerateID();
        this._room = room;
        this._socket = socket;
        this._name = name;
        this.setupEvents();
    }
    get ID() {
        return this._ID;
    }
    get SocketID() {
        var _a, _b;
        return _b = (_a = this._socket) === null || _a === void 0 ? void 0 : _a.id, (_b !== null && _b !== void 0 ? _b : "none");
    }
    get CardCount() {
        return this._cards.length;
    }
    get Name() {
        return this._name;
    }
    ClearCards() {
        this._cards = [];
    }
    AddCard(source, ...Card) {
        this._cards.push(...Card);
        this._socket.emit("AddedCard", { Card, source });
    }
    RemoveCard(card) {
        let index = this._cards.findIndex(x => card.Equals(x));
        if (index < 0)
            throw new Error("Card was not found.");
        this._cards.splice(index, 1);
    }
    HasCard(match) {
        return this._cards.some(card => card.Equals(match));
    }
    setupEvents() {
        this._socket.on("GetCard", (callback) => {
            callback(this._cards);
        });
        this._socket.on("TakeCard", () => {
            this.TakeCard();
        });
        this._socket.on("ThrowCard", (_card, callback) => {
            this.ThrowCard(_card, callback);
        });
        this._socket.on("CalledUno", () => {
            this._room.Log(`${this.Name} called unum.`);
            this._socket.broadcast.emit("CalledUno", this.toPublicObject());
        });
        this._socket.on("MissedUno", () => {
            this._room.Log(`${this.Name} missed unum.`);
            this.AddCard("stock", this._room.pickCard());
        });
    }
    ThrowCard(_card, callback) {
        let card = new card_1.default(_card);
        if (!this.HasCard(_card) || this._room.CurrentPlayer != this) {
            callback(false);
            this._socket.emit("Disconnect", { error: 423, reason: "Cheating is not allowed." });
            this._socket.disconnect(true);
            this._room.Warn(this.Name + " is cheating.");
        }
        if (card.CanMatch(this._room.RecentCard)) {
            this._room.AddToPile(card);
            this.RemoveCard(card);
            callback(true);
            if (this.CardCount == 1) {
                this._room.Log(`${this.Name} has unum.`);
                this._socket.emit("CallUno");
            }
            this._socket.emit("EndTurn");
            if (this.CardCount == 0) {
                this._room.EndGame(this);
                return;
            }
            if (card.Sign == "skip")
                this._room.SkipTurn();
            else if (card.Sign == "reverse")
                this._room.ChangeDirection();
            this._room.NextTurn(card.Penalty);
        }
        else
            callback(false);
    }
    TakeCard() {
        if (this._cards.some(card => card.CanMatch(this._room.RecentCard))) {
            this._room.Warn("Player " + this.Name + " has matching cards, but tried to draw anyway.");
            this._socket.emit("InvalidDraw");
            return;
        }
        let card = this._room.pickCard();
        let cards = [card];
        while (!card.CanMatch(this._room.RecentCard)) {
            card = this._room.pickCard();
            cards.push(card);
        }
        this.AddCard("stock", ...cards);
    }
    TakeTurn() {
        this._socket.emit("Turn");
    }
    toPublicObject() {
        return { ID: this.ID, Name: this.Name, Cards: this.CardCount, Host: this.Host };
    }
}
exports.default = Player;
