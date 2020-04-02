"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Logger {
    static Log(...message) {
        this.log.push("INFO " + message.toString());
    }
    static Warn(...message) {
        this.log.push("WARN " + message.toString());
    }
}
exports.default = Logger;
Logger.log = [];
