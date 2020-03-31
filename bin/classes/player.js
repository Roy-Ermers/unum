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
        return (_b = (_a = this._socket) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : "none";
    }
    get CardCount() {
        return this._cards.length;
    }
    get Name() {
        return this._name;
    }
    AddCard(...Card) {
        this._cards.push(...Card);
        this._socket.emit("AddedCard", Card);
    }
    HasCard(suit, sign) {
        return this._cards.some(card => {
            if (sign) {
                if (suit != undefined)
                    return card.Color == suit && card.Sign == sign;
                return card.Sign == sign;
            }
            return card.Color == suit || card.Sign == suit;
        });
    }
    setupEvents() {
        console.log(this._socket.connected);
        this._socket.on("GetCard", (callback) => {
            console.log("Player " + this.Name + " requested their cards.");
            callback(this._cards);
        });
        this._socket.on("ThrowCard", (_card, callback) => {
            let card = new card_1.default(_card);
            if (!this._cards.some(x => x.Color == card.Color && x.Sign == card.Sign && x.Penalty == card.Penalty)) {
                callback(false);
                this._socket.emit("Disconnect", { error: 423, reason: "Cheating is not allowed." });
                this._socket.disconnect(true);
                console.warn(this.Name + " is cheating.");
            }
            console.log(card, this._room.RecentCard);
            if (card.CanMatch(this._room.RecentCard)) {
                this._room.AddToPile(card);
                callback(true);
                this._room.NextTurn(card.Penalty);
                this._socket.emit("EndTurn");
            }
            else
                callback(false);
        });
    }
    TakeTurn() {
        this._socket.emit("Turn");
    }
    toPublicObject() {
        return { ID: this.ID, Name: this.Name, Cards: this.CardCount, Host: this.Host };
    }
}
exports.default = Player;
