"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
//#region Decorators
function Method(method) {
    return function (target, propertyKey, descriptor) {
        descriptor.value.method = method.toUpperCase();
    };
}
exports.Method = Method;
function GET(target, propertyKey, descriptor) {
    descriptor.value.method = "GET";
}
exports.GET = GET;
function POST(target, propertyKey, descriptor) {
    descriptor.value.method = "POST";
}
exports.POST = POST;
function DELETE(target, propertyKey, descriptor) {
    descriptor.value.method = "DELETE";
}
exports.DELETE = DELETE;
function PUT(target, propertyKey, descriptor) {
    descriptor.value.method = "PATCH";
}
exports.PUT = PUT;
function PATCH(target, propertyKey, descriptor) {
    descriptor.value.method = "PATCH";
}
exports.PATCH = PATCH;
function Path(path) {
    return function (target, propertyKey, descriptor) {
        descriptor.value.path = path;
    };
}
exports.Path = Path;
function Description(description) {
    return function (target, propertyKey, descriptor) {
        descriptor.value.description = description;
    };
}
exports.Description = Description;
function Response(response) {
    return function (target, propertyKey, descriptor) {
        descriptor.value.response = response;
    };
}
exports.Response = Response;
function Params(params) {
    return function (target, propertyKey, descriptor) {
        descriptor.value.params = params;
    };
}
exports.Params = Params;
//#endregion
class Endpoint {
    constructor() {
        this.router = express_1.default.Router();
        this.content = [];
        this.Initalize();
    }
    get Name() {
        return "";
    }
    get Description() {
        return "";
    }
    get Router() {
        return this.router;
    }
    get Content() {
        return this.content;
    }
    Initalize() {
        const blacklist = ["router", "constructor"];
        const keys = Reflect.ownKeys(Reflect.getPrototypeOf(this));
        keys.forEach(key => {
            let name = key;
            if (typeof this[name] == "function" && !blacklist.includes(name) && this[name].method) {
                let f = this[name];
                switch (f.method) {
                    case "GET":
                        this.router.get(f.path || "/", f);
                        break;
                    case "POST":
                        this.router.post(f.path || "/", f);
                        break;
                    case "DELETE":
                        this.router.delete(f.path || "/", f);
                        break;
                    case "PUT":
                        this.router.put(f.path || "/", f);
                        break;
                    case "PATCH":
                        this.router.patch(f.path || "/", f);
                        break;
                    default:
                        console.warn(`Invalid method (${f.method}) used on function ${name}`);
                }
                this.content.push({ Path: f.path || "/", Method: f.method, Description: f.description, Response: f.response, Params: f.Params });
            }
        });
    }
}
exports.default = Endpoint;
