"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Logger {
    static get Html() {
        let html = '<h1>Logs</h1>';
        html += this.log.map(x => `<p>${x}</p>`).join("");
        return html;
    }
    static Log(...message) {
        console.log(...message);
        this.log.push("INFO " + message.toString());
    }
    static Warn(...message) {
        console.warn(...message);
        this.log.push("WARN " + message.toString());
    }
}
exports.default = Logger;
Logger.log = [];
