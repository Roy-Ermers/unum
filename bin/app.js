"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const socket_io_1 = __importDefault(require("socket.io"));
const RoomManager_1 = require("./classes/RoomManager");
const App = express_1.default();
App.use(express_1.default.static("static", { extensions: ["html", "htm"] }));
App.use(socket_io_1.default);
console.log(`Uno listening on ${_a = process.env.PORT, (_a !== null && _a !== void 0 ? _a : 8080)}`);
const IO = socket_io_1.default(App.listen((_b = process.env.PORT, (_b !== null && _b !== void 0 ? _b : 8080))));
RoomManager_1.RoomManager.Initialize(IO);
