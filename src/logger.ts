export default class Logger {
	static log: string[] = [];

	public static Log(...message: any[]) {
		this.log.push("INFO " + message.toString());
	}
	public static Warn(...message: any[]) {
		this.log.push("WARN " + message.toString());
	}
}