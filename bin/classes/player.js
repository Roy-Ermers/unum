"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const card_1 = __importDefault(require("./card"));
class Player {
    constructor(socket, name) {
        this.Cards = [new card_1.default("special", "4")];
        this._socket = socket;
        this._name = name;
    }
    get Name() {
        return this._name;
    }
}
exports.default = Player;
