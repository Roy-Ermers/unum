"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const endpoint_1 = __importDefault(require("../endpoint"));
class Rooms extends endpoint_1.default {
    get Name() {
        return "Rooms";
    }
    get Description() {
        return `Manages all rooms in this application.`;
    }
}
exports.default = Rooms;
