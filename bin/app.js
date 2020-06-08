"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const socket_io_1 = __importDefault(require("socket.io"));
const RoomManager_1 = require("./classes/RoomManager");
const logger_1 = __importDefault(require("./logger"));
const App = express_1.default();
App.get("/logs", (req, res) => res.contentType("html").send(logger_1.default.Html));
App.use(express_1.default.static("static", { extensions: ["html", "htm"] }));
App.use("*", (req, res) => {
    res.status(404).send("Not found");
});
console.log(`Uno listening on ${(_a = process.env.PORT) !== null && _a !== void 0 ? _a : 8080}`);
const IO = socket_io_1.default(App.listen((_b = process.env.PORT) !== null && _b !== void 0 ? _b : 8080));
RoomManager_1.RoomManager.Initialize(IO);
