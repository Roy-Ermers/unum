export default class Logger {
	static log: string[] = [];

	static get Html() {
		let html = '<h1>Logs</h1>';

		html += this.log.map(x => `<p>${x}</p>`).join("");

		return html;
	}

	public static Log(...message: any[]) {
		console.log(...message);
		this.log.push("INFO " + message.toString());
	}
	public static Warn(...message: any[]) {
		console.warn(...message);
		this.log.push("WARN " + message.toString());
	}
}