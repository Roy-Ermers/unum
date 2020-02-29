import crypto from "crypto";
export function GenerateID() {
	return crypto.randomBytes(16).toString("hex");
}