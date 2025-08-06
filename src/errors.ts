// src/errors.ts - Custom error classes
export class MerakiError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "MerakiError";
	}
}

export class APIError extends Error {
	public statusCode: number;
	public responseBody: string;

	constructor(message: string, statusCode: number, responseBody: string) {
		super(message);
		this.name = "APIError";
		this.statusCode = statusCode;
		this.responseBody = responseBody;
	}
}
