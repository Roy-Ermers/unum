"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const endpoint_1 = __importStar(require("../endpoint"));
const express_1 = __importDefault(require("express"));
const RoomManager_1 = require("../classes/RoomManager");
class RoomEndpoint extends endpoint_1.default {
    get Name() {
        return "rooms";
    }
    get Description() {
        return `Manages all rooms in this application.`;
    }
    Get(req, res) {
    }
    CreateRoom(req, res) {
        var _a;
        if (req.body) {
            if (((_a = req.body) === null || _a === void 0 ? void 0 : _a.Name) == "")
                res.status(412).send({ message: "Name is not correctly filled in." });
            else if (req.body.maxPlayers < 2 || req.body.maxPlayers > 10)
                res.status(412).send({ message: "Too many or too less players to make a game." });
        }
        let newRoom = RoomManager_1.RoomManager.CreateRoom(req.body.Name, req.body.Password, req.body.Secret);
        newRoom.MaxPlayers = req.body.MaxPlayers;
        res.status(201).send(newRoom.toPublicObject());
    }
}
__decorate([
    endpoint_1.GET,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], RoomEndpoint.prototype, "Get", null);
__decorate([
    endpoint_1.POST,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], RoomEndpoint.prototype, "CreateRoom", null);
exports.default = RoomEndpoint;
