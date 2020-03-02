"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Player {
    constructor(socket, name) {
        this._cards = [];
        this._socket = socket;
        this._name = name;
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
    AddCard(...Card) {
        this._cards.push(...Card);
        this._socket.emit("AddedCard", Card);
    }
    setupEvents() {
        this._socket.on("getCards", callback => callback(this._cards));
    }
}
exports.default = Player;
