import { createRequire } from "node:module";
import { handle } from "hono/aws-lambda";
import { trpcServer } from "@hono/trpc-server";
import "dotenv/config";
import z$1, { z } from "zod";
import { drizzle } from "drizzle-orm/node-postgres";
import { and, eq, relations } from "drizzle-orm";
import { boolean, index, pgTable, serial, text, timestamp, unique } from "drizzle-orm/pg-core";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { TRPCError, initTRPC } from "@trpc/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
var __require = /* @__PURE__ */ createRequire(import.meta.url);
//#endregion
//#region ../../node_modules/.pnpm/@t3-oss+env-core@0.13.11_typescript@6.0.3_zod@4.4.3/node_modules/@t3-oss/env-core/dist/standard.js
function ensureSynchronous(value, message) {
	if (value instanceof Promise) throw new Error(message);
}
function parseWithDictionary(dictionary, value) {
	const result = {};
	const issues = [];
	for (const key in dictionary) {
		const propResult = dictionary[key]["~standard"].validate(value[key]);
		ensureSynchronous(propResult, `Validation must be synchronous, but ${key} returned a Promise.`);
		if (propResult.issues) {
			issues.push(...propResult.issues.map((issue) => ({
				...issue,
				message: issue.message,
				path: [key, ...issue.path ?? []]
			})));
			continue;
		}
		result[key] = propResult.value;
	}
	if (issues.length) return { issues };
	return { value: result };
}
//#endregion
//#region ../../node_modules/.pnpm/@t3-oss+env-core@0.13.11_typescript@6.0.3_zod@4.4.3/node_modules/@t3-oss/env-core/dist/index.js
/**
* Create a new environment variable schema.
*/
function createEnv(opts) {
	const runtimeEnv = opts.runtimeEnvStrict ?? opts.runtimeEnv ?? process.env;
	if (opts.emptyStringAsUndefined ?? false) {
		for (const [key, value] of Object.entries(runtimeEnv)) if (value === "") delete runtimeEnv[key];
	}
	if (!!opts.skipValidation) {
		if (opts.extends) for (const preset of opts.extends) preset.skipValidation = true;
		return runtimeEnv;
	}
	const _client = typeof opts.client === "object" ? opts.client : {};
	const _server = typeof opts.server === "object" ? opts.server : {};
	const _shared = typeof opts.shared === "object" ? opts.shared : {};
	const isServer = opts.isServer ?? (typeof window === "undefined" || "Deno" in window);
	const finalSchemaShape = isServer ? {
		..._server,
		..._shared,
		..._client
	} : {
		..._client,
		..._shared
	};
	const parsed = (opts.createFinalSchema?.(finalSchemaShape, isServer))?.["~standard"].validate(runtimeEnv) ?? parseWithDictionary(finalSchemaShape, runtimeEnv);
	ensureSynchronous(parsed, "Validation must be synchronous");
	const onValidationError = opts.onValidationError ?? ((issues) => {
		console.error("❌ Invalid environment variables:", issues);
		throw new Error("Invalid environment variables");
	});
	const onInvalidAccess = opts.onInvalidAccess ?? (() => {
		throw new Error("❌ Attempted to access a server-side environment variable on the client");
	});
	if (parsed.issues) return onValidationError(parsed.issues);
	const isServerAccess = (prop) => {
		if (!opts.clientPrefix) return true;
		return !prop.startsWith(opts.clientPrefix) && !(prop in _shared);
	};
	const isValidServerAccess = (prop) => {
		return isServer || !isServerAccess(prop);
	};
	const ignoreProp = (prop) => {
		return prop === "__esModule" || prop === "$$typeof";
	};
	const extendedObj = (opts.extends ?? []).reduce((acc, curr) => {
		return Object.assign(acc, curr);
	}, {});
	const fullObj = Object.assign(extendedObj, parsed.value);
	return new Proxy(fullObj, { get(target, prop) {
		if (typeof prop !== "string") return void 0;
		if (ignoreProp(prop)) return void 0;
		if (!isValidServerAccess(prop)) return onInvalidAccess(prop);
		return Reflect.get(target, prop);
	} });
}
//#endregion
//#region ../../packages/env/src/server.ts
const env = createEnv({
	server: {
		DATABASE_URL: z.string().min(1),
		BETTER_AUTH_SECRET: z.string().min(32),
		BETTER_AUTH_URL: z.url(),
		CORS_ORIGIN: z.url(),
		NODE_ENV: z.enum([
			"development",
			"production",
			"test"
		]).default("development"),
		OPENAI_API_KEY: z.string().min(1),
		OPENAI_BASE_URL: z.string().url().optional()
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true
});
//#endregion
//#region ../../node_modules/.pnpm/postgres-array@2.0.0/node_modules/postgres-array/index.js
var require_postgres_array = /* @__PURE__ */ __commonJSMin(((exports) => {
	exports.parse = function(source, transform) {
		return new ArrayParser(source, transform).parse();
	};
	var ArrayParser = class ArrayParser {
		constructor(source, transform) {
			this.source = source;
			this.transform = transform || identity;
			this.position = 0;
			this.entries = [];
			this.recorded = [];
			this.dimension = 0;
		}
		isEof() {
			return this.position >= this.source.length;
		}
		nextCharacter() {
			var character = this.source[this.position++];
			if (character === "\\") return {
				value: this.source[this.position++],
				escaped: true
			};
			return {
				value: character,
				escaped: false
			};
		}
		record(character) {
			this.recorded.push(character);
		}
		newEntry(includeEmpty) {
			var entry;
			if (this.recorded.length > 0 || includeEmpty) {
				entry = this.recorded.join("");
				if (entry === "NULL" && !includeEmpty) entry = null;
				if (entry !== null) entry = this.transform(entry);
				this.entries.push(entry);
				this.recorded = [];
			}
		}
		consumeDimensions() {
			if (this.source[0] === "[") {
				while (!this.isEof()) if (this.nextCharacter().value === "=") break;
			}
		}
		parse(nested) {
			var character, parser, quote;
			this.consumeDimensions();
			while (!this.isEof()) {
				character = this.nextCharacter();
				if (character.value === "{" && !quote) {
					this.dimension++;
					if (this.dimension > 1) {
						parser = new ArrayParser(this.source.substr(this.position - 1), this.transform);
						this.entries.push(parser.parse(true));
						this.position += parser.position - 2;
					}
				} else if (character.value === "}" && !quote) {
					this.dimension--;
					if (!this.dimension) {
						this.newEntry();
						if (nested) return this.entries;
					}
				} else if (character.value === "\"" && !character.escaped) {
					if (quote) this.newEntry(true);
					quote = !quote;
				} else if (character.value === "," && !quote) this.newEntry();
				else this.record(character.value);
			}
			if (this.dimension !== 0) throw new Error("array dimension not balanced");
			return this.entries;
		}
	};
	function identity(value) {
		return value;
	}
}));
//#endregion
//#region ../../node_modules/.pnpm/pg-types@2.2.0/node_modules/pg-types/lib/arrayParser.js
var require_arrayParser = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var array = require_postgres_array();
	module.exports = { create: function(source, transform) {
		return { parse: function() {
			return array.parse(source, transform);
		} };
	} };
}));
//#endregion
//#region ../../node_modules/.pnpm/postgres-date@1.0.7/node_modules/postgres-date/index.js
var require_postgres_date = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var DATE_TIME = /(\d{1,})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(\.\d{1,})?.*?( BC)?$/;
	var DATE = /^(\d{1,})-(\d{2})-(\d{2})( BC)?$/;
	var TIME_ZONE = /([Z+-])(\d{2})?:?(\d{2})?:?(\d{2})?/;
	var INFINITY = /^-?infinity$/;
	module.exports = function parseDate(isoDate) {
		if (INFINITY.test(isoDate)) return Number(isoDate.replace("i", "I"));
		var matches = DATE_TIME.exec(isoDate);
		if (!matches) return getDate(isoDate) || null;
		var isBC = !!matches[8];
		var year = parseInt(matches[1], 10);
		if (isBC) year = bcYearToNegativeYear(year);
		var month = parseInt(matches[2], 10) - 1;
		var day = matches[3];
		var hour = parseInt(matches[4], 10);
		var minute = parseInt(matches[5], 10);
		var second = parseInt(matches[6], 10);
		var ms = matches[7];
		ms = ms ? 1e3 * parseFloat(ms) : 0;
		var date;
		var offset = timeZoneOffset(isoDate);
		if (offset != null) {
			date = new Date(Date.UTC(year, month, day, hour, minute, second, ms));
			if (is0To99(year)) date.setUTCFullYear(year);
			if (offset !== 0) date.setTime(date.getTime() - offset);
		} else {
			date = new Date(year, month, day, hour, minute, second, ms);
			if (is0To99(year)) date.setFullYear(year);
		}
		return date;
	};
	function getDate(isoDate) {
		var matches = DATE.exec(isoDate);
		if (!matches) return;
		var year = parseInt(matches[1], 10);
		if (!!matches[4]) year = bcYearToNegativeYear(year);
		var month = parseInt(matches[2], 10) - 1;
		var day = matches[3];
		var date = new Date(year, month, day);
		if (is0To99(year)) date.setFullYear(year);
		return date;
	}
	function timeZoneOffset(isoDate) {
		if (isoDate.endsWith("+00")) return 0;
		var zone = TIME_ZONE.exec(isoDate.split(" ")[1]);
		if (!zone) return;
		var type = zone[1];
		if (type === "Z") return 0;
		var sign = type === "-" ? -1 : 1;
		return (parseInt(zone[2], 10) * 3600 + parseInt(zone[3] || 0, 10) * 60 + parseInt(zone[4] || 0, 10)) * sign * 1e3;
	}
	function bcYearToNegativeYear(year) {
		return -(year - 1);
	}
	function is0To99(num) {
		return num >= 0 && num < 100;
	}
}));
//#endregion
//#region ../../node_modules/.pnpm/xtend@4.0.2/node_modules/xtend/mutable.js
var require_mutable = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = extend;
	var hasOwnProperty = Object.prototype.hasOwnProperty;
	function extend(target) {
		for (var i = 1; i < arguments.length; i++) {
			var source = arguments[i];
			for (var key in source) if (hasOwnProperty.call(source, key)) target[key] = source[key];
		}
		return target;
	}
}));
//#endregion
//#region ../../node_modules/.pnpm/postgres-interval@1.2.0/node_modules/postgres-interval/index.js
var require_postgres_interval = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var extend = require_mutable();
	module.exports = PostgresInterval;
	function PostgresInterval(raw) {
		if (!(this instanceof PostgresInterval)) return new PostgresInterval(raw);
		extend(this, parse(raw));
	}
	var properties = [
		"seconds",
		"minutes",
		"hours",
		"days",
		"months",
		"years"
	];
	PostgresInterval.prototype.toPostgres = function() {
		var filtered = properties.filter(this.hasOwnProperty, this);
		if (this.milliseconds && filtered.indexOf("seconds") < 0) filtered.push("seconds");
		if (filtered.length === 0) return "0";
		return filtered.map(function(property) {
			var value = this[property] || 0;
			if (property === "seconds" && this.milliseconds) value = (value + this.milliseconds / 1e3).toFixed(6).replace(/\.?0+$/, "");
			return value + " " + property;
		}, this).join(" ");
	};
	var propertiesISOEquivalent = {
		years: "Y",
		months: "M",
		days: "D",
		hours: "H",
		minutes: "M",
		seconds: "S"
	};
	var dateProperties = [
		"years",
		"months",
		"days"
	];
	var timeProperties = [
		"hours",
		"minutes",
		"seconds"
	];
	PostgresInterval.prototype.toISOString = PostgresInterval.prototype.toISO = function() {
		var datePart = dateProperties.map(buildProperty, this).join("");
		var timePart = timeProperties.map(buildProperty, this).join("");
		return "P" + datePart + "T" + timePart;
		function buildProperty(property) {
			var value = this[property] || 0;
			if (property === "seconds" && this.milliseconds) value = (value + this.milliseconds / 1e3).toFixed(6).replace(/0+$/, "");
			return value + propertiesISOEquivalent[property];
		}
	};
	var NUMBER = "([+-]?\\d+)";
	var YEAR = NUMBER + "\\s+years?";
	var MONTH = NUMBER + "\\s+mons?";
	var DAY = NUMBER + "\\s+days?";
	var INTERVAL = new RegExp([
		YEAR,
		MONTH,
		DAY,
		"([+-])?([\\d]*):(\\d\\d):(\\d\\d)\\.?(\\d{1,6})?"
	].map(function(regexString) {
		return "(" + regexString + ")?";
	}).join("\\s*"));
	var positions = {
		years: 2,
		months: 4,
		days: 6,
		hours: 9,
		minutes: 10,
		seconds: 11,
		milliseconds: 12
	};
	var negatives = [
		"hours",
		"minutes",
		"seconds",
		"milliseconds"
	];
	function parseMilliseconds(fraction) {
		var microseconds = fraction + "000000".slice(fraction.length);
		return parseInt(microseconds, 10) / 1e3;
	}
	function parse(interval) {
		if (!interval) return {};
		var matches = INTERVAL.exec(interval);
		var isNegative = matches[8] === "-";
		return Object.keys(positions).reduce(function(parsed, property) {
			var value = matches[positions[property]];
			if (!value) return parsed;
			value = property === "milliseconds" ? parseMilliseconds(value) : parseInt(value, 10);
			if (!value) return parsed;
			if (isNegative && ~negatives.indexOf(property)) value *= -1;
			parsed[property] = value;
			return parsed;
		}, {});
	}
}));
//#endregion
//#region ../../node_modules/.pnpm/postgres-bytea@1.0.1/node_modules/postgres-bytea/index.js
var require_postgres_bytea = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var bufferFrom = Buffer.from || Buffer;
	module.exports = function parseBytea(input) {
		if (/^\\x/.test(input)) return bufferFrom(input.substr(2), "hex");
		var output = "";
		var i = 0;
		while (i < input.length) if (input[i] !== "\\") {
			output += input[i];
			++i;
		} else if (/[0-7]{3}/.test(input.substr(i + 1, 3))) {
			output += String.fromCharCode(parseInt(input.substr(i + 1, 3), 8));
			i += 4;
		} else {
			var backslashes = 1;
			while (i + backslashes < input.length && input[i + backslashes] === "\\") backslashes++;
			for (var k = 0; k < Math.floor(backslashes / 2); ++k) output += "\\";
			i += Math.floor(backslashes / 2) * 2;
		}
		return bufferFrom(output, "binary");
	};
}));
//#endregion
//#region ../../node_modules/.pnpm/pg-types@2.2.0/node_modules/pg-types/lib/textParsers.js
var require_textParsers = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var array = require_postgres_array();
	var arrayParser = require_arrayParser();
	var parseDate = require_postgres_date();
	var parseInterval = require_postgres_interval();
	var parseByteA = require_postgres_bytea();
	function allowNull(fn) {
		return function nullAllowed(value) {
			if (value === null) return value;
			return fn(value);
		};
	}
	function parseBool(value) {
		if (value === null) return value;
		return value === "TRUE" || value === "t" || value === "true" || value === "y" || value === "yes" || value === "on" || value === "1";
	}
	function parseBoolArray(value) {
		if (!value) return null;
		return array.parse(value, parseBool);
	}
	function parseBaseTenInt(string) {
		return parseInt(string, 10);
	}
	function parseIntegerArray(value) {
		if (!value) return null;
		return array.parse(value, allowNull(parseBaseTenInt));
	}
	function parseBigIntegerArray(value) {
		if (!value) return null;
		return array.parse(value, allowNull(function(entry) {
			return parseBigInteger(entry).trim();
		}));
	}
	var parsePointArray = function(value) {
		if (!value) return null;
		return arrayParser.create(value, function(entry) {
			if (entry !== null) entry = parsePoint(entry);
			return entry;
		}).parse();
	};
	var parseFloatArray = function(value) {
		if (!value) return null;
		return arrayParser.create(value, function(entry) {
			if (entry !== null) entry = parseFloat(entry);
			return entry;
		}).parse();
	};
	var parseStringArray = function(value) {
		if (!value) return null;
		return arrayParser.create(value).parse();
	};
	var parseDateArray = function(value) {
		if (!value) return null;
		return arrayParser.create(value, function(entry) {
			if (entry !== null) entry = parseDate(entry);
			return entry;
		}).parse();
	};
	var parseIntervalArray = function(value) {
		if (!value) return null;
		return arrayParser.create(value, function(entry) {
			if (entry !== null) entry = parseInterval(entry);
			return entry;
		}).parse();
	};
	var parseByteAArray = function(value) {
		if (!value) return null;
		return array.parse(value, allowNull(parseByteA));
	};
	var parseInteger = function(value) {
		return parseInt(value, 10);
	};
	var parseBigInteger = function(value) {
		var valStr = String(value);
		if (/^\d+$/.test(valStr)) return valStr;
		return value;
	};
	var parseJsonArray = function(value) {
		if (!value) return null;
		return array.parse(value, allowNull(JSON.parse));
	};
	var parsePoint = function(value) {
		if (value[0] !== "(") return null;
		value = value.substring(1, value.length - 1).split(",");
		return {
			x: parseFloat(value[0]),
			y: parseFloat(value[1])
		};
	};
	var parseCircle = function(value) {
		if (value[0] !== "<" && value[1] !== "(") return null;
		var point = "(";
		var radius = "";
		var pointParsed = false;
		for (var i = 2; i < value.length - 1; i++) {
			if (!pointParsed) point += value[i];
			if (value[i] === ")") {
				pointParsed = true;
				continue;
			} else if (!pointParsed) continue;
			if (value[i] === ",") continue;
			radius += value[i];
		}
		var result = parsePoint(point);
		result.radius = parseFloat(radius);
		return result;
	};
	var init = function(register) {
		register(20, parseBigInteger);
		register(21, parseInteger);
		register(23, parseInteger);
		register(26, parseInteger);
		register(700, parseFloat);
		register(701, parseFloat);
		register(16, parseBool);
		register(1082, parseDate);
		register(1114, parseDate);
		register(1184, parseDate);
		register(600, parsePoint);
		register(651, parseStringArray);
		register(718, parseCircle);
		register(1e3, parseBoolArray);
		register(1001, parseByteAArray);
		register(1005, parseIntegerArray);
		register(1007, parseIntegerArray);
		register(1028, parseIntegerArray);
		register(1016, parseBigIntegerArray);
		register(1017, parsePointArray);
		register(1021, parseFloatArray);
		register(1022, parseFloatArray);
		register(1231, parseFloatArray);
		register(1014, parseStringArray);
		register(1015, parseStringArray);
		register(1008, parseStringArray);
		register(1009, parseStringArray);
		register(1040, parseStringArray);
		register(1041, parseStringArray);
		register(1115, parseDateArray);
		register(1182, parseDateArray);
		register(1185, parseDateArray);
		register(1186, parseInterval);
		register(1187, parseIntervalArray);
		register(17, parseByteA);
		register(114, JSON.parse.bind(JSON));
		register(3802, JSON.parse.bind(JSON));
		register(199, parseJsonArray);
		register(3807, parseJsonArray);
		register(3907, parseStringArray);
		register(2951, parseStringArray);
		register(791, parseStringArray);
		register(1183, parseStringArray);
		register(1270, parseStringArray);
	};
	module.exports = { init };
}));
//#endregion
//#region ../../node_modules/.pnpm/pg-int8@1.0.1/node_modules/pg-int8/index.js
var require_pg_int8 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var BASE = 1e6;
	function readInt8(buffer) {
		var high = buffer.readInt32BE(0);
		var low = buffer.readUInt32BE(4);
		var sign = "";
		if (high < 0) {
			high = ~high + (low === 0);
			low = ~low + 1 >>> 0;
			sign = "-";
		}
		var result = "";
		var carry;
		var t;
		var digits;
		var pad;
		var l;
		var i;
		carry = high % BASE;
		high = high / BASE >>> 0;
		t = 4294967296 * carry + low;
		low = t / BASE >>> 0;
		digits = "" + (t - BASE * low);
		if (low === 0 && high === 0) return sign + digits + result;
		pad = "";
		l = 6 - digits.length;
		for (i = 0; i < l; i++) pad += "0";
		result = pad + digits + result;
		carry = high % BASE;
		high = high / BASE >>> 0;
		t = 4294967296 * carry + low;
		low = t / BASE >>> 0;
		digits = "" + (t - BASE * low);
		if (low === 0 && high === 0) return sign + digits + result;
		pad = "";
		l = 6 - digits.length;
		for (i = 0; i < l; i++) pad += "0";
		result = pad + digits + result;
		carry = high % BASE;
		high = high / BASE >>> 0;
		t = 4294967296 * carry + low;
		low = t / BASE >>> 0;
		digits = "" + (t - BASE * low);
		if (low === 0 && high === 0) return sign + digits + result;
		pad = "";
		l = 6 - digits.length;
		for (i = 0; i < l; i++) pad += "0";
		result = pad + digits + result;
		carry = high % BASE;
		t = 4294967296 * carry + low;
		digits = "" + t % BASE;
		return sign + digits + result;
	}
	module.exports = readInt8;
}));
//#endregion
//#region ../../node_modules/.pnpm/pg-types@2.2.0/node_modules/pg-types/lib/binaryParsers.js
var require_binaryParsers = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var parseInt64 = require_pg_int8();
	var parseBits = function(data, bits, offset, invert, callback) {
		offset = offset || 0;
		invert = invert || false;
		callback = callback || function(lastValue, newValue, bits) {
			return lastValue * Math.pow(2, bits) + newValue;
		};
		var offsetBytes = offset >> 3;
		var inv = function(value) {
			if (invert) return ~value & 255;
			return value;
		};
		var mask = 255;
		var firstBits = 8 - offset % 8;
		if (bits < firstBits) {
			mask = 255 << 8 - bits & 255;
			firstBits = bits;
		}
		if (offset) mask = mask >> offset % 8;
		var result = 0;
		if (offset % 8 + bits >= 8) result = callback(0, inv(data[offsetBytes]) & mask, firstBits);
		var bytes = bits + offset >> 3;
		for (var i = offsetBytes + 1; i < bytes; i++) result = callback(result, inv(data[i]), 8);
		var lastBits = (bits + offset) % 8;
		if (lastBits > 0) result = callback(result, inv(data[bytes]) >> 8 - lastBits, lastBits);
		return result;
	};
	var parseFloatFromBits = function(data, precisionBits, exponentBits) {
		var bias = Math.pow(2, exponentBits - 1) - 1;
		var sign = parseBits(data, 1);
		var exponent = parseBits(data, exponentBits, 1);
		if (exponent === 0) return 0;
		var precisionBitsCounter = 1;
		var parsePrecisionBits = function(lastValue, newValue, bits) {
			if (lastValue === 0) lastValue = 1;
			for (var i = 1; i <= bits; i++) {
				precisionBitsCounter /= 2;
				if ((newValue & 1 << bits - i) > 0) lastValue += precisionBitsCounter;
			}
			return lastValue;
		};
		var mantissa = parseBits(data, precisionBits, exponentBits + 1, false, parsePrecisionBits);
		if (exponent == Math.pow(2, exponentBits + 1) - 1) {
			if (mantissa === 0) return sign === 0 ? Infinity : -Infinity;
			return NaN;
		}
		return (sign === 0 ? 1 : -1) * Math.pow(2, exponent - bias) * mantissa;
	};
	var parseInt16 = function(value) {
		if (parseBits(value, 1) == 1) return -1 * (parseBits(value, 15, 1, true) + 1);
		return parseBits(value, 15, 1);
	};
	var parseInt32 = function(value) {
		if (parseBits(value, 1) == 1) return -1 * (parseBits(value, 31, 1, true) + 1);
		return parseBits(value, 31, 1);
	};
	var parseFloat32 = function(value) {
		return parseFloatFromBits(value, 23, 8);
	};
	var parseFloat64 = function(value) {
		return parseFloatFromBits(value, 52, 11);
	};
	var parseNumeric = function(value) {
		var sign = parseBits(value, 16, 32);
		if (sign == 49152) return NaN;
		var weight = Math.pow(1e4, parseBits(value, 16, 16));
		var result = 0;
		var ndigits = parseBits(value, 16);
		for (var i = 0; i < ndigits; i++) {
			result += parseBits(value, 16, 64 + 16 * i) * weight;
			weight /= 1e4;
		}
		var scale = Math.pow(10, parseBits(value, 16, 48));
		return (sign === 0 ? 1 : -1) * Math.round(result * scale) / scale;
	};
	var parseDate = function(isUTC, value) {
		var sign = parseBits(value, 1);
		var rawValue = parseBits(value, 63, 1);
		var result = /* @__PURE__ */ new Date((sign === 0 ? 1 : -1) * rawValue / 1e3 + 9466848e5);
		if (!isUTC) result.setTime(result.getTime() + result.getTimezoneOffset() * 6e4);
		result.usec = rawValue % 1e3;
		result.getMicroSeconds = function() {
			return this.usec;
		};
		result.setMicroSeconds = function(value) {
			this.usec = value;
		};
		result.getUTCMicroSeconds = function() {
			return this.usec;
		};
		return result;
	};
	var parseArray = function(value) {
		var dim = parseBits(value, 32);
		parseBits(value, 32, 32);
		var elementType = parseBits(value, 32, 64);
		var offset = 96;
		var dims = [];
		for (var i = 0; i < dim; i++) {
			dims[i] = parseBits(value, 32, offset);
			offset += 32;
			offset += 32;
		}
		var parseElement = function(elementType) {
			var length = parseBits(value, 32, offset);
			offset += 32;
			if (length == 4294967295) return null;
			var result;
			if (elementType == 23 || elementType == 20) {
				result = parseBits(value, length * 8, offset);
				offset += length * 8;
				return result;
			} else if (elementType == 25) {
				result = value.toString(this.encoding, offset >> 3, (offset += length << 3) >> 3);
				return result;
			} else console.log("ERROR: ElementType not implemented: " + elementType);
		};
		var parse = function(dimension, elementType) {
			var array = [];
			var i;
			if (dimension.length > 1) {
				var count = dimension.shift();
				for (i = 0; i < count; i++) array[i] = parse(dimension, elementType);
				dimension.unshift(count);
			} else for (i = 0; i < dimension[0]; i++) array[i] = parseElement(elementType);
			return array;
		};
		return parse(dims, elementType);
	};
	var parseText = function(value) {
		return value.toString("utf8");
	};
	var parseBool = function(value) {
		if (value === null) return null;
		return parseBits(value, 8) > 0;
	};
	var init = function(register) {
		register(20, parseInt64);
		register(21, parseInt16);
		register(23, parseInt32);
		register(26, parseInt32);
		register(1700, parseNumeric);
		register(700, parseFloat32);
		register(701, parseFloat64);
		register(16, parseBool);
		register(1114, parseDate.bind(null, false));
		register(1184, parseDate.bind(null, true));
		register(1e3, parseArray);
		register(1007, parseArray);
		register(1016, parseArray);
		register(1008, parseArray);
		register(1009, parseArray);
		register(25, parseText);
	};
	module.exports = { init };
}));
//#endregion
//#region ../../node_modules/.pnpm/pg-types@2.2.0/node_modules/pg-types/lib/builtins.js
var require_builtins = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* Following query was used to generate this file:
	
	SELECT json_object_agg(UPPER(PT.typname), PT.oid::int4 ORDER BY pt.oid)
	FROM pg_type PT
	WHERE typnamespace = (SELECT pgn.oid FROM pg_namespace pgn WHERE nspname = 'pg_catalog') -- Take only builting Postgres types with stable OID (extension types are not guaranted to be stable)
	AND typtype = 'b' -- Only basic types
	AND typelem = 0 -- Ignore aliases
	AND typisdefined -- Ignore undefined types
	*/
	module.exports = {
		BOOL: 16,
		BYTEA: 17,
		CHAR: 18,
		INT8: 20,
		INT2: 21,
		INT4: 23,
		REGPROC: 24,
		TEXT: 25,
		OID: 26,
		TID: 27,
		XID: 28,
		CID: 29,
		JSON: 114,
		XML: 142,
		PG_NODE_TREE: 194,
		SMGR: 210,
		PATH: 602,
		POLYGON: 604,
		CIDR: 650,
		FLOAT4: 700,
		FLOAT8: 701,
		ABSTIME: 702,
		RELTIME: 703,
		TINTERVAL: 704,
		CIRCLE: 718,
		MACADDR8: 774,
		MONEY: 790,
		MACADDR: 829,
		INET: 869,
		ACLITEM: 1033,
		BPCHAR: 1042,
		VARCHAR: 1043,
		DATE: 1082,
		TIME: 1083,
		TIMESTAMP: 1114,
		TIMESTAMPTZ: 1184,
		INTERVAL: 1186,
		TIMETZ: 1266,
		BIT: 1560,
		VARBIT: 1562,
		NUMERIC: 1700,
		REFCURSOR: 1790,
		REGPROCEDURE: 2202,
		REGOPER: 2203,
		REGOPERATOR: 2204,
		REGCLASS: 2205,
		REGTYPE: 2206,
		UUID: 2950,
		TXID_SNAPSHOT: 2970,
		PG_LSN: 3220,
		PG_NDISTINCT: 3361,
		PG_DEPENDENCIES: 3402,
		TSVECTOR: 3614,
		TSQUERY: 3615,
		GTSVECTOR: 3642,
		REGCONFIG: 3734,
		REGDICTIONARY: 3769,
		JSONB: 3802,
		REGNAMESPACE: 4089,
		REGROLE: 4096
	};
}));
//#endregion
//#region ../../node_modules/.pnpm/pg-types@2.2.0/node_modules/pg-types/index.js
var require_pg_types = /* @__PURE__ */ __commonJSMin(((exports) => {
	var textParsers = require_textParsers();
	var binaryParsers = require_binaryParsers();
	var arrayParser = require_arrayParser();
	var builtinTypes = require_builtins();
	exports.getTypeParser = getTypeParser;
	exports.setTypeParser = setTypeParser;
	exports.arrayParser = arrayParser;
	exports.builtins = builtinTypes;
	var typeParsers = {
		text: {},
		binary: {}
	};
	function noParse(val) {
		return String(val);
	}
	function getTypeParser(oid, format) {
		format = format || "text";
		if (!typeParsers[format]) return noParse;
		return typeParsers[format][oid] || noParse;
	}
	function setTypeParser(oid, format, parseFn) {
		if (typeof format == "function") {
			parseFn = format;
			format = "text";
		}
		typeParsers[format][oid] = parseFn;
	}
	textParsers.init(function(oid, converter) {
		typeParsers.text[oid] = converter;
	});
	binaryParsers.init(function(oid, converter) {
		typeParsers.binary[oid] = converter;
	});
}));
//#endregion
//#region ../../node_modules/.pnpm/pg@8.21.0/node_modules/pg/lib/defaults.js
var require_defaults = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	let user;
	try {
		user = process.platform === "win32" ? process.env.USERNAME : process.env.USER;
	} catch {}
	module.exports = {
		host: "localhost",
		user,
		database: void 0,
		password: null,
		connectionString: void 0,
		port: 5432,
		rows: 0,
		binary: false,
		max: 10,
		idleTimeoutMillis: 3e4,
		client_encoding: "",
		ssl: false,
		application_name: void 0,
		fallback_application_name: void 0,
		options: void 0,
		parseInputDatesAsUTC: false,
		statement_timeout: false,
		lock_timeout: false,
		idle_in_transaction_session_timeout: false,
		query_timeout: false,
		connect_timeout: 0,
		keepalives: 1,
		keepalives_idle: 0
	};
	const pgTypes = require_pg_types();
	const parseBigInteger = pgTypes.getTypeParser(20, "text");
	const parseBigIntegerArray = pgTypes.getTypeParser(1016, "text");
	module.exports.__defineSetter__("parseInt8", function(val) {
		pgTypes.setTypeParser(20, "text", val ? pgTypes.getTypeParser(23, "text") : parseBigInteger);
		pgTypes.setTypeParser(1016, "text", val ? pgTypes.getTypeParser(1007, "text") : parseBigIntegerArray);
	});
}));
//#endregion
//#region ../../node_modules/.pnpm/pg@8.21.0/node_modules/pg/lib/utils.js
var require_utils$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const defaults = require_defaults();
	const { isDate } = __require("util/types");
	function escapeElement(elementRepresentation) {
		return "\"" + elementRepresentation.replace(/\\/g, "\\\\").replace(/"/g, "\\\"") + "\"";
	}
	function arrayString(val) {
		let result = "{";
		for (let i = 0; i < val.length; i++) {
			if (i > 0) result += ",";
			let item = val[i];
			if (item == null) result += "NULL";
			else if (Array.isArray(item)) result += arrayString(item);
			else if (ArrayBuffer.isView(item)) {
				if (!(item instanceof Buffer)) item = Buffer.from(item.buffer, item.byteOffset, item.byteLength);
				result += "\\\\x" + item.toString("hex");
			} else result += escapeElement(prepareValue(item));
		}
		result += "}";
		return result;
	}
	const prepareValue = function(val, seen) {
		if (val == null) return null;
		if (typeof val === "object") {
			if (val instanceof Buffer) return val;
			if (ArrayBuffer.isView(val)) return Buffer.from(val.buffer, val.byteOffset, val.byteLength);
			if (isDate(val)) if (defaults.parseInputDatesAsUTC) return dateToStringUTC(val);
			else return dateToString(val);
			if (Array.isArray(val)) return arrayString(val);
			return prepareObject(val, seen);
		}
		return val.toString();
	};
	function prepareObject(val, seen) {
		if (val && typeof val.toPostgres === "function") {
			seen = seen || [];
			if (seen.indexOf(val) !== -1) throw new Error("circular reference detected while preparing \"" + val + "\" for query");
			seen.push(val);
			return prepareValue(val.toPostgres(prepareValue), seen);
		}
		return JSON.stringify(val);
	}
	function dateToString(date) {
		let offset = -date.getTimezoneOffset();
		let year = date.getFullYear();
		const isBCYear = year < 1;
		if (isBCYear) year = Math.abs(year) + 1;
		let ret = String(year).padStart(4, "0") + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0") + "T" + String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0") + ":" + String(date.getSeconds()).padStart(2, "0") + "." + String(date.getMilliseconds()).padStart(3, "0");
		if (offset < 0) {
			ret += "-";
			offset *= -1;
		} else ret += "+";
		ret += String(Math.floor(offset / 60)).padStart(2, "0") + ":" + String(offset % 60).padStart(2, "0");
		if (isBCYear) ret += " BC";
		return ret;
	}
	function dateToStringUTC(date) {
		let year = date.getUTCFullYear();
		const isBCYear = year < 1;
		if (isBCYear) year = Math.abs(year) + 1;
		let ret = String(year).padStart(4, "0") + "-" + String(date.getUTCMonth() + 1).padStart(2, "0") + "-" + String(date.getUTCDate()).padStart(2, "0") + "T" + String(date.getUTCHours()).padStart(2, "0") + ":" + String(date.getUTCMinutes()).padStart(2, "0") + ":" + String(date.getUTCSeconds()).padStart(2, "0") + "." + String(date.getUTCMilliseconds()).padStart(3, "0");
		ret += "+00:00";
		if (isBCYear) ret += " BC";
		return ret;
	}
	function normalizeQueryConfig(config, values, callback) {
		config = typeof config === "string" ? { text: config } : config;
		if (values) if (typeof values === "function") config.callback = values;
		else config.values = values;
		if (callback) config.callback = callback;
		return config;
	}
	const escapeIdentifier = function(str) {
		return "\"" + str.replace(/"/g, "\"\"") + "\"";
	};
	const escapeLiteral = function(str) {
		let hasBackslash = false;
		let escaped = "'";
		if (str == null) return "''";
		if (typeof str !== "string") return "''";
		for (let i = 0; i < str.length; i++) {
			const c = str[i];
			if (c === "'") escaped += c + c;
			else if (c === "\\") {
				escaped += c + c;
				hasBackslash = true;
			} else escaped += c;
		}
		escaped += "'";
		if (hasBackslash === true) escaped = " E" + escaped;
		return escaped;
	};
	module.exports = {
		prepareValue: function prepareValueWrapper(value) {
			return prepareValue(value);
		},
		normalizeQueryConfig,
		escapeIdentifier,
		escapeLiteral
	};
}));
//#endregion
//#region ../../node_modules/.pnpm/pg@8.21.0/node_modules/pg/lib/crypto/utils.js
var require_utils = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const nodeCrypto = __require("crypto");
	module.exports = {
		postgresMd5PasswordHash,
		randomBytes,
		deriveKey,
		sha256,
		hashByName,
		hmacSha256,
		md5
	};
	/**
	* The Web Crypto API - grabbed from the Node.js library or the global
	* @type Crypto
	*/
	const webCrypto = nodeCrypto.webcrypto || globalThis.crypto;
	/**
	* The SubtleCrypto API for low level crypto operations.
	* @type SubtleCrypto
	*/
	const subtleCrypto = webCrypto.subtle;
	const textEncoder = new TextEncoder();
	/**
	*
	* @param {*} length
	* @returns
	*/
	function randomBytes(length) {
		return webCrypto.getRandomValues(Buffer.alloc(length));
	}
	async function md5(string) {
		try {
			return nodeCrypto.createHash("md5").update(string, "utf-8").digest("hex");
		} catch (e) {
			const data = typeof string === "string" ? textEncoder.encode(string) : string;
			const hash = await subtleCrypto.digest("MD5", data);
			return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
		}
	}
	async function postgresMd5PasswordHash(user, password, salt) {
		const inner = await md5(password + user);
		return "md5" + await md5(Buffer.concat([Buffer.from(inner), salt]));
	}
	/**
	* Create a SHA-256 digest of the given data
	* @param {Buffer} data
	*/
	async function sha256(text) {
		return await subtleCrypto.digest("SHA-256", text);
	}
	async function hashByName(hashName, text) {
		return await subtleCrypto.digest(hashName, text);
	}
	/**
	* Sign the message with the given key
	* @param {ArrayBuffer} keyBuffer
	* @param {string} msg
	*/
	async function hmacSha256(keyBuffer, msg) {
		const key = await subtleCrypto.importKey("raw", keyBuffer, {
			name: "HMAC",
			hash: "SHA-256"
		}, false, ["sign"]);
		return await subtleCrypto.sign("HMAC", key, textEncoder.encode(msg));
	}
	/**
	* Derive a key from the password and salt
	* @param {string} password
	* @param {Uint8Array} salt
	* @param {number} iterations
	*/
	async function deriveKey(password, salt, iterations) {
		const key = await subtleCrypto.importKey("raw", textEncoder.encode(password), "PBKDF2", false, ["deriveBits"]);
		const params = {
			name: "PBKDF2",
			hash: "SHA-256",
			salt,
			iterations
		};
		return await subtleCrypto.deriveBits(params, key, 256, ["deriveBits"]);
	}
}));
//#endregion
//#region ../../node_modules/.pnpm/pg@8.21.0/node_modules/pg/lib/crypto/cert-signatures.js
var require_cert_signatures = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	function x509Error(msg, cert) {
		return /* @__PURE__ */ new Error("SASL channel binding: " + msg + " when parsing public certificate " + cert.toString("base64"));
	}
	function readASN1Length(data, index) {
		let length = data[index++];
		if (length < 128) return {
			length,
			index
		};
		const lengthBytes = length & 127;
		if (lengthBytes > 4) throw x509Error("bad length", data);
		length = 0;
		for (let i = 0; i < lengthBytes; i++) length = length << 8 | data[index++];
		return {
			length,
			index
		};
	}
	function readASN1OID(data, index) {
		if (data[index++] !== 6) throw x509Error("non-OID data", data);
		const { length: OIDLength, index: indexAfterOIDLength } = readASN1Length(data, index);
		index = indexAfterOIDLength;
		const lastIndex = index + OIDLength;
		const byte1 = data[index++];
		let oid = (byte1 / 40 >> 0) + "." + byte1 % 40;
		while (index < lastIndex) {
			let value = 0;
			while (index < lastIndex) {
				const nextByte = data[index++];
				value = value << 7 | nextByte & 127;
				if (nextByte < 128) break;
			}
			oid += "." + value;
		}
		return {
			oid,
			index
		};
	}
	function expectASN1Seq(data, index) {
		if (data[index++] !== 48) throw x509Error("non-sequence data", data);
		return readASN1Length(data, index);
	}
	function signatureAlgorithmHashFromCertificate(data, index) {
		if (index === void 0) index = 0;
		index = expectASN1Seq(data, index).index;
		const { length: certInfoLength, index: indexAfterCertInfoLength } = expectASN1Seq(data, index);
		index = indexAfterCertInfoLength + certInfoLength;
		index = expectASN1Seq(data, index).index;
		const { oid, index: indexAfterOID } = readASN1OID(data, index);
		switch (oid) {
			case "1.2.840.113549.1.1.4": return "MD5";
			case "1.2.840.113549.1.1.5": return "SHA-1";
			case "1.2.840.113549.1.1.11": return "SHA-256";
			case "1.2.840.113549.1.1.12": return "SHA-384";
			case "1.2.840.113549.1.1.13": return "SHA-512";
			case "1.2.840.113549.1.1.14": return "SHA-224";
			case "1.2.840.113549.1.1.15": return "SHA512-224";
			case "1.2.840.113549.1.1.16": return "SHA512-256";
			case "1.2.840.10045.4.1": return "SHA-1";
			case "1.2.840.10045.4.3.1": return "SHA-224";
			case "1.2.840.10045.4.3.2": return "SHA-256";
			case "1.2.840.10045.4.3.3": return "SHA-384";
			case "1.2.840.10045.4.3.4": return "SHA-512";
			case "1.2.840.113549.1.1.10": {
				index = indexAfterOID;
				index = expectASN1Seq(data, index).index;
				if (data[index++] !== 160) throw x509Error("non-tag data", data);
				index = readASN1Length(data, index).index;
				index = expectASN1Seq(data, index).index;
				const { oid: hashOID } = readASN1OID(data, index);
				switch (hashOID) {
					case "1.2.840.113549.2.5": return "MD5";
					case "1.3.14.3.2.26": return "SHA-1";
					case "2.16.840.1.101.3.4.2.1": return "SHA-256";
					case "2.16.840.1.101.3.4.2.2": return "SHA-384";
					case "2.16.840.1.101.3.4.2.3": return "SHA-512";
				}
				throw x509Error("unknown hash OID " + hashOID, data);
			}
			case "1.3.101.110":
			case "1.3.101.112": return "SHA-512";
			case "1.3.101.111":
			case "1.3.101.113": throw x509Error("Ed448 certificate channel binding is not currently supported by Postgres");
		}
		throw x509Error("unknown OID " + oid, data);
	}
	module.exports = { signatureAlgorithmHashFromCertificate };
}));
//#endregion
//#region ../../node_modules/.pnpm/pg@8.21.0/node_modules/pg/lib/crypto/sasl.js
var require_sasl = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const crypto = require_utils();
	const { signatureAlgorithmHashFromCertificate } = require_cert_signatures();
	function saslprep(password) {
		return password.replace(/[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000]/g, " ").replace(/[\u00AD\u034F\u1806\u180B\u180C\u180D\u200C\u200D\u2060\uFE00-\uFE0F\uFEFF]/g, "").normalize("NFKC");
	}
	const DEFAULT_MAX_SCRAM_ITERATIONS = 1e5;
	function startSession(mechanisms, stream, scramMaxIterations = DEFAULT_MAX_SCRAM_ITERATIONS) {
		const candidates = ["SCRAM-SHA-256"];
		if (stream) candidates.unshift("SCRAM-SHA-256-PLUS");
		const mechanism = candidates.find((candidate) => mechanisms.includes(candidate));
		if (!mechanism) throw new Error("SASL: Only mechanism(s) " + candidates.join(" and ") + " are supported");
		if (mechanism === "SCRAM-SHA-256-PLUS" && typeof stream.getPeerCertificate !== "function") throw new Error("SASL: Mechanism SCRAM-SHA-256-PLUS requires a certificate");
		const clientNonce = crypto.randomBytes(18).toString("base64");
		return {
			mechanism,
			clientNonce,
			response: (mechanism === "SCRAM-SHA-256-PLUS" ? "p=tls-server-end-point" : stream ? "y" : "n") + ",,n=*,r=" + clientNonce,
			message: "SASLInitialResponse",
			scramMaxIterations
		};
	}
	async function continueSession(session, password, serverData, stream) {
		if (session.message !== "SASLInitialResponse") throw new Error("SASL: Last message was not SASLInitialResponse");
		if (typeof password !== "string") throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string");
		if (password === "") throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a non-empty string");
		if (typeof serverData !== "string") throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: serverData must be a string");
		const sv = parseServerFirstMessage(serverData);
		if (!sv.nonce.startsWith(session.clientNonce)) throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce does not start with client nonce");
		else if (sv.nonce.length === session.clientNonce.length) throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce is too short");
		const scramMaxIterations = typeof session.scramMaxIterations === "number" ? session.scramMaxIterations : DEFAULT_MAX_SCRAM_ITERATIONS;
		if (scramMaxIterations !== 0 && sv.iteration > scramMaxIterations) throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: iteration count " + sv.iteration + " exceeds scramMaxIterations of " + scramMaxIterations);
		const clientFirstMessageBare = "n=*,r=" + session.clientNonce;
		const serverFirstMessage = "r=" + sv.nonce + ",s=" + sv.salt + ",i=" + sv.iteration;
		let channelBinding = stream ? "eSws" : "biws";
		if (session.mechanism === "SCRAM-SHA-256-PLUS") {
			const peerCert = stream.getPeerCertificate().raw;
			let hashName = signatureAlgorithmHashFromCertificate(peerCert);
			if (hashName === "MD5" || hashName === "SHA-1") hashName = "SHA-256";
			const certHash = await crypto.hashByName(hashName, peerCert);
			channelBinding = Buffer.concat([Buffer.from("p=tls-server-end-point,,"), Buffer.from(certHash)]).toString("base64");
		}
		const clientFinalMessageWithoutProof = "c=" + channelBinding + ",r=" + sv.nonce;
		const authMessage = clientFirstMessageBare + "," + serverFirstMessage + "," + clientFinalMessageWithoutProof;
		const saltBytes = Buffer.from(sv.salt, "base64");
		const saltedPassword = await crypto.deriveKey(saslprep(password), saltBytes, sv.iteration);
		const clientKey = await crypto.hmacSha256(saltedPassword, "Client Key");
		const storedKey = await crypto.sha256(clientKey);
		const clientSignature = await crypto.hmacSha256(storedKey, authMessage);
		const clientProof = xorBuffers(Buffer.from(clientKey), Buffer.from(clientSignature)).toString("base64");
		const serverKey = await crypto.hmacSha256(saltedPassword, "Server Key");
		const serverSignatureBytes = await crypto.hmacSha256(serverKey, authMessage);
		session.message = "SASLResponse";
		session.serverSignature = Buffer.from(serverSignatureBytes).toString("base64");
		session.response = clientFinalMessageWithoutProof + ",p=" + clientProof;
	}
	function finalizeSession(session, serverData) {
		if (session.message !== "SASLResponse") throw new Error("SASL: Last message was not SASLResponse");
		if (typeof serverData !== "string") throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: serverData must be a string");
		const { serverSignature } = parseServerFinalMessage(serverData);
		if (serverSignature !== session.serverSignature) throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature does not match");
	}
	/**
	* printable       = %x21-2B / %x2D-7E
	*                   ;; Printable ASCII except ",".
	*                   ;; Note that any "printable" is also
	*                   ;; a valid "value".
	*/
	function isPrintableChars(text) {
		if (typeof text !== "string") throw new TypeError("SASL: text must be a string");
		return text.split("").map((_, i) => text.charCodeAt(i)).every((c) => c >= 33 && c <= 43 || c >= 45 && c <= 126);
	}
	/**
	* base64-char     = ALPHA / DIGIT / "/" / "+"
	*
	* base64-4        = 4base64-char
	*
	* base64-3        = 3base64-char "="
	*
	* base64-2        = 2base64-char "=="
	*
	* base64          = *base64-4 [base64-3 / base64-2]
	*/
	function isBase64(text) {
		return /^(?:[a-zA-Z0-9+/]{4})*(?:[a-zA-Z0-9+/]{2}==|[a-zA-Z0-9+/]{3}=)?$/.test(text);
	}
	function parseAttributePairs(text) {
		if (typeof text !== "string") throw new TypeError("SASL: attribute pairs text must be a string");
		return new Map(text.split(",").map((attrValue) => {
			if (!/^.=/.test(attrValue)) throw new Error("SASL: Invalid attribute pair entry");
			return [attrValue[0], attrValue.substring(2)];
		}));
	}
	function parseServerFirstMessage(data) {
		const attrPairs = parseAttributePairs(data);
		const nonce = attrPairs.get("r");
		if (!nonce) throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: nonce missing");
		else if (!isPrintableChars(nonce)) throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: nonce must only contain printable characters");
		const salt = attrPairs.get("s");
		if (!salt) throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: salt missing");
		else if (!isBase64(salt)) throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: salt must be base64");
		const iterationText = attrPairs.get("i");
		if (!iterationText) throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: iteration missing");
		else if (!/^[1-9][0-9]*$/.test(iterationText)) throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: invalid iteration count");
		return {
			nonce,
			salt,
			iteration: parseInt(iterationText, 10)
		};
	}
	function parseServerFinalMessage(serverData) {
		const attrPairs = parseAttributePairs(serverData);
		const error = attrPairs.get("e");
		const serverSignature = attrPairs.get("v");
		if (error) throw new Error(`SASL: SCRAM-SERVER-FINAL-MESSAGE: server returned error: "${error}"`);
		if (!serverSignature) throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature is missing");
		else if (!isBase64(serverSignature)) throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature must be base64");
		return { serverSignature };
	}
	function xorBuffers(a, b) {
		if (!Buffer.isBuffer(a)) throw new TypeError("first argument must be a Buffer");
		if (!Buffer.isBuffer(b)) throw new TypeError("second argument must be a Buffer");
		if (a.length !== b.length) throw new Error("Buffer lengths must match");
		if (a.length === 0) throw new Error("Buffers cannot be empty");
		return Buffer.from(a.map((_, i) => a[i] ^ b[i]));
	}
	module.exports = {
		startSession,
		continueSession,
		finalizeSession,
		DEFAULT_MAX_SCRAM_ITERATIONS
	};
}));
//#endregion
//#region ../../node_modules/.pnpm/pg@8.21.0/node_modules/pg/lib/type-overrides.js
var require_type_overrides = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const types = require_pg_types();
	function TypeOverrides(userTypes) {
		this._types = userTypes || types;
		this.text = {};
		this.binary = {};
	}
	TypeOverrides.prototype.getOverrides = function(format) {
		switch (format) {
			case "text": return this.text;
			case "binary": return this.binary;
			default: return {};
		}
	};
	TypeOverrides.prototype.setTypeParser = function(oid, format, parseFn) {
		if (typeof format === "function") {
			parseFn = format;
			format = "text";
		}
		this.getOverrides(format)[oid] = parseFn;
	};
	TypeOverrides.prototype.getTypeParser = function(oid, format) {
		format = format || "text";
		return this.getOverrides(format)[oid] || this._types.getTypeParser(oid, format);
	};
	module.exports = TypeOverrides;
}));
//#endregion
//#region ../../node_modules/.pnpm/pg-connection-string@2.13.0/node_modules/pg-connection-string/index.js
var require_pg_connection_string = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	function parse(str, options = {}) {
		if (str.charAt(0) === "/") {
			const config = str.split(" ");
			return {
				host: config[0],
				database: config[1]
			};
		}
		const config = Object.create(null);
		let result;
		let dummyHost = false;
		if (/ |%[^a-f0-9]|%[a-f0-9][^a-f0-9]/i.test(str)) str = encodeURI(str).replace(/%25(\d\d)/g, "%$1");
		try {
			try {
				result = new URL(str, "postgres://base");
			} catch (e) {
				result = new URL(str.replace("@/", "@___DUMMY___/"), "postgres://base");
				dummyHost = true;
			}
		} catch (err) {
			err.input && (err.input = "*****REDACTED*****");
			throw err;
		}
		for (const entry of result.searchParams.entries()) config[entry[0]] = entry[1];
		config.user = config.user || decodeURIComponent(result.username);
		config.password = config.password || decodeURIComponent(result.password);
		if (result.protocol == "socket:") {
			config.host = decodeURI(result.pathname);
			config.database = result.searchParams.get("db");
			config.client_encoding = result.searchParams.get("encoding");
			return config;
		}
		const hostname = dummyHost ? "" : result.hostname;
		if (!config.host) config.host = decodeURIComponent(hostname);
		else if (hostname && /^%2f/i.test(hostname)) result.pathname = hostname + result.pathname;
		if (!config.port) config.port = result.port;
		const pathname = result.pathname.slice(1) || null;
		config.database = pathname ? decodeURI(pathname) : null;
		if (config.ssl === "true" || config.ssl === "1") config.ssl = true;
		if (config.ssl === "0") config.ssl = false;
		if (config.sslcert || config.sslkey || config.sslrootcert || config.sslmode) config.ssl = {};
		const fs = config.sslcert || config.sslkey || config.sslrootcert ? __require("fs") : null;
		if (config.sslcert) config.ssl.cert = fs.readFileSync(config.sslcert).toString();
		if (config.sslkey) config.ssl.key = fs.readFileSync(config.sslkey).toString();
		if (config.sslrootcert) config.ssl.ca = fs.readFileSync(config.sslrootcert).toString();
		if (options.useLibpqCompat && config.uselibpqcompat) throw new Error("Both useLibpqCompat and uselibpqcompat are set. Please use only one of them.");
		if (config.uselibpqcompat === "true" || options.useLibpqCompat) switch (config.sslmode) {
			case "disable":
				config.ssl = false;
				break;
			case "prefer":
				config.ssl.rejectUnauthorized = false;
				break;
			case "require":
				if (config.sslrootcert) config.ssl.checkServerIdentity = function() {};
				else config.ssl.rejectUnauthorized = false;
				break;
			case "verify-ca":
				if (!config.ssl.ca) throw new Error("SECURITY WARNING: Using sslmode=verify-ca requires specifying a CA with sslrootcert. If a public CA is used, verify-ca allows connections to a server that somebody else may have registered with the CA, making you vulnerable to Man-in-the-Middle attacks. Either specify a custom CA certificate with sslrootcert parameter or use sslmode=verify-full for proper security.");
				config.ssl.checkServerIdentity = function() {};
				break;
			case "verify-full": break;
		}
		else switch (config.sslmode) {
			case "disable":
				config.ssl = false;
				break;
			case "prefer":
			case "require":
			case "verify-ca":
			case "verify-full":
				if (config.sslmode !== "verify-full") deprecatedSslModeWarning(config.sslmode);
				break;
			case "no-verify":
				config.ssl.rejectUnauthorized = false;
				break;
		}
		return config;
	}
	function toConnectionOptions(sslConfig) {
		return Object.entries(sslConfig).reduce((c, [key, value]) => {
			if (value !== void 0 && value !== null) c[key] = value;
			return c;
		}, Object.create(null));
	}
	function toClientConfig(config) {
		return Object.entries(config).reduce((c, [key, value]) => {
			if (key === "ssl") {
				const sslConfig = value;
				if (typeof sslConfig === "boolean") c[key] = sslConfig;
				if (typeof sslConfig === "object") c[key] = toConnectionOptions(sslConfig);
			} else if (value !== void 0 && value !== null) if (key === "port") {
				if (value !== "") {
					const v = parseInt(value, 10);
					if (isNaN(v)) throw new Error(`Invalid ${key}: ${value}`);
					c[key] = v;
				}
			} else c[key] = value;
			return c;
		}, Object.create(null));
	}
	function parseIntoClientConfig(str) {
		return toClientConfig(parse(str));
	}
	function deprecatedSslModeWarning(sslmode) {
		if (!deprecatedSslModeWarning.warned && typeof process !== "undefined" && process.emitWarning) {
			deprecatedSslModeWarning.warned = true;
			process.emitWarning(`SECURITY WARNING: The SSL modes 'prefer', 'require', and 'verify-ca' are treated as aliases for 'verify-full'.
In the next major version (pg-connection-string v3.0.0 and pg v9.0.0), these modes will adopt standard libpq semantics, which have weaker security guarantees.

To prepare for this change:
- If you want the current behavior, explicitly use 'sslmode=verify-full'
- If you want libpq compatibility now, use 'uselibpqcompat=true&sslmode=${sslmode}'

See https://www.postgresql.org/docs/current/libpq-ssl.html for libpq SSL mode definitions.`);
		}
	}
	module.exports = parse;
	parse.parse = parse;
	parse.toClientConfig = toClientConfig;
	parse.parseIntoClientConfig = parseIntoClientConfig;
}));
//#endregion
//#region ../../node_modules/.pnpm/pg@8.21.0/node_modules/pg/lib/connection-parameters.js
var require_connection_parameters = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const dns = __require("dns");
	const defaults = require_defaults();
	const parse = require_pg_connection_string().parse;
	const val = function(key, config, envVar) {
		if (config[key]) return config[key];
		if (envVar === void 0) envVar = process.env["PG" + key.toUpperCase()];
		else if (envVar === false) {} else envVar = process.env[envVar];
		return envVar || defaults[key];
	};
	const readSSLConfigFromEnvironment = function() {
		switch (process.env.PGSSLMODE) {
			case "disable": return false;
			case "prefer":
			case "require":
			case "verify-ca":
			case "verify-full": return true;
			case "no-verify": return { rejectUnauthorized: false };
		}
		return defaults.ssl;
	};
	const quoteParamValue = function(value) {
		return "'" + ("" + value).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
	};
	const add = function(params, config, paramName) {
		const value = config[paramName];
		if (value !== void 0 && value !== null) params.push(paramName + "=" + quoteParamValue(value));
	};
	var ConnectionParameters = class {
		constructor(config) {
			config = typeof config === "string" ? parse(config) : config || {};
			if (config.connectionString) config = Object.assign({}, config, parse(config.connectionString));
			this.user = val("user", config);
			this.database = val("database", config);
			if (this.database === void 0) this.database = this.user;
			this.port = parseInt(val("port", config), 10);
			this.host = val("host", config);
			Object.defineProperty(this, "password", {
				configurable: true,
				enumerable: false,
				writable: true,
				value: val("password", config)
			});
			this.binary = val("binary", config);
			this.options = val("options", config);
			this.ssl = typeof config.ssl === "undefined" ? readSSLConfigFromEnvironment() : config.ssl;
			if (typeof this.ssl === "string") {
				if (this.ssl === "true") this.ssl = true;
			}
			if (this.ssl === "no-verify") this.ssl = { rejectUnauthorized: false };
			if (this.ssl && this.ssl.key) Object.defineProperty(this.ssl, "key", { enumerable: false });
			this.client_encoding = val("client_encoding", config);
			this.replication = val("replication", config);
			this.isDomainSocket = !(this.host || "").indexOf("/");
			this.application_name = val("application_name", config, "PGAPPNAME");
			this.fallback_application_name = val("fallback_application_name", config, false);
			this.statement_timeout = val("statement_timeout", config, false);
			this.lock_timeout = val("lock_timeout", config, false);
			this.idle_in_transaction_session_timeout = val("idle_in_transaction_session_timeout", config, false);
			this.query_timeout = val("query_timeout", config, false);
			if (config.connectionTimeoutMillis === void 0) this.connect_timeout = process.env.PGCONNECT_TIMEOUT || 0;
			else this.connect_timeout = Math.floor(config.connectionTimeoutMillis / 1e3);
			if (config.keepAlive === false) this.keepalives = 0;
			else if (config.keepAlive === true) this.keepalives = 1;
			if (typeof config.keepAliveInitialDelayMillis === "number") this.keepalives_idle = Math.floor(config.keepAliveInitialDelayMillis / 1e3);
		}
		getLibpqConnectionString(cb) {
			const params = [];
			add(params, this, "user");
			add(params, this, "password");
			add(params, this, "port");
			add(params, this, "application_name");
			add(params, this, "fallback_application_name");
			add(params, this, "connect_timeout");
			add(params, this, "options");
			const ssl = typeof this.ssl === "object" ? this.ssl : this.ssl ? { sslmode: this.ssl } : {};
			add(params, ssl, "sslmode");
			add(params, ssl, "sslca");
			add(params, ssl, "sslkey");
			add(params, ssl, "sslcert");
			add(params, ssl, "sslrootcert");
			if (this.database) params.push("dbname=" + quoteParamValue(this.database));
			if (this.replication) params.push("replication=" + quoteParamValue(this.replication));
			if (this.host) params.push("host=" + quoteParamValue(this.host));
			if (this.isDomainSocket) return cb(null, params.join(" "));
			if (this.client_encoding) params.push("client_encoding=" + quoteParamValue(this.client_encoding));
			dns.lookup(this.host, function(err, address) {
				if (err) return cb(err, null);
				params.push("hostaddr=" + quoteParamValue(address));
				return cb(null, params.join(" "));
			});
		}
	};
	module.exports = ConnectionParameters;
}));
//#endregion
//#region ../../node_modules/.pnpm/pg@8.21.0/node_modules/pg/lib/result.js
var require_result = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const types = require_pg_types();
	const matchRegexp = /^([A-Za-z]+)(?: (\d+))?(?: (\d+))?/;
	var Result = class {
		constructor(rowMode, types) {
			this.command = null;
			this.rowCount = null;
			this.oid = null;
			this.rows = [];
			this.fields = [];
			this._parsers = void 0;
			this._types = types;
			this.RowCtor = null;
			this.rowAsArray = rowMode === "array";
			if (this.rowAsArray) this.parseRow = this._parseRowAsArray;
			this._prebuiltEmptyResultObject = null;
		}
		addCommandComplete(msg) {
			let match;
			if (msg.text) match = matchRegexp.exec(msg.text);
			else match = matchRegexp.exec(msg.command);
			if (match) {
				this.command = match[1];
				if (match[3]) {
					this.oid = parseInt(match[2], 10);
					this.rowCount = parseInt(match[3], 10);
				} else if (match[2]) this.rowCount = parseInt(match[2], 10);
			}
		}
		_parseRowAsArray(rowData) {
			const row = new Array(rowData.length);
			for (let i = 0, len = rowData.length; i < len; i++) {
				const rawValue = rowData[i];
				if (rawValue !== null) row[i] = this._parsers[i](rawValue);
				else row[i] = null;
			}
			return row;
		}
		parseRow(rowData) {
			const row = { ...this._prebuiltEmptyResultObject };
			for (let i = 0, len = rowData.length; i < len; i++) {
				const rawValue = rowData[i];
				const field = this.fields[i].name;
				if (rawValue !== null) {
					const v = this.fields[i].format === "binary" ? Buffer.from(rawValue) : rawValue;
					row[field] = this._parsers[i](v);
				} else row[field] = null;
			}
			return row;
		}
		addRow(row) {
			this.rows.push(row);
		}
		addFields(fieldDescriptions) {
			this.fields = fieldDescriptions;
			if (this.fields.length) this._parsers = new Array(fieldDescriptions.length);
			const row = Object.create(null);
			for (let i = 0; i < fieldDescriptions.length; i++) {
				const desc = fieldDescriptions[i];
				row[desc.name] = null;
				if (this._types) this._parsers[i] = this._types.getTypeParser(desc.dataTypeID, desc.format || "text");
				else this._parsers[i] = types.getTypeParser(desc.dataTypeID, desc.format || "text");
			}
			this._prebuiltEmptyResultObject = { ...row };
		}
	};
	module.exports = Result;
}));
//#endregion
//#region ../../node_modules/.pnpm/pg@8.21.0/node_modules/pg/lib/query.js
var require_query$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const { EventEmitter: EventEmitter$5 } = __require("events");
	const Result = require_result();
	const utils = require_utils$1();
	var Query = class extends EventEmitter$5 {
		constructor(config, values, callback) {
			super();
			config = utils.normalizeQueryConfig(config, values, callback);
			this.text = config.text;
			this.values = config.values;
			this.rows = config.rows;
			this.types = config.types;
			this.name = config.name;
			this.queryMode = config.queryMode;
			this.binary = config.binary;
			this.portal = config.portal || "";
			this.callback = config.callback;
			this._rowMode = config.rowMode;
			if (process.domain && config.callback) this.callback = process.domain.bind(config.callback);
			this._result = new Result(this._rowMode, this.types);
			this._results = this._result;
			this._canceledDueToError = false;
		}
		requiresPreparation() {
			if (this.queryMode === "extended") return true;
			if (this.name) return true;
			if (this.rows) return true;
			if (!this.text) return false;
			if (!this.values) return false;
			return this.values.length > 0;
		}
		_checkForMultirow() {
			if (this._result.command) {
				if (!Array.isArray(this._results)) this._results = [this._result];
				this._result = new Result(this._rowMode, this._result._types);
				this._results.push(this._result);
			}
		}
		handleRowDescription(msg) {
			this._checkForMultirow();
			this._result.addFields(msg.fields);
			this._accumulateRows = this.callback || !this.listeners("row").length;
		}
		handleDataRow(msg) {
			let row;
			if (this._canceledDueToError) return;
			try {
				row = this._result.parseRow(msg.fields);
			} catch (err) {
				this._canceledDueToError = err;
				return;
			}
			this.emit("row", row, this._result);
			if (this._accumulateRows) this._result.addRow(row);
		}
		handleCommandComplete(msg, connection) {
			this._checkForMultirow();
			this._result.addCommandComplete(msg);
			if (this.rows) connection.sync();
		}
		handleEmptyQuery(connection) {
			if (this.rows) connection.sync();
		}
		handleError(err, connection) {
			if (this._canceledDueToError) {
				err = this._canceledDueToError;
				this._canceledDueToError = false;
			}
			if (this.callback) return this.callback(err);
			this.emit("error", err);
		}
		handleReadyForQuery(con) {
			if (this._canceledDueToError) return this.handleError(this._canceledDueToError, con);
			if (this.callback) try {
				this.callback(null, this._results);
			} catch (err) {
				process.nextTick(() => {
					throw err;
				});
			}
			this.emit("end", this._results);
		}
		submit(connection) {
			if (typeof this.text !== "string" && typeof this.name !== "string") return /* @__PURE__ */ new Error("A query must have either text or a name. Supplying neither is unsupported.");
			const previous = connection.parsedStatements[this.name];
			if (this.text && previous && this.text !== previous) return /* @__PURE__ */ new Error(`Prepared statements must be unique - '${this.name}' was used for a different statement`);
			if (this.values && !Array.isArray(this.values)) return /* @__PURE__ */ new Error("Query values must be an array");
			if (this.requiresPreparation()) {
				connection.stream.cork && connection.stream.cork();
				try {
					this.prepare(connection);
				} finally {
					connection.stream.uncork && connection.stream.uncork();
				}
			} else connection.query(this.text);
			return null;
		}
		hasBeenParsed(connection) {
			return this.name && connection.parsedStatements[this.name];
		}
		handlePortalSuspended(connection) {
			this._getRows(connection, this.rows);
		}
		_getRows(connection, rows) {
			connection.execute({
				portal: this.portal,
				rows
			});
			if (!rows) connection.sync();
			else connection.flush();
		}
		prepare(connection) {
			if (!this.hasBeenParsed(connection)) connection.parse({
				text: this.text,
				name: this.name,
				types: this.types
			});
			try {
				connection.bind({
					portal: this.portal,
					statement: this.name,
					values: this.values,
					binary: this.binary,
					valueMapper: utils.prepareValue
				});
			} catch (err) {
				this.handleError(err, connection);
				return;
			}
			connection.describe({
				type: "P",
				name: this.portal || ""
			});
			this._getRows(connection, this.rows);
		}
		handleCopyInResponse(connection) {
			connection.sendCopyFail("No source stream defined");
		}
		handleCopyData(msg, connection) {}
	};
	module.exports = Query;
}));
//#endregion
//#region ../../node_modules/.pnpm/pg-protocol@1.14.0/node_modules/pg-protocol/dist/messages.js
var require_messages = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.NoticeMessage = exports.DataRowMessage = exports.CommandCompleteMessage = exports.ReadyForQueryMessage = exports.NotificationResponseMessage = exports.BackendKeyDataMessage = exports.AuthenticationMD5Password = exports.ParameterStatusMessage = exports.ParameterDescriptionMessage = exports.RowDescriptionMessage = exports.Field = exports.CopyResponse = exports.CopyDataMessage = exports.DatabaseError = exports.copyDone = exports.emptyQuery = exports.replicationStart = exports.portalSuspended = exports.noData = exports.closeComplete = exports.bindComplete = exports.parseComplete = void 0;
	exports.parseComplete = {
		name: "parseComplete",
		length: 5
	};
	exports.bindComplete = {
		name: "bindComplete",
		length: 5
	};
	exports.closeComplete = {
		name: "closeComplete",
		length: 5
	};
	exports.noData = {
		name: "noData",
		length: 5
	};
	exports.portalSuspended = {
		name: "portalSuspended",
		length: 5
	};
	exports.replicationStart = {
		name: "replicationStart",
		length: 4
	};
	exports.emptyQuery = {
		name: "emptyQuery",
		length: 4
	};
	exports.copyDone = {
		name: "copyDone",
		length: 4
	};
	var DatabaseError = class extends Error {
		constructor(message, length, name) {
			super(message);
			this.length = length;
			this.name = name;
		}
	};
	exports.DatabaseError = DatabaseError;
	var CopyDataMessage = class {
		constructor(length, chunk) {
			this.length = length;
			this.chunk = chunk;
			this.name = "copyData";
		}
	};
	exports.CopyDataMessage = CopyDataMessage;
	var CopyResponse = class {
		constructor(length, name, binary, columnCount) {
			this.length = length;
			this.name = name;
			this.binary = binary;
			this.columnTypes = new Array(columnCount);
		}
	};
	exports.CopyResponse = CopyResponse;
	var Field = class {
		constructor(name, tableID, columnID, dataTypeID, dataTypeSize, dataTypeModifier, format) {
			this.name = name;
			this.tableID = tableID;
			this.columnID = columnID;
			this.dataTypeID = dataTypeID;
			this.dataTypeSize = dataTypeSize;
			this.dataTypeModifier = dataTypeModifier;
			this.format = format;
		}
	};
	exports.Field = Field;
	var RowDescriptionMessage = class {
		constructor(length, fieldCount) {
			this.length = length;
			this.fieldCount = fieldCount;
			this.name = "rowDescription";
			this.fields = new Array(this.fieldCount);
		}
	};
	exports.RowDescriptionMessage = RowDescriptionMessage;
	var ParameterDescriptionMessage = class {
		constructor(length, parameterCount) {
			this.length = length;
			this.parameterCount = parameterCount;
			this.name = "parameterDescription";
			this.dataTypeIDs = new Array(this.parameterCount);
		}
	};
	exports.ParameterDescriptionMessage = ParameterDescriptionMessage;
	var ParameterStatusMessage = class {
		constructor(length, parameterName, parameterValue) {
			this.length = length;
			this.parameterName = parameterName;
			this.parameterValue = parameterValue;
			this.name = "parameterStatus";
		}
	};
	exports.ParameterStatusMessage = ParameterStatusMessage;
	var AuthenticationMD5Password = class {
		constructor(length, salt) {
			this.length = length;
			this.salt = salt;
			this.name = "authenticationMD5Password";
		}
	};
	exports.AuthenticationMD5Password = AuthenticationMD5Password;
	var BackendKeyDataMessage = class {
		constructor(length, processID, secretKey) {
			this.length = length;
			this.processID = processID;
			this.secretKey = secretKey;
			this.name = "backendKeyData";
		}
	};
	exports.BackendKeyDataMessage = BackendKeyDataMessage;
	var NotificationResponseMessage = class {
		constructor(length, processId, channel, payload) {
			this.length = length;
			this.processId = processId;
			this.channel = channel;
			this.payload = payload;
			this.name = "notification";
		}
	};
	exports.NotificationResponseMessage = NotificationResponseMessage;
	var ReadyForQueryMessage = class {
		constructor(length, status) {
			this.length = length;
			this.status = status;
			this.name = "readyForQuery";
		}
	};
	exports.ReadyForQueryMessage = ReadyForQueryMessage;
	var CommandCompleteMessage = class {
		constructor(length, text) {
			this.length = length;
			this.text = text;
			this.name = "commandComplete";
		}
	};
	exports.CommandCompleteMessage = CommandCompleteMessage;
	var DataRowMessage = class {
		constructor(length, fields) {
			this.length = length;
			this.fields = fields;
			this.name = "dataRow";
			this.fieldCount = fields.length;
		}
	};
	exports.DataRowMessage = DataRowMessage;
	var NoticeMessage = class {
		constructor(length, message) {
			this.length = length;
			this.message = message;
			this.name = "notice";
		}
	};
	exports.NoticeMessage = NoticeMessage;
}));
//#endregion
//#region ../../node_modules/.pnpm/pg-protocol@1.14.0/node_modules/pg-protocol/dist/buffer-writer.js
var require_buffer_writer = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Writer = void 0;
	var Writer = class {
		constructor(size = 256) {
			this.size = size;
			this.offset = 5;
			this.headerPosition = 0;
			this.buffer = Buffer.allocUnsafe(size);
		}
		ensure(size) {
			if (this.buffer.length - this.offset < size) {
				const oldBuffer = this.buffer;
				const newSize = oldBuffer.length + (oldBuffer.length >> 1) + size;
				this.buffer = Buffer.allocUnsafe(newSize);
				oldBuffer.copy(this.buffer);
			}
		}
		addInt32(num) {
			this.ensure(4);
			this.buffer[this.offset++] = num >>> 24 & 255;
			this.buffer[this.offset++] = num >>> 16 & 255;
			this.buffer[this.offset++] = num >>> 8 & 255;
			this.buffer[this.offset++] = num >>> 0 & 255;
			return this;
		}
		addInt16(num) {
			this.ensure(2);
			this.buffer[this.offset++] = num >>> 8 & 255;
			this.buffer[this.offset++] = num >>> 0 & 255;
			return this;
		}
		addCString(string) {
			if (!string) this.ensure(1);
			else {
				const len = Buffer.byteLength(string);
				this.ensure(len + 1);
				this.buffer.write(string, this.offset, "utf-8");
				this.offset += len;
			}
			this.buffer[this.offset++] = 0;
			return this;
		}
		addString(string = "") {
			const len = Buffer.byteLength(string);
			this.ensure(len);
			this.buffer.write(string, this.offset);
			this.offset += len;
			return this;
		}
		add(otherBuffer) {
			this.ensure(otherBuffer.length);
			otherBuffer.copy(this.buffer, this.offset);
			this.offset += otherBuffer.length;
			return this;
		}
		join(code) {
			if (code) {
				this.buffer[this.headerPosition] = code;
				const length = this.offset - (this.headerPosition + 1);
				this.buffer.writeInt32BE(length, this.headerPosition + 1);
			}
			return this.buffer.slice(code ? 0 : 5, this.offset);
		}
		flush(code) {
			const result = this.join(code);
			this.offset = 5;
			this.headerPosition = 0;
			this.buffer = Buffer.allocUnsafe(this.size);
			return result;
		}
	};
	exports.Writer = Writer;
}));
//#endregion
//#region ../../node_modules/.pnpm/pg-protocol@1.14.0/node_modules/pg-protocol/dist/serializer.js
var require_serializer = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.serialize = void 0;
	const buffer_writer_1 = require_buffer_writer();
	const writer = new buffer_writer_1.Writer();
	const startup = (opts) => {
		writer.addInt16(3).addInt16(0);
		for (const key of Object.keys(opts)) writer.addCString(key).addCString(opts[key]);
		writer.addCString("client_encoding").addCString("UTF8");
		const bodyBuffer = writer.addCString("").flush();
		const length = bodyBuffer.length + 4;
		return new buffer_writer_1.Writer().addInt32(length).add(bodyBuffer).flush();
	};
	const requestSsl = () => {
		const response = Buffer.allocUnsafe(8);
		response.writeInt32BE(8, 0);
		response.writeInt32BE(80877103, 4);
		return response;
	};
	const password = (password) => {
		return writer.addCString(password).flush(112);
	};
	const sendSASLInitialResponseMessage = function(mechanism, initialResponse) {
		writer.addCString(mechanism).addInt32(Buffer.byteLength(initialResponse)).addString(initialResponse);
		return writer.flush(112);
	};
	const sendSCRAMClientFinalMessage = function(additionalData) {
		return writer.addString(additionalData).flush(112);
	};
	const query = (text) => {
		return writer.addCString(text).flush(81);
	};
	const emptyArray = [];
	const parse = (query) => {
		const name = query.name || "";
		if (name.length > 63) {
			console.error("Warning! Postgres only supports 63 characters for query names.");
			console.error("You supplied %s (%s)", name, name.length);
			console.error("This can cause conflicts and silent errors executing queries");
		}
		const types = query.types || emptyArray;
		const len = types.length;
		const buffer = writer.addCString(name).addCString(query.text).addInt16(len);
		for (let i = 0; i < len; i++) buffer.addInt32(types[i]);
		return writer.flush(80);
	};
	const paramWriter = new buffer_writer_1.Writer();
	const writeValues = function(values, valueMapper) {
		for (let i = 0; i < values.length; i++) {
			const mappedVal = valueMapper ? valueMapper(values[i], i) : values[i];
			if (mappedVal == null) {
				writer.addInt16(0);
				paramWriter.addInt32(-1);
			} else if (mappedVal instanceof Buffer) {
				writer.addInt16(1);
				paramWriter.addInt32(mappedVal.length);
				paramWriter.add(mappedVal);
			} else {
				writer.addInt16(0);
				paramWriter.addInt32(Buffer.byteLength(mappedVal));
				paramWriter.addString(mappedVal);
			}
		}
	};
	const bind = (config = {}) => {
		const portal = config.portal || "";
		const statement = config.statement || "";
		const binary = config.binary || false;
		const values = config.values || emptyArray;
		const len = values.length;
		writer.addCString(portal).addCString(statement);
		writer.addInt16(len);
		writeValues(values, config.valueMapper);
		writer.addInt16(len);
		writer.add(paramWriter.flush());
		writer.addInt16(1);
		writer.addInt16(binary ? 1 : 0);
		return writer.flush(66);
	};
	const emptyExecute = Buffer.from([
		69,
		0,
		0,
		0,
		9,
		0,
		0,
		0,
		0,
		0
	]);
	const execute = (config) => {
		if (!config || !config.portal && !config.rows) return emptyExecute;
		const portal = config.portal || "";
		const rows = config.rows || 0;
		const portalLength = Buffer.byteLength(portal);
		const len = 4 + portalLength + 1 + 4;
		const buff = Buffer.allocUnsafe(1 + len);
		buff[0] = 69;
		buff.writeInt32BE(len, 1);
		buff.write(portal, 5, "utf-8");
		buff[portalLength + 5] = 0;
		buff.writeUInt32BE(rows, buff.length - 4);
		return buff;
	};
	const cancel = (processID, secretKey) => {
		const buffer = Buffer.allocUnsafe(16);
		buffer.writeInt32BE(16, 0);
		buffer.writeInt16BE(1234, 4);
		buffer.writeInt16BE(5678, 6);
		buffer.writeInt32BE(processID, 8);
		buffer.writeInt32BE(secretKey, 12);
		return buffer;
	};
	const cstringMessage = (code, string) => {
		const len = 4 + Buffer.byteLength(string) + 1;
		const buffer = Buffer.allocUnsafe(1 + len);
		buffer[0] = code;
		buffer.writeInt32BE(len, 1);
		buffer.write(string, 5, "utf-8");
		buffer[len] = 0;
		return buffer;
	};
	const emptyDescribePortal = writer.addCString("P").flush(68);
	const emptyDescribeStatement = writer.addCString("S").flush(68);
	const describe = (msg) => {
		return msg.name ? cstringMessage(68, `${msg.type}${msg.name || ""}`) : msg.type === "P" ? emptyDescribePortal : emptyDescribeStatement;
	};
	const close = (msg) => {
		return cstringMessage(67, `${msg.type}${msg.name || ""}`);
	};
	const copyData = (chunk) => {
		return writer.add(chunk).flush(100);
	};
	const copyFail = (message) => {
		return cstringMessage(102, message);
	};
	const codeOnlyBuffer = (code) => Buffer.from([
		code,
		0,
		0,
		0,
		4
	]);
	const flushBuffer = codeOnlyBuffer(72);
	const syncBuffer = codeOnlyBuffer(83);
	const endBuffer = codeOnlyBuffer(88);
	const copyDoneBuffer = codeOnlyBuffer(99);
	exports.serialize = {
		startup,
		password,
		requestSsl,
		sendSASLInitialResponseMessage,
		sendSCRAMClientFinalMessage,
		query,
		parse,
		bind,
		execute,
		describe,
		close,
		flush: () => flushBuffer,
		sync: () => syncBuffer,
		end: () => endBuffer,
		copyData,
		copyDone: () => copyDoneBuffer,
		copyFail,
		cancel
	};
}));
//#endregion
//#region ../../node_modules/.pnpm/pg-protocol@1.14.0/node_modules/pg-protocol/dist/buffer-reader.js
var require_buffer_reader = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.BufferReader = void 0;
	var BufferReader = class {
		constructor(offset = 0) {
			this.offset = offset;
			this.buffer = Buffer.allocUnsafe(0);
			this.encoding = "utf-8";
		}
		setBuffer(offset, buffer) {
			this.offset = offset;
			this.buffer = buffer;
		}
		int16() {
			const result = this.buffer.readInt16BE(this.offset);
			this.offset += 2;
			return result;
		}
		byte() {
			const result = this.buffer[this.offset];
			this.offset++;
			return result;
		}
		int32() {
			const result = this.buffer.readInt32BE(this.offset);
			this.offset += 4;
			return result;
		}
		uint32() {
			const result = this.buffer.readUInt32BE(this.offset);
			this.offset += 4;
			return result;
		}
		string(length) {
			const result = this.buffer.toString(this.encoding, this.offset, this.offset + length);
			this.offset += length;
			return result;
		}
		cstring() {
			const start = this.offset;
			let end = start;
			while (this.buffer[end++] !== 0);
			this.offset = end;
			return this.buffer.toString(this.encoding, start, end - 1);
		}
		bytes(length) {
			const result = this.buffer.slice(this.offset, this.offset + length);
			this.offset += length;
			return result;
		}
	};
	exports.BufferReader = BufferReader;
}));
//#endregion
//#region ../../node_modules/.pnpm/pg-protocol@1.14.0/node_modules/pg-protocol/dist/parser.js
var require_parser = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Parser = void 0;
	const messages_1 = require_messages();
	const buffer_reader_1 = require_buffer_reader();
	const CODE_LENGTH = 1;
	const HEADER_LENGTH = CODE_LENGTH + 4;
	const LATEINIT_LENGTH = -1;
	const emptyBuffer = Buffer.allocUnsafe(0);
	var Parser = class {
		constructor(opts) {
			this.buffer = emptyBuffer;
			this.bufferLength = 0;
			this.bufferOffset = 0;
			this.reader = new buffer_reader_1.BufferReader();
			if ((opts === null || opts === void 0 ? void 0 : opts.mode) === "binary") throw new Error("Binary mode not supported yet");
			this.mode = (opts === null || opts === void 0 ? void 0 : opts.mode) || "text";
		}
		parse(buffer, callback) {
			this.mergeBuffer(buffer);
			const bufferFullLength = this.bufferOffset + this.bufferLength;
			let offset = this.bufferOffset;
			while (offset + HEADER_LENGTH <= bufferFullLength) {
				const code = this.buffer[offset];
				const length = this.buffer.readUInt32BE(offset + CODE_LENGTH);
				const fullMessageLength = CODE_LENGTH + length;
				if (fullMessageLength + offset <= bufferFullLength) {
					callback(this.handlePacket(offset + HEADER_LENGTH, code, length, this.buffer));
					offset += fullMessageLength;
				} else break;
			}
			if (offset === bufferFullLength) {
				this.buffer = emptyBuffer;
				this.bufferLength = 0;
				this.bufferOffset = 0;
			} else {
				this.bufferLength = bufferFullLength - offset;
				this.bufferOffset = offset;
			}
		}
		mergeBuffer(buffer) {
			if (this.bufferLength > 0) {
				const newLength = this.bufferLength + buffer.byteLength;
				if (newLength + this.bufferOffset > this.buffer.byteLength) {
					let newBuffer;
					if (newLength <= this.buffer.byteLength && this.bufferOffset >= this.bufferLength) newBuffer = this.buffer;
					else {
						let newBufferLength = this.buffer.byteLength * 2;
						while (newLength >= newBufferLength) newBufferLength *= 2;
						newBuffer = Buffer.allocUnsafe(newBufferLength);
					}
					this.buffer.copy(newBuffer, 0, this.bufferOffset, this.bufferOffset + this.bufferLength);
					this.buffer = newBuffer;
					this.bufferOffset = 0;
				}
				buffer.copy(this.buffer, this.bufferOffset + this.bufferLength);
				this.bufferLength = newLength;
			} else {
				this.buffer = buffer;
				this.bufferOffset = 0;
				this.bufferLength = buffer.byteLength;
			}
		}
		handlePacket(offset, code, length, bytes) {
			const { reader } = this;
			reader.setBuffer(offset, bytes);
			let message;
			switch (code) {
				case 50:
					message = messages_1.bindComplete;
					break;
				case 49:
					message = messages_1.parseComplete;
					break;
				case 51:
					message = messages_1.closeComplete;
					break;
				case 110:
					message = messages_1.noData;
					break;
				case 115:
					message = messages_1.portalSuspended;
					break;
				case 99:
					message = messages_1.copyDone;
					break;
				case 87:
					message = messages_1.replicationStart;
					break;
				case 73:
					message = messages_1.emptyQuery;
					break;
				case 68:
					message = parseDataRowMessage(reader);
					break;
				case 67:
					message = parseCommandCompleteMessage(reader);
					break;
				case 90:
					message = parseReadyForQueryMessage(reader);
					break;
				case 65:
					message = parseNotificationMessage(reader);
					break;
				case 82:
					message = parseAuthenticationResponse(reader, length);
					break;
				case 83:
					message = parseParameterStatusMessage(reader);
					break;
				case 75:
					message = parseBackendKeyData(reader);
					break;
				case 69:
					message = parseErrorMessage(reader, "error");
					break;
				case 78:
					message = parseErrorMessage(reader, "notice");
					break;
				case 84:
					message = parseRowDescriptionMessage(reader);
					break;
				case 116:
					message = parseParameterDescriptionMessage(reader);
					break;
				case 71:
					message = parseCopyInMessage(reader);
					break;
				case 72:
					message = parseCopyOutMessage(reader);
					break;
				case 100:
					message = parseCopyData(reader, length);
					break;
				default: return new messages_1.DatabaseError("received invalid response: " + code.toString(16), length, "error");
			}
			reader.setBuffer(0, emptyBuffer);
			message.length = length;
			return message;
		}
	};
	exports.Parser = Parser;
	const parseReadyForQueryMessage = (reader) => {
		const status = reader.string(1);
		return new messages_1.ReadyForQueryMessage(LATEINIT_LENGTH, status);
	};
	const parseCommandCompleteMessage = (reader) => {
		const text = reader.cstring();
		return new messages_1.CommandCompleteMessage(LATEINIT_LENGTH, text);
	};
	const parseCopyData = (reader, length) => {
		const chunk = reader.bytes(length - 4);
		return new messages_1.CopyDataMessage(LATEINIT_LENGTH, chunk);
	};
	const parseCopyInMessage = (reader) => parseCopyMessage(reader, "copyInResponse");
	const parseCopyOutMessage = (reader) => parseCopyMessage(reader, "copyOutResponse");
	const parseCopyMessage = (reader, messageName) => {
		const isBinary = reader.byte() !== 0;
		const columnCount = reader.int16();
		const message = new messages_1.CopyResponse(LATEINIT_LENGTH, messageName, isBinary, columnCount);
		for (let i = 0; i < columnCount; i++) message.columnTypes[i] = reader.int16();
		return message;
	};
	const parseNotificationMessage = (reader) => {
		const processId = reader.int32();
		const channel = reader.cstring();
		const payload = reader.cstring();
		return new messages_1.NotificationResponseMessage(LATEINIT_LENGTH, processId, channel, payload);
	};
	const parseRowDescriptionMessage = (reader) => {
		const fieldCount = reader.int16();
		const message = new messages_1.RowDescriptionMessage(LATEINIT_LENGTH, fieldCount);
		for (let i = 0; i < fieldCount; i++) message.fields[i] = parseField(reader);
		return message;
	};
	const parseField = (reader) => {
		const name = reader.cstring();
		const tableID = reader.uint32();
		const columnID = reader.int16();
		const dataTypeID = reader.uint32();
		const dataTypeSize = reader.int16();
		const dataTypeModifier = reader.int32();
		const mode = reader.int16() === 0 ? "text" : "binary";
		return new messages_1.Field(name, tableID, columnID, dataTypeID, dataTypeSize, dataTypeModifier, mode);
	};
	const parseParameterDescriptionMessage = (reader) => {
		const parameterCount = reader.int16();
		const message = new messages_1.ParameterDescriptionMessage(LATEINIT_LENGTH, parameterCount);
		for (let i = 0; i < parameterCount; i++) message.dataTypeIDs[i] = reader.int32();
		return message;
	};
	const parseDataRowMessage = (reader) => {
		const fieldCount = reader.int16();
		const fields = new Array(fieldCount);
		for (let i = 0; i < fieldCount; i++) {
			const len = reader.int32();
			fields[i] = len === -1 ? null : reader.string(len);
		}
		return new messages_1.DataRowMessage(LATEINIT_LENGTH, fields);
	};
	const parseParameterStatusMessage = (reader) => {
		const name = reader.cstring();
		const value = reader.cstring();
		return new messages_1.ParameterStatusMessage(LATEINIT_LENGTH, name, value);
	};
	const parseBackendKeyData = (reader) => {
		const processID = reader.int32();
		const secretKey = reader.int32();
		return new messages_1.BackendKeyDataMessage(LATEINIT_LENGTH, processID, secretKey);
	};
	const parseAuthenticationResponse = (reader, length) => {
		const code = reader.int32();
		const message = {
			name: "authenticationOk",
			length
		};
		switch (code) {
			case 0: break;
			case 3:
				if (message.length === 8) message.name = "authenticationCleartextPassword";
				break;
			case 5:
				if (message.length === 12) {
					message.name = "authenticationMD5Password";
					const salt = reader.bytes(4);
					return new messages_1.AuthenticationMD5Password(LATEINIT_LENGTH, salt);
				}
				break;
			case 10:
				{
					message.name = "authenticationSASL";
					message.mechanisms = [];
					let mechanism;
					do {
						mechanism = reader.cstring();
						if (mechanism) message.mechanisms.push(mechanism);
					} while (mechanism);
				}
				break;
			case 11:
				message.name = "authenticationSASLContinue";
				message.data = reader.string(length - 8);
				break;
			case 12:
				message.name = "authenticationSASLFinal";
				message.data = reader.string(length - 8);
				break;
			default: throw new Error("Unknown authenticationOk message type " + code);
		}
		return message;
	};
	const parseErrorMessage = (reader, name) => {
		const fields = {};
		let fieldType = reader.string(1);
		while (fieldType !== "\0") {
			fields[fieldType] = reader.cstring();
			fieldType = reader.string(1);
		}
		const messageValue = fields.M;
		const message = name === "notice" ? new messages_1.NoticeMessage(LATEINIT_LENGTH, messageValue) : new messages_1.DatabaseError(messageValue, LATEINIT_LENGTH, name);
		message.severity = fields.S;
		message.code = fields.C;
		message.detail = fields.D;
		message.hint = fields.H;
		message.position = fields.P;
		message.internalPosition = fields.p;
		message.internalQuery = fields.q;
		message.where = fields.W;
		message.schema = fields.s;
		message.table = fields.t;
		message.column = fields.c;
		message.dataType = fields.d;
		message.constraint = fields.n;
		message.file = fields.F;
		message.line = fields.L;
		message.routine = fields.R;
		return message;
	};
}));
//#endregion
//#region ../../node_modules/.pnpm/pg-protocol@1.14.0/node_modules/pg-protocol/dist/index.js
var require_dist = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.DatabaseError = exports.serialize = exports.parse = void 0;
	const messages_1 = require_messages();
	Object.defineProperty(exports, "DatabaseError", {
		enumerable: true,
		get: function() {
			return messages_1.DatabaseError;
		}
	});
	const serializer_1 = require_serializer();
	Object.defineProperty(exports, "serialize", {
		enumerable: true,
		get: function() {
			return serializer_1.serialize;
		}
	});
	const parser_1 = require_parser();
	function parse(stream, callback) {
		const parser = new parser_1.Parser();
		stream.on("data", (buffer) => parser.parse(buffer, callback));
		return new Promise((resolve) => stream.on("end", () => resolve()));
	}
	exports.parse = parse;
}));
//#endregion
//#region ../../node_modules/.pnpm/pg-cloudflare@1.4.0/node_modules/pg-cloudflare/dist/empty.js
var require_empty = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = {};
}));
//#endregion
//#region ../../node_modules/.pnpm/pg@8.21.0/node_modules/pg/lib/stream.js
var require_stream = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const { getStream, getSecureStream } = getStreamFuncs();
	module.exports = {
		/**
		* Get a socket stream compatible with the current runtime environment.
		* @returns {Duplex}
		*/
		getStream,
		/**
		* Get a TLS secured socket, compatible with the current environment,
		* using the socket and other settings given in `options`.
		* @returns {Duplex}
		*/
		getSecureStream
	};
	/**
	* The stream functions that work in Node.js
	*/
	function getNodejsStreamFuncs() {
		function getStream(ssl) {
			return new (__require("net")).Socket();
		}
		function getSecureStream(options) {
			return __require("tls").connect(options);
		}
		return {
			getStream,
			getSecureStream
		};
	}
	/**
	* The stream functions that work in Cloudflare Workers
	*/
	function getCloudflareStreamFuncs() {
		function getStream(ssl) {
			const { CloudflareSocket } = require_empty();
			return new CloudflareSocket(ssl);
		}
		function getSecureStream(options) {
			options.socket.startTls(options);
			return options.socket;
		}
		return {
			getStream,
			getSecureStream
		};
	}
	/**
	* Are we running in a Cloudflare Worker?
	*
	* @returns true if the code is currently running inside a Cloudflare Worker.
	*/
	function isCloudflareRuntime() {
		if (typeof navigator === "object" && navigator !== null && typeof navigator.userAgent === "string") return navigator.userAgent === "Cloudflare-Workers";
		if (typeof Response === "function") {
			const resp = new Response(null, { cf: { thing: true } });
			if (typeof resp.cf === "object" && resp.cf !== null && resp.cf.thing) return true;
		}
		return false;
	}
	function getStreamFuncs() {
		if (isCloudflareRuntime()) return getCloudflareStreamFuncs();
		return getNodejsStreamFuncs();
	}
}));
//#endregion
//#region ../../node_modules/.pnpm/pg@8.21.0/node_modules/pg/lib/connection.js
var require_connection = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const EventEmitter$4 = __require("events").EventEmitter;
	const { parse, serialize } = require_dist();
	const { getStream, getSecureStream } = require_stream();
	const flushBuffer = serialize.flush();
	const syncBuffer = serialize.sync();
	const endBuffer = serialize.end();
	var Connection$1 = class extends EventEmitter$4 {
		constructor(config) {
			super();
			config = config || {};
			this.stream = config.stream || getStream(config.ssl);
			if (typeof this.stream === "function") this.stream = this.stream(config);
			this._keepAlive = config.keepAlive;
			this._keepAliveInitialDelayMillis = config.keepAliveInitialDelayMillis;
			this.parsedStatements = {};
			this.ssl = config.ssl || false;
			this._ending = false;
			this._emitMessage = false;
			const self = this;
			this.on("newListener", function(eventName) {
				if (eventName === "message") self._emitMessage = true;
			});
		}
		connect(port, host) {
			const self = this;
			this._connecting = true;
			this.stream.setNoDelay(true);
			this.stream.connect(port, host);
			this.stream.once("connect", function() {
				if (self._keepAlive) self.stream.setKeepAlive(true, self._keepAliveInitialDelayMillis);
				self.emit("connect");
			});
			const reportStreamError = function(error) {
				if (self._ending && (error.code === "ECONNRESET" || error.code === "EPIPE")) return;
				self.emit("error", error);
			};
			this.stream.on("error", reportStreamError);
			this.stream.on("close", function() {
				self.emit("end");
			});
			if (!this.ssl) return this.attachListeners(this.stream);
			this.stream.once("data", function(buffer) {
				switch (buffer.toString("utf8")) {
					case "S": break;
					case "N":
						self.stream.end();
						return self.emit("error", /* @__PURE__ */ new Error("The server does not support SSL connections"));
					default:
						self.stream.end();
						return self.emit("error", /* @__PURE__ */ new Error("There was an error establishing an SSL connection"));
				}
				const options = { socket: self.stream };
				if (self.ssl !== true) {
					Object.assign(options, self.ssl);
					if ("key" in self.ssl) options.key = self.ssl.key;
				}
				const net = __require("net");
				if (net.isIP && net.isIP(host) === 0) options.servername = host;
				try {
					self.stream = getSecureStream(options);
				} catch (err) {
					return self.emit("error", err);
				}
				self.attachListeners(self.stream);
				self.stream.on("error", reportStreamError);
				self.emit("sslconnect");
			});
		}
		attachListeners(stream) {
			parse(stream, (msg) => {
				const eventName = msg.name === "error" ? "errorMessage" : msg.name;
				if (this._emitMessage) this.emit("message", msg);
				this.emit(eventName, msg);
			});
		}
		requestSsl() {
			this.stream.write(serialize.requestSsl());
		}
		startup(config) {
			this.stream.write(serialize.startup(config));
		}
		cancel(processID, secretKey) {
			this._send(serialize.cancel(processID, secretKey));
		}
		password(password) {
			this._send(serialize.password(password));
		}
		sendSASLInitialResponseMessage(mechanism, initialResponse) {
			this._send(serialize.sendSASLInitialResponseMessage(mechanism, initialResponse));
		}
		sendSCRAMClientFinalMessage(additionalData) {
			this._send(serialize.sendSCRAMClientFinalMessage(additionalData));
		}
		_send(buffer) {
			if (!this.stream.writable) return false;
			return this.stream.write(buffer);
		}
		query(text) {
			this._send(serialize.query(text));
		}
		parse(query) {
			this._send(serialize.parse(query));
		}
		bind(config) {
			this._send(serialize.bind(config));
		}
		execute(config) {
			this._send(serialize.execute(config));
		}
		flush() {
			if (this.stream.writable) this.stream.write(flushBuffer);
		}
		sync() {
			this._ending = true;
			this._send(syncBuffer);
		}
		ref() {
			this.stream.ref();
		}
		unref() {
			this.stream.unref();
		}
		end() {
			this._ending = true;
			if (!this._connecting || !this.stream.writable) {
				this.stream.end();
				return;
			}
			return this.stream.write(endBuffer, () => {
				this.stream.end();
			});
		}
		close(msg) {
			this._send(serialize.close(msg));
		}
		describe(msg) {
			this._send(serialize.describe(msg));
		}
		sendCopyFromChunk(chunk) {
			this._send(serialize.copyData(chunk));
		}
		endCopyFrom() {
			this._send(serialize.copyDone());
		}
		sendCopyFail(msg) {
			this._send(serialize.copyFail(msg));
		}
	};
	module.exports = Connection$1;
}));
//#endregion
//#region ../../node_modules/.pnpm/split2@4.2.0/node_modules/split2/index.js
var require_split2 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const { Transform } = __require("stream");
	const { StringDecoder } = __require("string_decoder");
	const kLast = Symbol("last");
	const kDecoder = Symbol("decoder");
	function transform(chunk, enc, cb) {
		let list;
		if (this.overflow) {
			list = this[kDecoder].write(chunk).split(this.matcher);
			if (list.length === 1) return cb();
			list.shift();
			this.overflow = false;
		} else {
			this[kLast] += this[kDecoder].write(chunk);
			list = this[kLast].split(this.matcher);
		}
		this[kLast] = list.pop();
		for (let i = 0; i < list.length; i++) try {
			push(this, this.mapper(list[i]));
		} catch (error) {
			return cb(error);
		}
		this.overflow = this[kLast].length > this.maxLength;
		if (this.overflow && !this.skipOverflow) {
			cb(/* @__PURE__ */ new Error("maximum buffer reached"));
			return;
		}
		cb();
	}
	function flush(cb) {
		this[kLast] += this[kDecoder].end();
		if (this[kLast]) try {
			push(this, this.mapper(this[kLast]));
		} catch (error) {
			return cb(error);
		}
		cb();
	}
	function push(self, val) {
		if (val !== void 0) self.push(val);
	}
	function noop(incoming) {
		return incoming;
	}
	function split(matcher, mapper, options) {
		matcher = matcher || /\r?\n/;
		mapper = mapper || noop;
		options = options || {};
		switch (arguments.length) {
			case 1:
				if (typeof matcher === "function") {
					mapper = matcher;
					matcher = /\r?\n/;
				} else if (typeof matcher === "object" && !(matcher instanceof RegExp) && !matcher[Symbol.split]) {
					options = matcher;
					matcher = /\r?\n/;
				}
				break;
			case 2: if (typeof matcher === "function") {
				options = mapper;
				mapper = matcher;
				matcher = /\r?\n/;
			} else if (typeof mapper === "object") {
				options = mapper;
				mapper = noop;
			}
		}
		options = Object.assign({}, options);
		options.autoDestroy = true;
		options.transform = transform;
		options.flush = flush;
		options.readableObjectMode = true;
		const stream = new Transform(options);
		stream[kLast] = "";
		stream[kDecoder] = new StringDecoder("utf8");
		stream.matcher = matcher;
		stream.mapper = mapper;
		stream.maxLength = options.maxLength;
		stream.skipOverflow = options.skipOverflow || false;
		stream.overflow = false;
		stream._destroy = function(err, cb) {
			this._writableState.errorEmitted = false;
			cb(err);
		};
		return stream;
	}
	module.exports = split;
}));
//#endregion
//#region ../../node_modules/.pnpm/pgpass@1.0.5/node_modules/pgpass/lib/helper.js
var require_helper = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var path$1 = __require("path"), Stream$1 = __require("stream").Stream, split = require_split2(), util$2 = __require("util"), defaultPort = 5432, isWin = process.platform === "win32", warnStream = process.stderr;
	var S_IRWXG = 56, S_IRWXO = 7, S_IFMT = 61440, S_IFREG = 32768;
	function isRegFile(mode) {
		return (mode & S_IFMT) == S_IFREG;
	}
	var fieldNames = [
		"host",
		"port",
		"database",
		"user",
		"password"
	];
	var nrOfFields = fieldNames.length;
	var passKey = fieldNames[nrOfFields - 1];
	function warn() {
		if (warnStream instanceof Stream$1 && true === warnStream.writable) {
			var args = Array.prototype.slice.call(arguments).concat("\n");
			warnStream.write(util$2.format.apply(util$2, args));
		}
	}
	Object.defineProperty(module.exports, "isWin", {
		get: function() {
			return isWin;
		},
		set: function(val) {
			isWin = val;
		}
	});
	module.exports.warnTo = function(stream) {
		var old = warnStream;
		warnStream = stream;
		return old;
	};
	module.exports.getFileName = function(rawEnv) {
		var env = rawEnv || process.env;
		return env.PGPASSFILE || (isWin ? path$1.join(env.APPDATA || "./", "postgresql", "pgpass.conf") : path$1.join(env.HOME || "./", ".pgpass"));
	};
	module.exports.usePgPass = function(stats, fname) {
		if (Object.prototype.hasOwnProperty.call(process.env, "PGPASSWORD")) return false;
		if (isWin) return true;
		fname = fname || "<unkn>";
		if (!isRegFile(stats.mode)) {
			warn("WARNING: password file \"%s\" is not a plain file", fname);
			return false;
		}
		if (stats.mode & (S_IRWXG | S_IRWXO)) {
			warn("WARNING: password file \"%s\" has group or world access; permissions should be u=rw (0600) or less", fname);
			return false;
		}
		return true;
	};
	var matcher = module.exports.match = function(connInfo, entry) {
		return fieldNames.slice(0, -1).reduce(function(prev, field, idx) {
			if (idx == 1) {
				if (Number(connInfo[field] || defaultPort) === Number(entry[field])) return prev && true;
			}
			return prev && (entry[field] === "*" || entry[field] === connInfo[field]);
		}, true);
	};
	module.exports.getPassword = function(connInfo, stream, cb) {
		var pass;
		var lineStream = stream.pipe(split());
		function onLine(line) {
			var entry = parseLine(line);
			if (entry && isValidEntry(entry) && matcher(connInfo, entry)) {
				pass = entry[passKey];
				lineStream.end();
			}
		}
		var onEnd = function() {
			stream.destroy();
			cb(pass);
		};
		var onErr = function(err) {
			stream.destroy();
			warn("WARNING: error on reading file: %s", err);
			cb(void 0);
		};
		stream.on("error", onErr);
		lineStream.on("data", onLine).on("end", onEnd).on("error", onErr);
	};
	var parseLine = module.exports.parseLine = function(line) {
		if (line.length < 11 || line.match(/^\s+#/)) return null;
		var curChar = "";
		var prevChar = "";
		var fieldIdx = 0;
		var startIdx = 0;
		var obj = {};
		var isLastField = false;
		var addToObj = function(idx, i0, i1) {
			var field = line.substring(i0, i1);
			if (!Object.hasOwnProperty.call(process.env, "PGPASS_NO_DEESCAPE")) field = field.replace(/\\([:\\])/g, "$1");
			obj[fieldNames[idx]] = field;
		};
		for (var i = 0; i < line.length - 1; i += 1) {
			curChar = line.charAt(i + 1);
			prevChar = line.charAt(i);
			isLastField = fieldIdx == nrOfFields - 1;
			if (isLastField) {
				addToObj(fieldIdx, startIdx);
				break;
			}
			if (i >= 0 && curChar == ":" && prevChar !== "\\") {
				addToObj(fieldIdx, startIdx, i + 1);
				startIdx = i + 2;
				fieldIdx += 1;
			}
		}
		obj = Object.keys(obj).length === nrOfFields ? obj : null;
		return obj;
	};
	var isValidEntry = module.exports.isValidEntry = function(entry) {
		var rules = {
			0: function(x) {
				return x.length > 0;
			},
			1: function(x) {
				if (x === "*") return true;
				x = Number(x);
				return isFinite(x) && x > 0 && x < 9007199254740992 && Math.floor(x) === x;
			},
			2: function(x) {
				return x.length > 0;
			},
			3: function(x) {
				return x.length > 0;
			},
			4: function(x) {
				return x.length > 0;
			}
		};
		for (var idx = 0; idx < fieldNames.length; idx += 1) {
			var rule = rules[idx];
			if (!rule(entry[fieldNames[idx]] || "")) return false;
		}
		return true;
	};
}));
//#endregion
//#region ../../node_modules/.pnpm/pgpass@1.0.5/node_modules/pgpass/lib/index.js
var require_lib$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	__require("path");
	var fs = __require("fs"), helper = require_helper();
	module.exports = function(connInfo, cb) {
		var file = helper.getFileName();
		fs.stat(file, function(err, stat) {
			if (err || !helper.usePgPass(stat, file)) return cb(void 0);
			var st = fs.createReadStream(file);
			helper.getPassword(connInfo, st, cb);
		});
	};
	module.exports.warnTo = helper.warnTo;
}));
//#endregion
//#region ../../node_modules/.pnpm/pg@8.21.0/node_modules/pg/lib/client.js
var require_client$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const EventEmitter$3 = __require("events").EventEmitter;
	const utils = require_utils$1();
	const nodeUtils$1 = __require("util");
	const sasl = require_sasl();
	const TypeOverrides = require_type_overrides();
	const ConnectionParameters = require_connection_parameters();
	const Query = require_query$1();
	const defaults = require_defaults();
	const Connection = require_connection();
	const crypto = require_utils();
	const activeQueryDeprecationNotice = nodeUtils$1.deprecate(() => {}, "Client.activeQuery is deprecated and will be removed in pg@9.0");
	const queryQueueDeprecationNotice = nodeUtils$1.deprecate(() => {}, "Client.queryQueue is deprecated and will be removed in pg@9.0.");
	const pgPassDeprecationNotice = nodeUtils$1.deprecate(() => {}, "pgpass support is deprecated and will be removed in pg@9.0. You can provide an async function as the password property to the Client/Pool constructor that returns a password instead. Within this function you can call the pgpass module in your own code.");
	const byoPromiseDeprecationNotice = nodeUtils$1.deprecate(() => {}, "Passing a custom Promise implementation to the Client/Pool constructor is deprecated and will be removed in pg@9.0.");
	const queryQueueLengthDeprecationNotice = nodeUtils$1.deprecate(() => {}, "Calling client.query() when the client is already executing a query is deprecated and will be removed in pg@9.0. Use async/await or an external async flow control mechanism instead.");
	function coerceNumberOrDefault(value, defaultValue) {
		if (typeof value === "number") return Number.isFinite(value) ? value : defaultValue;
		if (typeof value === "string" && value.trim() !== "") {
			const n = Number(value);
			return Number.isFinite(n) ? n : defaultValue;
		}
		return defaultValue;
	}
	var Client = class extends EventEmitter$3 {
		constructor(config) {
			super();
			this.connectionParameters = new ConnectionParameters(config);
			this.user = this.connectionParameters.user;
			this.database = this.connectionParameters.database;
			this.port = this.connectionParameters.port;
			this.host = this.connectionParameters.host;
			Object.defineProperty(this, "password", {
				configurable: true,
				enumerable: false,
				writable: true,
				value: this.connectionParameters.password
			});
			this.replication = this.connectionParameters.replication;
			const c = config || {};
			if (c.Promise) byoPromiseDeprecationNotice();
			this._Promise = c.Promise || global.Promise;
			this._types = new TypeOverrides(c.types);
			this._ending = false;
			this._ended = false;
			this._connecting = false;
			this._connected = false;
			this._connectionError = false;
			this._queryable = true;
			this._activeQuery = null;
			this._txStatus = null;
			this.enableChannelBinding = Boolean(c.enableChannelBinding);
			this.scramMaxIterations = coerceNumberOrDefault(c.scramMaxIterations, sasl.DEFAULT_MAX_SCRAM_ITERATIONS);
			this.connection = c.connection || new Connection({
				stream: c.stream,
				ssl: this.connectionParameters.ssl,
				keepAlive: c.keepAlive || false,
				keepAliveInitialDelayMillis: c.keepAliveInitialDelayMillis || 0,
				encoding: this.connectionParameters.client_encoding || "utf8"
			});
			this._queryQueue = [];
			this.binary = c.binary || defaults.binary;
			this.processID = null;
			this.secretKey = null;
			this.ssl = this.connectionParameters.ssl || false;
			if (this.ssl && this.ssl.key) Object.defineProperty(this.ssl, "key", { enumerable: false });
			this._connectionTimeoutMillis = c.connectionTimeoutMillis || 0;
		}
		get activeQuery() {
			activeQueryDeprecationNotice();
			return this._activeQuery;
		}
		set activeQuery(val) {
			activeQueryDeprecationNotice();
			this._activeQuery = val;
		}
		_getActiveQuery() {
			return this._activeQuery;
		}
		_errorAllQueries(err) {
			const enqueueError = (query) => {
				process.nextTick(() => {
					query.handleError(err, this.connection);
				});
			};
			const activeQuery = this._getActiveQuery();
			if (activeQuery) {
				enqueueError(activeQuery);
				this._activeQuery = null;
			}
			this._queryQueue.forEach(enqueueError);
			this._queryQueue.length = 0;
		}
		_connect(callback) {
			const self = this;
			const con = this.connection;
			this._connectionCallback = callback;
			if (this._connecting || this._connected) {
				const err = /* @__PURE__ */ new Error("Client has already been connected. You cannot reuse a client.");
				process.nextTick(() => {
					callback(err);
				});
				return;
			}
			this._connecting = true;
			if (this._connectionTimeoutMillis > 0) {
				this.connectionTimeoutHandle = setTimeout(() => {
					con._ending = true;
					con.stream.destroy(/* @__PURE__ */ new Error("timeout expired"));
				}, this._connectionTimeoutMillis);
				if (this.connectionTimeoutHandle.unref) this.connectionTimeoutHandle.unref();
			}
			if (this.host && this.host.indexOf("/") === 0) con.connect(this.host + "/.s.PGSQL." + this.port);
			else con.connect(this.port, this.host);
			con.on("connect", function() {
				if (self.ssl) con.requestSsl();
				else con.startup(self.getStartupConf());
			});
			con.on("sslconnect", function() {
				con.startup(self.getStartupConf());
			});
			this._attachListeners(con);
			con.once("end", () => {
				const error = this._ending ? /* @__PURE__ */ new Error("Connection terminated") : /* @__PURE__ */ new Error("Connection terminated unexpectedly");
				clearTimeout(this.connectionTimeoutHandle);
				this._errorAllQueries(error);
				this._ended = true;
				if (!this._ending) {
					if (this._connecting && !this._connectionError) if (this._connectionCallback) this._connectionCallback(error);
					else this._handleErrorEvent(error);
					else if (!this._connectionError) this._handleErrorEvent(error);
				}
				process.nextTick(() => {
					this.emit("end");
				});
			});
		}
		connect(callback) {
			if (callback) {
				this._connect(callback);
				return;
			}
			return new this._Promise((resolve, reject) => {
				this._connect((error) => {
					if (error) reject(error);
					else resolve(this);
				});
			});
		}
		_attachListeners(con) {
			con.on("authenticationCleartextPassword", this._handleAuthCleartextPassword.bind(this));
			con.on("authenticationMD5Password", this._handleAuthMD5Password.bind(this));
			con.on("authenticationSASL", this._handleAuthSASL.bind(this));
			con.on("authenticationSASLContinue", this._handleAuthSASLContinue.bind(this));
			con.on("authenticationSASLFinal", this._handleAuthSASLFinal.bind(this));
			con.on("backendKeyData", this._handleBackendKeyData.bind(this));
			con.on("error", this._handleErrorEvent.bind(this));
			con.on("errorMessage", this._handleErrorMessage.bind(this));
			con.on("readyForQuery", this._handleReadyForQuery.bind(this));
			con.on("notice", this._handleNotice.bind(this));
			con.on("rowDescription", this._handleRowDescription.bind(this));
			con.on("dataRow", this._handleDataRow.bind(this));
			con.on("portalSuspended", this._handlePortalSuspended.bind(this));
			con.on("emptyQuery", this._handleEmptyQuery.bind(this));
			con.on("commandComplete", this._handleCommandComplete.bind(this));
			con.on("parseComplete", this._handleParseComplete.bind(this));
			con.on("copyInResponse", this._handleCopyInResponse.bind(this));
			con.on("copyData", this._handleCopyData.bind(this));
			con.on("notification", this._handleNotification.bind(this));
		}
		_getPassword(cb) {
			const con = this.connection;
			if (typeof this.password === "function") this._Promise.resolve().then(() => this.password(this.connectionParameters)).then((pass) => {
				if (pass !== void 0) {
					if (typeof pass !== "string") {
						con.emit("error", /* @__PURE__ */ new TypeError("Password must be a string"));
						return;
					}
					this.connectionParameters.password = this.password = pass;
				} else this.connectionParameters.password = this.password = null;
				cb();
			}).catch((err) => {
				con.emit("error", err);
			});
			else if (this.password !== null) cb();
			else try {
				require_lib$1()(this.connectionParameters, (pass) => {
					if (void 0 !== pass) {
						pgPassDeprecationNotice();
						this.connectionParameters.password = this.password = pass;
					}
					cb();
				});
			} catch (e) {
				this.emit("error", e);
			}
		}
		_handleAuthCleartextPassword(msg) {
			this._getPassword(() => {
				this.connection.password(this.password);
			});
		}
		_handleAuthMD5Password(msg) {
			this._getPassword(async () => {
				try {
					const hashedPassword = await crypto.postgresMd5PasswordHash(this.user, this.password, msg.salt);
					this.connection.password(hashedPassword);
				} catch (e) {
					this.emit("error", e);
				}
			});
		}
		_handleAuthSASL(msg) {
			this._getPassword(() => {
				try {
					this.saslSession = sasl.startSession(msg.mechanisms, this.enableChannelBinding && this.connection.stream, this.scramMaxIterations);
					this.connection.sendSASLInitialResponseMessage(this.saslSession.mechanism, this.saslSession.response);
				} catch (err) {
					this.connection.emit("error", err);
				}
			});
		}
		async _handleAuthSASLContinue(msg) {
			try {
				await sasl.continueSession(this.saslSession, this.password, msg.data, this.enableChannelBinding && this.connection.stream);
				this.connection.sendSCRAMClientFinalMessage(this.saslSession.response);
			} catch (err) {
				this.connection.emit("error", err);
			}
		}
		_handleAuthSASLFinal(msg) {
			try {
				sasl.finalizeSession(this.saslSession, msg.data);
				this.saslSession = null;
			} catch (err) {
				this.connection.emit("error", err);
			}
		}
		_handleBackendKeyData(msg) {
			this.processID = msg.processID;
			this.secretKey = msg.secretKey;
		}
		_handleReadyForQuery(msg) {
			if (this._connecting) {
				this._connecting = false;
				this._connected = true;
				clearTimeout(this.connectionTimeoutHandle);
				if (this._connectionCallback) {
					this._connectionCallback(null, this);
					this._connectionCallback = null;
				}
				this.emit("connect");
			}
			const activeQuery = this._getActiveQuery();
			this._activeQuery = null;
			this._txStatus = msg?.status ?? null;
			this.readyForQuery = true;
			if (activeQuery) activeQuery.handleReadyForQuery(this.connection);
			this._pulseQueryQueue();
		}
		_handleErrorWhileConnecting(err) {
			if (this._connectionError) return;
			this._connectionError = true;
			clearTimeout(this.connectionTimeoutHandle);
			if (this._connectionCallback) return this._connectionCallback(err);
			this.emit("error", err);
		}
		_handleErrorEvent(err) {
			if (this._connecting) return this._handleErrorWhileConnecting(err);
			this._queryable = false;
			this._errorAllQueries(err);
			this.emit("error", err);
		}
		_handleErrorMessage(msg) {
			if (this._connecting) return this._handleErrorWhileConnecting(msg);
			const activeQuery = this._getActiveQuery();
			if (!activeQuery) {
				this._handleErrorEvent(msg);
				return;
			}
			this._activeQuery = null;
			activeQuery.handleError(msg, this.connection);
		}
		_handleRowDescription(msg) {
			const activeQuery = this._getActiveQuery();
			if (activeQuery == null) {
				const error = /* @__PURE__ */ new Error("Received unexpected rowDescription message from backend.");
				this._handleErrorEvent(error);
				return;
			}
			activeQuery.handleRowDescription(msg);
		}
		_handleDataRow(msg) {
			const activeQuery = this._getActiveQuery();
			if (activeQuery == null) {
				const error = /* @__PURE__ */ new Error("Received unexpected dataRow message from backend.");
				this._handleErrorEvent(error);
				return;
			}
			activeQuery.handleDataRow(msg);
		}
		_handlePortalSuspended(msg) {
			const activeQuery = this._getActiveQuery();
			if (activeQuery == null) {
				const error = /* @__PURE__ */ new Error("Received unexpected portalSuspended message from backend.");
				this._handleErrorEvent(error);
				return;
			}
			activeQuery.handlePortalSuspended(this.connection);
		}
		_handleEmptyQuery(msg) {
			const activeQuery = this._getActiveQuery();
			if (activeQuery == null) {
				const error = /* @__PURE__ */ new Error("Received unexpected emptyQuery message from backend.");
				this._handleErrorEvent(error);
				return;
			}
			activeQuery.handleEmptyQuery(this.connection);
		}
		_handleCommandComplete(msg) {
			const activeQuery = this._getActiveQuery();
			if (activeQuery == null) {
				const error = /* @__PURE__ */ new Error("Received unexpected commandComplete message from backend.");
				this._handleErrorEvent(error);
				return;
			}
			activeQuery.handleCommandComplete(msg, this.connection);
		}
		_handleParseComplete() {
			const activeQuery = this._getActiveQuery();
			if (activeQuery == null) {
				const error = /* @__PURE__ */ new Error("Received unexpected parseComplete message from backend.");
				this._handleErrorEvent(error);
				return;
			}
			if (activeQuery.name) this.connection.parsedStatements[activeQuery.name] = activeQuery.text;
		}
		_handleCopyInResponse(msg) {
			const activeQuery = this._getActiveQuery();
			if (activeQuery == null) {
				const error = /* @__PURE__ */ new Error("Received unexpected copyInResponse message from backend.");
				this._handleErrorEvent(error);
				return;
			}
			activeQuery.handleCopyInResponse(this.connection);
		}
		_handleCopyData(msg) {
			const activeQuery = this._getActiveQuery();
			if (activeQuery == null) {
				const error = /* @__PURE__ */ new Error("Received unexpected copyData message from backend.");
				this._handleErrorEvent(error);
				return;
			}
			activeQuery.handleCopyData(msg, this.connection);
		}
		_handleNotification(msg) {
			this.emit("notification", msg);
		}
		_handleNotice(msg) {
			this.emit("notice", msg);
		}
		getStartupConf() {
			const params = this.connectionParameters;
			const data = {
				user: params.user,
				database: params.database
			};
			const appName = params.application_name || params.fallback_application_name;
			if (appName) data.application_name = appName;
			if (params.replication) data.replication = "" + params.replication;
			if (params.statement_timeout) data.statement_timeout = String(parseInt(params.statement_timeout, 10));
			if (params.lock_timeout) data.lock_timeout = String(parseInt(params.lock_timeout, 10));
			if (params.idle_in_transaction_session_timeout) data.idle_in_transaction_session_timeout = String(parseInt(params.idle_in_transaction_session_timeout, 10));
			if (params.options) data.options = params.options;
			return data;
		}
		cancel(client, query) {
			if (client.activeQuery === query) {
				const con = this.connection;
				if (this.host && this.host.indexOf("/") === 0) con.connect(this.host + "/.s.PGSQL." + this.port);
				else con.connect(this.port, this.host);
				con.on("connect", function() {
					con.cancel(client.processID, client.secretKey);
				});
			} else if (client._queryQueue.indexOf(query) !== -1) client._queryQueue.splice(client._queryQueue.indexOf(query), 1);
		}
		setTypeParser(oid, format, parseFn) {
			return this._types.setTypeParser(oid, format, parseFn);
		}
		getTypeParser(oid, format) {
			return this._types.getTypeParser(oid, format);
		}
		escapeIdentifier(str) {
			return utils.escapeIdentifier(str);
		}
		escapeLiteral(str) {
			return utils.escapeLiteral(str);
		}
		_pulseQueryQueue() {
			if (this.readyForQuery === true) {
				this._activeQuery = this._queryQueue.shift();
				const activeQuery = this._getActiveQuery();
				if (activeQuery) {
					this.readyForQuery = false;
					this.hasExecuted = true;
					const queryError = activeQuery.submit(this.connection);
					if (queryError) process.nextTick(() => {
						activeQuery.handleError(queryError, this.connection);
						this.readyForQuery = true;
						this._pulseQueryQueue();
					});
				} else if (this.hasExecuted) {
					this._activeQuery = null;
					this.emit("drain");
				}
			}
		}
		query(config, values, callback) {
			let query;
			let result;
			if (config == null) throw new TypeError("Client was passed a null or undefined query");
			if (typeof config.submit === "function") {
				result = query = config;
				if (!query.callback) {
					if (typeof values === "function") query.callback = values;
					else if (callback) query.callback = callback;
				}
			} else {
				query = new Query(config, values, callback);
				if (!query.callback) result = new this._Promise((resolve, reject) => {
					query.callback = (err, res) => err ? reject(err) : resolve(res);
				}).catch((err) => {
					Error.captureStackTrace(err);
					throw err;
				});
				else if (typeof query.callback !== "function") throw new TypeError("callback is not a function");
			}
			const readTimeout = config.query_timeout || this.connectionParameters.query_timeout;
			if (readTimeout) {
				const queryCallback = query.callback || (() => {});
				const readTimeoutTimer = setTimeout(() => {
					const error = /* @__PURE__ */ new Error("Query read timeout");
					process.nextTick(() => {
						query.handleError(error, this.connection);
					});
					queryCallback(error);
					query.callback = () => {};
					const index = this._queryQueue.indexOf(query);
					if (index > -1) this._queryQueue.splice(index, 1);
					this._pulseQueryQueue();
				}, readTimeout);
				query.callback = (err, res) => {
					clearTimeout(readTimeoutTimer);
					queryCallback(err, res);
				};
			}
			if (this.binary && !query.binary) query.binary = true;
			if (query._result && !query._result._types) query._result._types = this._types;
			if (!this._queryable) {
				process.nextTick(() => {
					query.handleError(/* @__PURE__ */ new Error("Client has encountered a connection error and is not queryable"), this.connection);
				});
				return result;
			}
			if (this._ending) {
				process.nextTick(() => {
					query.handleError(/* @__PURE__ */ new Error("Client was closed and is not queryable"), this.connection);
				});
				return result;
			}
			if (this._queryQueue.length > 0) queryQueueLengthDeprecationNotice();
			this._queryQueue.push(query);
			this._pulseQueryQueue();
			return result;
		}
		ref() {
			this.connection.ref();
		}
		unref() {
			this.connection.unref();
		}
		getTransactionStatus() {
			return this._txStatus;
		}
		end(cb) {
			this._ending = true;
			if (!this.connection._connecting || this._ended) if (cb) {
				cb();
				return;
			} else return this._Promise.resolve();
			if (this._getActiveQuery() || !this._queryable) this.connection.stream.destroy();
			else this.connection.end();
			if (cb) this.connection.once("end", cb);
			else return new this._Promise((resolve) => {
				this.connection.once("end", resolve);
			});
		}
		get queryQueue() {
			queryQueueDeprecationNotice();
			return this._queryQueue;
		}
	};
	Client.Query = Query;
	module.exports = Client;
}));
//#endregion
//#region ../../node_modules/.pnpm/pg-pool@3.14.0_pg@8.21.0/node_modules/pg-pool/index.js
var require_pg_pool = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const EventEmitter$2 = __require("events").EventEmitter;
	const NOOP = function() {};
	const removeWhere = (list, predicate) => {
		const i = list.findIndex(predicate);
		return i === -1 ? void 0 : list.splice(i, 1)[0];
	};
	var IdleItem = class {
		constructor(client, idleListener, timeoutId) {
			this.client = client;
			this.idleListener = idleListener;
			this.timeoutId = timeoutId;
		}
	};
	var PendingItem = class {
		constructor(callback) {
			this.callback = callback;
		}
	};
	function throwOnDoubleRelease() {
		throw new Error("Release called on client which has already been released to the pool.");
	}
	function promisify(Promise, callback) {
		if (callback) return {
			callback,
			result: void 0
		};
		let rej;
		let res;
		const cb = function(err, client) {
			err ? rej(err) : res(client);
		};
		return {
			callback: cb,
			result: new Promise(function(resolve, reject) {
				res = resolve;
				rej = reject;
			}).catch((err) => {
				Error.captureStackTrace(err);
				throw err;
			})
		};
	}
	function makeIdleListener(pool, client) {
		return function idleListener(err) {
			err.client = client;
			client.removeListener("error", idleListener);
			client.on("error", () => {
				pool.log("additional client error after disconnection due to error", err);
			});
			pool._remove(client);
			pool.emit("error", err, client);
		};
	}
	var Pool = class extends EventEmitter$2 {
		constructor(options, Client) {
			super();
			this.options = Object.assign({}, options);
			if (options != null && "password" in options) Object.defineProperty(this.options, "password", {
				configurable: true,
				enumerable: false,
				writable: true,
				value: options.password
			});
			if (options != null && options.ssl && options.ssl.key) Object.defineProperty(this.options.ssl, "key", { enumerable: false });
			this.options.max = this.options.max || this.options.poolSize || 10;
			this.options.min = this.options.min || 0;
			this.options.maxUses = this.options.maxUses || Infinity;
			this.options.allowExitOnIdle = this.options.allowExitOnIdle || false;
			this.options.maxLifetimeSeconds = this.options.maxLifetimeSeconds || 0;
			this.log = this.options.log || function() {};
			this.Client = this.options.Client || Client || require_lib().Client;
			this.Promise = this.options.Promise || global.Promise;
			if (typeof this.options.idleTimeoutMillis === "undefined") this.options.idleTimeoutMillis = 1e4;
			this._clients = [];
			this._idle = [];
			this._expired = /* @__PURE__ */ new WeakSet();
			this._pendingQueue = [];
			this._endCallback = void 0;
			this.ending = false;
			this.ended = false;
		}
		_promiseTry(f) {
			const Promise = this.Promise;
			if (typeof Promise.try === "function") return Promise.try(f);
			return new Promise((resolve) => resolve(f()));
		}
		_isFull() {
			return this._clients.length >= this.options.max;
		}
		_isAboveMin() {
			return this._clients.length > this.options.min;
		}
		_pulseQueue() {
			this.log("pulse queue");
			if (this.ended) {
				this.log("pulse queue ended");
				return;
			}
			if (this.ending) {
				this.log("pulse queue on ending");
				if (this._idle.length) this._idle.slice().map((item) => {
					this._remove(item.client);
				});
				if (!this._clients.length) {
					this.ended = true;
					this._endCallback();
				}
				return;
			}
			if (!this._pendingQueue.length) {
				this.log("no queued requests");
				return;
			}
			if (!this._idle.length && this._isFull()) return;
			const pendingItem = this._pendingQueue.shift();
			if (this._idle.length) {
				const idleItem = this._idle.pop();
				clearTimeout(idleItem.timeoutId);
				const client = idleItem.client;
				client.ref && client.ref();
				const idleListener = idleItem.idleListener;
				return this._acquireClient(client, pendingItem, idleListener, false);
			}
			if (!this._isFull()) return this.newClient(pendingItem);
			throw new Error("unexpected condition");
		}
		_remove(client, callback) {
			const removed = removeWhere(this._idle, (item) => item.client === client);
			if (removed !== void 0) clearTimeout(removed.timeoutId);
			this._clients = this._clients.filter((c) => c !== client);
			const context = this;
			client.end(() => {
				context.emit("remove", client);
				if (typeof callback === "function") callback();
			});
		}
		connect(cb) {
			if (this.ending) {
				const err = /* @__PURE__ */ new Error("Cannot use a pool after calling end on the pool");
				return cb ? cb(err) : this.Promise.reject(err);
			}
			const response = promisify(this.Promise, cb);
			const result = response.result;
			if (this._isFull() || this._idle.length) {
				if (this._idle.length) process.nextTick(() => this._pulseQueue());
				if (!this.options.connectionTimeoutMillis) {
					this._pendingQueue.push(new PendingItem(response.callback));
					return result;
				}
				const queueCallback = (err, res, done) => {
					clearTimeout(tid);
					response.callback(err, res, done);
				};
				const pendingItem = new PendingItem(queueCallback);
				const tid = setTimeout(() => {
					removeWhere(this._pendingQueue, (i) => i.callback === queueCallback);
					pendingItem.timedOut = true;
					response.callback(/* @__PURE__ */ new Error("timeout exceeded when trying to connect"));
				}, this.options.connectionTimeoutMillis);
				if (tid.unref) tid.unref();
				this._pendingQueue.push(pendingItem);
				return result;
			}
			this.newClient(new PendingItem(response.callback));
			return result;
		}
		newClient(pendingItem) {
			const client = new this.Client(this.options);
			this._clients.push(client);
			const idleListener = makeIdleListener(this, client);
			this.log("checking client timeout");
			let tid;
			let timeoutHit = false;
			if (this.options.connectionTimeoutMillis) tid = setTimeout(() => {
				if (client.connection) {
					this.log("ending client due to timeout");
					timeoutHit = true;
					client.connection.stream.destroy();
				} else if (!client.isConnected()) {
					this.log("ending client due to timeout");
					timeoutHit = true;
					client.end();
				}
			}, this.options.connectionTimeoutMillis);
			this.log("connecting new client");
			client.connect((err) => {
				if (tid) clearTimeout(tid);
				client.on("error", idleListener);
				if (err) {
					this.log("client failed to connect", err);
					this._clients = this._clients.filter((c) => c !== client);
					if (timeoutHit) err = new Error("Connection terminated due to connection timeout", { cause: err });
					this._pulseQueue();
					if (!pendingItem.timedOut) pendingItem.callback(err, void 0, NOOP);
				} else {
					this.log("new client connected");
					if (this.options.onConnect) {
						this._promiseTry(() => this.options.onConnect(client)).then(() => {
							this._afterConnect(client, pendingItem, idleListener);
						}, (hookErr) => {
							this._clients = this._clients.filter((c) => c !== client);
							client.end(() => {
								this._pulseQueue();
								if (!pendingItem.timedOut) pendingItem.callback(hookErr, void 0, NOOP);
							});
						});
						return;
					}
					return this._afterConnect(client, pendingItem, idleListener);
				}
			});
		}
		_afterConnect(client, pendingItem, idleListener) {
			if (this.options.maxLifetimeSeconds !== 0) {
				const maxLifetimeTimeout = setTimeout(() => {
					this.log("ending client due to expired lifetime");
					this._expired.add(client);
					if (this._idle.findIndex((idleItem) => idleItem.client === client) !== -1) this._acquireClient(client, new PendingItem((err, client, clientRelease) => clientRelease()), idleListener, false);
				}, this.options.maxLifetimeSeconds * 1e3);
				maxLifetimeTimeout.unref();
				client.once("end", () => clearTimeout(maxLifetimeTimeout));
			}
			return this._acquireClient(client, pendingItem, idleListener, true);
		}
		_acquireClient(client, pendingItem, idleListener, isNew) {
			if (isNew) this.emit("connect", client);
			this.emit("acquire", client);
			client.release = this._releaseOnce(client, idleListener);
			client.removeListener("error", idleListener);
			if (!pendingItem.timedOut) if (isNew && this.options.verify) this.options.verify(client, (err) => {
				if (err) {
					client.release(err);
					return pendingItem.callback(err, void 0, NOOP);
				}
				pendingItem.callback(void 0, client, client.release);
			});
			else pendingItem.callback(void 0, client, client.release);
			else if (isNew && this.options.verify) this.options.verify(client, client.release);
			else client.release();
		}
		_releaseOnce(client, idleListener) {
			let released = false;
			return (err) => {
				if (released) throwOnDoubleRelease();
				released = true;
				this._release(client, idleListener, err);
			};
		}
		_release(client, idleListener, err) {
			client.on("error", idleListener);
			client._poolUseCount = (client._poolUseCount || 0) + 1;
			this.emit("release", err, client);
			if (err || this.ending || !client._queryable || client._ending || client._poolUseCount >= this.options.maxUses) {
				if (client._poolUseCount >= this.options.maxUses) this.log("remove expended client");
				return this._remove(client, this._pulseQueue.bind(this));
			}
			if (this._expired.has(client)) {
				this.log("remove expired client");
				this._expired.delete(client);
				return this._remove(client, this._pulseQueue.bind(this));
			}
			let tid;
			if (this.options.idleTimeoutMillis && this._isAboveMin()) {
				tid = setTimeout(() => {
					if (this._isAboveMin()) {
						this.log("remove idle client");
						this._remove(client, this._pulseQueue.bind(this));
					}
				}, this.options.idleTimeoutMillis);
				if (this.options.allowExitOnIdle) tid.unref();
			}
			if (this.options.allowExitOnIdle) client.unref();
			this._idle.push(new IdleItem(client, idleListener, tid));
			this._pulseQueue();
		}
		query(text, values, cb) {
			if (typeof text === "function") {
				const response = promisify(this.Promise, text);
				setImmediate(function() {
					return response.callback(/* @__PURE__ */ new Error("Passing a function as the first parameter to pool.query is not supported"));
				});
				return response.result;
			}
			if (typeof values === "function") {
				cb = values;
				values = void 0;
			}
			const response = promisify(this.Promise, cb);
			cb = response.callback;
			this.connect((err, client) => {
				if (err) return cb(err);
				let clientReleased = false;
				const onError = (err) => {
					if (clientReleased) return;
					clientReleased = true;
					client.release(err);
					cb(err);
				};
				client.once("error", onError);
				this.log("dispatching query");
				try {
					client.query(text, values, (err, res) => {
						this.log("query dispatched");
						client.removeListener("error", onError);
						if (clientReleased) return;
						clientReleased = true;
						client.release(err);
						if (err) return cb(err);
						return cb(void 0, res);
					});
				} catch (err) {
					client.release(err);
					return cb(err);
				}
			});
			return response.result;
		}
		end(cb) {
			this.log("ending");
			if (this.ending) {
				const err = /* @__PURE__ */ new Error("Called end on pool more than once");
				return cb ? cb(err) : this.Promise.reject(err);
			}
			this.ending = true;
			const promised = promisify(this.Promise, cb);
			this._endCallback = promised.callback;
			this._pulseQueue();
			return promised.result;
		}
		get waitingCount() {
			return this._pendingQueue.length;
		}
		get idleCount() {
			return this._idle.length;
		}
		get expiredCount() {
			return this._clients.reduce((acc, client) => acc + (this._expired.has(client) ? 1 : 0), 0);
		}
		get totalCount() {
			return this._clients.length;
		}
	};
	module.exports = Pool;
}));
//#endregion
//#region ../../node_modules/.pnpm/pg@8.21.0/node_modules/pg/lib/native/query.js
var require_query = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const EventEmitter$1 = __require("events").EventEmitter;
	const util$1 = __require("util");
	const utils = require_utils$1();
	const NativeQuery = module.exports = function(config, values, callback) {
		EventEmitter$1.call(this);
		config = utils.normalizeQueryConfig(config, values, callback);
		this.text = config.text;
		this.values = config.values;
		this.name = config.name;
		this.queryMode = config.queryMode;
		this.callback = config.callback;
		this.state = "new";
		this._arrayMode = config.rowMode === "array";
		this._emitRowEvents = false;
		this.on("newListener", function(event) {
			if (event === "row") this._emitRowEvents = true;
		}.bind(this));
	};
	util$1.inherits(NativeQuery, EventEmitter$1);
	const errorFieldMap = {
		sqlState: "code",
		statementPosition: "position",
		messagePrimary: "message",
		context: "where",
		schemaName: "schema",
		tableName: "table",
		columnName: "column",
		dataTypeName: "dataType",
		constraintName: "constraint",
		sourceFile: "file",
		sourceLine: "line",
		sourceFunction: "routine"
	};
	NativeQuery.prototype.handleError = function(err) {
		const fields = this.native.pq.resultErrorFields();
		if (fields) for (const key in fields) {
			const normalizedFieldName = errorFieldMap[key] || key;
			err[normalizedFieldName] = fields[key];
		}
		if (this.callback) this.callback(err);
		else this.emit("error", err);
		this.state = "error";
	};
	NativeQuery.prototype.then = function(onSuccess, onFailure) {
		return this._getPromise().then(onSuccess, onFailure);
	};
	NativeQuery.prototype.catch = function(callback) {
		return this._getPromise().catch(callback);
	};
	NativeQuery.prototype._getPromise = function() {
		if (this._promise) return this._promise;
		this._promise = new Promise(function(resolve, reject) {
			this._once("end", resolve);
			this._once("error", reject);
		}.bind(this));
		return this._promise;
	};
	NativeQuery.prototype.submit = function(client) {
		this.state = "running";
		const self = this;
		this.native = client.native;
		client.native.arrayMode = this._arrayMode;
		let after = function(err, rows, results) {
			client.native.arrayMode = false;
			setImmediate(function() {
				self.emit("_done");
			});
			if (err) return self.handleError(err);
			if (self._emitRowEvents) if (results.length > 1) rows.forEach((rowOfRows, i) => {
				rowOfRows.forEach((row) => {
					self.emit("row", row, results[i]);
				});
			});
			else rows.forEach(function(row) {
				self.emit("row", row, results);
			});
			self.state = "end";
			self.emit("end", results);
			if (self.callback) self.callback(null, results);
		};
		if (process.domain) after = process.domain.bind(after);
		if (this.name) {
			if (this.name.length > 63) {
				console.error("Warning! Postgres only supports 63 characters for query names.");
				console.error("You supplied %s (%s)", this.name, this.name.length);
				console.error("This can cause conflicts and silent errors executing queries");
			}
			const values = (this.values || []).map(utils.prepareValue);
			if (client.namedQueries[this.name]) {
				if (this.text && client.namedQueries[this.name] !== this.text) {
					const err = /* @__PURE__ */ new Error(`Prepared statements must be unique - '${this.name}' was used for a different statement`);
					return after(err);
				}
				return client.native.execute(this.name, values, after);
			}
			return client.native.prepare(this.name, this.text, values.length, function(err) {
				if (err) return after(err);
				client.namedQueries[self.name] = self.text;
				return self.native.execute(self.name, values, after);
			});
		} else if (this.values) {
			if (!Array.isArray(this.values)) return after(/* @__PURE__ */ new Error("Query values must be an array"));
			const vals = this.values.map(utils.prepareValue);
			client.native.query(this.text, vals, after);
		} else if (this.queryMode === "extended") client.native.query(this.text, [], after);
		else client.native.query(this.text, after);
	};
}));
//#endregion
//#region ../../node_modules/.pnpm/pg@8.21.0/node_modules/pg/lib/native/client.js
var require_client = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const nodeUtils = __require("util");
	var Native;
	try {
		Native = __require("pg-native");
	} catch (e) {
		throw e;
	}
	const TypeOverrides = require_type_overrides();
	const EventEmitter = __require("events").EventEmitter;
	const util = __require("util");
	const ConnectionParameters = require_connection_parameters();
	const NativeQuery = require_query();
	const queryQueueLengthDeprecationNotice = nodeUtils.deprecate(() => {}, "Calling client.query() when the client is already executing a query is deprecated and will be removed in pg@9.0. Use async/await or an external async flow control mechanism instead.");
	const Client = module.exports = function(config) {
		EventEmitter.call(this);
		config = config || {};
		this._Promise = config.Promise || global.Promise;
		this._types = new TypeOverrides(config.types);
		this.native = new Native({ types: this._types });
		this._queryQueue = [];
		this._ending = false;
		this._connecting = false;
		this._connected = false;
		this._queryable = true;
		const cp = this.connectionParameters = new ConnectionParameters(config);
		if (config.nativeConnectionString) cp.nativeConnectionString = config.nativeConnectionString;
		this.user = cp.user;
		Object.defineProperty(this, "password", {
			configurable: true,
			enumerable: false,
			writable: true,
			value: cp.password
		});
		this.database = cp.database;
		this.host = cp.host;
		this.port = cp.port;
		this.namedQueries = {};
	};
	Client.Query = NativeQuery;
	util.inherits(Client, EventEmitter);
	Client.prototype._errorAllQueries = function(err) {
		const enqueueError = (query) => {
			process.nextTick(() => {
				query.native = this.native;
				query.handleError(err);
			});
		};
		if (this._hasActiveQuery()) {
			enqueueError(this._activeQuery);
			this._activeQuery = null;
		}
		this._queryQueue.forEach(enqueueError);
		this._queryQueue.length = 0;
	};
	Client.prototype._connect = function(cb) {
		const self = this;
		if (this._connecting) {
			process.nextTick(() => cb(/* @__PURE__ */ new Error("Client has already been connected. You cannot reuse a client.")));
			return;
		}
		this._connecting = true;
		this.connectionParameters.getLibpqConnectionString(function(err, conString) {
			if (self.connectionParameters.nativeConnectionString) conString = self.connectionParameters.nativeConnectionString;
			if (err) return cb(err);
			self.native.connect(conString, function(err) {
				if (err) {
					self.native.end();
					return cb(err);
				}
				self._connected = true;
				self.native.on("error", function(err) {
					self._queryable = false;
					self._errorAllQueries(err);
					self.emit("error", err);
				});
				self.native.on("notification", function(msg) {
					self.emit("notification", {
						channel: msg.relname,
						payload: msg.extra
					});
				});
				self.emit("connect");
				self._pulseQueryQueue(true);
				cb(null, this);
			});
		});
	};
	Client.prototype.connect = function(callback) {
		if (callback) {
			this._connect(callback);
			return;
		}
		return new this._Promise((resolve, reject) => {
			this._connect((error) => {
				if (error) reject(error);
				else resolve(this);
			});
		});
	};
	Client.prototype.query = function(config, values, callback) {
		let query;
		let result;
		let readTimeout;
		let readTimeoutTimer;
		let queryCallback;
		if (config === null || config === void 0) throw new TypeError("Client was passed a null or undefined query");
		else if (typeof config.submit === "function") {
			readTimeout = config.query_timeout || this.connectionParameters.query_timeout;
			result = query = config;
			if (typeof values === "function") config.callback = values;
		} else {
			readTimeout = config.query_timeout || this.connectionParameters.query_timeout;
			query = new NativeQuery(config, values, callback);
			if (!query.callback) {
				let resolveOut, rejectOut;
				result = new this._Promise((resolve, reject) => {
					resolveOut = resolve;
					rejectOut = reject;
				}).catch((err) => {
					Error.captureStackTrace(err);
					throw err;
				});
				query.callback = (err, res) => err ? rejectOut(err) : resolveOut(res);
			}
		}
		if (readTimeout) {
			queryCallback = query.callback || (() => {});
			readTimeoutTimer = setTimeout(() => {
				const error = /* @__PURE__ */ new Error("Query read timeout");
				process.nextTick(() => {
					query.handleError(error, this.connection);
				});
				queryCallback(error);
				query.callback = () => {};
				const index = this._queryQueue.indexOf(query);
				if (index > -1) this._queryQueue.splice(index, 1);
				this._pulseQueryQueue();
			}, readTimeout);
			query.callback = (err, res) => {
				clearTimeout(readTimeoutTimer);
				queryCallback(err, res);
			};
		}
		if (!this._queryable) {
			query.native = this.native;
			process.nextTick(() => {
				query.handleError(/* @__PURE__ */ new Error("Client has encountered a connection error and is not queryable"));
			});
			return result;
		}
		if (this._ending) {
			query.native = this.native;
			process.nextTick(() => {
				query.handleError(/* @__PURE__ */ new Error("Client was closed and is not queryable"));
			});
			return result;
		}
		if (this._queryQueue.length > 0) queryQueueLengthDeprecationNotice();
		this._queryQueue.push(query);
		this._pulseQueryQueue();
		return result;
	};
	Client.prototype.end = function(cb) {
		const self = this;
		this._ending = true;
		if (this._connecting && !this._connected) this.once("connect", () => {
			this.end(() => {});
		});
		let result;
		if (!cb) result = new this._Promise(function(resolve, reject) {
			cb = (err) => err ? reject(err) : resolve();
		});
		this.native.end(function() {
			self._connected = false;
			self._errorAllQueries(/* @__PURE__ */ new Error("Connection terminated"));
			process.nextTick(() => {
				self.emit("end");
				if (cb) cb();
			});
		});
		return result;
	};
	Client.prototype._hasActiveQuery = function() {
		return this._activeQuery && this._activeQuery.state !== "error" && this._activeQuery.state !== "end";
	};
	Client.prototype._pulseQueryQueue = function(initialConnection) {
		if (!this._connected) return;
		if (this._hasActiveQuery()) return;
		const query = this._queryQueue.shift();
		if (!query) {
			if (!initialConnection) this.emit("drain");
			return;
		}
		this._activeQuery = query;
		query.submit(this);
		const self = this;
		query.once("_done", function() {
			self._pulseQueryQueue();
		});
	};
	Client.prototype.cancel = function(query) {
		if (this._activeQuery === query) this.native.cancel(function() {});
		else if (this._queryQueue.indexOf(query) !== -1) this._queryQueue.splice(this._queryQueue.indexOf(query), 1);
	};
	Client.prototype.ref = function() {};
	Client.prototype.unref = function() {};
	Client.prototype.setTypeParser = function(oid, format, parseFn) {
		return this._types.setTypeParser(oid, format, parseFn);
	};
	Client.prototype.getTypeParser = function(oid, format) {
		return this._types.getTypeParser(oid, format);
	};
	Client.prototype.isConnected = function() {
		return this._connected;
	};
	Client.prototype.getTransactionStatus = function() {
		return this.native.getTransactionStatus();
	};
}));
//#endregion
//#region ../../node_modules/.pnpm/pg@8.21.0/node_modules/pg/lib/native/index.js
var require_native = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = require_client();
}));
//#endregion
//#region ../../node_modules/.pnpm/pg@8.21.0/node_modules/pg/lib/index.js
var require_lib = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const Client = require_client$1();
	const defaults = require_defaults();
	const Connection = require_connection();
	const Result = require_result();
	const utils = require_utils$1();
	const Pool = require_pg_pool();
	const TypeOverrides = require_type_overrides();
	const { DatabaseError } = require_dist();
	const { escapeIdentifier, escapeLiteral } = require_utils$1();
	const poolFactory = (Client) => {
		return class BoundPool extends Pool {
			constructor(options) {
				super(options, Client);
			}
		};
	};
	const PG = function(clientConstructor) {
		this.defaults = defaults;
		this.Client = clientConstructor;
		this.Query = this.Client.Query;
		this.Pool = poolFactory(this.Client);
		this._pools = [];
		this.Connection = Connection;
		this.types = require_pg_types();
		this.DatabaseError = DatabaseError;
		this.TypeOverrides = TypeOverrides;
		this.escapeIdentifier = escapeIdentifier;
		this.escapeLiteral = escapeLiteral;
		this.Result = Result;
		this.utils = utils;
	};
	let clientConstructor = Client;
	let forceNative = false;
	try {
		forceNative = !!process.env.NODE_PG_FORCE_NATIVE;
	} catch {}
	if (forceNative) clientConstructor = require_native();
	module.exports = new PG(clientConstructor);
	Object.defineProperty(module.exports, "native", {
		configurable: true,
		enumerable: false,
		get() {
			let native = null;
			try {
				native = new PG(require_native());
			} catch (err) {
				if (err.code !== "MODULE_NOT_FOUND") throw err;
			}
			Object.defineProperty(module.exports, "native", { value: native });
			return native;
		}
	});
}));
//#endregion
//#region ../../node_modules/.pnpm/pg@8.21.0/node_modules/pg/esm/index.mjs
var import_lib = /* @__PURE__ */ __toESM(require_lib(), 1);
import_lib.default.Client;
const Pool = import_lib.default.Pool;
import_lib.default.Connection;
import_lib.default.types;
import_lib.default.Query;
import_lib.default.DatabaseError;
import_lib.default.escapeIdentifier;
import_lib.default.escapeLiteral;
import_lib.default.Result;
import_lib.default.TypeOverrides;
import_lib.default.defaults;
//#endregion
//#region ../../packages/db/src/schema/auth.ts
var auth_exports = /* @__PURE__ */ __exportAll({
	account: () => account,
	accountRelations: () => accountRelations,
	session: () => session,
	sessionRelations: () => sessionRelations,
	user: () => user,
	userRelations: () => userRelations,
	verification: () => verification
});
const user = pgTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	image: text("image"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
});
const session = pgTable("session", {
	id: text("id").primaryKey(),
	expiresAt: timestamp("expires_at").notNull(),
	token: text("token").notNull().unique(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").$onUpdate(() => /* @__PURE__ */ new Date()).notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" })
}, (table) => [index("session_userId_idx").on(table.userId)]);
const account = pgTable("account", {
	id: text("id").primaryKey(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at"),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
	scope: text("scope"),
	password: text("password"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
}, (table) => [index("account_userId_idx").on(table.userId)]);
const verification = pgTable("verification", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
}, (table) => [index("verification_identifier_idx").on(table.identifier)]);
const userRelations = relations(user, ({ many }) => ({
	sessions: many(session),
	accounts: many(account)
}));
const sessionRelations = relations(session, ({ one }) => ({ user: one(user, {
	fields: [session.userId],
	references: [user.id]
}) }));
const accountRelations = relations(account, ({ one }) => ({ user: one(user, {
	fields: [account.userId],
	references: [user.id]
}) }));
//#endregion
//#region ../../packages/db/src/schema/org.ts
var org_exports = /* @__PURE__ */ __exportAll({
	invitation: () => invitation,
	member: () => member,
	organization: () => organization$1
});
const organization$1 = pgTable("organization", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	slug: text("slug").unique(),
	logo: text("logo"),
	metadata: text("metadata"),
	createdAt: timestamp("created_at").notNull()
});
const member = pgTable("member", {
	id: text("id").primaryKey(),
	organizationId: text("organization_id").notNull().references(() => organization$1.id, { onDelete: "cascade" }),
	userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
	role: text("role").notNull(),
	createdAt: timestamp("created_at").notNull()
}, (t) => [unique("member_user_org_unique").on(t.userId, t.organizationId)]);
const invitation = pgTable("invitation", {
	id: text("id").primaryKey(),
	organizationId: text("organization_id").notNull().references(() => organization$1.id, { onDelete: "cascade" }),
	email: text("email").notNull(),
	role: text("role"),
	status: text("status").notNull().default("pending"),
	teamId: text("team_id"),
	inviterId: text("inviter_id").notNull().references(() => user.id, { onDelete: "cascade" }),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at").notNull()
});
//#endregion
//#region ../../packages/db/src/schema/todo.ts
const todo = pgTable("todo", {
	id: serial("id").primaryKey(),
	text: text("text").notNull(),
	completed: boolean("completed").default(false).notNull()
});
//#endregion
//#region ../../packages/db/src/schema/index.ts
var schema_exports = /* @__PURE__ */ __exportAll({
	account: () => account,
	accountRelations: () => accountRelations,
	invitation: () => invitation,
	member: () => member,
	organization: () => organization$1,
	session: () => session,
	sessionRelations: () => sessionRelations,
	todo: () => todo,
	user: () => user,
	userRelations: () => userRelations,
	verification: () => verification
});
//#endregion
//#region ../../packages/db/src/index.ts
const createPool = () => {
	const databaseUrl = new URL(env.DATABASE_URL);
	const sslEnabled = databaseUrl.searchParams.get("sslmode") === "require" || databaseUrl.hostname.endsWith(".rds.amazonaws.com");
	return new Pool({
		host: databaseUrl.hostname,
		port: Number(databaseUrl.port || "5432"),
		user: decodeURIComponent(databaseUrl.username),
		password: decodeURIComponent(databaseUrl.password),
		database: databaseUrl.pathname.replace(/^\//, ""),
		ssl: sslEnabled ? { rejectUnauthorized: false } : void 0
	});
};
function createDb() {
	return drizzle(createPool(), { schema: schema_exports });
}
const db = createDb();
//#endregion
//#region ../../packages/auth/src/index.ts
function createAuth() {
	return betterAuth({
		database: drizzleAdapter(createDb(), {
			provider: "pg",
			schema: {
				...auth_exports,
				...org_exports
			}
		}),
		trustedOrigins: [env.CORS_ORIGIN],
		emailAndPassword: { enabled: true },
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		advanced: { defaultCookieAttributes: {
			sameSite: env.NODE_ENV === "production" ? "none" : "lax",
			secure: env.NODE_ENV === "production",
			httpOnly: true
		} },
		plugins: [organization({
			allowUserToCreateOrganization: false,
			creatorRole: "admin"
		})]
	});
}
const auth = createAuth();
//#endregion
//#region ../../packages/api/src/context.ts
const DEFAULT_ORG_ID$1 = "default-org";
async function getMemberRole(userId) {
	const [result] = await db.select({ role: member.role }).from(member).where(and(eq(member.userId, userId), eq(member.organizationId, DEFAULT_ORG_ID$1))).limit(1);
	return result?.role ?? null;
}
async function createContext({ context }) {
	const session = await auth.api.getSession({ headers: context.req.raw.headers });
	return {
		auth: null,
		session,
		role: session ? await getMemberRole(session.user.id) : null
	};
}
//#endregion
//#region ../../packages/api/src/index.ts
const t = initTRPC.context().create();
const router = t.router;
const publicProcedure = t.procedure;
const protectedProcedure = t.procedure.use(({ ctx, next }) => {
	if (!ctx.session) throw new TRPCError({
		code: "UNAUTHORIZED",
		message: "Authentication required",
		cause: "No session"
	});
	return next({ ctx: {
		...ctx,
		session: ctx.session
	} });
});
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
	if (ctx.role !== "admin") throw new TRPCError({
		code: "FORBIDDEN",
		message: "Admin access required"
	});
	return next({ ctx });
});
protectedProcedure.use(({ ctx, next }) => {
	if (ctx.role !== "admin" && ctx.role !== "researcher") throw new TRPCError({
		code: "FORBIDDEN",
		message: "Researcher access required"
	});
	return next({ ctx });
});
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/internal/tslib.mjs
function __classPrivateFieldSet(receiver, state, value, kind, f) {
	if (kind === "m") throw new TypeError("Private method is not writable");
	if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
	if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
	return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
}
function __classPrivateFieldGet(receiver, state, kind, f) {
	if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
	if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
	return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/internal/utils/uuid.mjs
/**
* https://stackoverflow.com/a/2117523
*/
let uuid4 = function() {
	const { crypto } = globalThis;
	if (crypto?.randomUUID) {
		uuid4 = crypto.randomUUID.bind(crypto);
		return crypto.randomUUID();
	}
	const u8 = new Uint8Array(1);
	const randomByte = crypto ? () => crypto.getRandomValues(u8)[0] : () => Math.random() * 255 & 255;
	return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (+c ^ randomByte() & 15 >> +c / 4).toString(16));
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/internal/errors.mjs
function isAbortError(err) {
	return typeof err === "object" && err !== null && ("name" in err && err.name === "AbortError" || "message" in err && String(err.message).includes("FetchRequestCanceledException"));
}
const castToError = (err) => {
	if (err instanceof Error) return err;
	if (typeof err === "object" && err !== null) {
		try {
			if (Object.prototype.toString.call(err) === "[object Error]") {
				const error = new Error(err.message, err.cause ? { cause: err.cause } : {});
				if (err.stack) error.stack = err.stack;
				if (err.cause && !error.cause) error.cause = err.cause;
				if (err.name) error.name = err.name;
				return error;
			}
		} catch {}
		try {
			return new Error(JSON.stringify(err));
		} catch {}
	}
	return new Error(err);
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/core/error.mjs
var OpenAIError = class extends Error {};
var APIError = class APIError extends OpenAIError {
	constructor(status, error, message, headers) {
		super(`${APIError.makeMessage(status, error, message)}`);
		this.status = status;
		this.headers = headers;
		this.requestID = headers?.get("x-request-id");
		this.error = error;
		const data = error;
		this.code = data?.["code"];
		this.param = data?.["param"];
		this.type = data?.["type"];
	}
	static makeMessage(status, error, message) {
		const msg = error?.message ? typeof error.message === "string" ? error.message : JSON.stringify(error.message) : error ? JSON.stringify(error) : message;
		if (status && msg) return `${status} ${msg}`;
		if (status) return `${status} status code (no body)`;
		if (msg) return msg;
		return "(no status code or body)";
	}
	static generate(status, errorResponse, message, headers) {
		if (!status || !headers) return new APIConnectionError({
			message,
			cause: castToError(errorResponse)
		});
		const error = errorResponse?.["error"];
		if (status === 400) return new BadRequestError(status, error, message, headers);
		if (status === 401) return new AuthenticationError(status, error, message, headers);
		if (status === 403) return new PermissionDeniedError(status, error, message, headers);
		if (status === 404) return new NotFoundError(status, error, message, headers);
		if (status === 409) return new ConflictError(status, error, message, headers);
		if (status === 422) return new UnprocessableEntityError(status, error, message, headers);
		if (status === 429) return new RateLimitError(status, error, message, headers);
		if (status >= 500) return new InternalServerError(status, error, message, headers);
		return new APIError(status, error, message, headers);
	}
};
var APIUserAbortError = class extends APIError {
	constructor({ message } = {}) {
		super(void 0, void 0, message || "Request was aborted.", void 0);
	}
};
var APIConnectionError = class extends APIError {
	constructor({ message, cause }) {
		super(void 0, void 0, message || "Connection error.", void 0);
		if (cause) this.cause = cause;
	}
};
var APIConnectionTimeoutError = class extends APIConnectionError {
	constructor({ message } = {}) {
		super({ message: message ?? "Request timed out." });
	}
};
var BadRequestError = class extends APIError {};
var AuthenticationError = class extends APIError {};
var PermissionDeniedError = class extends APIError {};
var NotFoundError = class extends APIError {};
var ConflictError = class extends APIError {};
var UnprocessableEntityError = class extends APIError {};
var RateLimitError = class extends APIError {};
var InternalServerError = class extends APIError {};
var LengthFinishReasonError = class extends OpenAIError {
	constructor() {
		super(`Could not parse response content as the length limit was reached`);
	}
};
var ContentFilterFinishReasonError = class extends OpenAIError {
	constructor() {
		super(`Could not parse response content as the request was rejected by the content filter`);
	}
};
var InvalidWebhookSignatureError = class extends Error {
	constructor(message) {
		super(message);
	}
};
/**
* Error thrown by the API server during OAuth token exchange.
* Can have status codes 400, 401, or 403.
* Other status codes from OAuth endpoints are raised as normal APIError types.
*/
var OAuthError = class extends APIError {
	constructor(status, error, headers) {
		let finalMessage = "OAuth2 authentication error";
		let error_code = void 0;
		if (error && typeof error === "object") {
			const errorData = error;
			error_code = errorData["error"];
			const description = errorData["error_description"];
			if (description && typeof description === "string") finalMessage = description;
			else if (error_code) finalMessage = error_code;
		}
		super(status, error, finalMessage, headers);
		this.error_code = error_code;
	}
};
var SubjectTokenProviderError = class extends OpenAIError {
	constructor(message, provider, cause) {
		super(message);
		this.provider = provider;
		this.cause = cause;
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/internal/utils/values.mjs
const startsWithSchemeRegexp = /^[a-z][a-z0-9+.-]*:/i;
const isAbsoluteURL = (url) => {
	return startsWithSchemeRegexp.test(url);
};
let isArray = (val) => (isArray = Array.isArray, isArray(val));
let isReadonlyArray = isArray;
/** Returns an object if the given value isn't an object, otherwise returns as-is */
function maybeObj(x) {
	if (typeof x !== "object") return {};
	return x ?? {};
}
function isEmptyObj(obj) {
	if (!obj) return true;
	for (const _k in obj) return false;
	return true;
}
function hasOwn(obj, key) {
	return Object.prototype.hasOwnProperty.call(obj, key);
}
function isObj(obj) {
	return obj != null && typeof obj === "object" && !Array.isArray(obj);
}
const validatePositiveInteger = (name, n) => {
	if (typeof n !== "number" || !Number.isInteger(n)) throw new OpenAIError(`${name} must be an integer`);
	if (n < 0) throw new OpenAIError(`${name} must be a positive integer`);
	return n;
};
const safeJSON = (text) => {
	try {
		return JSON.parse(text);
	} catch (err) {
		return;
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/internal/utils/sleep.mjs
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/version.mjs
const VERSION = "6.42.0";
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/internal/detect-platform.mjs
const isRunningInBrowser = () => {
	return typeof window !== "undefined" && typeof window.document !== "undefined" && typeof navigator !== "undefined";
};
/**
* Note this does not detect 'browser'; for that, use getBrowserInfo().
*/
function getDetectedPlatform() {
	if (typeof Deno !== "undefined" && Deno.build != null) return "deno";
	if (typeof EdgeRuntime !== "undefined") return "edge";
	if (Object.prototype.toString.call(typeof globalThis.process !== "undefined" ? globalThis.process : 0) === "[object process]") return "node";
	return "unknown";
}
const getPlatformProperties = () => {
	const detectedPlatform = getDetectedPlatform();
	if (detectedPlatform === "deno") return {
		"X-Stainless-Lang": "js",
		"X-Stainless-Package-Version": VERSION,
		"X-Stainless-OS": normalizePlatform(Deno.build.os),
		"X-Stainless-Arch": normalizeArch(Deno.build.arch),
		"X-Stainless-Runtime": "deno",
		"X-Stainless-Runtime-Version": typeof Deno.version === "string" ? Deno.version : Deno.version?.deno ?? "unknown"
	};
	if (typeof EdgeRuntime !== "undefined") return {
		"X-Stainless-Lang": "js",
		"X-Stainless-Package-Version": VERSION,
		"X-Stainless-OS": "Unknown",
		"X-Stainless-Arch": `other:${EdgeRuntime}`,
		"X-Stainless-Runtime": "edge",
		"X-Stainless-Runtime-Version": globalThis.process.version
	};
	if (detectedPlatform === "node") return {
		"X-Stainless-Lang": "js",
		"X-Stainless-Package-Version": VERSION,
		"X-Stainless-OS": normalizePlatform(globalThis.process.platform ?? "unknown"),
		"X-Stainless-Arch": normalizeArch(globalThis.process.arch ?? "unknown"),
		"X-Stainless-Runtime": "node",
		"X-Stainless-Runtime-Version": globalThis.process.version ?? "unknown"
	};
	const browserInfo = getBrowserInfo();
	if (browserInfo) return {
		"X-Stainless-Lang": "js",
		"X-Stainless-Package-Version": VERSION,
		"X-Stainless-OS": "Unknown",
		"X-Stainless-Arch": "unknown",
		"X-Stainless-Runtime": `browser:${browserInfo.browser}`,
		"X-Stainless-Runtime-Version": browserInfo.version
	};
	return {
		"X-Stainless-Lang": "js",
		"X-Stainless-Package-Version": VERSION,
		"X-Stainless-OS": "Unknown",
		"X-Stainless-Arch": "unknown",
		"X-Stainless-Runtime": "unknown",
		"X-Stainless-Runtime-Version": "unknown"
	};
};
function getBrowserInfo() {
	if (typeof navigator === "undefined" || !navigator) return null;
	for (const { key, pattern } of [
		{
			key: "edge",
			pattern: /Edge(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/
		},
		{
			key: "ie",
			pattern: /MSIE(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/
		},
		{
			key: "ie",
			pattern: /Trident(?:.*rv\:(\d+)\.(\d+)(?:\.(\d+))?)?/
		},
		{
			key: "chrome",
			pattern: /Chrome(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/
		},
		{
			key: "firefox",
			pattern: /Firefox(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/
		},
		{
			key: "safari",
			pattern: /(?:Version\W+(\d+)\.(\d+)(?:\.(\d+))?)?(?:\W+Mobile\S*)?\W+Safari/
		}
	]) {
		const match = pattern.exec(navigator.userAgent);
		if (match) return {
			browser: key,
			version: `${match[1] || 0}.${match[2] || 0}.${match[3] || 0}`
		};
	}
	return null;
}
const normalizeArch = (arch) => {
	if (arch === "x32") return "x32";
	if (arch === "x86_64" || arch === "x64") return "x64";
	if (arch === "arm") return "arm";
	if (arch === "aarch64" || arch === "arm64") return "arm64";
	if (arch) return `other:${arch}`;
	return "unknown";
};
const normalizePlatform = (platform) => {
	platform = platform.toLowerCase();
	if (platform.includes("ios")) return "iOS";
	if (platform === "android") return "Android";
	if (platform === "darwin") return "MacOS";
	if (platform === "win32") return "Windows";
	if (platform === "freebsd") return "FreeBSD";
	if (platform === "openbsd") return "OpenBSD";
	if (platform === "linux") return "Linux";
	if (platform) return `Other:${platform}`;
	return "Unknown";
};
let _platformHeaders;
const getPlatformHeaders = () => {
	return _platformHeaders ?? (_platformHeaders = getPlatformProperties());
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/internal/shims.mjs
function getDefaultFetch() {
	if (typeof fetch !== "undefined") return fetch;
	throw new Error("`fetch` is not defined as a global; Either pass `fetch` to the client, `new OpenAI({ fetch })` or polyfill the global, `globalThis.fetch = fetch`");
}
function makeReadableStream(...args) {
	const ReadableStream = globalThis.ReadableStream;
	if (typeof ReadableStream === "undefined") throw new Error("`ReadableStream` is not defined as a global; You will need to polyfill it, `globalThis.ReadableStream = ReadableStream`");
	return new ReadableStream(...args);
}
function ReadableStreamFrom(iterable) {
	let iter = Symbol.asyncIterator in iterable ? iterable[Symbol.asyncIterator]() : iterable[Symbol.iterator]();
	return makeReadableStream({
		start() {},
		async pull(controller) {
			const { done, value } = await iter.next();
			if (done) controller.close();
			else controller.enqueue(value);
		},
		async cancel() {
			await iter.return?.();
		}
	});
}
/**
* Most browsers don't yet have async iterable support for ReadableStream,
* and Node has a very different way of reading bytes from its "ReadableStream".
*
* This polyfill was pulled from https://github.com/MattiasBuelens/web-streams-polyfill/pull/122#issuecomment-1627354490
*/
function ReadableStreamToAsyncIterable(stream) {
	if (stream[Symbol.asyncIterator]) return stream;
	const reader = stream.getReader();
	return {
		async next() {
			try {
				const result = await reader.read();
				if (result?.done) reader.releaseLock();
				return result;
			} catch (e) {
				reader.releaseLock();
				throw e;
			}
		},
		async return() {
			const cancelPromise = reader.cancel();
			reader.releaseLock();
			await cancelPromise;
			return {
				done: true,
				value: void 0
			};
		},
		[Symbol.asyncIterator]() {
			return this;
		}
	};
}
/**
* Cancels a ReadableStream we don't need to consume.
* See https://undici.nodejs.org/#/?id=garbage-collection
*/
async function CancelReadableStream(stream) {
	if (stream === null || typeof stream !== "object") return;
	if (stream[Symbol.asyncIterator]) {
		await stream[Symbol.asyncIterator]().return?.();
		return;
	}
	const reader = stream.getReader();
	const cancelPromise = reader.cancel();
	reader.releaseLock();
	await cancelPromise;
}
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/internal/request-options.mjs
const FallbackEncoder = ({ headers, body }) => {
	return {
		bodyHeaders: { "content-type": "application/json" },
		body: JSON.stringify(body)
	};
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/internal/qs/formats.mjs
const default_format = "RFC3986";
const default_formatter = (v) => String(v);
const formatters = {
	RFC1738: (v) => String(v).replace(/%20/g, "+"),
	RFC3986: default_formatter
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/internal/qs/utils.mjs
let has = (obj, key) => (has = Object.hasOwn ?? Function.prototype.call.bind(Object.prototype.hasOwnProperty), has(obj, key));
const hex_table = /* @__PURE__ */ (() => {
	const array = [];
	for (let i = 0; i < 256; ++i) array.push("%" + ((i < 16 ? "0" : "") + i.toString(16)).toUpperCase());
	return array;
})();
const limit = 1024;
const encode = (str, _defaultEncoder, charset, _kind, format) => {
	if (str.length === 0) return str;
	let string = str;
	if (typeof str === "symbol") string = Symbol.prototype.toString.call(str);
	else if (typeof str !== "string") string = String(str);
	if (charset === "iso-8859-1") return escape(string).replace(/%u[0-9a-f]{4}/gi, function($0) {
		return "%26%23" + parseInt($0.slice(2), 16) + "%3B";
	});
	let out = "";
	for (let j = 0; j < string.length; j += limit) {
		const segment = string.length >= limit ? string.slice(j, j + limit) : string;
		const arr = [];
		for (let i = 0; i < segment.length; ++i) {
			let c = segment.charCodeAt(i);
			if (c === 45 || c === 46 || c === 95 || c === 126 || c >= 48 && c <= 57 || c >= 65 && c <= 90 || c >= 97 && c <= 122 || format === "RFC1738" && (c === 40 || c === 41)) {
				arr[arr.length] = segment.charAt(i);
				continue;
			}
			if (c < 128) {
				arr[arr.length] = hex_table[c];
				continue;
			}
			if (c < 2048) {
				arr[arr.length] = hex_table[192 | c >> 6] + hex_table[128 | c & 63];
				continue;
			}
			if (c < 55296 || c >= 57344) {
				arr[arr.length] = hex_table[224 | c >> 12] + hex_table[128 | c >> 6 & 63] + hex_table[128 | c & 63];
				continue;
			}
			i += 1;
			c = 65536 + ((c & 1023) << 10 | segment.charCodeAt(i) & 1023);
			arr[arr.length] = hex_table[240 | c >> 18] + hex_table[128 | c >> 12 & 63] + hex_table[128 | c >> 6 & 63] + hex_table[128 | c & 63];
		}
		out += arr.join("");
	}
	return out;
};
function is_buffer(obj) {
	if (!obj || typeof obj !== "object") return false;
	return !!(obj.constructor && obj.constructor.isBuffer && obj.constructor.isBuffer(obj));
}
function maybe_map(val, fn) {
	if (isArray(val)) {
		const mapped = [];
		for (let i = 0; i < val.length; i += 1) mapped.push(fn(val[i]));
		return mapped;
	}
	return fn(val);
}
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/internal/qs/stringify.mjs
const array_prefix_generators = {
	brackets(prefix) {
		return String(prefix) + "[]";
	},
	comma: "comma",
	indices(prefix, key) {
		return String(prefix) + "[" + key + "]";
	},
	repeat(prefix) {
		return String(prefix);
	}
};
const push_to_array = function(arr, value_or_array) {
	Array.prototype.push.apply(arr, isArray(value_or_array) ? value_or_array : [value_or_array]);
};
let toISOString;
const defaults = {
	addQueryPrefix: false,
	allowDots: false,
	allowEmptyArrays: false,
	arrayFormat: "indices",
	charset: "utf-8",
	charsetSentinel: false,
	delimiter: "&",
	encode: true,
	encodeDotInKeys: false,
	encoder: encode,
	encodeValuesOnly: false,
	format: default_format,
	formatter: default_formatter,
	/** @deprecated */
	indices: false,
	serializeDate(date) {
		return (toISOString ?? (toISOString = Function.prototype.call.bind(Date.prototype.toISOString)))(date);
	},
	skipNulls: false,
	strictNullHandling: false
};
function is_non_nullish_primitive(v) {
	return typeof v === "string" || typeof v === "number" || typeof v === "boolean" || typeof v === "symbol" || typeof v === "bigint";
}
const sentinel = {};
function inner_stringify(object, prefix, generateArrayPrefix, commaRoundTrip, allowEmptyArrays, strictNullHandling, skipNulls, encodeDotInKeys, encoder, filter, sort, allowDots, serializeDate, format, formatter, encodeValuesOnly, charset, sideChannel) {
	let obj = object;
	let tmp_sc = sideChannel;
	let step = 0;
	let find_flag = false;
	while ((tmp_sc = tmp_sc.get(sentinel)) !== void 0 && !find_flag) {
		const pos = tmp_sc.get(object);
		step += 1;
		if (typeof pos !== "undefined") if (pos === step) throw new RangeError("Cyclic object value");
		else find_flag = true;
		if (typeof tmp_sc.get(sentinel) === "undefined") step = 0;
	}
	if (typeof filter === "function") obj = filter(prefix, obj);
	else if (obj instanceof Date) obj = serializeDate?.(obj);
	else if (generateArrayPrefix === "comma" && isArray(obj)) obj = maybe_map(obj, function(value) {
		if (value instanceof Date) return serializeDate?.(value);
		return value;
	});
	if (obj === null) {
		if (strictNullHandling) return encoder && !encodeValuesOnly ? encoder(prefix, defaults.encoder, charset, "key", format) : prefix;
		obj = "";
	}
	if (is_non_nullish_primitive(obj) || is_buffer(obj)) {
		if (encoder) {
			const key_value = encodeValuesOnly ? prefix : encoder(prefix, defaults.encoder, charset, "key", format);
			return [formatter?.(key_value) + "=" + formatter?.(encoder(obj, defaults.encoder, charset, "value", format))];
		}
		return [formatter?.(prefix) + "=" + formatter?.(String(obj))];
	}
	const values = [];
	if (typeof obj === "undefined") return values;
	let obj_keys;
	if (generateArrayPrefix === "comma" && isArray(obj)) {
		if (encodeValuesOnly && encoder) obj = maybe_map(obj, encoder);
		obj_keys = [{ value: obj.length > 0 ? obj.join(",") || null : void 0 }];
	} else if (isArray(filter)) obj_keys = filter;
	else {
		const keys = Object.keys(obj);
		obj_keys = sort ? keys.sort(sort) : keys;
	}
	const encoded_prefix = encodeDotInKeys ? String(prefix).replace(/\./g, "%2E") : String(prefix);
	const adjusted_prefix = commaRoundTrip && isArray(obj) && obj.length === 1 ? encoded_prefix + "[]" : encoded_prefix;
	if (allowEmptyArrays && isArray(obj) && obj.length === 0) return adjusted_prefix + "[]";
	for (let j = 0; j < obj_keys.length; ++j) {
		const key = obj_keys[j];
		const value = typeof key === "object" && typeof key.value !== "undefined" ? key.value : obj[key];
		if (skipNulls && value === null) continue;
		const encoded_key = allowDots && encodeDotInKeys ? key.replace(/\./g, "%2E") : key;
		const key_prefix = isArray(obj) ? typeof generateArrayPrefix === "function" ? generateArrayPrefix(adjusted_prefix, encoded_key) : adjusted_prefix : adjusted_prefix + (allowDots ? "." + encoded_key : "[" + encoded_key + "]");
		sideChannel.set(object, step);
		const valueSideChannel = /* @__PURE__ */ new WeakMap();
		valueSideChannel.set(sentinel, sideChannel);
		push_to_array(values, inner_stringify(value, key_prefix, generateArrayPrefix, commaRoundTrip, allowEmptyArrays, strictNullHandling, skipNulls, encodeDotInKeys, generateArrayPrefix === "comma" && encodeValuesOnly && isArray(obj) ? null : encoder, filter, sort, allowDots, serializeDate, format, formatter, encodeValuesOnly, charset, valueSideChannel));
	}
	return values;
}
function normalize_stringify_options(opts = defaults) {
	if (typeof opts.allowEmptyArrays !== "undefined" && typeof opts.allowEmptyArrays !== "boolean") throw new TypeError("`allowEmptyArrays` option can only be `true` or `false`, when provided");
	if (typeof opts.encodeDotInKeys !== "undefined" && typeof opts.encodeDotInKeys !== "boolean") throw new TypeError("`encodeDotInKeys` option can only be `true` or `false`, when provided");
	if (opts.encoder !== null && typeof opts.encoder !== "undefined" && typeof opts.encoder !== "function") throw new TypeError("Encoder has to be a function.");
	const charset = opts.charset || defaults.charset;
	if (typeof opts.charset !== "undefined" && opts.charset !== "utf-8" && opts.charset !== "iso-8859-1") throw new TypeError("The charset option must be either utf-8, iso-8859-1, or undefined");
	let format = default_format;
	if (typeof opts.format !== "undefined") {
		if (!has(formatters, opts.format)) throw new TypeError("Unknown format option provided.");
		format = opts.format;
	}
	const formatter = formatters[format];
	let filter = defaults.filter;
	if (typeof opts.filter === "function" || isArray(opts.filter)) filter = opts.filter;
	let arrayFormat;
	if (opts.arrayFormat && opts.arrayFormat in array_prefix_generators) arrayFormat = opts.arrayFormat;
	else if ("indices" in opts) arrayFormat = opts.indices ? "indices" : "repeat";
	else arrayFormat = defaults.arrayFormat;
	if ("commaRoundTrip" in opts && typeof opts.commaRoundTrip !== "boolean") throw new TypeError("`commaRoundTrip` must be a boolean, or absent");
	const allowDots = typeof opts.allowDots === "undefined" ? !!opts.encodeDotInKeys === true ? true : defaults.allowDots : !!opts.allowDots;
	return {
		addQueryPrefix: typeof opts.addQueryPrefix === "boolean" ? opts.addQueryPrefix : defaults.addQueryPrefix,
		allowDots,
		allowEmptyArrays: typeof opts.allowEmptyArrays === "boolean" ? !!opts.allowEmptyArrays : defaults.allowEmptyArrays,
		arrayFormat,
		charset,
		charsetSentinel: typeof opts.charsetSentinel === "boolean" ? opts.charsetSentinel : defaults.charsetSentinel,
		commaRoundTrip: !!opts.commaRoundTrip,
		delimiter: typeof opts.delimiter === "undefined" ? defaults.delimiter : opts.delimiter,
		encode: typeof opts.encode === "boolean" ? opts.encode : defaults.encode,
		encodeDotInKeys: typeof opts.encodeDotInKeys === "boolean" ? opts.encodeDotInKeys : defaults.encodeDotInKeys,
		encoder: typeof opts.encoder === "function" ? opts.encoder : defaults.encoder,
		encodeValuesOnly: typeof opts.encodeValuesOnly === "boolean" ? opts.encodeValuesOnly : defaults.encodeValuesOnly,
		filter,
		format,
		formatter,
		serializeDate: typeof opts.serializeDate === "function" ? opts.serializeDate : defaults.serializeDate,
		skipNulls: typeof opts.skipNulls === "boolean" ? opts.skipNulls : defaults.skipNulls,
		sort: typeof opts.sort === "function" ? opts.sort : null,
		strictNullHandling: typeof opts.strictNullHandling === "boolean" ? opts.strictNullHandling : defaults.strictNullHandling
	};
}
function stringify(object, opts = {}) {
	let obj = object;
	const options = normalize_stringify_options(opts);
	let obj_keys;
	let filter;
	if (typeof options.filter === "function") {
		filter = options.filter;
		obj = filter("", obj);
	} else if (isArray(options.filter)) {
		filter = options.filter;
		obj_keys = filter;
	}
	const keys = [];
	if (typeof obj !== "object" || obj === null) return "";
	const generateArrayPrefix = array_prefix_generators[options.arrayFormat];
	const commaRoundTrip = generateArrayPrefix === "comma" && options.commaRoundTrip;
	if (!obj_keys) obj_keys = Object.keys(obj);
	if (options.sort) obj_keys.sort(options.sort);
	const sideChannel = /* @__PURE__ */ new WeakMap();
	for (let i = 0; i < obj_keys.length; ++i) {
		const key = obj_keys[i];
		if (options.skipNulls && obj[key] === null) continue;
		push_to_array(keys, inner_stringify(obj[key], key, generateArrayPrefix, commaRoundTrip, options.allowEmptyArrays, options.strictNullHandling, options.skipNulls, options.encodeDotInKeys, options.encode ? options.encoder : null, options.filter, options.sort, options.allowDots, options.serializeDate, options.format, options.formatter, options.encodeValuesOnly, options.charset, sideChannel));
	}
	const joined = keys.join(options.delimiter);
	let prefix = options.addQueryPrefix === true ? "?" : "";
	if (options.charsetSentinel) if (options.charset === "iso-8859-1") prefix += "utf8=%26%2310003%3B&";
	else prefix += "utf8=%E2%9C%93&";
	return joined.length > 0 ? prefix + joined : "";
}
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/internal/utils/query.mjs
function stringifyQuery(query) {
	return stringify(query, { arrayFormat: "brackets" });
}
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/internal/utils/bytes.mjs
function concatBytes(buffers) {
	let length = 0;
	for (const buffer of buffers) length += buffer.length;
	const output = new Uint8Array(length);
	let index = 0;
	for (const buffer of buffers) {
		output.set(buffer, index);
		index += buffer.length;
	}
	return output;
}
let encodeUTF8_;
function encodeUTF8(str) {
	let encoder;
	return (encodeUTF8_ ?? (encoder = new globalThis.TextEncoder(), encodeUTF8_ = encoder.encode.bind(encoder)))(str);
}
let decodeUTF8_;
function decodeUTF8(bytes) {
	let decoder;
	return (decodeUTF8_ ?? (decoder = new globalThis.TextDecoder(), decodeUTF8_ = decoder.decode.bind(decoder)))(bytes);
}
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/internal/decoders/line.mjs
var _LineDecoder_buffer, _LineDecoder_carriageReturnIndex;
/**
* A re-implementation of httpx's `LineDecoder` in Python that handles incrementally
* reading lines from text.
*
* https://github.com/encode/httpx/blob/920333ea98118e9cf617f246905d7b202510941c/httpx/_decoders.py#L258
*/
var LineDecoder = class {
	constructor() {
		_LineDecoder_buffer.set(this, void 0);
		_LineDecoder_carriageReturnIndex.set(this, void 0);
		__classPrivateFieldSet(this, _LineDecoder_buffer, new Uint8Array(), "f");
		__classPrivateFieldSet(this, _LineDecoder_carriageReturnIndex, null, "f");
	}
	decode(chunk) {
		if (chunk == null) return [];
		const binaryChunk = chunk instanceof ArrayBuffer ? new Uint8Array(chunk) : typeof chunk === "string" ? encodeUTF8(chunk) : chunk;
		__classPrivateFieldSet(this, _LineDecoder_buffer, concatBytes([__classPrivateFieldGet(this, _LineDecoder_buffer, "f"), binaryChunk]), "f");
		const lines = [];
		let patternIndex;
		while ((patternIndex = findNewlineIndex(__classPrivateFieldGet(this, _LineDecoder_buffer, "f"), __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f"))) != null) {
			if (patternIndex.carriage && __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") == null) {
				__classPrivateFieldSet(this, _LineDecoder_carriageReturnIndex, patternIndex.index, "f");
				continue;
			}
			if (__classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") != null && (patternIndex.index !== __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") + 1 || patternIndex.carriage)) {
				lines.push(decodeUTF8(__classPrivateFieldGet(this, _LineDecoder_buffer, "f").subarray(0, __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") - 1)));
				__classPrivateFieldSet(this, _LineDecoder_buffer, __classPrivateFieldGet(this, _LineDecoder_buffer, "f").subarray(__classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f")), "f");
				__classPrivateFieldSet(this, _LineDecoder_carriageReturnIndex, null, "f");
				continue;
			}
			const endIndex = __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") !== null ? patternIndex.preceding - 1 : patternIndex.preceding;
			const line = decodeUTF8(__classPrivateFieldGet(this, _LineDecoder_buffer, "f").subarray(0, endIndex));
			lines.push(line);
			__classPrivateFieldSet(this, _LineDecoder_buffer, __classPrivateFieldGet(this, _LineDecoder_buffer, "f").subarray(patternIndex.index), "f");
			__classPrivateFieldSet(this, _LineDecoder_carriageReturnIndex, null, "f");
		}
		return lines;
	}
	flush() {
		if (!__classPrivateFieldGet(this, _LineDecoder_buffer, "f").length) return [];
		return this.decode("\n");
	}
};
_LineDecoder_buffer = /* @__PURE__ */ new WeakMap(), _LineDecoder_carriageReturnIndex = /* @__PURE__ */ new WeakMap();
LineDecoder.NEWLINE_CHARS = new Set(["\n", "\r"]);
LineDecoder.NEWLINE_REGEXP = /\r\n|[\n\r]/g;
/**
* This function searches the buffer for the end patterns, (\r or \n)
* and returns an object with the index preceding the matched newline and the
* index after the newline char. `null` is returned if no new line is found.
*
* ```ts
* findNewLineIndex('abc\ndef') -> { preceding: 2, index: 3 }
* ```
*/
function findNewlineIndex(buffer, startIndex) {
	const newline = 10;
	const carriage = 13;
	for (let i = startIndex ?? 0; i < buffer.length; i++) {
		if (buffer[i] === newline) return {
			preceding: i,
			index: i + 1,
			carriage: false
		};
		if (buffer[i] === carriage) return {
			preceding: i,
			index: i + 1,
			carriage: true
		};
	}
	return null;
}
function findDoubleNewlineIndex(buffer) {
	const newline = 10;
	const carriage = 13;
	for (let i = 0; i < buffer.length - 1; i++) {
		if (buffer[i] === newline && buffer[i + 1] === newline) return i + 2;
		if (buffer[i] === carriage && buffer[i + 1] === carriage) return i + 2;
		if (buffer[i] === carriage && buffer[i + 1] === newline && i + 3 < buffer.length && buffer[i + 2] === carriage && buffer[i + 3] === newline) return i + 4;
	}
	return -1;
}
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/internal/utils/log.mjs
const levelNumbers = {
	off: 0,
	error: 200,
	warn: 300,
	info: 400,
	debug: 500
};
const parseLogLevel = (maybeLevel, sourceName, client) => {
	if (!maybeLevel) return;
	if (hasOwn(levelNumbers, maybeLevel)) return maybeLevel;
	loggerFor(client).warn(`${sourceName} was set to ${JSON.stringify(maybeLevel)}, expected one of ${JSON.stringify(Object.keys(levelNumbers))}`);
};
function noop() {}
function makeLogFn(fnLevel, logger, logLevel) {
	if (!logger || levelNumbers[fnLevel] > levelNumbers[logLevel]) return noop;
	else return logger[fnLevel].bind(logger);
}
const noopLogger = {
	error: noop,
	warn: noop,
	info: noop,
	debug: noop
};
let cachedLoggers = /* @__PURE__ */ new WeakMap();
function loggerFor(client) {
	const logger = client.logger;
	const logLevel = client.logLevel ?? "off";
	if (!logger) return noopLogger;
	const cachedLogger = cachedLoggers.get(logger);
	if (cachedLogger && cachedLogger[0] === logLevel) return cachedLogger[1];
	const levelLogger = {
		error: makeLogFn("error", logger, logLevel),
		warn: makeLogFn("warn", logger, logLevel),
		info: makeLogFn("info", logger, logLevel),
		debug: makeLogFn("debug", logger, logLevel)
	};
	cachedLoggers.set(logger, [logLevel, levelLogger]);
	return levelLogger;
}
const formatRequestDetails = (details) => {
	if (details.options) {
		details.options = { ...details.options };
		delete details.options["headers"];
	}
	if (details.headers) details.headers = Object.fromEntries((details.headers instanceof Headers ? [...details.headers] : Object.entries(details.headers)).map(([name, value]) => [name, name.toLowerCase() === "authorization" || name.toLowerCase() === "api-key" || name.toLowerCase() === "x-api-key" || name.toLowerCase() === "cookie" || name.toLowerCase() === "set-cookie" ? "***" : value]));
	if ("retryOfRequestLogID" in details) {
		if (details.retryOfRequestLogID) details.retryOf = details.retryOfRequestLogID;
		delete details.retryOfRequestLogID;
	}
	return details;
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/core/streaming.mjs
var _Stream_client;
var Stream = class Stream {
	constructor(iterator, controller, client) {
		this.iterator = iterator;
		_Stream_client.set(this, void 0);
		this.controller = controller;
		__classPrivateFieldSet(this, _Stream_client, client, "f");
	}
	static fromSSEResponse(response, controller, client, synthesizeEventData) {
		let consumed = false;
		const logger = client ? loggerFor(client) : console;
		async function* iterator() {
			if (consumed) throw new OpenAIError("Cannot iterate over a consumed stream, use `.tee()` to split the stream.");
			consumed = true;
			let done = false;
			try {
				for await (const sse of _iterSSEMessages(response, controller)) {
					if (done) continue;
					if (sse.data.startsWith("[DONE]")) {
						done = true;
						continue;
					}
					if (sse.event === null || !sse.event.startsWith("thread.")) {
						let data;
						try {
							data = JSON.parse(sse.data);
						} catch (e) {
							logger.error(`Could not parse message into JSON:`, sse.data);
							logger.error(`From chunk:`, sse.raw);
							throw e;
						}
						if (data && data.error) throw new APIError(void 0, data.error, void 0, response.headers);
						yield synthesizeEventData ? {
							event: sse.event,
							data
						} : data;
					} else {
						let data;
						try {
							data = JSON.parse(sse.data);
						} catch (e) {
							console.error(`Could not parse message into JSON:`, sse.data);
							console.error(`From chunk:`, sse.raw);
							throw e;
						}
						if (sse.event == "error") throw new APIError(void 0, data.error, data.message, void 0);
						yield {
							event: sse.event,
							data
						};
					}
				}
				done = true;
			} catch (e) {
				if (isAbortError(e)) return;
				throw e;
			} finally {
				if (!done) controller.abort();
			}
		}
		return new Stream(iterator, controller, client);
	}
	/**
	* Generates a Stream from a newline-separated ReadableStream
	* where each item is a JSON value.
	*/
	static fromReadableStream(readableStream, controller, client) {
		let consumed = false;
		async function* iterLines() {
			const lineDecoder = new LineDecoder();
			const iter = ReadableStreamToAsyncIterable(readableStream);
			for await (const chunk of iter) for (const line of lineDecoder.decode(chunk)) yield line;
			for (const line of lineDecoder.flush()) yield line;
		}
		async function* iterator() {
			if (consumed) throw new OpenAIError("Cannot iterate over a consumed stream, use `.tee()` to split the stream.");
			consumed = true;
			let done = false;
			try {
				for await (const line of iterLines()) {
					if (done) continue;
					if (line) yield JSON.parse(line);
				}
				done = true;
			} catch (e) {
				if (isAbortError(e)) return;
				throw e;
			} finally {
				if (!done) controller.abort();
			}
		}
		return new Stream(iterator, controller, client);
	}
	[(_Stream_client = /* @__PURE__ */ new WeakMap(), Symbol.asyncIterator)]() {
		return this.iterator();
	}
	/**
	* Splits the stream into two streams which can be
	* independently read from at different speeds.
	*/
	tee() {
		const left = [];
		const right = [];
		const iterator = this.iterator();
		const teeIterator = (queue) => {
			return { next: () => {
				if (queue.length === 0) {
					const result = iterator.next();
					left.push(result);
					right.push(result);
				}
				return queue.shift();
			} };
		};
		return [new Stream(() => teeIterator(left), this.controller, __classPrivateFieldGet(this, _Stream_client, "f")), new Stream(() => teeIterator(right), this.controller, __classPrivateFieldGet(this, _Stream_client, "f"))];
	}
	/**
	* Converts this stream to a newline-separated ReadableStream of
	* JSON stringified values in the stream
	* which can be turned back into a Stream with `Stream.fromReadableStream()`.
	*/
	toReadableStream() {
		const self = this;
		let iter;
		return makeReadableStream({
			async start() {
				iter = self[Symbol.asyncIterator]();
			},
			async pull(ctrl) {
				try {
					const { value, done } = await iter.next();
					if (done) return ctrl.close();
					const bytes = encodeUTF8(JSON.stringify(value) + "\n");
					ctrl.enqueue(bytes);
				} catch (err) {
					ctrl.error(err);
				}
			},
			async cancel() {
				await iter.return?.();
			}
		});
	}
};
async function* _iterSSEMessages(response, controller) {
	if (!response.body) {
		controller.abort();
		if (typeof globalThis.navigator !== "undefined" && globalThis.navigator.product === "ReactNative") throw new OpenAIError(`The default react-native fetch implementation does not support streaming. Please use expo/fetch: https://docs.expo.dev/versions/latest/sdk/expo/#expofetch-api`);
		throw new OpenAIError(`Attempted to iterate over a response with no body`);
	}
	const sseDecoder = new SSEDecoder();
	const lineDecoder = new LineDecoder();
	const iter = ReadableStreamToAsyncIterable(response.body);
	for await (const sseChunk of iterSSEChunks(iter)) for (const line of lineDecoder.decode(sseChunk)) {
		const sse = sseDecoder.decode(line);
		if (sse) yield sse;
	}
	for (const line of lineDecoder.flush()) {
		const sse = sseDecoder.decode(line);
		if (sse) yield sse;
	}
}
/**
* Given an async iterable iterator, iterates over it and yields full
* SSE chunks, i.e. yields when a double new-line is encountered.
*/
async function* iterSSEChunks(iterator) {
	let data = new Uint8Array();
	for await (const chunk of iterator) {
		if (chunk == null) continue;
		const binaryChunk = chunk instanceof ArrayBuffer ? new Uint8Array(chunk) : typeof chunk === "string" ? encodeUTF8(chunk) : chunk;
		let newData = new Uint8Array(data.length + binaryChunk.length);
		newData.set(data);
		newData.set(binaryChunk, data.length);
		data = newData;
		let patternIndex;
		while ((patternIndex = findDoubleNewlineIndex(data)) !== -1) {
			yield data.slice(0, patternIndex);
			data = data.slice(patternIndex);
		}
	}
	if (data.length > 0) yield data;
}
var SSEDecoder = class {
	constructor() {
		this.event = null;
		this.data = [];
		this.chunks = [];
	}
	decode(line) {
		if (line.endsWith("\r")) line = line.substring(0, line.length - 1);
		if (!line) {
			if (!this.event && !this.data.length) return null;
			const sse = {
				event: this.event,
				data: this.data.join("\n"),
				raw: this.chunks
			};
			this.event = null;
			this.data = [];
			this.chunks = [];
			return sse;
		}
		this.chunks.push(line);
		if (line.startsWith(":")) return null;
		let [fieldname, _, value] = partition(line, ":");
		if (value.startsWith(" ")) value = value.substring(1);
		if (fieldname === "event") this.event = value;
		else if (fieldname === "data") this.data.push(value);
		return null;
	}
};
function partition(str, delimiter) {
	const index = str.indexOf(delimiter);
	if (index !== -1) return [
		str.substring(0, index),
		delimiter,
		str.substring(index + delimiter.length)
	];
	return [
		str,
		"",
		""
	];
}
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/internal/parse.mjs
async function defaultParseResponse(client, props) {
	const { response, requestLogID, retryOfRequestLogID, startTime } = props;
	const body = await (async () => {
		if (props.options.stream) {
			loggerFor(client).debug("response", response.status, response.url, response.headers, response.body);
			if (props.options.__streamClass) return props.options.__streamClass.fromSSEResponse(response, props.controller, client, props.options.__synthesizeEventData);
			return Stream.fromSSEResponse(response, props.controller, client, props.options.__synthesizeEventData);
		}
		if (response.status === 204) return null;
		if (props.options.__binaryResponse) return response;
		const mediaType = response.headers.get("content-type")?.split(";")[0]?.trim();
		if (mediaType?.includes("application/json") || mediaType?.endsWith("+json")) {
			if (response.headers.get("content-length") === "0") return;
			return addRequestID(await response.json(), response);
		}
		return await response.text();
	})();
	loggerFor(client).debug(`[${requestLogID}] response parsed`, formatRequestDetails({
		retryOfRequestLogID,
		url: response.url,
		status: response.status,
		body,
		durationMs: Date.now() - startTime
	}));
	return body;
}
function addRequestID(value, response) {
	if (!value || typeof value !== "object" || Array.isArray(value)) return value;
	return Object.defineProperty(value, "_request_id", {
		value: response.headers.get("x-request-id"),
		enumerable: false
	});
}
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/core/api-promise.mjs
var _APIPromise_client;
/**
* A subclass of `Promise` providing additional helper methods
* for interacting with the SDK.
*/
var APIPromise = class APIPromise extends Promise {
	constructor(client, responsePromise, parseResponse = defaultParseResponse) {
		super((resolve) => {
			resolve(null);
		});
		this.responsePromise = responsePromise;
		this.parseResponse = parseResponse;
		_APIPromise_client.set(this, void 0);
		__classPrivateFieldSet(this, _APIPromise_client, client, "f");
	}
	_thenUnwrap(transform) {
		return new APIPromise(__classPrivateFieldGet(this, _APIPromise_client, "f"), this.responsePromise, async (client, props) => addRequestID(transform(await this.parseResponse(client, props), props), props.response));
	}
	/**
	* Gets the raw `Response` instance instead of parsing the response
	* data.
	*
	* If you want to parse the response body but still get the `Response`
	* instance, you can use {@link withResponse()}.
	*
	* 👋 Getting the wrong TypeScript type for `Response`?
	* Try setting `"moduleResolution": "NodeNext"` or add `"lib": ["DOM"]`
	* to your `tsconfig.json`.
	*/
	asResponse() {
		return this.responsePromise.then((p) => p.response);
	}
	/**
	* Gets the parsed response data, the raw `Response` instance and the ID of the request,
	* returned via the X-Request-ID header which is useful for debugging requests and reporting
	* issues to OpenAI.
	*
	* If you just want to get the raw `Response` instance without parsing it,
	* you can use {@link asResponse()}.
	*
	* 👋 Getting the wrong TypeScript type for `Response`?
	* Try setting `"moduleResolution": "NodeNext"` or add `"lib": ["DOM"]`
	* to your `tsconfig.json`.
	*/
	async withResponse() {
		const [data, response] = await Promise.all([this.parse(), this.asResponse()]);
		return {
			data,
			response,
			request_id: response.headers.get("x-request-id")
		};
	}
	parse() {
		if (!this.parsedPromise) this.parsedPromise = this.responsePromise.then((data) => this.parseResponse(__classPrivateFieldGet(this, _APIPromise_client, "f"), data));
		return this.parsedPromise;
	}
	then(onfulfilled, onrejected) {
		return this.parse().then(onfulfilled, onrejected);
	}
	catch(onrejected) {
		return this.parse().catch(onrejected);
	}
	finally(onfinally) {
		return this.parse().finally(onfinally);
	}
};
_APIPromise_client = /* @__PURE__ */ new WeakMap();
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/core/pagination.mjs
var _AbstractPage_client;
var AbstractPage = class {
	constructor(client, response, body, options) {
		_AbstractPage_client.set(this, void 0);
		__classPrivateFieldSet(this, _AbstractPage_client, client, "f");
		this.options = options;
		this.response = response;
		this.body = body;
	}
	hasNextPage() {
		if (!this.getPaginatedItems().length) return false;
		return this.nextPageRequestOptions() != null;
	}
	async getNextPage() {
		const nextOptions = this.nextPageRequestOptions();
		if (!nextOptions) throw new OpenAIError("No next page expected; please check `.hasNextPage()` before calling `.getNextPage()`.");
		return await __classPrivateFieldGet(this, _AbstractPage_client, "f").requestAPIList(this.constructor, nextOptions);
	}
	async *iterPages() {
		let page = this;
		yield page;
		while (page.hasNextPage()) {
			page = await page.getNextPage();
			yield page;
		}
	}
	async *[(_AbstractPage_client = /* @__PURE__ */ new WeakMap(), Symbol.asyncIterator)]() {
		for await (const page of this.iterPages()) for (const item of page.getPaginatedItems()) yield item;
	}
};
/**
* This subclass of Promise will resolve to an instantiated Page once the request completes.
*
* It also implements AsyncIterable to allow auto-paginating iteration on an unawaited list call, eg:
*
*    for await (const item of client.items.list()) {
*      console.log(item)
*    }
*/
var PagePromise = class extends APIPromise {
	constructor(client, request, Page) {
		super(client, request, async (client, props) => new Page(client, props.response, await defaultParseResponse(client, props), props.options));
	}
	/**
	* Allow auto-paginating iteration on an unawaited list call, eg:
	*
	*    for await (const item of client.items.list()) {
	*      console.log(item)
	*    }
	*/
	async *[Symbol.asyncIterator]() {
		const page = await this;
		for await (const item of page) yield item;
	}
};
/**
* Note: no pagination actually occurs yet, this is for forwards-compatibility.
*/
var Page = class extends AbstractPage {
	constructor(client, response, body, options) {
		super(client, response, body, options);
		this.data = body.data || [];
		this.object = body.object;
	}
	getPaginatedItems() {
		return this.data ?? [];
	}
	nextPageRequestOptions() {
		return null;
	}
};
var CursorPage = class extends AbstractPage {
	constructor(client, response, body, options) {
		super(client, response, body, options);
		this.data = body.data || [];
		this.has_more = body.has_more || false;
	}
	getPaginatedItems() {
		return this.data ?? [];
	}
	hasNextPage() {
		if (this.has_more === false) return false;
		return super.hasNextPage();
	}
	nextPageRequestOptions() {
		const data = this.getPaginatedItems();
		const id = data[data.length - 1]?.id;
		if (!id) return null;
		return {
			...this.options,
			query: {
				...maybeObj(this.options.query),
				after: id
			}
		};
	}
};
var ConversationCursorPage = class extends AbstractPage {
	constructor(client, response, body, options) {
		super(client, response, body, options);
		this.data = body.data || [];
		this.has_more = body.has_more || false;
		this.last_id = body.last_id || "";
	}
	getPaginatedItems() {
		return this.data ?? [];
	}
	hasNextPage() {
		if (this.has_more === false) return false;
		return super.hasNextPage();
	}
	nextPageRequestOptions() {
		const cursor = this.last_id;
		if (!cursor) return null;
		return {
			...this.options,
			query: {
				...maybeObj(this.options.query),
				after: cursor
			}
		};
	}
};
var NextCursorPage = class extends AbstractPage {
	constructor(client, response, body, options) {
		super(client, response, body, options);
		this.data = body.data || [];
		this.has_more = body.has_more || false;
		this.next = body.next || null;
	}
	getPaginatedItems() {
		return this.data ?? [];
	}
	hasNextPage() {
		if (this.has_more === false) return false;
		return super.hasNextPage();
	}
	nextPageRequestOptions() {
		const cursor = this.next;
		if (!cursor) return null;
		return {
			...this.options,
			query: {
				...maybeObj(this.options.query),
				after: cursor
			}
		};
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/auth/workload-identity-auth.mjs
const SUBJECT_TOKEN_TYPES = {
	jwt: "urn:ietf:params:oauth:token-type:jwt",
	id: "urn:ietf:params:oauth:token-type:id_token"
};
const TOKEN_EXCHANGE_GRANT_TYPE = "urn:ietf:params:oauth:grant-type:token-exchange";
var WorkloadIdentityAuth = class {
	constructor(config, fetch) {
		this.cachedToken = null;
		this.refreshPromise = null;
		this.tokenExchangeUrl = "https://auth.openai.com/oauth/token";
		this.config = config;
		this.fetch = fetch ?? getDefaultFetch();
	}
	async getToken() {
		if (!this.cachedToken || this.isTokenExpired(this.cachedToken)) {
			if (this.refreshPromise) return await this.refreshPromise;
			this.refreshPromise = this.refreshToken();
			try {
				return await this.refreshPromise;
			} finally {
				this.refreshPromise = null;
			}
		}
		if (this.needsRefresh(this.cachedToken) && !this.refreshPromise) this.refreshPromise = this.refreshToken().finally(() => {
			this.refreshPromise = null;
		});
		return this.cachedToken.token;
	}
	async refreshToken() {
		const body = {
			grant_type: TOKEN_EXCHANGE_GRANT_TYPE,
			subject_token: await this.config.provider.getToken(),
			subject_token_type: SUBJECT_TOKEN_TYPES[this.config.provider.tokenType],
			identity_provider_id: this.config.identityProviderId,
			service_account_id: this.config.serviceAccountId
		};
		if (this.config.clientId) body["client_id"] = this.config.clientId;
		const response = await this.fetch(this.tokenExchangeUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body)
		});
		if (!response.ok) {
			const errorText = await response.text();
			let body = void 0;
			try {
				body = JSON.parse(errorText);
			} catch {}
			if (response.status === 400 || response.status === 401 || response.status === 403) throw new OAuthError(response.status, body, response.headers);
			throw APIError.generate(response.status, body, `Token exchange failed with status ${response.status}`, response.headers);
		}
		const tokenResponse = await response.json();
		const expiresIn = tokenResponse.expires_in || 3600;
		const expiresAt = Date.now() + expiresIn * 1e3;
		this.cachedToken = {
			token: tokenResponse.access_token,
			expiresAt
		};
		return tokenResponse.access_token;
	}
	isTokenExpired(cachedToken) {
		return Date.now() >= cachedToken.expiresAt;
	}
	needsRefresh(cachedToken) {
		const bufferMs = (this.config.refreshBufferSeconds ?? 1200) * 1e3;
		return Date.now() >= cachedToken.expiresAt - bufferMs;
	}
	invalidateToken() {
		this.cachedToken = null;
		this.refreshPromise = null;
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/internal/uploads.mjs
const checkFileSupport = () => {
	if (typeof File === "undefined") {
		const { process } = globalThis;
		const isOldNode = typeof process?.versions?.node === "string" && parseInt(process.versions.node.split(".")) < 20;
		throw new Error("`File` is not defined as a global, which is required for file uploads." + (isOldNode ? " Update to Node 20 LTS or newer, or set `globalThis.File` to `import('node:buffer').File`." : ""));
	}
};
/**
* Construct a `File` instance. This is used to ensure a helpful error is thrown
* for environments that don't define a global `File` yet.
*/
function makeFile(fileBits, fileName, options) {
	checkFileSupport();
	return new File(fileBits, fileName ?? "unknown_file", options);
}
function getName(value) {
	return (typeof value === "object" && value !== null && ("name" in value && value.name && String(value.name) || "url" in value && value.url && String(value.url) || "filename" in value && value.filename && String(value.filename) || "path" in value && value.path && String(value.path)) || "").split(/[\\/]/).pop() || void 0;
}
const isAsyncIterable = (value) => value != null && typeof value === "object" && typeof value[Symbol.asyncIterator] === "function";
/**
* Returns a multipart/form-data request if any part of the given request body contains a File / Blob value.
* Otherwise returns the request as is.
*/
const maybeMultipartFormRequestOptions = async (opts, fetch) => {
	if (!hasUploadableValue(opts.body)) return opts;
	return {
		...opts,
		body: await createForm(opts.body, fetch)
	};
};
const multipartFormRequestOptions = async (opts, fetch) => {
	return {
		...opts,
		body: await createForm(opts.body, fetch)
	};
};
const supportsFormDataMap = /* @__PURE__ */ new WeakMap();
/**
* node-fetch doesn't support the global FormData object in recent node versions. Instead of sending
* properly-encoded form data, it just stringifies the object, resulting in a request body of "[object FormData]".
* This function detects if the fetch function provided supports the global FormData object to avoid
* confusing error messages later on.
*/
function supportsFormData(fetchObject) {
	const fetch = typeof fetchObject === "function" ? fetchObject : fetchObject.fetch;
	const cached = supportsFormDataMap.get(fetch);
	if (cached) return cached;
	const promise = (async () => {
		try {
			const FetchResponse = "Response" in fetch ? fetch.Response : (await fetch("data:,")).constructor;
			const data = new FormData();
			if (data.toString() === await new FetchResponse(data).text()) return false;
			return true;
		} catch {
			return true;
		}
	})();
	supportsFormDataMap.set(fetch, promise);
	return promise;
}
const createForm = async (body, fetch) => {
	if (!await supportsFormData(fetch)) throw new TypeError("The provided fetch function does not support file uploads with the current global FormData class.");
	const form = new FormData();
	await Promise.all(Object.entries(body || {}).map(([key, value]) => addFormValue(form, key, value)));
	return form;
};
const isNamedBlob = (value) => value instanceof Blob && "name" in value;
const isUploadable = (value) => typeof value === "object" && value !== null && (value instanceof Response || isAsyncIterable(value) || isNamedBlob(value));
const hasUploadableValue = (value) => {
	if (isUploadable(value)) return true;
	if (Array.isArray(value)) return value.some(hasUploadableValue);
	if (value && typeof value === "object") {
		for (const k in value) if (hasUploadableValue(value[k])) return true;
	}
	return false;
};
const addFormValue = async (form, key, value) => {
	if (value === void 0) return;
	if (value == null) throw new TypeError(`Received null for "${key}"; to pass null in FormData, you must use the string 'null'`);
	if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") form.append(key, String(value));
	else if (value instanceof Response) form.append(key, makeFile([await value.blob()], getName(value)));
	else if (isAsyncIterable(value)) form.append(key, makeFile([await new Response(ReadableStreamFrom(value)).blob()], getName(value)));
	else if (isNamedBlob(value)) form.append(key, value, getName(value));
	else if (Array.isArray(value)) await Promise.all(value.map((entry) => addFormValue(form, key + "[]", entry)));
	else if (typeof value === "object") await Promise.all(Object.entries(value).map(([name, prop]) => addFormValue(form, `${key}[${name}]`, prop)));
	else throw new TypeError(`Invalid value given to form, expected a string, number, boolean, object, Array, File or Blob but got ${value} instead`);
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/internal/to-file.mjs
/**
* This check adds the arrayBuffer() method type because it is available and used at runtime
*/
const isBlobLike = (value) => value != null && typeof value === "object" && typeof value.size === "number" && typeof value.type === "string" && typeof value.text === "function" && typeof value.slice === "function" && typeof value.arrayBuffer === "function";
/**
* This check adds the arrayBuffer() method type because it is available and used at runtime
*/
const isFileLike = (value) => value != null && typeof value === "object" && typeof value.name === "string" && typeof value.lastModified === "number" && isBlobLike(value);
const isResponseLike = (value) => value != null && typeof value === "object" && typeof value.url === "string" && typeof value.blob === "function";
/**
* Helper for creating a {@link File} to pass to an SDK upload method from a variety of different data formats
* @param value the raw content of the file. Can be an {@link Uploadable}, BlobLikePart, or AsyncIterable of BlobLikeParts
* @param {string=} name the name of the file. If omitted, toFile will try to determine a file name from bits if possible
* @param {Object=} options additional properties
* @param {string=} options.type the MIME type of the content
* @param {number=} options.lastModified the last modified timestamp
* @returns a {@link File} with the given properties
*/
async function toFile(value, name, options) {
	checkFileSupport();
	value = await value;
	if (isFileLike(value)) {
		if (value instanceof File) return value;
		return makeFile([await value.arrayBuffer()], value.name);
	}
	if (isResponseLike(value)) {
		const blob = await value.blob();
		name || (name = new URL(value.url).pathname.split(/[\\/]/).pop());
		return makeFile(await getBytes(blob), name, options);
	}
	const parts = await getBytes(value);
	name || (name = getName(value));
	if (!options?.type) {
		const type = parts.find((part) => typeof part === "object" && "type" in part && part.type);
		if (typeof type === "string") options = {
			...options,
			type
		};
	}
	return makeFile(parts, name, options);
}
async function getBytes(value) {
	let parts = [];
	if (typeof value === "string" || ArrayBuffer.isView(value) || value instanceof ArrayBuffer) parts.push(value);
	else if (isBlobLike(value)) parts.push(value instanceof Blob ? value : await value.arrayBuffer());
	else if (isAsyncIterable(value)) for await (const chunk of value) parts.push(...await getBytes(chunk));
	else {
		const constructor = value?.constructor?.name;
		throw new Error(`Unexpected data type: ${typeof value}${constructor ? `; constructor: ${constructor}` : ""}${propsForError(value)}`);
	}
	return parts;
}
function propsForError(value) {
	if (typeof value !== "object" || value === null) return "";
	return `; props: [${Object.getOwnPropertyNames(value).map((p) => `"${p}"`).join(", ")}]`;
}
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/core/resource.mjs
var APIResource = class {
	constructor(client) {
		this._client = client;
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/internal/utils/path.mjs
/**
* Percent-encode everything that isn't safe to have in a path without encoding safe chars.
*
* Taken from https://datatracker.ietf.org/doc/html/rfc3986#section-3.3:
* > unreserved  = ALPHA / DIGIT / "-" / "." / "_" / "~"
* > sub-delims  = "!" / "$" / "&" / "'" / "(" / ")" / "*" / "+" / "," / ";" / "="
* > pchar       = unreserved / pct-encoded / sub-delims / ":" / "@"
*/
function encodeURIPath(str) {
	return str.replace(/[^A-Za-z0-9\-._~!$&'()*+,;=:@]+/g, encodeURIComponent);
}
const EMPTY = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.create(null));
const createPathTagFunction = (pathEncoder = encodeURIPath) => function path(statics, ...params) {
	if (statics.length === 1) return statics[0];
	let postPath = false;
	const invalidSegments = [];
	const path = statics.reduce((previousValue, currentValue, index) => {
		if (/[?#]/.test(currentValue)) postPath = true;
		const value = params[index];
		let encoded = (postPath ? encodeURIComponent : pathEncoder)("" + value);
		if (index !== params.length && (value == null || typeof value === "object" && value.toString === Object.getPrototypeOf(Object.getPrototypeOf(value.hasOwnProperty ?? EMPTY) ?? EMPTY)?.toString)) {
			encoded = value + "";
			invalidSegments.push({
				start: previousValue.length + currentValue.length,
				length: encoded.length,
				error: `Value of type ${Object.prototype.toString.call(value).slice(8, -1)} is not a valid path parameter`
			});
		}
		return previousValue + currentValue + (index === params.length ? "" : encoded);
	}, "");
	const pathOnly = path.split(/[?#]/, 1)[0];
	const invalidSegmentPattern = /(?<=^|\/)(?:\.|%2e){1,2}(?=\/|$)/gi;
	let match;
	while ((match = invalidSegmentPattern.exec(pathOnly)) !== null) invalidSegments.push({
		start: match.index,
		length: match[0].length,
		error: `Value "${match[0]}" can\'t be safely passed as a path parameter`
	});
	invalidSegments.sort((a, b) => a.start - b.start);
	if (invalidSegments.length > 0) {
		let lastEnd = 0;
		const underline = invalidSegments.reduce((acc, segment) => {
			const spaces = " ".repeat(segment.start - lastEnd);
			const arrows = "^".repeat(segment.length);
			lastEnd = segment.start + segment.length;
			return acc + spaces + arrows;
		}, "");
		throw new OpenAIError(`Path parameters result in path with invalid segments:\n${invalidSegments.map((e) => e.error).join("\n")}\n${path}\n${underline}`);
	}
	return path;
};
/**
* URI-encodes path params and ensures no unsafe /./ or /../ path segments are introduced.
*/
const path = /* @__PURE__ */ createPathTagFunction(encodeURIPath);
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/chat/completions/messages.mjs
/**
* Given a list of messages comprising a conversation, the model will return a response.
*/
var Messages$1 = class extends APIResource {
	/**
	* Get the messages in a stored chat completion. Only Chat Completions that have
	* been created with the `store` parameter set to `true` will be returned.
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const chatCompletionStoreMessage of client.chat.completions.messages.list(
	*   'completion_id',
	* )) {
	*   // ...
	* }
	* ```
	*/
	list(completionID, query = {}, options) {
		return this._client.getAPIList(path`/chat/completions/${completionID}/messages`, CursorPage, {
			query,
			...options,
			__security: { bearerAuth: true }
		});
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/lib/parser.mjs
function isChatCompletionFunctionTool(tool) {
	return tool !== void 0 && "function" in tool && tool.function !== void 0;
}
function isAutoParsableResponseFormat(response_format) {
	return response_format?.["$brand"] === "auto-parseable-response-format";
}
function isAutoParsableTool$1(tool) {
	return tool?.["$brand"] === "auto-parseable-tool";
}
function maybeParseChatCompletion(completion, params) {
	if (!params || !hasAutoParseableInput$1(params)) return {
		...completion,
		choices: completion.choices.map((choice) => {
			assertToolCallsAreChatCompletionFunctionToolCalls(choice.message.tool_calls);
			return {
				...choice,
				message: {
					...choice.message,
					parsed: null,
					...choice.message.tool_calls ? { tool_calls: choice.message.tool_calls } : void 0
				}
			};
		})
	};
	return parseChatCompletion(completion, params);
}
function parseChatCompletion(completion, params) {
	const choices = completion.choices.map((choice) => {
		if (choice.finish_reason === "length") throw new LengthFinishReasonError();
		if (choice.finish_reason === "content_filter") throw new ContentFilterFinishReasonError();
		assertToolCallsAreChatCompletionFunctionToolCalls(choice.message.tool_calls);
		return {
			...choice,
			message: {
				...choice.message,
				...choice.message.tool_calls ? { tool_calls: choice.message.tool_calls?.map((toolCall) => parseToolCall$1(params, toolCall)) ?? void 0 } : void 0,
				parsed: choice.message.content && !choice.message.refusal ? parseResponseFormat(params, choice.message.content) : null
			}
		};
	});
	return {
		...completion,
		choices
	};
}
function parseResponseFormat(params, content) {
	if (params.response_format?.type !== "json_schema") return null;
	if (params.response_format?.type === "json_schema") {
		if ("$parseRaw" in params.response_format) return params.response_format.$parseRaw(content);
		return JSON.parse(content);
	}
	return null;
}
function parseToolCall$1(params, toolCall) {
	const inputTool = params.tools?.find((inputTool) => isChatCompletionFunctionTool(inputTool) && inputTool.function?.name === toolCall.function.name);
	return {
		...toolCall,
		function: {
			...toolCall.function,
			parsed_arguments: isAutoParsableTool$1(inputTool) ? inputTool.$parseRaw(toolCall.function.arguments) : inputTool?.function.strict ? JSON.parse(toolCall.function.arguments) : null
		}
	};
}
function shouldParseToolCall(params, toolCall) {
	if (!params || !("tools" in params) || !params.tools) return false;
	const inputTool = params.tools?.find((inputTool) => isChatCompletionFunctionTool(inputTool) && inputTool.function?.name === toolCall.function.name);
	return isChatCompletionFunctionTool(inputTool) && (isAutoParsableTool$1(inputTool) || inputTool?.function.strict || false);
}
function hasAutoParseableInput$1(params) {
	if (isAutoParsableResponseFormat(params.response_format)) return true;
	return params.tools?.some((t) => isAutoParsableTool$1(t) || t.type === "function" && t.function.strict === true) ?? false;
}
function assertToolCallsAreChatCompletionFunctionToolCalls(toolCalls) {
	for (const toolCall of toolCalls || []) if (toolCall.type !== "function") throw new OpenAIError(`Currently only \`function\` tool calls are supported; Received \`${toolCall.type}\``);
}
function validateInputTools(tools) {
	for (const tool of tools ?? []) {
		if (tool.type !== "function") throw new OpenAIError(`Currently only \`function\` tool types support auto-parsing; Received \`${tool.type}\``);
		if (tool.function.strict !== true) throw new OpenAIError(`The \`${tool.function.name}\` tool is not marked with \`strict: true\`. Only strict function tools can be auto-parsed`);
	}
}
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/lib/chatCompletionUtils.mjs
const isAssistantMessage = (message) => {
	return message?.role === "assistant";
};
const isToolMessage = (message) => {
	return message?.role === "tool";
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/lib/EventStream.mjs
var _EventStream_instances, _EventStream_connectedPromise, _EventStream_resolveConnectedPromise, _EventStream_rejectConnectedPromise, _EventStream_endPromise, _EventStream_resolveEndPromise, _EventStream_rejectEndPromise, _EventStream_listeners, _EventStream_ended, _EventStream_errored, _EventStream_aborted, _EventStream_catchingPromiseCreated, _EventStream_handleError;
var EventStream = class {
	constructor() {
		_EventStream_instances.add(this);
		this.controller = new AbortController();
		_EventStream_connectedPromise.set(this, void 0);
		_EventStream_resolveConnectedPromise.set(this, () => {});
		_EventStream_rejectConnectedPromise.set(this, () => {});
		_EventStream_endPromise.set(this, void 0);
		_EventStream_resolveEndPromise.set(this, () => {});
		_EventStream_rejectEndPromise.set(this, () => {});
		_EventStream_listeners.set(this, {});
		_EventStream_ended.set(this, false);
		_EventStream_errored.set(this, false);
		_EventStream_aborted.set(this, false);
		_EventStream_catchingPromiseCreated.set(this, false);
		__classPrivateFieldSet(this, _EventStream_connectedPromise, new Promise((resolve, reject) => {
			__classPrivateFieldSet(this, _EventStream_resolveConnectedPromise, resolve, "f");
			__classPrivateFieldSet(this, _EventStream_rejectConnectedPromise, reject, "f");
		}), "f");
		__classPrivateFieldSet(this, _EventStream_endPromise, new Promise((resolve, reject) => {
			__classPrivateFieldSet(this, _EventStream_resolveEndPromise, resolve, "f");
			__classPrivateFieldSet(this, _EventStream_rejectEndPromise, reject, "f");
		}), "f");
		__classPrivateFieldGet(this, _EventStream_connectedPromise, "f").catch(() => {});
		__classPrivateFieldGet(this, _EventStream_endPromise, "f").catch(() => {});
	}
	_run(executor) {
		setTimeout(() => {
			executor().then(() => {
				this._emitFinal();
				this._emit("end");
			}, __classPrivateFieldGet(this, _EventStream_instances, "m", _EventStream_handleError).bind(this));
		}, 0);
	}
	_connected() {
		if (this.ended) return;
		__classPrivateFieldGet(this, _EventStream_resolveConnectedPromise, "f").call(this);
		this._emit("connect");
	}
	get ended() {
		return __classPrivateFieldGet(this, _EventStream_ended, "f");
	}
	get errored() {
		return __classPrivateFieldGet(this, _EventStream_errored, "f");
	}
	get aborted() {
		return __classPrivateFieldGet(this, _EventStream_aborted, "f");
	}
	abort() {
		this.controller.abort();
	}
	/**
	* Adds the listener function to the end of the listeners array for the event.
	* No checks are made to see if the listener has already been added. Multiple calls passing
	* the same combination of event and listener will result in the listener being added, and
	* called, multiple times.
	* @returns this ChatCompletionStream, so that calls can be chained
	*/
	on(event, listener) {
		(__classPrivateFieldGet(this, _EventStream_listeners, "f")[event] || (__classPrivateFieldGet(this, _EventStream_listeners, "f")[event] = [])).push({ listener });
		return this;
	}
	/**
	* Removes the specified listener from the listener array for the event.
	* off() will remove, at most, one instance of a listener from the listener array. If any single
	* listener has been added multiple times to the listener array for the specified event, then
	* off() must be called multiple times to remove each instance.
	* @returns this ChatCompletionStream, so that calls can be chained
	*/
	off(event, listener) {
		const listeners = __classPrivateFieldGet(this, _EventStream_listeners, "f")[event];
		if (!listeners) return this;
		const index = listeners.findIndex((l) => l.listener === listener);
		if (index >= 0) listeners.splice(index, 1);
		return this;
	}
	/**
	* Adds a one-time listener function for the event. The next time the event is triggered,
	* this listener is removed and then invoked.
	* @returns this ChatCompletionStream, so that calls can be chained
	*/
	once(event, listener) {
		(__classPrivateFieldGet(this, _EventStream_listeners, "f")[event] || (__classPrivateFieldGet(this, _EventStream_listeners, "f")[event] = [])).push({
			listener,
			once: true
		});
		return this;
	}
	/**
	* This is similar to `.once()`, but returns a Promise that resolves the next time
	* the event is triggered, instead of calling a listener callback.
	* @returns a Promise that resolves the next time given event is triggered,
	* or rejects if an error is emitted.  (If you request the 'error' event,
	* returns a promise that resolves with the error).
	*
	* Example:
	*
	*   const message = await stream.emitted('message') // rejects if the stream errors
	*/
	emitted(event) {
		return new Promise((resolve, reject) => {
			__classPrivateFieldSet(this, _EventStream_catchingPromiseCreated, true, "f");
			if (event !== "error") this.once("error", reject);
			this.once(event, resolve);
		});
	}
	async done() {
		__classPrivateFieldSet(this, _EventStream_catchingPromiseCreated, true, "f");
		await __classPrivateFieldGet(this, _EventStream_endPromise, "f");
	}
	_emit(event, ...args) {
		if (__classPrivateFieldGet(this, _EventStream_ended, "f")) return;
		if (event === "end") {
			__classPrivateFieldSet(this, _EventStream_ended, true, "f");
			__classPrivateFieldGet(this, _EventStream_resolveEndPromise, "f").call(this);
		}
		const listeners = __classPrivateFieldGet(this, _EventStream_listeners, "f")[event];
		if (listeners) {
			__classPrivateFieldGet(this, _EventStream_listeners, "f")[event] = listeners.filter((l) => !l.once);
			listeners.forEach(({ listener }) => listener(...args));
		}
		if (event === "abort") {
			const error = args[0];
			if (!__classPrivateFieldGet(this, _EventStream_catchingPromiseCreated, "f") && !listeners?.length) Promise.reject(error);
			__classPrivateFieldGet(this, _EventStream_rejectConnectedPromise, "f").call(this, error);
			__classPrivateFieldGet(this, _EventStream_rejectEndPromise, "f").call(this, error);
			this._emit("end");
			return;
		}
		if (event === "error") {
			const error = args[0];
			if (!__classPrivateFieldGet(this, _EventStream_catchingPromiseCreated, "f") && !listeners?.length) Promise.reject(error);
			__classPrivateFieldGet(this, _EventStream_rejectConnectedPromise, "f").call(this, error);
			__classPrivateFieldGet(this, _EventStream_rejectEndPromise, "f").call(this, error);
			this._emit("end");
		}
	}
	_emitFinal() {}
};
_EventStream_connectedPromise = /* @__PURE__ */ new WeakMap(), _EventStream_resolveConnectedPromise = /* @__PURE__ */ new WeakMap(), _EventStream_rejectConnectedPromise = /* @__PURE__ */ new WeakMap(), _EventStream_endPromise = /* @__PURE__ */ new WeakMap(), _EventStream_resolveEndPromise = /* @__PURE__ */ new WeakMap(), _EventStream_rejectEndPromise = /* @__PURE__ */ new WeakMap(), _EventStream_listeners = /* @__PURE__ */ new WeakMap(), _EventStream_ended = /* @__PURE__ */ new WeakMap(), _EventStream_errored = /* @__PURE__ */ new WeakMap(), _EventStream_aborted = /* @__PURE__ */ new WeakMap(), _EventStream_catchingPromiseCreated = /* @__PURE__ */ new WeakMap(), _EventStream_instances = /* @__PURE__ */ new WeakSet(), _EventStream_handleError = function _EventStream_handleError(error) {
	__classPrivateFieldSet(this, _EventStream_errored, true, "f");
	if (error instanceof Error && error.name === "AbortError") error = new APIUserAbortError();
	if (error instanceof APIUserAbortError) {
		__classPrivateFieldSet(this, _EventStream_aborted, true, "f");
		return this._emit("abort", error);
	}
	if (error instanceof OpenAIError) return this._emit("error", error);
	if (error instanceof Error) {
		const openAIError = new OpenAIError(error.message);
		openAIError.cause = error;
		return this._emit("error", openAIError);
	}
	return this._emit("error", new OpenAIError(String(error)));
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/lib/RunnableFunction.mjs
function isRunnableFunctionWithParse(fn) {
	return typeof fn.parse === "function";
}
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/lib/AbstractChatCompletionRunner.mjs
var _AbstractChatCompletionRunner_instances, _AbstractChatCompletionRunner_getFinalContent, _AbstractChatCompletionRunner_getFinalMessage, _AbstractChatCompletionRunner_getFinalFunctionToolCall, _AbstractChatCompletionRunner_getFinalFunctionToolCallResult, _AbstractChatCompletionRunner_calculateTotalUsage, _AbstractChatCompletionRunner_validateParams, _AbstractChatCompletionRunner_stringifyFunctionCallResult;
const DEFAULT_MAX_CHAT_COMPLETIONS = 10;
var AbstractChatCompletionRunner = class extends EventStream {
	constructor() {
		super(...arguments);
		_AbstractChatCompletionRunner_instances.add(this);
		this._chatCompletions = [];
		this.messages = [];
	}
	_addChatCompletion(chatCompletion) {
		this._chatCompletions.push(chatCompletion);
		this._emit("chatCompletion", chatCompletion);
		const message = chatCompletion.choices[0]?.message;
		if (message) this._addMessage(message);
		return chatCompletion;
	}
	_addMessage(message, emit = true) {
		if (!("content" in message)) message.content = null;
		this.messages.push(message);
		if (emit) {
			this._emit("message", message);
			if (isToolMessage(message) && message.content) this._emit("functionToolCallResult", message.content);
			else if (isAssistantMessage(message) && message.tool_calls) {
				for (const tool_call of message.tool_calls) if (tool_call.type === "function") this._emit("functionToolCall", tool_call.function);
			}
		}
	}
	/**
	* @returns a promise that resolves with the final ChatCompletion, or rejects
	* if an error occurred or the stream ended prematurely without producing a ChatCompletion.
	*/
	async finalChatCompletion() {
		await this.done();
		const completion = this._chatCompletions[this._chatCompletions.length - 1];
		if (!completion) throw new OpenAIError("stream ended without producing a ChatCompletion");
		return completion;
	}
	/**
	* @returns a promise that resolves with the content of the final ChatCompletionMessage, or rejects
	* if an error occurred or the stream ended prematurely without producing a ChatCompletionMessage.
	*/
	async finalContent() {
		await this.done();
		return __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalContent).call(this);
	}
	/**
	* @returns a promise that resolves with the the final assistant ChatCompletionMessage response,
	* or rejects if an error occurred or the stream ended prematurely without producing a ChatCompletionMessage.
	*/
	async finalMessage() {
		await this.done();
		return __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalMessage).call(this);
	}
	/**
	* @returns a promise that resolves with the content of the final FunctionCall, or rejects
	* if an error occurred or the stream ended prematurely without producing a ChatCompletionMessage.
	*/
	async finalFunctionToolCall() {
		await this.done();
		return __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalFunctionToolCall).call(this);
	}
	async finalFunctionToolCallResult() {
		await this.done();
		return __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalFunctionToolCallResult).call(this);
	}
	async totalUsage() {
		await this.done();
		return __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_calculateTotalUsage).call(this);
	}
	allChatCompletions() {
		return [...this._chatCompletions];
	}
	_emitFinal() {
		const completion = this._chatCompletions[this._chatCompletions.length - 1];
		if (completion) this._emit("finalChatCompletion", completion);
		const finalMessage = __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalMessage).call(this);
		if (finalMessage) this._emit("finalMessage", finalMessage);
		const finalContent = __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalContent).call(this);
		if (finalContent) this._emit("finalContent", finalContent);
		const finalFunctionCall = __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalFunctionToolCall).call(this);
		if (finalFunctionCall) this._emit("finalFunctionToolCall", finalFunctionCall);
		const finalFunctionCallResult = __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalFunctionToolCallResult).call(this);
		if (finalFunctionCallResult != null) this._emit("finalFunctionToolCallResult", finalFunctionCallResult);
		if (this._chatCompletions.some((c) => c.usage)) this._emit("totalUsage", __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_calculateTotalUsage).call(this));
	}
	async _createChatCompletion(client, params, options) {
		const signal = options?.signal;
		if (signal) {
			if (signal.aborted) this.controller.abort();
			signal.addEventListener("abort", () => this.controller.abort());
		}
		__classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_validateParams).call(this, params);
		const chatCompletion = await client.chat.completions.create({
			...params,
			stream: false
		}, {
			...options,
			signal: this.controller.signal
		});
		this._connected();
		return this._addChatCompletion(parseChatCompletion(chatCompletion, params));
	}
	async _runChatCompletion(client, params, options) {
		for (const message of params.messages) this._addMessage(message, false);
		return await this._createChatCompletion(client, params, options);
	}
	async _runTools(client, params, options) {
		const role = "tool";
		const { tool_choice = "auto", stream, ...restParams } = params;
		const singleFunctionToCall = typeof tool_choice !== "string" && tool_choice.type === "function" && tool_choice?.function?.name;
		const { maxChatCompletions = DEFAULT_MAX_CHAT_COMPLETIONS } = options || {};
		const inputTools = params.tools.map((tool) => {
			if (isAutoParsableTool$1(tool)) {
				if (!tool.$callback) throw new OpenAIError("Tool given to `.runTools()` that does not have an associated function");
				return {
					type: "function",
					function: {
						function: tool.$callback,
						name: tool.function.name,
						description: tool.function.description || "",
						parameters: tool.function.parameters,
						parse: tool.$parseRaw,
						strict: true
					}
				};
			}
			return tool;
		});
		const functionsByName = {};
		for (const f of inputTools) if (f.type === "function") functionsByName[f.function.name || f.function.function.name] = f.function;
		const tools = "tools" in params ? inputTools.map((t) => t.type === "function" ? {
			type: "function",
			function: {
				name: t.function.name || t.function.function.name,
				parameters: t.function.parameters,
				description: t.function.description,
				strict: t.function.strict
			}
		} : t) : void 0;
		for (const message of params.messages) this._addMessage(message, false);
		for (let i = 0; i < maxChatCompletions; ++i) {
			const message = (await this._createChatCompletion(client, {
				...restParams,
				tool_choice,
				tools,
				messages: [...this.messages]
			}, options)).choices[0]?.message;
			if (!message) throw new OpenAIError(`missing message in ChatCompletion response`);
			if (!message.tool_calls?.length) return;
			for (const tool_call of message.tool_calls) {
				if (tool_call.type !== "function") continue;
				const tool_call_id = tool_call.id;
				const { name, arguments: args } = tool_call.function;
				const fn = functionsByName[name];
				if (!fn) {
					const content = `Invalid tool_call: ${JSON.stringify(name)}. Available options are: ${Object.keys(functionsByName).map((name) => JSON.stringify(name)).join(", ")}. Please try again`;
					this._addMessage({
						role,
						tool_call_id,
						content
					});
					continue;
				} else if (singleFunctionToCall && singleFunctionToCall !== name) {
					const content = `Invalid tool_call: ${JSON.stringify(name)}. ${JSON.stringify(singleFunctionToCall)} requested. Please try again`;
					this._addMessage({
						role,
						tool_call_id,
						content
					});
					continue;
				}
				let parsed;
				try {
					parsed = isRunnableFunctionWithParse(fn) ? await fn.parse(args) : args;
				} catch (error) {
					const content = error instanceof Error ? error.message : String(error);
					this._addMessage({
						role,
						tool_call_id,
						content
					});
					continue;
				}
				const rawContent = await fn.function(parsed, this);
				const content = __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_stringifyFunctionCallResult).call(this, rawContent);
				this._addMessage({
					role,
					tool_call_id,
					content
				});
				if (singleFunctionToCall) return;
			}
		}
	}
};
_AbstractChatCompletionRunner_instances = /* @__PURE__ */ new WeakSet(), _AbstractChatCompletionRunner_getFinalContent = function _AbstractChatCompletionRunner_getFinalContent() {
	return __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalMessage).call(this).content ?? null;
}, _AbstractChatCompletionRunner_getFinalMessage = function _AbstractChatCompletionRunner_getFinalMessage() {
	let i = this.messages.length;
	while (i-- > 0) {
		const message = this.messages[i];
		if (isAssistantMessage(message)) return {
			...message,
			content: message.content ?? null,
			refusal: message.refusal ?? null
		};
	}
	throw new OpenAIError("stream ended without producing a ChatCompletionMessage with role=assistant");
}, _AbstractChatCompletionRunner_getFinalFunctionToolCall = function _AbstractChatCompletionRunner_getFinalFunctionToolCall() {
	for (let i = this.messages.length - 1; i >= 0; i--) {
		const message = this.messages[i];
		if (isAssistantMessage(message) && message?.tool_calls?.length) return message.tool_calls.filter((x) => x.type === "function").at(-1)?.function;
	}
}, _AbstractChatCompletionRunner_getFinalFunctionToolCallResult = function _AbstractChatCompletionRunner_getFinalFunctionToolCallResult() {
	for (let i = this.messages.length - 1; i >= 0; i--) {
		const message = this.messages[i];
		if (isToolMessage(message) && message.content != null && typeof message.content === "string" && this.messages.some((x) => x.role === "assistant" && x.tool_calls?.some((y) => y.type === "function" && y.id === message.tool_call_id))) return message.content;
	}
}, _AbstractChatCompletionRunner_calculateTotalUsage = function _AbstractChatCompletionRunner_calculateTotalUsage() {
	const total = {
		completion_tokens: 0,
		prompt_tokens: 0,
		total_tokens: 0
	};
	for (const { usage } of this._chatCompletions) if (usage) {
		total.completion_tokens += usage.completion_tokens;
		total.prompt_tokens += usage.prompt_tokens;
		total.total_tokens += usage.total_tokens;
	}
	return total;
}, _AbstractChatCompletionRunner_validateParams = function _AbstractChatCompletionRunner_validateParams(params) {
	if (params.n != null && params.n > 1) throw new OpenAIError("ChatCompletion convenience helpers only support n=1 at this time. To use n>1, please use chat.completions.create() directly.");
}, _AbstractChatCompletionRunner_stringifyFunctionCallResult = function _AbstractChatCompletionRunner_stringifyFunctionCallResult(rawContent) {
	return typeof rawContent === "string" ? rawContent : rawContent === void 0 ? "undefined" : JSON.stringify(rawContent);
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/lib/ChatCompletionRunner.mjs
var ChatCompletionRunner = class ChatCompletionRunner extends AbstractChatCompletionRunner {
	static runTools(client, params, options) {
		const runner = new ChatCompletionRunner();
		const opts = {
			...options,
			headers: {
				...options?.headers,
				"X-Stainless-Helper-Method": "runTools"
			}
		};
		runner._run(() => runner._runTools(client, params, opts));
		return runner;
	}
	_addMessage(message, emit = true) {
		super._addMessage(message, emit);
		if (isAssistantMessage(message) && message.content) this._emit("content", message.content);
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/_vendor/partial-json-parser/parser.mjs
const STR = 1;
const NUM = 2;
const ARR = 4;
const OBJ = 8;
const NULL = 16;
const BOOL = 32;
const NAN = 64;
const INFINITY = 128;
const MINUS_INFINITY = 256;
const INF = INFINITY | MINUS_INFINITY;
const SPECIAL = 496;
const ATOM = NUM | 497;
const COLLECTION = ARR | OBJ;
const Allow = {
	STR,
	NUM,
	ARR,
	OBJ,
	NULL,
	BOOL,
	NAN,
	INFINITY,
	MINUS_INFINITY,
	INF,
	SPECIAL,
	ATOM,
	COLLECTION,
	ALL: ATOM | COLLECTION
};
var PartialJSON = class extends Error {};
var MalformedJSON = class extends Error {};
/**
* Parse incomplete JSON
* @param {string} jsonString Partial JSON to be parsed
* @param {number} allowPartial Specify what types are allowed to be partial, see {@link Allow} for details
* @returns The parsed JSON
* @throws {PartialJSON} If the JSON is incomplete (related to the `allow` parameter)
* @throws {MalformedJSON} If the JSON is malformed
*/
function parseJSON(jsonString, allowPartial = Allow.ALL) {
	if (typeof jsonString !== "string") throw new TypeError(`expecting str, got ${typeof jsonString}`);
	if (!jsonString.trim()) throw new Error(`${jsonString} is empty`);
	return _parseJSON(jsonString.trim(), allowPartial);
}
const _parseJSON = (jsonString, allow) => {
	const length = jsonString.length;
	let index = 0;
	const markPartialJSON = (msg) => {
		throw new PartialJSON(`${msg} at position ${index}`);
	};
	const throwMalformedError = (msg) => {
		throw new MalformedJSON(`${msg} at position ${index}`);
	};
	const parseAny = () => {
		skipBlank();
		if (index >= length) markPartialJSON("Unexpected end of input");
		if (jsonString[index] === "\"") return parseStr();
		if (jsonString[index] === "{") return parseObj();
		if (jsonString[index] === "[") return parseArr();
		if (jsonString.substring(index, index + 4) === "null" || Allow.NULL & allow && length - index < 4 && "null".startsWith(jsonString.substring(index))) {
			index += 4;
			return null;
		}
		if (jsonString.substring(index, index + 4) === "true" || Allow.BOOL & allow && length - index < 4 && "true".startsWith(jsonString.substring(index))) {
			index += 4;
			return true;
		}
		if (jsonString.substring(index, index + 5) === "false" || Allow.BOOL & allow && length - index < 5 && "false".startsWith(jsonString.substring(index))) {
			index += 5;
			return false;
		}
		if (jsonString.substring(index, index + 8) === "Infinity" || Allow.INFINITY & allow && length - index < 8 && "Infinity".startsWith(jsonString.substring(index))) {
			index += 8;
			return Infinity;
		}
		if (jsonString.substring(index, index + 9) === "-Infinity" || Allow.MINUS_INFINITY & allow && 1 < length - index && length - index < 9 && "-Infinity".startsWith(jsonString.substring(index))) {
			index += 9;
			return -Infinity;
		}
		if (jsonString.substring(index, index + 3) === "NaN" || Allow.NAN & allow && length - index < 3 && "NaN".startsWith(jsonString.substring(index))) {
			index += 3;
			return NaN;
		}
		return parseNum();
	};
	const parseStr = () => {
		const start = index;
		let escape = false;
		index++;
		while (index < length && (jsonString[index] !== "\"" || escape && jsonString[index - 1] === "\\")) {
			escape = jsonString[index] === "\\" ? !escape : false;
			index++;
		}
		if (jsonString.charAt(index) == "\"") try {
			return JSON.parse(jsonString.substring(start, ++index - Number(escape)));
		} catch (e) {
			throwMalformedError(String(e));
		}
		else if (Allow.STR & allow) try {
			return JSON.parse(jsonString.substring(start, index - Number(escape)) + "\"");
		} catch (e) {
			return JSON.parse(jsonString.substring(start, jsonString.lastIndexOf("\\")) + "\"");
		}
		markPartialJSON("Unterminated string literal");
	};
	const parseObj = () => {
		index++;
		skipBlank();
		const obj = {};
		try {
			while (jsonString[index] !== "}") {
				skipBlank();
				if (index >= length && Allow.OBJ & allow) return obj;
				const key = parseStr();
				skipBlank();
				index++;
				try {
					const value = parseAny();
					Object.defineProperty(obj, key, {
						value,
						writable: true,
						enumerable: true,
						configurable: true
					});
				} catch (e) {
					if (Allow.OBJ & allow) return obj;
					else throw e;
				}
				skipBlank();
				if (jsonString[index] === ",") index++;
			}
		} catch (e) {
			if (Allow.OBJ & allow) return obj;
			else markPartialJSON("Expected '}' at end of object");
		}
		index++;
		return obj;
	};
	const parseArr = () => {
		index++;
		const arr = [];
		try {
			while (jsonString[index] !== "]") {
				arr.push(parseAny());
				skipBlank();
				if (jsonString[index] === ",") index++;
			}
		} catch (e) {
			if (Allow.ARR & allow) return arr;
			markPartialJSON("Expected ']' at end of array");
		}
		index++;
		return arr;
	};
	const parseNum = () => {
		if (index === 0) {
			if (jsonString === "-" && Allow.NUM & allow) markPartialJSON("Not sure what '-' is");
			try {
				return JSON.parse(jsonString);
			} catch (e) {
				if (Allow.NUM & allow) try {
					if ("." === jsonString[jsonString.length - 1]) return JSON.parse(jsonString.substring(0, jsonString.lastIndexOf(".")));
					return JSON.parse(jsonString.substring(0, jsonString.lastIndexOf("e")));
				} catch (e) {}
				throwMalformedError(String(e));
			}
		}
		const start = index;
		if (jsonString[index] === "-") index++;
		while (jsonString[index] && !",]}".includes(jsonString[index])) index++;
		if (index == length && !(Allow.NUM & allow)) markPartialJSON("Unterminated number literal");
		try {
			return JSON.parse(jsonString.substring(start, index));
		} catch (e) {
			if (jsonString.substring(start, index) === "-" && Allow.NUM & allow) markPartialJSON("Not sure what '-' is");
			try {
				return JSON.parse(jsonString.substring(start, jsonString.lastIndexOf("e")));
			} catch (e) {
				throwMalformedError(String(e));
			}
		}
	};
	const skipBlank = () => {
		while (index < length && " \n\r	".includes(jsonString[index])) index++;
	};
	return parseAny();
};
const partialParse = (input) => parseJSON(input, Allow.ALL ^ Allow.NUM);
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/lib/ChatCompletionStream.mjs
var _ChatCompletionStream_instances, _ChatCompletionStream_params, _ChatCompletionStream_choiceEventStates, _ChatCompletionStream_currentChatCompletionSnapshot, _ChatCompletionStream_beginRequest, _ChatCompletionStream_getChoiceEventState, _ChatCompletionStream_addChunk, _ChatCompletionStream_emitToolCallDoneEvent, _ChatCompletionStream_emitContentDoneEvents, _ChatCompletionStream_endRequest, _ChatCompletionStream_getAutoParseableResponseFormat, _ChatCompletionStream_accumulateChatCompletion;
var ChatCompletionStream = class ChatCompletionStream extends AbstractChatCompletionRunner {
	constructor(params) {
		super();
		_ChatCompletionStream_instances.add(this);
		_ChatCompletionStream_params.set(this, void 0);
		_ChatCompletionStream_choiceEventStates.set(this, void 0);
		_ChatCompletionStream_currentChatCompletionSnapshot.set(this, void 0);
		__classPrivateFieldSet(this, _ChatCompletionStream_params, params, "f");
		__classPrivateFieldSet(this, _ChatCompletionStream_choiceEventStates, [], "f");
	}
	get currentChatCompletionSnapshot() {
		return __classPrivateFieldGet(this, _ChatCompletionStream_currentChatCompletionSnapshot, "f");
	}
	/**
	* Intended for use on the frontend, consuming a stream produced with
	* `.toReadableStream()` on the backend.
	*
	* Note that messages sent to the model do not appear in `.on('message')`
	* in this context.
	*/
	static fromReadableStream(stream) {
		const runner = new ChatCompletionStream(null);
		runner._run(() => runner._fromReadableStream(stream));
		return runner;
	}
	static createChatCompletion(client, params, options) {
		const runner = new ChatCompletionStream(params);
		runner._run(() => runner._runChatCompletion(client, {
			...params,
			stream: true
		}, {
			...options,
			headers: {
				...options?.headers,
				"X-Stainless-Helper-Method": "stream"
			}
		}));
		return runner;
	}
	async _createChatCompletion(client, params, options) {
		super._createChatCompletion;
		const signal = options?.signal;
		if (signal) {
			if (signal.aborted) this.controller.abort();
			signal.addEventListener("abort", () => this.controller.abort());
		}
		__classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_beginRequest).call(this);
		const stream = await client.chat.completions.create({
			...params,
			stream: true
		}, {
			...options,
			signal: this.controller.signal
		});
		this._connected();
		for await (const chunk of stream) __classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_addChunk).call(this, chunk);
		if (stream.controller.signal?.aborted) throw new APIUserAbortError();
		return this._addChatCompletion(__classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_endRequest).call(this));
	}
	async _fromReadableStream(readableStream, options) {
		const signal = options?.signal;
		if (signal) {
			if (signal.aborted) this.controller.abort();
			signal.addEventListener("abort", () => this.controller.abort());
		}
		__classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_beginRequest).call(this);
		this._connected();
		const stream = Stream.fromReadableStream(readableStream, this.controller);
		let chatId;
		for await (const chunk of stream) {
			if (chatId && chatId !== chunk.id) this._addChatCompletion(__classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_endRequest).call(this));
			__classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_addChunk).call(this, chunk);
			chatId = chunk.id;
		}
		if (stream.controller.signal?.aborted) throw new APIUserAbortError();
		return this._addChatCompletion(__classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_endRequest).call(this));
	}
	[(_ChatCompletionStream_params = /* @__PURE__ */ new WeakMap(), _ChatCompletionStream_choiceEventStates = /* @__PURE__ */ new WeakMap(), _ChatCompletionStream_currentChatCompletionSnapshot = /* @__PURE__ */ new WeakMap(), _ChatCompletionStream_instances = /* @__PURE__ */ new WeakSet(), _ChatCompletionStream_beginRequest = function _ChatCompletionStream_beginRequest() {
		if (this.ended) return;
		__classPrivateFieldSet(this, _ChatCompletionStream_currentChatCompletionSnapshot, void 0, "f");
	}, _ChatCompletionStream_getChoiceEventState = function _ChatCompletionStream_getChoiceEventState(choice) {
		let state = __classPrivateFieldGet(this, _ChatCompletionStream_choiceEventStates, "f")[choice.index];
		if (state) return state;
		state = {
			content_done: false,
			refusal_done: false,
			logprobs_content_done: false,
			logprobs_refusal_done: false,
			done_tool_calls: /* @__PURE__ */ new Set(),
			current_tool_call_index: null
		};
		__classPrivateFieldGet(this, _ChatCompletionStream_choiceEventStates, "f")[choice.index] = state;
		return state;
	}, _ChatCompletionStream_addChunk = function _ChatCompletionStream_addChunk(chunk) {
		if (this.ended) return;
		const completion = __classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_accumulateChatCompletion).call(this, chunk);
		this._emit("chunk", chunk, completion);
		for (const choice of chunk.choices) {
			const choiceSnapshot = completion.choices[choice.index];
			if (choice.delta.content != null && choiceSnapshot.message?.role === "assistant" && choiceSnapshot.message?.content) {
				this._emit("content", choice.delta.content, choiceSnapshot.message.content);
				this._emit("content.delta", {
					delta: choice.delta.content,
					snapshot: choiceSnapshot.message.content,
					parsed: choiceSnapshot.message.parsed
				});
			}
			if (choice.delta.refusal != null && choiceSnapshot.message?.role === "assistant" && choiceSnapshot.message?.refusal) this._emit("refusal.delta", {
				delta: choice.delta.refusal,
				snapshot: choiceSnapshot.message.refusal
			});
			if (choice.logprobs?.content != null && choiceSnapshot.message?.role === "assistant") this._emit("logprobs.content.delta", {
				content: choice.logprobs?.content,
				snapshot: choiceSnapshot.logprobs?.content ?? []
			});
			if (choice.logprobs?.refusal != null && choiceSnapshot.message?.role === "assistant") this._emit("logprobs.refusal.delta", {
				refusal: choice.logprobs?.refusal,
				snapshot: choiceSnapshot.logprobs?.refusal ?? []
			});
			const state = __classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_getChoiceEventState).call(this, choiceSnapshot);
			if (choiceSnapshot.finish_reason) {
				__classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_emitContentDoneEvents).call(this, choiceSnapshot);
				if (state.current_tool_call_index != null) __classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_emitToolCallDoneEvent).call(this, choiceSnapshot, state.current_tool_call_index);
			}
			for (const toolCall of choice.delta.tool_calls ?? []) {
				if (state.current_tool_call_index !== toolCall.index) {
					__classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_emitContentDoneEvents).call(this, choiceSnapshot);
					if (state.current_tool_call_index != null) __classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_emitToolCallDoneEvent).call(this, choiceSnapshot, state.current_tool_call_index);
				}
				state.current_tool_call_index = toolCall.index;
			}
			for (const toolCallDelta of choice.delta.tool_calls ?? []) {
				const toolCallSnapshot = choiceSnapshot.message.tool_calls?.[toolCallDelta.index];
				if (!toolCallSnapshot?.type) continue;
				if (toolCallSnapshot?.type === "function") this._emit("tool_calls.function.arguments.delta", {
					name: toolCallSnapshot.function?.name,
					index: toolCallDelta.index,
					arguments: toolCallSnapshot.function.arguments,
					parsed_arguments: toolCallSnapshot.function.parsed_arguments,
					arguments_delta: toolCallDelta.function?.arguments ?? ""
				});
				else assertNever$1(toolCallSnapshot?.type);
			}
		}
	}, _ChatCompletionStream_emitToolCallDoneEvent = function _ChatCompletionStream_emitToolCallDoneEvent(choiceSnapshot, toolCallIndex) {
		if (__classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_getChoiceEventState).call(this, choiceSnapshot).done_tool_calls.has(toolCallIndex)) return;
		const toolCallSnapshot = choiceSnapshot.message.tool_calls?.[toolCallIndex];
		if (!toolCallSnapshot) throw new Error("no tool call snapshot");
		if (!toolCallSnapshot.type) throw new Error("tool call snapshot missing `type`");
		if (toolCallSnapshot.type === "function") {
			const inputTool = __classPrivateFieldGet(this, _ChatCompletionStream_params, "f")?.tools?.find((tool) => isChatCompletionFunctionTool(tool) && tool.function.name === toolCallSnapshot.function.name);
			this._emit("tool_calls.function.arguments.done", {
				name: toolCallSnapshot.function.name,
				index: toolCallIndex,
				arguments: toolCallSnapshot.function.arguments,
				parsed_arguments: isAutoParsableTool$1(inputTool) ? inputTool.$parseRaw(toolCallSnapshot.function.arguments) : inputTool?.function.strict ? JSON.parse(toolCallSnapshot.function.arguments) : null
			});
		} else assertNever$1(toolCallSnapshot.type);
	}, _ChatCompletionStream_emitContentDoneEvents = function _ChatCompletionStream_emitContentDoneEvents(choiceSnapshot) {
		const state = __classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_getChoiceEventState).call(this, choiceSnapshot);
		if (choiceSnapshot.message.content && !state.content_done) {
			state.content_done = true;
			const responseFormat = __classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_getAutoParseableResponseFormat).call(this);
			this._emit("content.done", {
				content: choiceSnapshot.message.content,
				parsed: responseFormat ? responseFormat.$parseRaw(choiceSnapshot.message.content) : null
			});
		}
		if (choiceSnapshot.message.refusal && !state.refusal_done) {
			state.refusal_done = true;
			this._emit("refusal.done", { refusal: choiceSnapshot.message.refusal });
		}
		if (choiceSnapshot.logprobs?.content && !state.logprobs_content_done) {
			state.logprobs_content_done = true;
			this._emit("logprobs.content.done", { content: choiceSnapshot.logprobs.content });
		}
		if (choiceSnapshot.logprobs?.refusal && !state.logprobs_refusal_done) {
			state.logprobs_refusal_done = true;
			this._emit("logprobs.refusal.done", { refusal: choiceSnapshot.logprobs.refusal });
		}
	}, _ChatCompletionStream_endRequest = function _ChatCompletionStream_endRequest() {
		if (this.ended) throw new OpenAIError(`stream has ended, this shouldn't happen`);
		const snapshot = __classPrivateFieldGet(this, _ChatCompletionStream_currentChatCompletionSnapshot, "f");
		if (!snapshot) throw new OpenAIError(`request ended without sending any chunks`);
		__classPrivateFieldSet(this, _ChatCompletionStream_currentChatCompletionSnapshot, void 0, "f");
		__classPrivateFieldSet(this, _ChatCompletionStream_choiceEventStates, [], "f");
		return finalizeChatCompletion(snapshot, __classPrivateFieldGet(this, _ChatCompletionStream_params, "f"));
	}, _ChatCompletionStream_getAutoParseableResponseFormat = function _ChatCompletionStream_getAutoParseableResponseFormat() {
		const responseFormat = __classPrivateFieldGet(this, _ChatCompletionStream_params, "f")?.response_format;
		if (isAutoParsableResponseFormat(responseFormat)) return responseFormat;
		return null;
	}, _ChatCompletionStream_accumulateChatCompletion = function _ChatCompletionStream_accumulateChatCompletion(chunk) {
		var _a, _b, _c, _d;
		let snapshot = __classPrivateFieldGet(this, _ChatCompletionStream_currentChatCompletionSnapshot, "f");
		const { choices, ...rest } = chunk;
		if (!snapshot) snapshot = __classPrivateFieldSet(this, _ChatCompletionStream_currentChatCompletionSnapshot, {
			...rest,
			choices: []
		}, "f");
		else Object.assign(snapshot, rest);
		for (const { delta, finish_reason, index, logprobs = null, ...other } of chunk.choices) {
			let choice = snapshot.choices[index];
			if (!choice) choice = snapshot.choices[index] = {
				finish_reason,
				index,
				message: {},
				logprobs,
				...other
			};
			if (logprobs) if (!choice.logprobs) choice.logprobs = Object.assign({}, logprobs);
			else {
				const { content, refusal, ...rest } = logprobs;
				assertIsEmpty(rest);
				Object.assign(choice.logprobs, rest);
				if (content) {
					(_a = choice.logprobs).content ?? (_a.content = []);
					choice.logprobs.content.push(...content);
				}
				if (refusal) {
					(_b = choice.logprobs).refusal ?? (_b.refusal = []);
					choice.logprobs.refusal.push(...refusal);
				}
			}
			if (finish_reason) {
				choice.finish_reason = finish_reason;
				if (__classPrivateFieldGet(this, _ChatCompletionStream_params, "f") && hasAutoParseableInput$1(__classPrivateFieldGet(this, _ChatCompletionStream_params, "f"))) {
					if (finish_reason === "length") throw new LengthFinishReasonError();
					if (finish_reason === "content_filter") throw new ContentFilterFinishReasonError();
				}
			}
			Object.assign(choice, other);
			if (!delta) continue;
			const { content, refusal, function_call, role, tool_calls, ...rest } = delta;
			assertIsEmpty(rest);
			Object.assign(choice.message, rest);
			if (refusal) choice.message.refusal = (choice.message.refusal || "") + refusal;
			if (role) choice.message.role = role;
			if (function_call) if (!choice.message.function_call) choice.message.function_call = function_call;
			else {
				if (function_call.name) choice.message.function_call.name = function_call.name;
				if (function_call.arguments) {
					(_c = choice.message.function_call).arguments ?? (_c.arguments = "");
					choice.message.function_call.arguments += function_call.arguments;
				}
			}
			if (content) {
				choice.message.content = (choice.message.content || "") + content;
				if (!choice.message.refusal && __classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_getAutoParseableResponseFormat).call(this)) choice.message.parsed = partialParse(choice.message.content);
			}
			if (tool_calls) {
				if (!choice.message.tool_calls) choice.message.tool_calls = [];
				for (const { index, id, type, function: fn, ...rest } of tool_calls) {
					const tool_call = (_d = choice.message.tool_calls)[index] ?? (_d[index] = {});
					Object.assign(tool_call, rest);
					if (id) tool_call.id = id;
					if (type) tool_call.type = type;
					if (fn) tool_call.function ?? (tool_call.function = {
						name: fn.name ?? "",
						arguments: ""
					});
					if (fn?.name) tool_call.function.name = fn.name;
					if (fn?.arguments) {
						tool_call.function.arguments += fn.arguments;
						if (shouldParseToolCall(__classPrivateFieldGet(this, _ChatCompletionStream_params, "f"), tool_call)) tool_call.function.parsed_arguments = partialParse(tool_call.function.arguments);
					}
				}
			}
		}
		return snapshot;
	}, Symbol.asyncIterator)]() {
		const pushQueue = [];
		const readQueue = [];
		let done = false;
		this.on("chunk", (chunk) => {
			const reader = readQueue.shift();
			if (reader) reader.resolve(chunk);
			else pushQueue.push(chunk);
		});
		this.on("end", () => {
			done = true;
			for (const reader of readQueue) reader.resolve(void 0);
			readQueue.length = 0;
		});
		this.on("abort", (err) => {
			done = true;
			for (const reader of readQueue) reader.reject(err);
			readQueue.length = 0;
		});
		this.on("error", (err) => {
			done = true;
			for (const reader of readQueue) reader.reject(err);
			readQueue.length = 0;
		});
		return {
			next: async () => {
				if (!pushQueue.length) {
					if (done) return {
						value: void 0,
						done: true
					};
					return new Promise((resolve, reject) => readQueue.push({
						resolve,
						reject
					})).then((chunk) => chunk ? {
						value: chunk,
						done: false
					} : {
						value: void 0,
						done: true
					});
				}
				return {
					value: pushQueue.shift(),
					done: false
				};
			},
			return: async () => {
				this.abort();
				return {
					value: void 0,
					done: true
				};
			}
		};
	}
	toReadableStream() {
		return new Stream(this[Symbol.asyncIterator].bind(this), this.controller).toReadableStream();
	}
};
function finalizeChatCompletion(snapshot, params) {
	const { id, choices, created, model, system_fingerprint, ...rest } = snapshot;
	return maybeParseChatCompletion({
		...rest,
		id,
		choices: choices.map(({ message, finish_reason, index, logprobs, ...choiceRest }) => {
			if (!finish_reason) throw new OpenAIError(`missing finish_reason for choice ${index}`);
			const { content = null, function_call, tool_calls, ...messageRest } = message;
			const role = message.role;
			if (!role) throw new OpenAIError(`missing role for choice ${index}`);
			if (function_call) {
				const { arguments: args, name } = function_call;
				if (args == null) throw new OpenAIError(`missing function_call.arguments for choice ${index}`);
				if (!name) throw new OpenAIError(`missing function_call.name for choice ${index}`);
				return {
					...choiceRest,
					message: {
						content,
						function_call: {
							arguments: args,
							name
						},
						role,
						refusal: message.refusal ?? null
					},
					finish_reason,
					index,
					logprobs
				};
			}
			if (tool_calls) return {
				...choiceRest,
				index,
				finish_reason,
				logprobs,
				message: {
					...messageRest,
					role,
					content,
					refusal: message.refusal ?? null,
					tool_calls: tool_calls.map((tool_call, i) => {
						const { function: fn, type, id, ...toolRest } = tool_call;
						const { arguments: args, name, ...fnRest } = fn || {};
						if (id == null) throw new OpenAIError(`missing choices[${index}].tool_calls[${i}].id\n${str(snapshot)}`);
						if (type == null) throw new OpenAIError(`missing choices[${index}].tool_calls[${i}].type\n${str(snapshot)}`);
						if (name == null) throw new OpenAIError(`missing choices[${index}].tool_calls[${i}].function.name\n${str(snapshot)}`);
						if (args == null) throw new OpenAIError(`missing choices[${index}].tool_calls[${i}].function.arguments\n${str(snapshot)}`);
						return {
							...toolRest,
							id,
							type,
							function: {
								...fnRest,
								name,
								arguments: args
							}
						};
					})
				}
			};
			return {
				...choiceRest,
				message: {
					...messageRest,
					content,
					role,
					refusal: message.refusal ?? null
				},
				finish_reason,
				index,
				logprobs
			};
		}),
		created,
		model,
		object: "chat.completion",
		...system_fingerprint ? { system_fingerprint } : {}
	}, params);
}
function str(x) {
	return JSON.stringify(x);
}
/**
* Ensures the given argument is an empty object, useful for
* asserting that all known properties on an object have been
* destructured.
*/
function assertIsEmpty(obj) {}
function assertNever$1(_x) {}
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/lib/ChatCompletionStreamingRunner.mjs
var ChatCompletionStreamingRunner = class ChatCompletionStreamingRunner extends ChatCompletionStream {
	static fromReadableStream(stream) {
		const runner = new ChatCompletionStreamingRunner(null);
		runner._run(() => runner._fromReadableStream(stream));
		return runner;
	}
	static runTools(client, params, options) {
		const runner = new ChatCompletionStreamingRunner(params);
		const opts = {
			...options,
			headers: {
				...options?.headers,
				"X-Stainless-Helper-Method": "runTools"
			}
		};
		runner._run(() => runner._runTools(client, params, opts));
		return runner;
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/chat/completions/completions.mjs
/**
* Given a list of messages comprising a conversation, the model will return a response.
*/
var Completions$1 = class extends APIResource {
	constructor() {
		super(...arguments);
		this.messages = new Messages$1(this._client);
	}
	create(body, options) {
		return this._client.post("/chat/completions", {
			body,
			...options,
			stream: body.stream ?? false,
			__security: { bearerAuth: true }
		});
	}
	/**
	* Get a stored chat completion. Only Chat Completions that have been created with
	* the `store` parameter set to `true` will be returned.
	*
	* @example
	* ```ts
	* const chatCompletion =
	*   await client.chat.completions.retrieve('completion_id');
	* ```
	*/
	retrieve(completionID, options) {
		return this._client.get(path`/chat/completions/${completionID}`, {
			...options,
			__security: { bearerAuth: true }
		});
	}
	/**
	* Modify a stored chat completion. Only Chat Completions that have been created
	* with the `store` parameter set to `true` can be modified. Currently, the only
	* supported modification is to update the `metadata` field.
	*
	* @example
	* ```ts
	* const chatCompletion = await client.chat.completions.update(
	*   'completion_id',
	*   { metadata: { foo: 'string' } },
	* );
	* ```
	*/
	update(completionID, body, options) {
		return this._client.post(path`/chat/completions/${completionID}`, {
			body,
			...options,
			__security: { bearerAuth: true }
		});
	}
	/**
	* List stored Chat Completions. Only Chat Completions that have been stored with
	* the `store` parameter set to `true` will be returned.
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const chatCompletion of client.chat.completions.list()) {
	*   // ...
	* }
	* ```
	*/
	list(query = {}, options) {
		return this._client.getAPIList("/chat/completions", CursorPage, {
			query,
			...options,
			__security: { bearerAuth: true }
		});
	}
	/**
	* Delete a stored chat completion. Only Chat Completions that have been created
	* with the `store` parameter set to `true` can be deleted.
	*
	* @example
	* ```ts
	* const chatCompletionDeleted =
	*   await client.chat.completions.delete('completion_id');
	* ```
	*/
	delete(completionID, options) {
		return this._client.delete(path`/chat/completions/${completionID}`, {
			...options,
			__security: { bearerAuth: true }
		});
	}
	parse(body, options) {
		validateInputTools(body.tools);
		return this._client.chat.completions.create(body, {
			...options,
			headers: {
				...options?.headers,
				"X-Stainless-Helper-Method": "chat.completions.parse"
			}
		})._thenUnwrap((completion) => parseChatCompletion(completion, body));
	}
	runTools(body, options) {
		if (body.stream) return ChatCompletionStreamingRunner.runTools(this._client, body, options);
		return ChatCompletionRunner.runTools(this._client, body, options);
	}
	/**
	* Creates a chat completion stream
	*/
	stream(body, options) {
		return ChatCompletionStream.createChatCompletion(this._client, body, options);
	}
};
Completions$1.Messages = Messages$1;
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/chat/chat.mjs
var Chat = class extends APIResource {
	constructor() {
		super(...arguments);
		this.completions = new Completions$1(this._client);
	}
};
Chat.Completions = Completions$1;
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/admin/organization/admin-api-keys.mjs
var AdminAPIKeys = class extends APIResource {
	/**
	* Create an organization admin API key
	*
	* @example
	* ```ts
	* const adminAPIKey =
	*   await client.admin.organization.adminAPIKeys.create({
	*     name: 'New Admin Key',
	*   });
	* ```
	*/
	create(body, options) {
		return this._client.post("/organization/admin_api_keys", {
			body,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Retrieve a single organization API key
	*
	* @example
	* ```ts
	* const adminAPIKey =
	*   await client.admin.organization.adminAPIKeys.retrieve(
	*     'key_id',
	*   );
	* ```
	*/
	retrieve(keyID, options) {
		return this._client.get(path`/organization/admin_api_keys/${keyID}`, {
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* List organization API keys
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const adminAPIKey of client.admin.organization.adminAPIKeys.list()) {
	*   // ...
	* }
	* ```
	*/
	list(query = {}, options) {
		return this._client.getAPIList("/organization/admin_api_keys", CursorPage, {
			query,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Delete an organization admin API key
	*
	* @example
	* ```ts
	* const adminAPIKey =
	*   await client.admin.organization.adminAPIKeys.delete(
	*     'key_id',
	*   );
	* ```
	*/
	delete(keyID, options) {
		return this._client.delete(path`/organization/admin_api_keys/${keyID}`, {
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/admin/organization/audit-logs.mjs
/**
* List user actions and configuration changes within this organization.
*/
var AuditLogs = class extends APIResource {
	/**
	* List user actions and configuration changes within this organization.
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const auditLogListResponse of client.admin.organization.auditLogs.list()) {
	*   // ...
	* }
	* ```
	*/
	list(query = {}, options) {
		return this._client.getAPIList("/organization/audit_logs", ConversationCursorPage, {
			query,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/admin/organization/certificates.mjs
var Certificates$1 = class extends APIResource {
	/**
	* Upload a certificate to the organization. This does **not** automatically
	* activate the certificate.
	*
	* Organizations can upload up to 50 certificates.
	*
	* @example
	* ```ts
	* const certificate =
	*   await client.admin.organization.certificates.create({
	*     certificate: 'certificate',
	*   });
	* ```
	*/
	create(body, options) {
		return this._client.post("/organization/certificates", {
			body,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Get a certificate that has been uploaded to the organization.
	*
	* You can get a certificate regardless of whether it is active or not.
	*
	* @example
	* ```ts
	* const certificate =
	*   await client.admin.organization.certificates.retrieve(
	*     'certificate_id',
	*   );
	* ```
	*/
	retrieve(certificateID, query = {}, options) {
		return this._client.get(path`/organization/certificates/${certificateID}`, {
			query,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Modify a certificate. Note that only the name can be modified.
	*
	* @example
	* ```ts
	* const certificate =
	*   await client.admin.organization.certificates.update(
	*     'certificate_id',
	*   );
	* ```
	*/
	update(certificateID, body, options) {
		return this._client.post(path`/organization/certificates/${certificateID}`, {
			body,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* List uploaded certificates for this organization.
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const certificateListResponse of client.admin.organization.certificates.list()) {
	*   // ...
	* }
	* ```
	*/
	list(query = {}, options) {
		return this._client.getAPIList("/organization/certificates", ConversationCursorPage, {
			query,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Delete a certificate from the organization.
	*
	* The certificate must be inactive for the organization and all projects.
	*
	* @example
	* ```ts
	* const certificate =
	*   await client.admin.organization.certificates.delete(
	*     'certificate_id',
	*   );
	* ```
	*/
	delete(certificateID, options) {
		return this._client.delete(path`/organization/certificates/${certificateID}`, {
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Activate certificates at the organization level.
	*
	* You can atomically and idempotently activate up to 10 certificates at a time.
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const certificateActivateResponse of client.admin.organization.certificates.activate(
	*   { certificate_ids: ['cert_abc'] },
	* )) {
	*   // ...
	* }
	* ```
	*/
	activate(body, options) {
		return this._client.getAPIList("/organization/certificates/activate", Page, {
			body,
			method: "post",
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Deactivate certificates at the organization level.
	*
	* You can atomically and idempotently deactivate up to 10 certificates at a time.
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const certificateDeactivateResponse of client.admin.organization.certificates.deactivate(
	*   { certificate_ids: ['cert_abc'] },
	* )) {
	*   // ...
	* }
	* ```
	*/
	deactivate(body, options) {
		return this._client.getAPIList("/organization/certificates/deactivate", Page, {
			body,
			method: "post",
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/admin/organization/data-retention.mjs
var DataRetention$1 = class extends APIResource {
	/**
	* Retrieves organization data retention controls.
	*
	* @example
	* ```ts
	* const organizationDataRetention =
	*   await client.admin.organization.dataRetention.retrieve();
	* ```
	*/
	retrieve(options) {
		return this._client.get("/organization/data_retention", {
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Updates organization data retention controls.
	*
	* @example
	* ```ts
	* const organizationDataRetention =
	*   await client.admin.organization.dataRetention.update({
	*     retention_type: 'zero_data_retention',
	*   });
	* ```
	*/
	update(body, options) {
		return this._client.post("/organization/data_retention", {
			body,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/admin/organization/invites.mjs
var Invites = class extends APIResource {
	/**
	* Create an invite for a user to the organization. The invite must be accepted by
	* the user before they have access to the organization.
	*
	* @example
	* ```ts
	* const invite =
	*   await client.admin.organization.invites.create({
	*     email: 'email',
	*     role: 'reader',
	*   });
	* ```
	*/
	create(body, options) {
		return this._client.post("/organization/invites", {
			body,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Retrieves an invite.
	*
	* @example
	* ```ts
	* const invite =
	*   await client.admin.organization.invites.retrieve(
	*     'invite_id',
	*   );
	* ```
	*/
	retrieve(inviteID, options) {
		return this._client.get(path`/organization/invites/${inviteID}`, {
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Returns a list of invites in the organization.
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const invite of client.admin.organization.invites.list()) {
	*   // ...
	* }
	* ```
	*/
	list(query = {}, options) {
		return this._client.getAPIList("/organization/invites", ConversationCursorPage, {
			query,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Delete an invite. If the invite has already been accepted, it cannot be deleted.
	*
	* @example
	* ```ts
	* const invite =
	*   await client.admin.organization.invites.delete(
	*     'invite_id',
	*   );
	* ```
	*/
	delete(inviteID, options) {
		return this._client.delete(path`/organization/invites/${inviteID}`, {
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/admin/organization/roles.mjs
var Roles$5 = class extends APIResource {
	/**
	* Creates a custom role for the organization.
	*
	* @example
	* ```ts
	* const role = await client.admin.organization.roles.create({
	*   permissions: ['string'],
	*   role_name: 'role_name',
	* });
	* ```
	*/
	create(body, options) {
		return this._client.post("/organization/roles", {
			body,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Retrieves an organization role.
	*
	* @example
	* ```ts
	* const role = await client.admin.organization.roles.retrieve(
	*   'role_id',
	* );
	* ```
	*/
	retrieve(roleID, options) {
		return this._client.get(path`/organization/roles/${roleID}`, {
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Updates an existing organization role.
	*
	* @example
	* ```ts
	* const role = await client.admin.organization.roles.update(
	*   'role_id',
	* );
	* ```
	*/
	update(roleID, body, options) {
		return this._client.post(path`/organization/roles/${roleID}`, {
			body,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Lists the roles configured for the organization.
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const role of client.admin.organization.roles.list()) {
	*   // ...
	* }
	* ```
	*/
	list(query = {}, options) {
		return this._client.getAPIList("/organization/roles", NextCursorPage, {
			query,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Deletes a custom role from the organization.
	*
	* @example
	* ```ts
	* const role = await client.admin.organization.roles.delete(
	*   'role_id',
	* );
	* ```
	*/
	delete(roleID, options) {
		return this._client.delete(path`/organization/roles/${roleID}`, {
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/admin/organization/spend-alerts.mjs
var SpendAlerts$1 = class extends APIResource {
	/**
	* Creates an organization spend alert.
	*
	* @example
	* ```ts
	* const organizationSpendAlert =
	*   await client.admin.organization.spendAlerts.create({
	*     currency: 'USD',
	*     interval: 'month',
	*     notification_channel: {
	*       recipients: ['string'],
	*       type: 'email',
	*     },
	*     threshold_amount: 0,
	*   });
	* ```
	*/
	create(body, options) {
		return this._client.post("/organization/spend_alerts", {
			body,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Updates an organization spend alert.
	*
	* @example
	* ```ts
	* const organizationSpendAlert =
	*   await client.admin.organization.spendAlerts.update(
	*     'alert_id',
	*     {
	*       currency: 'USD',
	*       interval: 'month',
	*       notification_channel: {
	*         recipients: ['string'],
	*         type: 'email',
	*       },
	*       threshold_amount: 0,
	*     },
	*   );
	* ```
	*/
	update(alertID, body, options) {
		return this._client.post(path`/organization/spend_alerts/${alertID}`, {
			body,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Lists organization spend alerts.
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const organizationSpendAlert of client.admin.organization.spendAlerts.list()) {
	*   // ...
	* }
	* ```
	*/
	list(query = {}, options) {
		return this._client.getAPIList("/organization/spend_alerts", ConversationCursorPage, {
			query,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Deletes an organization spend alert.
	*
	* @example
	* ```ts
	* const organizationSpendAlertDeleted =
	*   await client.admin.organization.spendAlerts.delete(
	*     'alert_id',
	*   );
	* ```
	*/
	delete(alertID, options) {
		return this._client.delete(path`/organization/spend_alerts/${alertID}`, {
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/admin/organization/usage.mjs
var Usage = class extends APIResource {
	/**
	* Get audio speeches usage details for the organization.
	*
	* @example
	* ```ts
	* const response =
	*   await client.admin.organization.usage.audioSpeeches({
	*     start_time: 0,
	*   });
	* ```
	*/
	audioSpeeches(query, options) {
		return this._client.get("/organization/usage/audio_speeches", {
			query,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Get audio transcriptions usage details for the organization.
	*
	* @example
	* ```ts
	* const response =
	*   await client.admin.organization.usage.audioTranscriptions(
	*     { start_time: 0 },
	*   );
	* ```
	*/
	audioTranscriptions(query, options) {
		return this._client.get("/organization/usage/audio_transcriptions", {
			query,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Get code interpreter sessions usage details for the organization.
	*
	* @example
	* ```ts
	* const response =
	*   await client.admin.organization.usage.codeInterpreterSessions(
	*     { start_time: 0 },
	*   );
	* ```
	*/
	codeInterpreterSessions(query, options) {
		return this._client.get("/organization/usage/code_interpreter_sessions", {
			query,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Get completions usage details for the organization.
	*
	* @example
	* ```ts
	* const response =
	*   await client.admin.organization.usage.completions({
	*     start_time: 0,
	*   });
	* ```
	*/
	completions(query, options) {
		return this._client.get("/organization/usage/completions", {
			query,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Get costs details for the organization.
	*
	* @example
	* ```ts
	* const response =
	*   await client.admin.organization.usage.costs({
	*     start_time: 0,
	*   });
	* ```
	*/
	costs(query, options) {
		return this._client.get("/organization/costs", {
			query,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Get embeddings usage details for the organization.
	*
	* @example
	* ```ts
	* const response =
	*   await client.admin.organization.usage.embeddings({
	*     start_time: 0,
	*   });
	* ```
	*/
	embeddings(query, options) {
		return this._client.get("/organization/usage/embeddings", {
			query,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Get file search calls usage details for the organization.
	*
	* @example
	* ```ts
	* const response =
	*   await client.admin.organization.usage.fileSearchCalls({
	*     start_time: 0,
	*   });
	* ```
	*/
	fileSearchCalls(query, options) {
		return this._client.get("/organization/usage/file_search_calls", {
			query,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Get images usage details for the organization.
	*
	* @example
	* ```ts
	* const response =
	*   await client.admin.organization.usage.images({
	*     start_time: 0,
	*   });
	* ```
	*/
	images(query, options) {
		return this._client.get("/organization/usage/images", {
			query,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Get moderations usage details for the organization.
	*
	* @example
	* ```ts
	* const response =
	*   await client.admin.organization.usage.moderations({
	*     start_time: 0,
	*   });
	* ```
	*/
	moderations(query, options) {
		return this._client.get("/organization/usage/moderations", {
			query,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Get vector stores usage details for the organization.
	*
	* @example
	* ```ts
	* const response =
	*   await client.admin.organization.usage.vectorStores({
	*     start_time: 0,
	*   });
	* ```
	*/
	vectorStores(query, options) {
		return this._client.get("/organization/usage/vector_stores", {
			query,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Get web search calls usage details for the organization.
	*
	* @example
	* ```ts
	* const response =
	*   await client.admin.organization.usage.webSearchCalls({
	*     start_time: 0,
	*   });
	* ```
	*/
	webSearchCalls(query, options) {
		return this._client.get("/organization/usage/web_search_calls", {
			query,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/admin/organization/groups/roles.mjs
var Roles$4 = class extends APIResource {
	/**
	* Assigns an organization role to a group within the organization.
	*
	* @example
	* ```ts
	* const role =
	*   await client.admin.organization.groups.roles.create(
	*     'group_id',
	*     { role_id: 'role_id' },
	*   );
	* ```
	*/
	create(groupID, body, options) {
		return this._client.post(path`/organization/groups/${groupID}/roles`, {
			body,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Retrieves an organization role assigned to a group.
	*
	* @example
	* ```ts
	* const role =
	*   await client.admin.organization.groups.roles.retrieve(
	*     'role_id',
	*     { group_id: 'group_id' },
	*   );
	* ```
	*/
	retrieve(roleID, params, options) {
		const { group_id } = params;
		return this._client.get(path`/organization/groups/${group_id}/roles/${roleID}`, {
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Lists the organization roles assigned to a group within the organization.
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const roleListResponse of client.admin.organization.groups.roles.list(
	*   'group_id',
	* )) {
	*   // ...
	* }
	* ```
	*/
	list(groupID, query = {}, options) {
		return this._client.getAPIList(path`/organization/groups/${groupID}/roles`, NextCursorPage, {
			query,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Unassigns an organization role from a group within the organization.
	*
	* @example
	* ```ts
	* const role =
	*   await client.admin.organization.groups.roles.delete(
	*     'role_id',
	*     { group_id: 'group_id' },
	*   );
	* ```
	*/
	delete(roleID, params, options) {
		const { group_id } = params;
		return this._client.delete(path`/organization/groups/${group_id}/roles/${roleID}`, {
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/admin/organization/groups/users.mjs
var Users$2 = class extends APIResource {
	/**
	* Adds a user to a group.
	*
	* @example
	* ```ts
	* const user =
	*   await client.admin.organization.groups.users.create(
	*     'group_id',
	*     { user_id: 'user_id' },
	*   );
	* ```
	*/
	create(groupID, body, options) {
		return this._client.post(path`/organization/groups/${groupID}/users`, {
			body,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Retrieves a user in a group.
	*
	* @example
	* ```ts
	* const user =
	*   await client.admin.organization.groups.users.retrieve(
	*     'user_id',
	*     { group_id: 'group_id' },
	*   );
	* ```
	*/
	retrieve(userID, params, options) {
		const { group_id } = params;
		return this._client.get(path`/organization/groups/${group_id}/users/${userID}`, {
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Lists the users assigned to a group.
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const organizationGroupUser of client.admin.organization.groups.users.list(
	*   'group_id',
	* )) {
	*   // ...
	* }
	* ```
	*/
	list(groupID, query = {}, options) {
		return this._client.getAPIList(path`/organization/groups/${groupID}/users`, NextCursorPage, {
			query,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Removes a user from a group.
	*
	* @example
	* ```ts
	* const user =
	*   await client.admin.organization.groups.users.delete(
	*     'user_id',
	*     { group_id: 'group_id' },
	*   );
	* ```
	*/
	delete(userID, params, options) {
		const { group_id } = params;
		return this._client.delete(path`/organization/groups/${group_id}/users/${userID}`, {
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/admin/organization/groups/groups.mjs
var Groups$1 = class extends APIResource {
	constructor() {
		super(...arguments);
		this.users = new Users$2(this._client);
		this.roles = new Roles$4(this._client);
	}
	/**
	* Creates a new group in the organization.
	*
	* @example
	* ```ts
	* const group = await client.admin.organization.groups.create(
	*   { name: 'x' },
	* );
	* ```
	*/
	create(body, options) {
		return this._client.post("/organization/groups", {
			body,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Retrieves a group.
	*
	* @example
	* ```ts
	* const group =
	*   await client.admin.organization.groups.retrieve(
	*     'group_id',
	*   );
	* ```
	*/
	retrieve(groupID, options) {
		return this._client.get(path`/organization/groups/${groupID}`, {
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Updates a group's information.
	*
	* @example
	* ```ts
	* const group = await client.admin.organization.groups.update(
	*   'group_id',
	*   { name: 'x' },
	* );
	* ```
	*/
	update(groupID, body, options) {
		return this._client.post(path`/organization/groups/${groupID}`, {
			body,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Lists all groups in the organization.
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const group of client.admin.organization.groups.list()) {
	*   // ...
	* }
	* ```
	*/
	list(query = {}, options) {
		return this._client.getAPIList("/organization/groups", NextCursorPage, {
			query,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Deletes a group from the organization.
	*
	* @example
	* ```ts
	* const group = await client.admin.organization.groups.delete(
	*   'group_id',
	* );
	* ```
	*/
	delete(groupID, options) {
		return this._client.delete(path`/organization/groups/${groupID}`, {
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
};
Groups$1.Users = Users$2;
Groups$1.Roles = Roles$4;
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/admin/organization/projects/api-keys.mjs
var APIKeys = class extends APIResource {
	/**
	* Retrieves an API key in the project.
	*
	* @example
	* ```ts
	* const projectAPIKey =
	*   await client.admin.organization.projects.apiKeys.retrieve(
	*     'api_key_id',
	*     { project_id: 'project_id' },
	*   );
	* ```
	*/
	retrieve(apiKeyID, params, options) {
		const { project_id } = params;
		return this._client.get(path`/organization/projects/${project_id}/api_keys/${apiKeyID}`, {
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Returns a list of API keys in the project.
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const projectAPIKey of client.admin.organization.projects.apiKeys.list(
	*   'project_id',
	* )) {
	*   // ...
	* }
	* ```
	*/
	list(projectID, query = {}, options) {
		return this._client.getAPIList(path`/organization/projects/${projectID}/api_keys`, ConversationCursorPage, {
			query,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Deletes an API key from the project.
	*
	* Returns confirmation of the key deletion, or an error if the key belonged to a
	* service account.
	*
	* @example
	* ```ts
	* const apiKey =
	*   await client.admin.organization.projects.apiKeys.delete(
	*     'api_key_id',
	*     { project_id: 'project_id' },
	*   );
	* ```
	*/
	delete(apiKeyID, params, options) {
		const { project_id } = params;
		return this._client.delete(path`/organization/projects/${project_id}/api_keys/${apiKeyID}`, {
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/admin/organization/projects/certificates.mjs
var Certificates = class extends APIResource {
	/**
	* List certificates for this project.
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const certificateListResponse of client.admin.organization.projects.certificates.list(
	*   'project_id',
	* )) {
	*   // ...
	* }
	* ```
	*/
	list(projectID, query = {}, options) {
		return this._client.getAPIList(path`/organization/projects/${projectID}/certificates`, ConversationCursorPage, {
			query,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Activate certificates at the project level.
	*
	* You can atomically and idempotently activate up to 10 certificates at a time.
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const certificateActivateResponse of client.admin.organization.projects.certificates.activate(
	*   'project_id',
	*   { certificate_ids: ['cert_abc'] },
	* )) {
	*   // ...
	* }
	* ```
	*/
	activate(projectID, body, options) {
		return this._client.getAPIList(path`/organization/projects/${projectID}/certificates/activate`, Page, {
			body,
			method: "post",
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Deactivate certificates at the project level. You can atomically and
	* idempotently deactivate up to 10 certificates at a time.
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const certificateDeactivateResponse of client.admin.organization.projects.certificates.deactivate(
	*   'project_id',
	*   { certificate_ids: ['cert_abc'] },
	* )) {
	*   // ...
	* }
	* ```
	*/
	deactivate(projectID, body, options) {
		return this._client.getAPIList(path`/organization/projects/${projectID}/certificates/deactivate`, Page, {
			body,
			method: "post",
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/admin/organization/projects/data-retention.mjs
var DataRetention = class extends APIResource {
	/**
	* Retrieves project data retention controls.
	*
	* @example
	* ```ts
	* const projectDataRetention =
	*   await client.admin.organization.projects.dataRetention.retrieve(
	*     'project_id',
	*   );
	* ```
	*/
	retrieve(projectID, options) {
		return this._client.get(path`/organization/projects/${projectID}/data_retention`, {
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Updates project data retention controls.
	*
	* @example
	* ```ts
	* const projectDataRetention =
	*   await client.admin.organization.projects.dataRetention.update(
	*     'project_id',
	*     { retention_type: 'organization_default' },
	*   );
	* ```
	*/
	update(projectID, body, options) {
		return this._client.post(path`/organization/projects/${projectID}/data_retention`, {
			body,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/admin/organization/projects/hosted-tool-permissions.mjs
var HostedToolPermissions = class extends APIResource {
	/**
	* Returns hosted tool permissions for a project.
	*
	* @example
	* ```ts
	* const projectHostedToolPermissions =
	*   await client.admin.organization.projects.hostedToolPermissions.retrieve(
	*     'project_id',
	*   );
	* ```
	*/
	retrieve(projectID, options) {
		return this._client.get(path`/organization/projects/${projectID}/hosted_tool_permissions`, {
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Updates hosted tool permissions for a project.
	*
	* @example
	* ```ts
	* const projectHostedToolPermissions =
	*   await client.admin.organization.projects.hostedToolPermissions.update(
	*     'project_id',
	*   );
	* ```
	*/
	update(projectID, body, options) {
		return this._client.post(path`/organization/projects/${projectID}/hosted_tool_permissions`, {
			body,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/admin/organization/projects/model-permissions.mjs
var ModelPermissions = class extends APIResource {
	/**
	* Returns model permissions for a project.
	*
	* @example
	* ```ts
	* const projectModelPermissions =
	*   await client.admin.organization.projects.modelPermissions.retrieve(
	*     'project_id',
	*   );
	* ```
	*/
	retrieve(projectID, options) {
		return this._client.get(path`/organization/projects/${projectID}/model_permissions`, {
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Updates model permissions for a project.
	*
	* @example
	* ```ts
	* const projectModelPermissions =
	*   await client.admin.organization.projects.modelPermissions.update(
	*     'project_id',
	*     { mode: 'allow_list', model_ids: ['string'] },
	*   );
	* ```
	*/
	update(projectID, body, options) {
		return this._client.post(path`/organization/projects/${projectID}/model_permissions`, {
			body,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Deletes model permissions for a project.
	*
	* @example
	* ```ts
	* const projectModelPermissionsDeleted =
	*   await client.admin.organization.projects.modelPermissions.delete(
	*     'project_id',
	*   );
	* ```
	*/
	delete(projectID, options) {
		return this._client.delete(path`/organization/projects/${projectID}/model_permissions`, {
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/admin/organization/projects/rate-limits.mjs
var RateLimits = class extends APIResource {
	/**
	* Returns the rate limits per model for a project.
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const projectRateLimit of client.admin.organization.projects.rateLimits.listRateLimits(
	*   'project_id',
	* )) {
	*   // ...
	* }
	* ```
	*/
	listRateLimits(projectID, query = {}, options) {
		return this._client.getAPIList(path`/organization/projects/${projectID}/rate_limits`, ConversationCursorPage, {
			query,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Updates a project rate limit.
	*
	* @example
	* ```ts
	* const projectRateLimit =
	*   await client.admin.organization.projects.rateLimits.updateRateLimit(
	*     'rate_limit_id',
	*     { project_id: 'project_id' },
	*   );
	* ```
	*/
	updateRateLimit(rateLimitID, params, options) {
		const { project_id, ...body } = params;
		return this._client.post(path`/organization/projects/${project_id}/rate_limits/${rateLimitID}`, {
			body,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/admin/organization/projects/roles.mjs
var Roles$3 = class extends APIResource {
	/**
	* Creates a custom role for a project.
	*
	* @example
	* ```ts
	* const role =
	*   await client.admin.organization.projects.roles.create(
	*     'project_id',
	*     { permissions: ['string'], role_name: 'role_name' },
	*   );
	* ```
	*/
	create(projectID, body, options) {
		return this._client.post(path`/projects/${projectID}/roles`, {
			body,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Retrieves a project role.
	*
	* @example
	* ```ts
	* const role =
	*   await client.admin.organization.projects.roles.retrieve(
	*     'role_id',
	*     { project_id: 'project_id' },
	*   );
	* ```
	*/
	retrieve(roleID, params, options) {
		const { project_id } = params;
		return this._client.get(path`/projects/${project_id}/roles/${roleID}`, {
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Updates an existing project role.
	*
	* @example
	* ```ts
	* const role =
	*   await client.admin.organization.projects.roles.update(
	*     'role_id',
	*     { project_id: 'project_id' },
	*   );
	* ```
	*/
	update(roleID, params, options) {
		const { project_id, ...body } = params;
		return this._client.post(path`/projects/${project_id}/roles/${roleID}`, {
			body,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Lists the roles configured for a project.
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const role of client.admin.organization.projects.roles.list(
	*   'project_id',
	* )) {
	*   // ...
	* }
	* ```
	*/
	list(projectID, query = {}, options) {
		return this._client.getAPIList(path`/projects/${projectID}/roles`, NextCursorPage, {
			query,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Deletes a custom role from a project.
	*
	* @example
	* ```ts
	* const role =
	*   await client.admin.organization.projects.roles.delete(
	*     'role_id',
	*     { project_id: 'project_id' },
	*   );
	* ```
	*/
	delete(roleID, params, options) {
		const { project_id } = params;
		return this._client.delete(path`/projects/${project_id}/roles/${roleID}`, {
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/admin/organization/projects/service-accounts.mjs
var ServiceAccounts = class extends APIResource {
	/**
	* Creates a new service account in the project. This also returns an unredacted
	* API key for the service account.
	*
	* @example
	* ```ts
	* const serviceAccount =
	*   await client.admin.organization.projects.serviceAccounts.create(
	*     'project_id',
	*     { name: 'name' },
	*   );
	* ```
	*/
	create(projectID, body, options) {
		return this._client.post(path`/organization/projects/${projectID}/service_accounts`, {
			body,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Retrieves a service account in the project.
	*
	* @example
	* ```ts
	* const projectServiceAccount =
	*   await client.admin.organization.projects.serviceAccounts.retrieve(
	*     'service_account_id',
	*     { project_id: 'project_id' },
	*   );
	* ```
	*/
	retrieve(serviceAccountID, params, options) {
		const { project_id } = params;
		return this._client.get(path`/organization/projects/${project_id}/service_accounts/${serviceAccountID}`, {
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Updates a service account in the project.
	*
	* @example
	* ```ts
	* const projectServiceAccount =
	*   await client.admin.organization.projects.serviceAccounts.update(
	*     'service_account_id',
	*     { project_id: 'project_id' },
	*   );
	* ```
	*/
	update(serviceAccountID, params, options) {
		const { project_id, ...body } = params;
		return this._client.post(path`/organization/projects/${project_id}/service_accounts/${serviceAccountID}`, {
			body,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Returns a list of service accounts in the project.
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const projectServiceAccount of client.admin.organization.projects.serviceAccounts.list(
	*   'project_id',
	* )) {
	*   // ...
	* }
	* ```
	*/
	list(projectID, query = {}, options) {
		return this._client.getAPIList(path`/organization/projects/${projectID}/service_accounts`, ConversationCursorPage, {
			query,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Deletes a service account from the project.
	*
	* Returns confirmation of service account deletion, or an error if the project is
	* archived (archived projects have no service accounts).
	*
	* @example
	* ```ts
	* const serviceAccount =
	*   await client.admin.organization.projects.serviceAccounts.delete(
	*     'service_account_id',
	*     { project_id: 'project_id' },
	*   );
	* ```
	*/
	delete(serviceAccountID, params, options) {
		const { project_id } = params;
		return this._client.delete(path`/organization/projects/${project_id}/service_accounts/${serviceAccountID}`, {
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/admin/organization/projects/spend-alerts.mjs
var SpendAlerts = class extends APIResource {
	/**
	* Creates a project spend alert.
	*
	* @example
	* ```ts
	* const projectSpendAlert =
	*   await client.admin.organization.projects.spendAlerts.create(
	*     'project_id',
	*     {
	*       currency: 'USD',
	*       interval: 'month',
	*       notification_channel: {
	*         recipients: ['string'],
	*         type: 'email',
	*       },
	*       threshold_amount: 0,
	*     },
	*   );
	* ```
	*/
	create(projectID, body, options) {
		return this._client.post(path`/organization/projects/${projectID}/spend_alerts`, {
			body,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Updates a project spend alert.
	*
	* @example
	* ```ts
	* const projectSpendAlert =
	*   await client.admin.organization.projects.spendAlerts.update(
	*     'alert_id',
	*     {
	*       project_id: 'project_id',
	*       currency: 'USD',
	*       interval: 'month',
	*       notification_channel: {
	*         recipients: ['string'],
	*         type: 'email',
	*       },
	*       threshold_amount: 0,
	*     },
	*   );
	* ```
	*/
	update(alertID, params, options) {
		const { project_id, ...body } = params;
		return this._client.post(path`/organization/projects/${project_id}/spend_alerts/${alertID}`, {
			body,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Lists project spend alerts.
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const projectSpendAlert of client.admin.organization.projects.spendAlerts.list(
	*   'project_id',
	* )) {
	*   // ...
	* }
	* ```
	*/
	list(projectID, query = {}, options) {
		return this._client.getAPIList(path`/organization/projects/${projectID}/spend_alerts`, ConversationCursorPage, {
			query,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Deletes a project spend alert.
	*
	* @example
	* ```ts
	* const projectSpendAlertDeleted =
	*   await client.admin.organization.projects.spendAlerts.delete(
	*     'alert_id',
	*     { project_id: 'project_id' },
	*   );
	* ```
	*/
	delete(alertID, params, options) {
		const { project_id } = params;
		return this._client.delete(path`/organization/projects/${project_id}/spend_alerts/${alertID}`, {
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/admin/organization/projects/groups/roles.mjs
var Roles$2 = class extends APIResource {
	/**
	* Assigns a project role to a group within a project.
	*
	* @example
	* ```ts
	* const role =
	*   await client.admin.organization.projects.groups.roles.create(
	*     'group_id',
	*     { project_id: 'project_id', role_id: 'role_id' },
	*   );
	* ```
	*/
	create(groupID, params, options) {
		const { project_id, ...body } = params;
		return this._client.post(path`/projects/${project_id}/groups/${groupID}/roles`, {
			body,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Retrieves a project role assigned to a group.
	*
	* @example
	* ```ts
	* const role =
	*   await client.admin.organization.projects.groups.roles.retrieve(
	*     'role_id',
	*     { project_id: 'project_id', group_id: 'group_id' },
	*   );
	* ```
	*/
	retrieve(roleID, params, options) {
		const { project_id, group_id } = params;
		return this._client.get(path`/projects/${project_id}/groups/${group_id}/roles/${roleID}`, {
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Lists the project roles assigned to a group within a project.
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const roleListResponse of client.admin.organization.projects.groups.roles.list(
	*   'group_id',
	*   { project_id: 'project_id' },
	* )) {
	*   // ...
	* }
	* ```
	*/
	list(groupID, params, options) {
		const { project_id, ...query } = params;
		return this._client.getAPIList(path`/projects/${project_id}/groups/${groupID}/roles`, NextCursorPage, {
			query,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Unassigns a project role from a group within a project.
	*
	* @example
	* ```ts
	* const role =
	*   await client.admin.organization.projects.groups.roles.delete(
	*     'role_id',
	*     { project_id: 'project_id', group_id: 'group_id' },
	*   );
	* ```
	*/
	delete(roleID, params, options) {
		const { project_id, group_id } = params;
		return this._client.delete(path`/projects/${project_id}/groups/${group_id}/roles/${roleID}`, {
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/admin/organization/projects/groups/groups.mjs
var Groups = class extends APIResource {
	constructor() {
		super(...arguments);
		this.roles = new Roles$2(this._client);
	}
	/**
	* Grants a group access to a project.
	*
	* @example
	* ```ts
	* const projectGroup =
	*   await client.admin.organization.projects.groups.create(
	*     'project_id',
	*     { group_id: 'group_id', role: 'role' },
	*   );
	* ```
	*/
	create(projectID, body, options) {
		return this._client.post(path`/organization/projects/${projectID}/groups`, {
			body,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Retrieves a project's group.
	*
	* @example
	* ```ts
	* const projectGroup =
	*   await client.admin.organization.projects.groups.retrieve(
	*     'group_id',
	*     { project_id: 'project_id' },
	*   );
	* ```
	*/
	retrieve(groupID, params, options) {
		const { project_id, ...query } = params;
		return this._client.get(path`/organization/projects/${project_id}/groups/${groupID}`, {
			query,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Lists the groups that have access to a project.
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const projectGroup of client.admin.organization.projects.groups.list(
	*   'project_id',
	* )) {
	*   // ...
	* }
	* ```
	*/
	list(projectID, query = {}, options) {
		return this._client.getAPIList(path`/organization/projects/${projectID}/groups`, NextCursorPage, {
			query,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Revokes a group's access to a project.
	*
	* @example
	* ```ts
	* const group =
	*   await client.admin.organization.projects.groups.delete(
	*     'group_id',
	*     { project_id: 'project_id' },
	*   );
	* ```
	*/
	delete(groupID, params, options) {
		const { project_id } = params;
		return this._client.delete(path`/organization/projects/${project_id}/groups/${groupID}`, {
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
};
Groups.Roles = Roles$2;
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/admin/organization/projects/users/roles.mjs
var Roles$1 = class extends APIResource {
	/**
	* Assigns a project role to a user within a project.
	*
	* @example
	* ```ts
	* const role =
	*   await client.admin.organization.projects.users.roles.create(
	*     'user_id',
	*     { project_id: 'project_id', role_id: 'role_id' },
	*   );
	* ```
	*/
	create(userID, params, options) {
		const { project_id, ...body } = params;
		return this._client.post(path`/projects/${project_id}/users/${userID}/roles`, {
			body,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Retrieves a project role assigned to a user.
	*
	* @example
	* ```ts
	* const role =
	*   await client.admin.organization.projects.users.roles.retrieve(
	*     'role_id',
	*     { project_id: 'project_id', user_id: 'user_id' },
	*   );
	* ```
	*/
	retrieve(roleID, params, options) {
		const { project_id, user_id } = params;
		return this._client.get(path`/projects/${project_id}/users/${user_id}/roles/${roleID}`, {
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Lists the project roles assigned to a user within a project.
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const roleListResponse of client.admin.organization.projects.users.roles.list(
	*   'user_id',
	*   { project_id: 'project_id' },
	* )) {
	*   // ...
	* }
	* ```
	*/
	list(userID, params, options) {
		const { project_id, ...query } = params;
		return this._client.getAPIList(path`/projects/${project_id}/users/${userID}/roles`, NextCursorPage, {
			query,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Unassigns a project role from a user within a project.
	*
	* @example
	* ```ts
	* const role =
	*   await client.admin.organization.projects.users.roles.delete(
	*     'role_id',
	*     { project_id: 'project_id', user_id: 'user_id' },
	*   );
	* ```
	*/
	delete(roleID, params, options) {
		const { project_id, user_id } = params;
		return this._client.delete(path`/projects/${project_id}/users/${user_id}/roles/${roleID}`, {
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/admin/organization/projects/users/users.mjs
var Users$1 = class extends APIResource {
	constructor() {
		super(...arguments);
		this.roles = new Roles$1(this._client);
	}
	/**
	* Adds a user to the project. Users must already be members of the organization to
	* be added to a project.
	*
	* @example
	* ```ts
	* const projectUser =
	*   await client.admin.organization.projects.users.create(
	*     'project_id',
	*     { role: 'role' },
	*   );
	* ```
	*/
	create(projectID, body, options) {
		return this._client.post(path`/organization/projects/${projectID}/users`, {
			body,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Retrieves a user in the project.
	*
	* @example
	* ```ts
	* const projectUser =
	*   await client.admin.organization.projects.users.retrieve(
	*     'user_id',
	*     { project_id: 'project_id' },
	*   );
	* ```
	*/
	retrieve(userID, params, options) {
		const { project_id } = params;
		return this._client.get(path`/organization/projects/${project_id}/users/${userID}`, {
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Modifies a user's role in the project.
	*
	* @example
	* ```ts
	* const projectUser =
	*   await client.admin.organization.projects.users.update(
	*     'user_id',
	*     { project_id: 'project_id' },
	*   );
	* ```
	*/
	update(userID, params, options) {
		const { project_id, ...body } = params;
		return this._client.post(path`/organization/projects/${project_id}/users/${userID}`, {
			body,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Returns a list of users in the project.
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const projectUser of client.admin.organization.projects.users.list(
	*   'project_id',
	* )) {
	*   // ...
	* }
	* ```
	*/
	list(projectID, query = {}, options) {
		return this._client.getAPIList(path`/organization/projects/${projectID}/users`, ConversationCursorPage, {
			query,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Deletes a user from the project.
	*
	* Returns confirmation of project user deletion, or an error if the project is
	* archived (archived projects have no users).
	*
	* @example
	* ```ts
	* const user =
	*   await client.admin.organization.projects.users.delete(
	*     'user_id',
	*     { project_id: 'project_id' },
	*   );
	* ```
	*/
	delete(userID, params, options) {
		const { project_id } = params;
		return this._client.delete(path`/organization/projects/${project_id}/users/${userID}`, {
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
};
Users$1.Roles = Roles$1;
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/admin/organization/projects/projects.mjs
var Projects = class extends APIResource {
	constructor() {
		super(...arguments);
		this.users = new Users$1(this._client);
		this.serviceAccounts = new ServiceAccounts(this._client);
		this.apiKeys = new APIKeys(this._client);
		this.rateLimits = new RateLimits(this._client);
		this.modelPermissions = new ModelPermissions(this._client);
		this.hostedToolPermissions = new HostedToolPermissions(this._client);
		this.groups = new Groups(this._client);
		this.roles = new Roles$3(this._client);
		this.dataRetention = new DataRetention(this._client);
		this.spendAlerts = new SpendAlerts(this._client);
		this.certificates = new Certificates(this._client);
	}
	/**
	* Create a new project in the organization. Projects can be created and archived,
	* but cannot be deleted.
	*
	* @example
	* ```ts
	* const project =
	*   await client.admin.organization.projects.create({
	*     name: 'name',
	*   });
	* ```
	*/
	create(body, options) {
		return this._client.post("/organization/projects", {
			body,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Retrieves a project.
	*
	* @example
	* ```ts
	* const project =
	*   await client.admin.organization.projects.retrieve(
	*     'project_id',
	*   );
	* ```
	*/
	retrieve(projectID, options) {
		return this._client.get(path`/organization/projects/${projectID}`, {
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Modifies a project in the organization.
	*
	* @example
	* ```ts
	* const project =
	*   await client.admin.organization.projects.update(
	*     'project_id',
	*   );
	* ```
	*/
	update(projectID, body, options) {
		return this._client.post(path`/organization/projects/${projectID}`, {
			body,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Returns a list of projects.
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const project of client.admin.organization.projects.list()) {
	*   // ...
	* }
	* ```
	*/
	list(query = {}, options) {
		return this._client.getAPIList("/organization/projects", ConversationCursorPage, {
			query,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Archives a project in the organization. Archived projects cannot be used or
	* updated.
	*
	* @example
	* ```ts
	* const project =
	*   await client.admin.organization.projects.archive(
	*     'project_id',
	*   );
	* ```
	*/
	archive(projectID, options) {
		return this._client.post(path`/organization/projects/${projectID}/archive`, {
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
};
Projects.Users = Users$1;
Projects.ServiceAccounts = ServiceAccounts;
Projects.APIKeys = APIKeys;
Projects.RateLimits = RateLimits;
Projects.ModelPermissions = ModelPermissions;
Projects.HostedToolPermissions = HostedToolPermissions;
Projects.Groups = Groups;
Projects.Roles = Roles$3;
Projects.DataRetention = DataRetention;
Projects.SpendAlerts = SpendAlerts;
Projects.Certificates = Certificates;
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/admin/organization/users/roles.mjs
var Roles = class extends APIResource {
	/**
	* Assigns an organization role to a user within the organization.
	*
	* @example
	* ```ts
	* const role =
	*   await client.admin.organization.users.roles.create(
	*     'user_id',
	*     { role_id: 'role_id' },
	*   );
	* ```
	*/
	create(userID, body, options) {
		return this._client.post(path`/organization/users/${userID}/roles`, {
			body,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Retrieves an organization role assigned to a user.
	*
	* @example
	* ```ts
	* const role =
	*   await client.admin.organization.users.roles.retrieve(
	*     'role_id',
	*     { user_id: 'user_id' },
	*   );
	* ```
	*/
	retrieve(roleID, params, options) {
		const { user_id } = params;
		return this._client.get(path`/organization/users/${user_id}/roles/${roleID}`, {
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Lists the organization roles assigned to a user within the organization.
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const roleListResponse of client.admin.organization.users.roles.list(
	*   'user_id',
	* )) {
	*   // ...
	* }
	* ```
	*/
	list(userID, query = {}, options) {
		return this._client.getAPIList(path`/organization/users/${userID}/roles`, NextCursorPage, {
			query,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Unassigns an organization role from a user within the organization.
	*
	* @example
	* ```ts
	* const role =
	*   await client.admin.organization.users.roles.delete(
	*     'role_id',
	*     { user_id: 'user_id' },
	*   );
	* ```
	*/
	delete(roleID, params, options) {
		const { user_id } = params;
		return this._client.delete(path`/organization/users/${user_id}/roles/${roleID}`, {
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/admin/organization/users/users.mjs
var Users = class extends APIResource {
	constructor() {
		super(...arguments);
		this.roles = new Roles(this._client);
	}
	/**
	* Retrieves a user by their identifier.
	*
	* @example
	* ```ts
	* const organizationUser =
	*   await client.admin.organization.users.retrieve('user_id');
	* ```
	*/
	retrieve(userID, options) {
		return this._client.get(path`/organization/users/${userID}`, {
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Modifies a user's role in the organization.
	*
	* @example
	* ```ts
	* const organizationUser =
	*   await client.admin.organization.users.update('user_id');
	* ```
	*/
	update(userID, body, options) {
		return this._client.post(path`/organization/users/${userID}`, {
			body,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Lists all of the users in the organization.
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const organizationUser of client.admin.organization.users.list()) {
	*   // ...
	* }
	* ```
	*/
	list(query = {}, options) {
		return this._client.getAPIList("/organization/users", ConversationCursorPage, {
			query,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* Deletes a user from the organization.
	*
	* @example
	* ```ts
	* const user = await client.admin.organization.users.delete(
	*   'user_id',
	* );
	* ```
	*/
	delete(userID, options) {
		return this._client.delete(path`/organization/users/${userID}`, {
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
};
Users.Roles = Roles;
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/admin/organization/organization.mjs
var Organization = class extends APIResource {
	constructor() {
		super(...arguments);
		this.auditLogs = new AuditLogs(this._client);
		this.adminAPIKeys = new AdminAPIKeys(this._client);
		this.usage = new Usage(this._client);
		this.invites = new Invites(this._client);
		this.users = new Users(this._client);
		this.groups = new Groups$1(this._client);
		this.roles = new Roles$5(this._client);
		this.dataRetention = new DataRetention$1(this._client);
		this.spendAlerts = new SpendAlerts$1(this._client);
		this.certificates = new Certificates$1(this._client);
		this.projects = new Projects(this._client);
	}
};
Organization.AuditLogs = AuditLogs;
Organization.AdminAPIKeys = AdminAPIKeys;
Organization.Usage = Usage;
Organization.Invites = Invites;
Organization.Users = Users;
Organization.Groups = Groups$1;
Organization.Roles = Roles$5;
Organization.DataRetention = DataRetention$1;
Organization.SpendAlerts = SpendAlerts$1;
Organization.Certificates = Certificates$1;
Organization.Projects = Projects;
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/admin/admin.mjs
var Admin = class extends APIResource {
	constructor() {
		super(...arguments);
		this.organization = new Organization(this._client);
	}
};
Admin.Organization = Organization;
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/internal/headers.mjs
const brand_privateNullableHeaders = /* @__PURE__ */ Symbol("brand.privateNullableHeaders");
function* iterateHeaders(headers) {
	if (!headers) return;
	if (brand_privateNullableHeaders in headers) {
		const { values, nulls } = headers;
		yield* values.entries();
		for (const name of nulls) yield [name, null];
		return;
	}
	let shouldClear = false;
	let iter;
	if (headers instanceof Headers) iter = headers.entries();
	else if (isReadonlyArray(headers)) iter = headers;
	else {
		shouldClear = true;
		iter = Object.entries(headers ?? {});
	}
	for (let row of iter) {
		const name = row[0];
		if (typeof name !== "string") throw new TypeError("expected header name to be a string");
		const values = isReadonlyArray(row[1]) ? row[1] : [row[1]];
		let didClear = false;
		for (const value of values) {
			if (value === void 0) continue;
			if (shouldClear && !didClear) {
				didClear = true;
				yield [name, null];
			}
			yield [name, value];
		}
	}
}
const buildHeaders = (newHeaders) => {
	const targetHeaders = new Headers();
	const nullHeaders = /* @__PURE__ */ new Set();
	for (const headers of newHeaders) {
		const seenHeaders = /* @__PURE__ */ new Set();
		for (const [name, value] of iterateHeaders(headers)) {
			const lowerName = name.toLowerCase();
			if (!seenHeaders.has(lowerName)) {
				targetHeaders.delete(name);
				seenHeaders.add(lowerName);
			}
			if (value === null) {
				targetHeaders.delete(name);
				nullHeaders.add(lowerName);
			} else {
				targetHeaders.append(name, value);
				nullHeaders.delete(lowerName);
			}
		}
	}
	return {
		[brand_privateNullableHeaders]: true,
		values: targetHeaders,
		nulls: nullHeaders
	};
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/audio/speech.mjs
/**
* Turn audio into text or text into audio.
*/
var Speech = class extends APIResource {
	/**
	* Generates audio from the input text.
	*
	* Returns the audio file content, or a stream of audio events.
	*
	* @example
	* ```ts
	* const speech = await client.audio.speech.create({
	*   input: 'input',
	*   model: 'tts-1',
	*   voice: 'alloy',
	* });
	*
	* const content = await speech.blob();
	* console.log(content);
	* ```
	*/
	create(body, options) {
		return this._client.post("/audio/speech", {
			body,
			...options,
			headers: buildHeaders([{ Accept: "application/octet-stream" }, options?.headers]),
			__security: { bearerAuth: true },
			__binaryResponse: true
		});
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/audio/transcriptions.mjs
/**
* Turn audio into text or text into audio.
*/
var Transcriptions = class extends APIResource {
	create(body, options) {
		return this._client.post("/audio/transcriptions", multipartFormRequestOptions({
			body,
			...options,
			stream: body.stream ?? false,
			__metadata: { model: body.model },
			__security: { bearerAuth: true }
		}, this._client));
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/audio/translations.mjs
/**
* Turn audio into text or text into audio.
*/
var Translations = class extends APIResource {
	create(body, options) {
		return this._client.post("/audio/translations", multipartFormRequestOptions({
			body,
			...options,
			__metadata: { model: body.model },
			__security: { bearerAuth: true }
		}, this._client));
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/audio/audio.mjs
var Audio = class extends APIResource {
	constructor() {
		super(...arguments);
		this.transcriptions = new Transcriptions(this._client);
		this.translations = new Translations(this._client);
		this.speech = new Speech(this._client);
	}
};
Audio.Transcriptions = Transcriptions;
Audio.Translations = Translations;
Audio.Speech = Speech;
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/batches.mjs
/**
* Create large batches of API requests to run asynchronously.
*/
var Batches = class extends APIResource {
	/**
	* Creates and executes a batch from an uploaded file of requests
	*/
	create(body, options) {
		return this._client.post("/batches", {
			body,
			...options,
			__security: { bearerAuth: true }
		});
	}
	/**
	* Retrieves a batch.
	*/
	retrieve(batchID, options) {
		return this._client.get(path`/batches/${batchID}`, {
			...options,
			__security: { bearerAuth: true }
		});
	}
	/**
	* List your organization's batches.
	*/
	list(query = {}, options) {
		return this._client.getAPIList("/batches", CursorPage, {
			query,
			...options,
			__security: { bearerAuth: true }
		});
	}
	/**
	* Cancels an in-progress batch. The batch will be in status `cancelling` for up to
	* 10 minutes, before changing to `cancelled`, where it will have partial results
	* (if any) available in the output file.
	*/
	cancel(batchID, options) {
		return this._client.post(path`/batches/${batchID}/cancel`, {
			...options,
			__security: { bearerAuth: true }
		});
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/beta/assistants.mjs
/**
* Build Assistants that can call models and use tools.
*/
var Assistants = class extends APIResource {
	/**
	* Create an assistant with a model and instructions.
	*
	* @deprecated
	*/
	create(body, options) {
		return this._client.post("/assistants", {
			body,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
			__security: { bearerAuth: true }
		});
	}
	/**
	* Retrieves an assistant.
	*
	* @deprecated
	*/
	retrieve(assistantID, options) {
		return this._client.get(path`/assistants/${assistantID}`, {
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
			__security: { bearerAuth: true }
		});
	}
	/**
	* Modifies an assistant.
	*
	* @deprecated
	*/
	update(assistantID, body, options) {
		return this._client.post(path`/assistants/${assistantID}`, {
			body,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
			__security: { bearerAuth: true }
		});
	}
	/**
	* Returns a list of assistants.
	*
	* @deprecated
	*/
	list(query = {}, options) {
		return this._client.getAPIList("/assistants", CursorPage, {
			query,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
			__security: { bearerAuth: true }
		});
	}
	/**
	* Delete an assistant.
	*
	* @deprecated
	*/
	delete(assistantID, options) {
		return this._client.delete(path`/assistants/${assistantID}`, {
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
			__security: { bearerAuth: true }
		});
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/beta/realtime/sessions.mjs
var Sessions$1 = class extends APIResource {
	/**
	* Create an ephemeral API token for use in client-side applications with the
	* Realtime API. Can be configured with the same session parameters as the
	* `session.update` client event.
	*
	* It responds with a session object, plus a `client_secret` key which contains a
	* usable ephemeral API token that can be used to authenticate browser clients for
	* the Realtime API.
	*
	* @example
	* ```ts
	* const session =
	*   await client.beta.realtime.sessions.create();
	* ```
	*/
	create(body, options) {
		return this._client.post("/realtime/sessions", {
			body,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
			__security: { bearerAuth: true }
		});
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/beta/realtime/transcription-sessions.mjs
var TranscriptionSessions = class extends APIResource {
	/**
	* Create an ephemeral API token for use in client-side applications with the
	* Realtime API specifically for realtime transcriptions. Can be configured with
	* the same session parameters as the `transcription_session.update` client event.
	*
	* It responds with a session object, plus a `client_secret` key which contains a
	* usable ephemeral API token that can be used to authenticate browser clients for
	* the Realtime API.
	*
	* @example
	* ```ts
	* const transcriptionSession =
	*   await client.beta.realtime.transcriptionSessions.create();
	* ```
	*/
	create(body, options) {
		return this._client.post("/realtime/transcription_sessions", {
			body,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
			__security: { bearerAuth: true }
		});
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/beta/realtime/realtime.mjs
/**
* @deprecated Realtime has now launched and is generally available. The old beta API is now deprecated.
*/
var Realtime$1 = class extends APIResource {
	constructor() {
		super(...arguments);
		this.sessions = new Sessions$1(this._client);
		this.transcriptionSessions = new TranscriptionSessions(this._client);
	}
};
Realtime$1.Sessions = Sessions$1;
Realtime$1.TranscriptionSessions = TranscriptionSessions;
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/beta/chatkit/sessions.mjs
var Sessions = class extends APIResource {
	/**
	* Create a ChatKit session.
	*
	* @example
	* ```ts
	* const chatSession =
	*   await client.beta.chatkit.sessions.create({
	*     user: 'x',
	*     workflow: { id: 'id' },
	*   });
	* ```
	*/
	create(body, options) {
		return this._client.post("/chatkit/sessions", {
			body,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "chatkit_beta=v1" }, options?.headers]),
			__security: { bearerAuth: true }
		});
	}
	/**
	* Cancel an active ChatKit session and return its most recent metadata.
	*
	* Cancelling prevents new requests from using the issued client secret.
	*
	* @example
	* ```ts
	* const chatSession =
	*   await client.beta.chatkit.sessions.cancel('cksess_123');
	* ```
	*/
	cancel(sessionID, options) {
		return this._client.post(path`/chatkit/sessions/${sessionID}/cancel`, {
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "chatkit_beta=v1" }, options?.headers]),
			__security: { bearerAuth: true }
		});
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/beta/chatkit/threads.mjs
var Threads$1 = class extends APIResource {
	/**
	* Retrieve a ChatKit thread by its identifier.
	*
	* @example
	* ```ts
	* const chatkitThread =
	*   await client.beta.chatkit.threads.retrieve('cthr_123');
	* ```
	*/
	retrieve(threadID, options) {
		return this._client.get(path`/chatkit/threads/${threadID}`, {
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "chatkit_beta=v1" }, options?.headers]),
			__security: { bearerAuth: true }
		});
	}
	/**
	* List ChatKit threads with optional pagination and user filters.
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const chatkitThread of client.beta.chatkit.threads.list()) {
	*   // ...
	* }
	* ```
	*/
	list(query = {}, options) {
		return this._client.getAPIList("/chatkit/threads", ConversationCursorPage, {
			query,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "chatkit_beta=v1" }, options?.headers]),
			__security: { bearerAuth: true }
		});
	}
	/**
	* Delete a ChatKit thread along with its items and stored attachments.
	*
	* @example
	* ```ts
	* const thread = await client.beta.chatkit.threads.delete(
	*   'cthr_123',
	* );
	* ```
	*/
	delete(threadID, options) {
		return this._client.delete(path`/chatkit/threads/${threadID}`, {
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "chatkit_beta=v1" }, options?.headers]),
			__security: { bearerAuth: true }
		});
	}
	/**
	* List items that belong to a ChatKit thread.
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const thread of client.beta.chatkit.threads.listItems(
	*   'cthr_123',
	* )) {
	*   // ...
	* }
	* ```
	*/
	listItems(threadID, query = {}, options) {
		return this._client.getAPIList(path`/chatkit/threads/${threadID}/items`, ConversationCursorPage, {
			query,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "chatkit_beta=v1" }, options?.headers]),
			__security: { bearerAuth: true }
		});
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/beta/chatkit/chatkit.mjs
var ChatKit = class extends APIResource {
	constructor() {
		super(...arguments);
		this.sessions = new Sessions(this._client);
		this.threads = new Threads$1(this._client);
	}
};
ChatKit.Sessions = Sessions;
ChatKit.Threads = Threads$1;
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/beta/threads/messages.mjs
/**
* Build Assistants that can call models and use tools.
*
* @deprecated The Assistants API is deprecated in favor of the Responses API
*/
var Messages = class extends APIResource {
	/**
	* Create a message.
	*
	* @deprecated The Assistants API is deprecated in favor of the Responses API
	*/
	create(threadID, body, options) {
		return this._client.post(path`/threads/${threadID}/messages`, {
			body,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
			__security: { bearerAuth: true }
		});
	}
	/**
	* Retrieve a message.
	*
	* @deprecated The Assistants API is deprecated in favor of the Responses API
	*/
	retrieve(messageID, params, options) {
		const { thread_id } = params;
		return this._client.get(path`/threads/${thread_id}/messages/${messageID}`, {
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
			__security: { bearerAuth: true }
		});
	}
	/**
	* Modifies a message.
	*
	* @deprecated The Assistants API is deprecated in favor of the Responses API
	*/
	update(messageID, params, options) {
		const { thread_id, ...body } = params;
		return this._client.post(path`/threads/${thread_id}/messages/${messageID}`, {
			body,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
			__security: { bearerAuth: true }
		});
	}
	/**
	* Returns a list of messages for a given thread.
	*
	* @deprecated The Assistants API is deprecated in favor of the Responses API
	*/
	list(threadID, query = {}, options) {
		return this._client.getAPIList(path`/threads/${threadID}/messages`, CursorPage, {
			query,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
			__security: { bearerAuth: true }
		});
	}
	/**
	* Deletes a message.
	*
	* @deprecated The Assistants API is deprecated in favor of the Responses API
	*/
	delete(messageID, params, options) {
		const { thread_id } = params;
		return this._client.delete(path`/threads/${thread_id}/messages/${messageID}`, {
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
			__security: { bearerAuth: true }
		});
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/beta/threads/runs/steps.mjs
/**
* Build Assistants that can call models and use tools.
*
* @deprecated The Assistants API is deprecated in favor of the Responses API
*/
var Steps = class extends APIResource {
	/**
	* Retrieves a run step.
	*
	* @deprecated The Assistants API is deprecated in favor of the Responses API
	*/
	retrieve(stepID, params, options) {
		const { thread_id, run_id, ...query } = params;
		return this._client.get(path`/threads/${thread_id}/runs/${run_id}/steps/${stepID}`, {
			query,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
			__security: { bearerAuth: true }
		});
	}
	/**
	* Returns a list of run steps belonging to a run.
	*
	* @deprecated The Assistants API is deprecated in favor of the Responses API
	*/
	list(runID, params, options) {
		const { thread_id, ...query } = params;
		return this._client.getAPIList(path`/threads/${thread_id}/runs/${runID}/steps`, CursorPage, {
			query,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
			__security: { bearerAuth: true }
		});
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/internal/utils/base64.mjs
/**
* Converts a Base64 encoded string to a Float32Array.
* @param base64Str - The Base64 encoded string.
* @returns An Array of numbers interpreted as Float32 values.
*/
const toFloat32Array = (base64Str) => {
	if (typeof Buffer !== "undefined") {
		const buf = Buffer.from(base64Str, "base64");
		return Array.from(new Float32Array(buf.buffer, buf.byteOffset, buf.length / Float32Array.BYTES_PER_ELEMENT));
	} else {
		const binaryStr = atob(base64Str);
		const len = binaryStr.length;
		const bytes = new Uint8Array(len);
		for (let i = 0; i < len; i++) bytes[i] = binaryStr.charCodeAt(i);
		return Array.from(new Float32Array(bytes.buffer));
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/internal/utils/env.mjs
/**
* Read an environment variable.
*
* Trims beginning and trailing whitespace.
*
* Will return undefined if the environment variable doesn't exist or cannot be accessed.
*/
const readEnv = (env) => {
	if (typeof globalThis.process !== "undefined") return globalThis.process.env?.[env]?.trim() || void 0;
	if (typeof globalThis.Deno !== "undefined") return globalThis.Deno.env?.get?.(env)?.trim() || void 0;
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/lib/AssistantStream.mjs
var _AssistantStream_instances, _a$1, _AssistantStream_events, _AssistantStream_runStepSnapshots, _AssistantStream_messageSnapshots, _AssistantStream_messageSnapshot, _AssistantStream_finalRun, _AssistantStream_currentContentIndex, _AssistantStream_currentContent, _AssistantStream_currentToolCallIndex, _AssistantStream_currentToolCall, _AssistantStream_currentEvent, _AssistantStream_currentRunSnapshot, _AssistantStream_currentRunStepSnapshot, _AssistantStream_addEvent, _AssistantStream_endRequest, _AssistantStream_handleMessage, _AssistantStream_handleRunStep, _AssistantStream_handleEvent, _AssistantStream_accumulateRunStep, _AssistantStream_accumulateMessage, _AssistantStream_accumulateContent, _AssistantStream_handleRun;
var AssistantStream = class extends EventStream {
	constructor() {
		super(...arguments);
		_AssistantStream_instances.add(this);
		_AssistantStream_events.set(this, []);
		_AssistantStream_runStepSnapshots.set(this, {});
		_AssistantStream_messageSnapshots.set(this, {});
		_AssistantStream_messageSnapshot.set(this, void 0);
		_AssistantStream_finalRun.set(this, void 0);
		_AssistantStream_currentContentIndex.set(this, void 0);
		_AssistantStream_currentContent.set(this, void 0);
		_AssistantStream_currentToolCallIndex.set(this, void 0);
		_AssistantStream_currentToolCall.set(this, void 0);
		_AssistantStream_currentEvent.set(this, void 0);
		_AssistantStream_currentRunSnapshot.set(this, void 0);
		_AssistantStream_currentRunStepSnapshot.set(this, void 0);
	}
	[(_AssistantStream_events = /* @__PURE__ */ new WeakMap(), _AssistantStream_runStepSnapshots = /* @__PURE__ */ new WeakMap(), _AssistantStream_messageSnapshots = /* @__PURE__ */ new WeakMap(), _AssistantStream_messageSnapshot = /* @__PURE__ */ new WeakMap(), _AssistantStream_finalRun = /* @__PURE__ */ new WeakMap(), _AssistantStream_currentContentIndex = /* @__PURE__ */ new WeakMap(), _AssistantStream_currentContent = /* @__PURE__ */ new WeakMap(), _AssistantStream_currentToolCallIndex = /* @__PURE__ */ new WeakMap(), _AssistantStream_currentToolCall = /* @__PURE__ */ new WeakMap(), _AssistantStream_currentEvent = /* @__PURE__ */ new WeakMap(), _AssistantStream_currentRunSnapshot = /* @__PURE__ */ new WeakMap(), _AssistantStream_currentRunStepSnapshot = /* @__PURE__ */ new WeakMap(), _AssistantStream_instances = /* @__PURE__ */ new WeakSet(), Symbol.asyncIterator)]() {
		const pushQueue = [];
		const readQueue = [];
		let done = false;
		this.on("event", (event) => {
			const reader = readQueue.shift();
			if (reader) reader.resolve(event);
			else pushQueue.push(event);
		});
		this.on("end", () => {
			done = true;
			for (const reader of readQueue) reader.resolve(void 0);
			readQueue.length = 0;
		});
		this.on("abort", (err) => {
			done = true;
			for (const reader of readQueue) reader.reject(err);
			readQueue.length = 0;
		});
		this.on("error", (err) => {
			done = true;
			for (const reader of readQueue) reader.reject(err);
			readQueue.length = 0;
		});
		return {
			next: async () => {
				if (!pushQueue.length) {
					if (done) return {
						value: void 0,
						done: true
					};
					return new Promise((resolve, reject) => readQueue.push({
						resolve,
						reject
					})).then((chunk) => chunk ? {
						value: chunk,
						done: false
					} : {
						value: void 0,
						done: true
					});
				}
				return {
					value: pushQueue.shift(),
					done: false
				};
			},
			return: async () => {
				this.abort();
				return {
					value: void 0,
					done: true
				};
			}
		};
	}
	static fromReadableStream(stream) {
		const runner = new _a$1();
		runner._run(() => runner._fromReadableStream(stream));
		return runner;
	}
	async _fromReadableStream(readableStream, options) {
		const signal = options?.signal;
		if (signal) {
			if (signal.aborted) this.controller.abort();
			signal.addEventListener("abort", () => this.controller.abort());
		}
		this._connected();
		const stream = Stream.fromReadableStream(readableStream, this.controller);
		for await (const event of stream) __classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_addEvent).call(this, event);
		if (stream.controller.signal?.aborted) throw new APIUserAbortError();
		return this._addRun(__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_endRequest).call(this));
	}
	toReadableStream() {
		return new Stream(this[Symbol.asyncIterator].bind(this), this.controller).toReadableStream();
	}
	static createToolAssistantStream(runId, runs, params, options) {
		const runner = new _a$1();
		runner._run(() => runner._runToolAssistantStream(runId, runs, params, {
			...options,
			headers: {
				...options?.headers,
				"X-Stainless-Helper-Method": "stream"
			}
		}));
		return runner;
	}
	async _createToolAssistantStream(run, runId, params, options) {
		const signal = options?.signal;
		if (signal) {
			if (signal.aborted) this.controller.abort();
			signal.addEventListener("abort", () => this.controller.abort());
		}
		const body = {
			...params,
			stream: true
		};
		const stream = await run.submitToolOutputs(runId, body, {
			...options,
			signal: this.controller.signal
		});
		this._connected();
		for await (const event of stream) __classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_addEvent).call(this, event);
		if (stream.controller.signal?.aborted) throw new APIUserAbortError();
		return this._addRun(__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_endRequest).call(this));
	}
	static createThreadAssistantStream(params, thread, options) {
		const runner = new _a$1();
		runner._run(() => runner._threadAssistantStream(params, thread, {
			...options,
			headers: {
				...options?.headers,
				"X-Stainless-Helper-Method": "stream"
			}
		}));
		return runner;
	}
	static createAssistantStream(threadId, runs, params, options) {
		const runner = new _a$1();
		runner._run(() => runner._runAssistantStream(threadId, runs, params, {
			...options,
			headers: {
				...options?.headers,
				"X-Stainless-Helper-Method": "stream"
			}
		}));
		return runner;
	}
	currentEvent() {
		return __classPrivateFieldGet(this, _AssistantStream_currentEvent, "f");
	}
	currentRun() {
		return __classPrivateFieldGet(this, _AssistantStream_currentRunSnapshot, "f");
	}
	currentMessageSnapshot() {
		return __classPrivateFieldGet(this, _AssistantStream_messageSnapshot, "f");
	}
	currentRunStepSnapshot() {
		return __classPrivateFieldGet(this, _AssistantStream_currentRunStepSnapshot, "f");
	}
	async finalRunSteps() {
		await this.done();
		return Object.values(__classPrivateFieldGet(this, _AssistantStream_runStepSnapshots, "f"));
	}
	async finalMessages() {
		await this.done();
		return Object.values(__classPrivateFieldGet(this, _AssistantStream_messageSnapshots, "f"));
	}
	async finalRun() {
		await this.done();
		if (!__classPrivateFieldGet(this, _AssistantStream_finalRun, "f")) throw Error("Final run was not received.");
		return __classPrivateFieldGet(this, _AssistantStream_finalRun, "f");
	}
	async _createThreadAssistantStream(thread, params, options) {
		const signal = options?.signal;
		if (signal) {
			if (signal.aborted) this.controller.abort();
			signal.addEventListener("abort", () => this.controller.abort());
		}
		const body = {
			...params,
			stream: true
		};
		const stream = await thread.createAndRun(body, {
			...options,
			signal: this.controller.signal
		});
		this._connected();
		for await (const event of stream) __classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_addEvent).call(this, event);
		if (stream.controller.signal?.aborted) throw new APIUserAbortError();
		return this._addRun(__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_endRequest).call(this));
	}
	async _createAssistantStream(run, threadId, params, options) {
		const signal = options?.signal;
		if (signal) {
			if (signal.aborted) this.controller.abort();
			signal.addEventListener("abort", () => this.controller.abort());
		}
		const body = {
			...params,
			stream: true
		};
		const stream = await run.create(threadId, body, {
			...options,
			signal: this.controller.signal
		});
		this._connected();
		for await (const event of stream) __classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_addEvent).call(this, event);
		if (stream.controller.signal?.aborted) throw new APIUserAbortError();
		return this._addRun(__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_endRequest).call(this));
	}
	static accumulateDelta(acc, delta) {
		for (const [key, deltaValue] of Object.entries(delta)) {
			if (!acc.hasOwnProperty(key)) {
				acc[key] = deltaValue;
				continue;
			}
			let accValue = acc[key];
			if (accValue === null || accValue === void 0) {
				acc[key] = deltaValue;
				continue;
			}
			if (key === "index" || key === "type") {
				acc[key] = deltaValue;
				continue;
			}
			if (typeof accValue === "string" && typeof deltaValue === "string") accValue += deltaValue;
			else if (typeof accValue === "number" && typeof deltaValue === "number") accValue += deltaValue;
			else if (isObj(accValue) && isObj(deltaValue)) accValue = this.accumulateDelta(accValue, deltaValue);
			else if (Array.isArray(accValue) && Array.isArray(deltaValue)) {
				if (accValue.every((x) => typeof x === "string" || typeof x === "number")) {
					accValue.push(...deltaValue);
					continue;
				}
				for (const deltaEntry of deltaValue) {
					if (!isObj(deltaEntry)) throw new Error(`Expected array delta entry to be an object but got: ${deltaEntry}`);
					const index = deltaEntry["index"];
					if (index == null) {
						console.error(deltaEntry);
						throw new Error("Expected array delta entry to have an `index` property");
					}
					if (typeof index !== "number") throw new Error(`Expected array delta entry \`index\` property to be a number but got ${index}`);
					const accEntry = accValue[index];
					if (accEntry == null) accValue.push(deltaEntry);
					else accValue[index] = this.accumulateDelta(accEntry, deltaEntry);
				}
				continue;
			} else throw Error(`Unhandled record type: ${key}, deltaValue: ${deltaValue}, accValue: ${accValue}`);
			acc[key] = accValue;
		}
		return acc;
	}
	_addRun(run) {
		return run;
	}
	async _threadAssistantStream(params, thread, options) {
		return await this._createThreadAssistantStream(thread, params, options);
	}
	async _runAssistantStream(threadId, runs, params, options) {
		return await this._createAssistantStream(runs, threadId, params, options);
	}
	async _runToolAssistantStream(runId, runs, params, options) {
		return await this._createToolAssistantStream(runs, runId, params, options);
	}
};
_a$1 = AssistantStream, _AssistantStream_addEvent = function _AssistantStream_addEvent(event) {
	if (this.ended) return;
	__classPrivateFieldSet(this, _AssistantStream_currentEvent, event, "f");
	__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_handleEvent).call(this, event);
	switch (event.event) {
		case "thread.created": break;
		case "thread.run.created":
		case "thread.run.queued":
		case "thread.run.in_progress":
		case "thread.run.requires_action":
		case "thread.run.completed":
		case "thread.run.incomplete":
		case "thread.run.failed":
		case "thread.run.cancelling":
		case "thread.run.cancelled":
		case "thread.run.expired":
			__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_handleRun).call(this, event);
			break;
		case "thread.run.step.created":
		case "thread.run.step.in_progress":
		case "thread.run.step.delta":
		case "thread.run.step.completed":
		case "thread.run.step.failed":
		case "thread.run.step.cancelled":
		case "thread.run.step.expired":
			__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_handleRunStep).call(this, event);
			break;
		case "thread.message.created":
		case "thread.message.in_progress":
		case "thread.message.delta":
		case "thread.message.completed":
		case "thread.message.incomplete":
			__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_handleMessage).call(this, event);
			break;
		case "error": throw new Error("Encountered an error event in event processing - errors should be processed earlier");
		default: assertNever(event);
	}
}, _AssistantStream_endRequest = function _AssistantStream_endRequest() {
	if (this.ended) throw new OpenAIError(`stream has ended, this shouldn't happen`);
	if (!__classPrivateFieldGet(this, _AssistantStream_finalRun, "f")) throw Error("Final run has not been received");
	return __classPrivateFieldGet(this, _AssistantStream_finalRun, "f");
}, _AssistantStream_handleMessage = function _AssistantStream_handleMessage(event) {
	const [accumulatedMessage, newContent] = __classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_accumulateMessage).call(this, event, __classPrivateFieldGet(this, _AssistantStream_messageSnapshot, "f"));
	__classPrivateFieldSet(this, _AssistantStream_messageSnapshot, accumulatedMessage, "f");
	__classPrivateFieldGet(this, _AssistantStream_messageSnapshots, "f")[accumulatedMessage.id] = accumulatedMessage;
	for (const content of newContent) {
		const snapshotContent = accumulatedMessage.content[content.index];
		if (snapshotContent?.type == "text") this._emit("textCreated", snapshotContent.text);
	}
	switch (event.event) {
		case "thread.message.created":
			this._emit("messageCreated", event.data);
			break;
		case "thread.message.in_progress": break;
		case "thread.message.delta":
			this._emit("messageDelta", event.data.delta, accumulatedMessage);
			if (event.data.delta.content) for (const content of event.data.delta.content) {
				if (content.type == "text" && content.text) {
					let textDelta = content.text;
					let snapshot = accumulatedMessage.content[content.index];
					if (snapshot && snapshot.type == "text") this._emit("textDelta", textDelta, snapshot.text);
					else throw Error("The snapshot associated with this text delta is not text or missing");
				}
				if (content.index != __classPrivateFieldGet(this, _AssistantStream_currentContentIndex, "f")) {
					if (__classPrivateFieldGet(this, _AssistantStream_currentContent, "f")) switch (__classPrivateFieldGet(this, _AssistantStream_currentContent, "f").type) {
						case "text":
							this._emit("textDone", __classPrivateFieldGet(this, _AssistantStream_currentContent, "f").text, __classPrivateFieldGet(this, _AssistantStream_messageSnapshot, "f"));
							break;
						case "image_file":
							this._emit("imageFileDone", __classPrivateFieldGet(this, _AssistantStream_currentContent, "f").image_file, __classPrivateFieldGet(this, _AssistantStream_messageSnapshot, "f"));
							break;
					}
					__classPrivateFieldSet(this, _AssistantStream_currentContentIndex, content.index, "f");
				}
				__classPrivateFieldSet(this, _AssistantStream_currentContent, accumulatedMessage.content[content.index], "f");
			}
			break;
		case "thread.message.completed":
		case "thread.message.incomplete":
			if (__classPrivateFieldGet(this, _AssistantStream_currentContentIndex, "f") !== void 0) {
				const currentContent = event.data.content[__classPrivateFieldGet(this, _AssistantStream_currentContentIndex, "f")];
				if (currentContent) switch (currentContent.type) {
					case "image_file":
						this._emit("imageFileDone", currentContent.image_file, __classPrivateFieldGet(this, _AssistantStream_messageSnapshot, "f"));
						break;
					case "text":
						this._emit("textDone", currentContent.text, __classPrivateFieldGet(this, _AssistantStream_messageSnapshot, "f"));
						break;
				}
			}
			if (__classPrivateFieldGet(this, _AssistantStream_messageSnapshot, "f")) this._emit("messageDone", event.data);
			__classPrivateFieldSet(this, _AssistantStream_messageSnapshot, void 0, "f");
	}
}, _AssistantStream_handleRunStep = function _AssistantStream_handleRunStep(event) {
	const accumulatedRunStep = __classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_accumulateRunStep).call(this, event);
	__classPrivateFieldSet(this, _AssistantStream_currentRunStepSnapshot, accumulatedRunStep, "f");
	switch (event.event) {
		case "thread.run.step.created":
			this._emit("runStepCreated", event.data);
			break;
		case "thread.run.step.delta":
			const delta = event.data.delta;
			if (delta.step_details && delta.step_details.type == "tool_calls" && delta.step_details.tool_calls && accumulatedRunStep.step_details.type == "tool_calls") for (const toolCall of delta.step_details.tool_calls) if (toolCall.index == __classPrivateFieldGet(this, _AssistantStream_currentToolCallIndex, "f")) this._emit("toolCallDelta", toolCall, accumulatedRunStep.step_details.tool_calls[toolCall.index]);
			else {
				if (__classPrivateFieldGet(this, _AssistantStream_currentToolCall, "f")) this._emit("toolCallDone", __classPrivateFieldGet(this, _AssistantStream_currentToolCall, "f"));
				__classPrivateFieldSet(this, _AssistantStream_currentToolCallIndex, toolCall.index, "f");
				__classPrivateFieldSet(this, _AssistantStream_currentToolCall, accumulatedRunStep.step_details.tool_calls[toolCall.index], "f");
				if (__classPrivateFieldGet(this, _AssistantStream_currentToolCall, "f")) this._emit("toolCallCreated", __classPrivateFieldGet(this, _AssistantStream_currentToolCall, "f"));
			}
			this._emit("runStepDelta", event.data.delta, accumulatedRunStep);
			break;
		case "thread.run.step.completed":
		case "thread.run.step.failed":
		case "thread.run.step.cancelled":
		case "thread.run.step.expired":
			__classPrivateFieldSet(this, _AssistantStream_currentRunStepSnapshot, void 0, "f");
			if (event.data.step_details.type == "tool_calls") {
				if (__classPrivateFieldGet(this, _AssistantStream_currentToolCall, "f")) {
					this._emit("toolCallDone", __classPrivateFieldGet(this, _AssistantStream_currentToolCall, "f"));
					__classPrivateFieldSet(this, _AssistantStream_currentToolCall, void 0, "f");
				}
			}
			this._emit("runStepDone", event.data, accumulatedRunStep);
			break;
		case "thread.run.step.in_progress": break;
	}
}, _AssistantStream_handleEvent = function _AssistantStream_handleEvent(event) {
	__classPrivateFieldGet(this, _AssistantStream_events, "f").push(event);
	this._emit("event", event);
}, _AssistantStream_accumulateRunStep = function _AssistantStream_accumulateRunStep(event) {
	switch (event.event) {
		case "thread.run.step.created":
			__classPrivateFieldGet(this, _AssistantStream_runStepSnapshots, "f")[event.data.id] = event.data;
			return event.data;
		case "thread.run.step.delta":
			let snapshot = __classPrivateFieldGet(this, _AssistantStream_runStepSnapshots, "f")[event.data.id];
			if (!snapshot) throw Error("Received a RunStepDelta before creation of a snapshot");
			let data = event.data;
			if (data.delta) {
				const accumulated = _a$1.accumulateDelta(snapshot, data.delta);
				__classPrivateFieldGet(this, _AssistantStream_runStepSnapshots, "f")[event.data.id] = accumulated;
			}
			return __classPrivateFieldGet(this, _AssistantStream_runStepSnapshots, "f")[event.data.id];
		case "thread.run.step.completed":
		case "thread.run.step.failed":
		case "thread.run.step.cancelled":
		case "thread.run.step.expired":
		case "thread.run.step.in_progress":
			__classPrivateFieldGet(this, _AssistantStream_runStepSnapshots, "f")[event.data.id] = event.data;
			break;
	}
	if (__classPrivateFieldGet(this, _AssistantStream_runStepSnapshots, "f")[event.data.id]) return __classPrivateFieldGet(this, _AssistantStream_runStepSnapshots, "f")[event.data.id];
	throw new Error("No snapshot available");
}, _AssistantStream_accumulateMessage = function _AssistantStream_accumulateMessage(event, snapshot) {
	let newContent = [];
	switch (event.event) {
		case "thread.message.created": return [event.data, newContent];
		case "thread.message.delta":
			if (!snapshot) throw Error("Received a delta with no existing snapshot (there should be one from message creation)");
			let data = event.data;
			if (data.delta.content) for (const contentElement of data.delta.content) if (contentElement.index in snapshot.content) {
				let currentContent = snapshot.content[contentElement.index];
				snapshot.content[contentElement.index] = __classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_accumulateContent).call(this, contentElement, currentContent);
			} else {
				snapshot.content[contentElement.index] = contentElement;
				newContent.push(contentElement);
			}
			return [snapshot, newContent];
		case "thread.message.in_progress":
		case "thread.message.completed":
		case "thread.message.incomplete": if (snapshot) return [snapshot, newContent];
		else throw Error("Received thread message event with no existing snapshot");
	}
	throw Error("Tried to accumulate a non-message event");
}, _AssistantStream_accumulateContent = function _AssistantStream_accumulateContent(contentElement, currentContent) {
	return _a$1.accumulateDelta(currentContent, contentElement);
}, _AssistantStream_handleRun = function _AssistantStream_handleRun(event) {
	__classPrivateFieldSet(this, _AssistantStream_currentRunSnapshot, event.data, "f");
	switch (event.event) {
		case "thread.run.created": break;
		case "thread.run.queued": break;
		case "thread.run.in_progress": break;
		case "thread.run.requires_action":
		case "thread.run.cancelled":
		case "thread.run.failed":
		case "thread.run.completed":
		case "thread.run.expired":
		case "thread.run.incomplete":
			__classPrivateFieldSet(this, _AssistantStream_finalRun, event.data, "f");
			if (__classPrivateFieldGet(this, _AssistantStream_currentToolCall, "f")) {
				this._emit("toolCallDone", __classPrivateFieldGet(this, _AssistantStream_currentToolCall, "f"));
				__classPrivateFieldSet(this, _AssistantStream_currentToolCall, void 0, "f");
			}
			break;
		case "thread.run.cancelling": break;
	}
};
function assertNever(_x) {}
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/beta/threads/runs/runs.mjs
/**
* Build Assistants that can call models and use tools.
*
* @deprecated The Assistants API is deprecated in favor of the Responses API
*/
var Runs$1 = class extends APIResource {
	constructor() {
		super(...arguments);
		this.steps = new Steps(this._client);
	}
	create(threadID, params, options) {
		const { include, ...body } = params;
		return this._client.post(path`/threads/${threadID}/runs`, {
			query: { include },
			body,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
			stream: params.stream ?? false,
			__synthesizeEventData: true,
			__security: { bearerAuth: true }
		});
	}
	/**
	* Retrieves a run.
	*
	* @deprecated The Assistants API is deprecated in favor of the Responses API
	*/
	retrieve(runID, params, options) {
		const { thread_id } = params;
		return this._client.get(path`/threads/${thread_id}/runs/${runID}`, {
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
			__security: { bearerAuth: true }
		});
	}
	/**
	* Modifies a run.
	*
	* @deprecated The Assistants API is deprecated in favor of the Responses API
	*/
	update(runID, params, options) {
		const { thread_id, ...body } = params;
		return this._client.post(path`/threads/${thread_id}/runs/${runID}`, {
			body,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
			__security: { bearerAuth: true }
		});
	}
	/**
	* Returns a list of runs belonging to a thread.
	*
	* @deprecated The Assistants API is deprecated in favor of the Responses API
	*/
	list(threadID, query = {}, options) {
		return this._client.getAPIList(path`/threads/${threadID}/runs`, CursorPage, {
			query,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
			__security: { bearerAuth: true }
		});
	}
	/**
	* Cancels a run that is `in_progress`.
	*
	* @deprecated The Assistants API is deprecated in favor of the Responses API
	*/
	cancel(runID, params, options) {
		const { thread_id } = params;
		return this._client.post(path`/threads/${thread_id}/runs/${runID}/cancel`, {
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
			__security: { bearerAuth: true }
		});
	}
	/**
	* A helper to create a run an poll for a terminal state. More information on Run
	* lifecycles can be found here:
	* https://platform.openai.com/docs/assistants/how-it-works/runs-and-run-steps
	*/
	async createAndPoll(threadId, body, options) {
		const run = await this.create(threadId, body, options);
		return await this.poll(run.id, { thread_id: threadId }, options);
	}
	/**
	* Create a Run stream
	*
	* @deprecated use `stream` instead
	*/
	createAndStream(threadId, body, options) {
		return AssistantStream.createAssistantStream(threadId, this._client.beta.threads.runs, body, options);
	}
	/**
	* A helper to poll a run status until it reaches a terminal state. More
	* information on Run lifecycles can be found here:
	* https://platform.openai.com/docs/assistants/how-it-works/runs-and-run-steps
	*/
	async poll(runId, params, options) {
		const headers = buildHeaders([options?.headers, {
			"X-Stainless-Poll-Helper": "true",
			"X-Stainless-Custom-Poll-Interval": options?.pollIntervalMs?.toString() ?? void 0
		}]);
		while (true) {
			const { data: run, response } = await this.retrieve(runId, params, {
				...options,
				headers: {
					...options?.headers,
					...headers
				}
			}).withResponse();
			switch (run.status) {
				case "queued":
				case "in_progress":
				case "cancelling":
					let sleepInterval = 5e3;
					if (options?.pollIntervalMs) sleepInterval = options.pollIntervalMs;
					else {
						const headerInterval = response.headers.get("openai-poll-after-ms");
						if (headerInterval) {
							const headerIntervalMs = parseInt(headerInterval);
							if (!isNaN(headerIntervalMs)) sleepInterval = headerIntervalMs;
						}
					}
					await sleep(sleepInterval);
					break;
				case "requires_action":
				case "incomplete":
				case "cancelled":
				case "completed":
				case "failed":
				case "expired": return run;
			}
		}
	}
	/**
	* Create a Run stream
	*/
	stream(threadId, body, options) {
		return AssistantStream.createAssistantStream(threadId, this._client.beta.threads.runs, body, options);
	}
	submitToolOutputs(runID, params, options) {
		const { thread_id, ...body } = params;
		return this._client.post(path`/threads/${thread_id}/runs/${runID}/submit_tool_outputs`, {
			body,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
			stream: params.stream ?? false,
			__synthesizeEventData: true,
			__security: { bearerAuth: true }
		});
	}
	/**
	* A helper to submit a tool output to a run and poll for a terminal run state.
	* More information on Run lifecycles can be found here:
	* https://platform.openai.com/docs/assistants/how-it-works/runs-and-run-steps
	*/
	async submitToolOutputsAndPoll(runId, params, options) {
		const run = await this.submitToolOutputs(runId, params, options);
		return await this.poll(run.id, params, options);
	}
	/**
	* Submit the tool outputs from a previous run and stream the run to a terminal
	* state. More information on Run lifecycles can be found here:
	* https://platform.openai.com/docs/assistants/how-it-works/runs-and-run-steps
	*/
	submitToolOutputsStream(runId, params, options) {
		return AssistantStream.createToolAssistantStream(runId, this._client.beta.threads.runs, params, options);
	}
};
Runs$1.Steps = Steps;
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/beta/threads/threads.mjs
/**
* Build Assistants that can call models and use tools.
*
* @deprecated The Assistants API is deprecated in favor of the Responses API
*/
var Threads = class extends APIResource {
	constructor() {
		super(...arguments);
		this.runs = new Runs$1(this._client);
		this.messages = new Messages(this._client);
	}
	/**
	* Create a thread.
	*
	* @deprecated The Assistants API is deprecated in favor of the Responses API
	*/
	create(body = {}, options) {
		return this._client.post("/threads", {
			body,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
			__security: { bearerAuth: true }
		});
	}
	/**
	* Retrieves a thread.
	*
	* @deprecated The Assistants API is deprecated in favor of the Responses API
	*/
	retrieve(threadID, options) {
		return this._client.get(path`/threads/${threadID}`, {
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
			__security: { bearerAuth: true }
		});
	}
	/**
	* Modifies a thread.
	*
	* @deprecated The Assistants API is deprecated in favor of the Responses API
	*/
	update(threadID, body, options) {
		return this._client.post(path`/threads/${threadID}`, {
			body,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
			__security: { bearerAuth: true }
		});
	}
	/**
	* Delete a thread.
	*
	* @deprecated The Assistants API is deprecated in favor of the Responses API
	*/
	delete(threadID, options) {
		return this._client.delete(path`/threads/${threadID}`, {
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
			__security: { bearerAuth: true }
		});
	}
	createAndRun(body, options) {
		return this._client.post("/threads/runs", {
			body,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
			stream: body.stream ?? false,
			__synthesizeEventData: true,
			__security: { bearerAuth: true }
		});
	}
	/**
	* A helper to create a thread, start a run and then poll for a terminal state.
	* More information on Run lifecycles can be found here:
	* https://platform.openai.com/docs/assistants/how-it-works/runs-and-run-steps
	*/
	async createAndRunPoll(body, options) {
		const run = await this.createAndRun(body, options);
		return await this.runs.poll(run.id, { thread_id: run.thread_id }, options);
	}
	/**
	* Create a thread and stream the run back
	*/
	createAndRunStream(body, options) {
		return AssistantStream.createThreadAssistantStream(body, this._client.beta.threads, options);
	}
};
Threads.Runs = Runs$1;
Threads.Messages = Messages;
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/beta/beta.mjs
var Beta = class extends APIResource {
	constructor() {
		super(...arguments);
		this.realtime = new Realtime$1(this._client);
		this.chatkit = new ChatKit(this._client);
		this.assistants = new Assistants(this._client);
		this.threads = new Threads(this._client);
	}
};
Beta.Realtime = Realtime$1;
Beta.ChatKit = ChatKit;
Beta.Assistants = Assistants;
Beta.Threads = Threads;
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/completions.mjs
/**
* Given a prompt, the model will return one or more predicted completions, and can also return the probabilities of alternative tokens at each position.
*/
var Completions = class extends APIResource {
	create(body, options) {
		return this._client.post("/completions", {
			body,
			...options,
			stream: body.stream ?? false,
			__security: { bearerAuth: true }
		});
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/containers/files/content.mjs
var Content$2 = class extends APIResource {
	/**
	* Retrieve Container File Content
	*/
	retrieve(fileID, params, options) {
		const { container_id } = params;
		return this._client.get(path`/containers/${container_id}/files/${fileID}/content`, {
			...options,
			headers: buildHeaders([{ Accept: "application/binary" }, options?.headers]),
			__security: { bearerAuth: true },
			__binaryResponse: true
		});
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/containers/files/files.mjs
var Files$2 = class extends APIResource {
	constructor() {
		super(...arguments);
		this.content = new Content$2(this._client);
	}
	/**
	* Create a Container File
	*
	* You can send either a multipart/form-data request with the raw file content, or
	* a JSON request with a file ID.
	*/
	create(containerID, body, options) {
		return this._client.post(path`/containers/${containerID}/files`, maybeMultipartFormRequestOptions({
			body,
			...options,
			__security: { bearerAuth: true }
		}, this._client));
	}
	/**
	* Retrieve Container File
	*/
	retrieve(fileID, params, options) {
		const { container_id } = params;
		return this._client.get(path`/containers/${container_id}/files/${fileID}`, {
			...options,
			__security: { bearerAuth: true }
		});
	}
	/**
	* List Container files
	*/
	list(containerID, query = {}, options) {
		return this._client.getAPIList(path`/containers/${containerID}/files`, CursorPage, {
			query,
			...options,
			__security: { bearerAuth: true }
		});
	}
	/**
	* Delete Container File
	*/
	delete(fileID, params, options) {
		const { container_id } = params;
		return this._client.delete(path`/containers/${container_id}/files/${fileID}`, {
			...options,
			headers: buildHeaders([{ Accept: "*/*" }, options?.headers]),
			__security: { bearerAuth: true }
		});
	}
};
Files$2.Content = Content$2;
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/containers/containers.mjs
var Containers = class extends APIResource {
	constructor() {
		super(...arguments);
		this.files = new Files$2(this._client);
	}
	/**
	* Create Container
	*/
	create(body, options) {
		return this._client.post("/containers", {
			body,
			...options,
			__security: { bearerAuth: true }
		});
	}
	/**
	* Retrieve Container
	*/
	retrieve(containerID, options) {
		return this._client.get(path`/containers/${containerID}`, {
			...options,
			__security: { bearerAuth: true }
		});
	}
	/**
	* List Containers
	*/
	list(query = {}, options) {
		return this._client.getAPIList("/containers", CursorPage, {
			query,
			...options,
			__security: { bearerAuth: true }
		});
	}
	/**
	* Delete Container
	*/
	delete(containerID, options) {
		return this._client.delete(path`/containers/${containerID}`, {
			...options,
			headers: buildHeaders([{ Accept: "*/*" }, options?.headers]),
			__security: { bearerAuth: true }
		});
	}
};
Containers.Files = Files$2;
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/conversations/items.mjs
/**
* Manage conversations and conversation items.
*/
var Items = class extends APIResource {
	/**
	* Create items in a conversation with the given ID.
	*/
	create(conversationID, params, options) {
		const { include, ...body } = params;
		return this._client.post(path`/conversations/${conversationID}/items`, {
			query: { include },
			body,
			...options,
			__security: { bearerAuth: true }
		});
	}
	/**
	* Get a single item from a conversation with the given IDs.
	*/
	retrieve(itemID, params, options) {
		const { conversation_id, ...query } = params;
		return this._client.get(path`/conversations/${conversation_id}/items/${itemID}`, {
			query,
			...options,
			__security: { bearerAuth: true }
		});
	}
	/**
	* List all items for a conversation with the given ID.
	*/
	list(conversationID, query = {}, options) {
		return this._client.getAPIList(path`/conversations/${conversationID}/items`, ConversationCursorPage, {
			query,
			...options,
			__security: { bearerAuth: true }
		});
	}
	/**
	* Delete an item from a conversation with the given IDs.
	*/
	delete(itemID, params, options) {
		const { conversation_id } = params;
		return this._client.delete(path`/conversations/${conversation_id}/items/${itemID}`, {
			...options,
			__security: { bearerAuth: true }
		});
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/conversations/conversations.mjs
/**
* Manage conversations and conversation items.
*/
var Conversations = class extends APIResource {
	constructor() {
		super(...arguments);
		this.items = new Items(this._client);
	}
	/**
	* Create a conversation.
	*/
	create(body = {}, options) {
		return this._client.post("/conversations", {
			body,
			...options,
			__security: { bearerAuth: true }
		});
	}
	/**
	* Get a conversation
	*/
	retrieve(conversationID, options) {
		return this._client.get(path`/conversations/${conversationID}`, {
			...options,
			__security: { bearerAuth: true }
		});
	}
	/**
	* Update a conversation
	*/
	update(conversationID, body, options) {
		return this._client.post(path`/conversations/${conversationID}`, {
			body,
			...options,
			__security: { bearerAuth: true }
		});
	}
	/**
	* Delete a conversation. Items in the conversation will not be deleted.
	*/
	delete(conversationID, options) {
		return this._client.delete(path`/conversations/${conversationID}`, {
			...options,
			__security: { bearerAuth: true }
		});
	}
};
Conversations.Items = Items;
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/embeddings.mjs
/**
* Get a vector representation of a given input that can be easily consumed by machine learning models and algorithms.
*/
var Embeddings = class extends APIResource {
	/**
	* Creates an embedding vector representing the input text.
	*
	* @example
	* ```ts
	* const createEmbeddingResponse =
	*   await client.embeddings.create({
	*     input: 'The quick brown fox jumped over the lazy dog',
	*     model: 'text-embedding-3-small',
	*   });
	* ```
	*/
	create(body, options) {
		const hasUserProvidedEncodingFormat = !!body.encoding_format;
		let encoding_format = hasUserProvidedEncodingFormat ? body.encoding_format : "base64";
		if (hasUserProvidedEncodingFormat) loggerFor(this._client).debug("embeddings/user defined encoding_format:", body.encoding_format);
		const response = this._client.post("/embeddings", {
			body: {
				...body,
				encoding_format
			},
			...options,
			__security: { bearerAuth: true }
		});
		if (hasUserProvidedEncodingFormat) return response;
		loggerFor(this._client).debug("embeddings/decoding base64 embeddings from base64");
		return response._thenUnwrap((response) => {
			if (response && response.data) response.data.forEach((embeddingBase64Obj) => {
				const embeddingBase64Str = embeddingBase64Obj.embedding;
				embeddingBase64Obj.embedding = toFloat32Array(embeddingBase64Str);
			});
			return response;
		});
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/evals/runs/output-items.mjs
/**
* Manage and run evals in the OpenAI platform.
*/
var OutputItems = class extends APIResource {
	/**
	* Get an evaluation run output item by ID.
	*/
	retrieve(outputItemID, params, options) {
		const { eval_id, run_id } = params;
		return this._client.get(path`/evals/${eval_id}/runs/${run_id}/output_items/${outputItemID}`, {
			...options,
			__security: { bearerAuth: true }
		});
	}
	/**
	* Get a list of output items for an evaluation run.
	*/
	list(runID, params, options) {
		const { eval_id, ...query } = params;
		return this._client.getAPIList(path`/evals/${eval_id}/runs/${runID}/output_items`, CursorPage, {
			query,
			...options,
			__security: { bearerAuth: true }
		});
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/evals/runs/runs.mjs
/**
* Manage and run evals in the OpenAI platform.
*/
var Runs = class extends APIResource {
	constructor() {
		super(...arguments);
		this.outputItems = new OutputItems(this._client);
	}
	/**
	* Kicks off a new run for a given evaluation, specifying the data source, and what
	* model configuration to use to test. The datasource will be validated against the
	* schema specified in the config of the evaluation.
	*/
	create(evalID, body, options) {
		return this._client.post(path`/evals/${evalID}/runs`, {
			body,
			...options,
			__security: { bearerAuth: true }
		});
	}
	/**
	* Get an evaluation run by ID.
	*/
	retrieve(runID, params, options) {
		const { eval_id } = params;
		return this._client.get(path`/evals/${eval_id}/runs/${runID}`, {
			...options,
			__security: { bearerAuth: true }
		});
	}
	/**
	* Get a list of runs for an evaluation.
	*/
	list(evalID, query = {}, options) {
		return this._client.getAPIList(path`/evals/${evalID}/runs`, CursorPage, {
			query,
			...options,
			__security: { bearerAuth: true }
		});
	}
	/**
	* Delete an eval run.
	*/
	delete(runID, params, options) {
		const { eval_id } = params;
		return this._client.delete(path`/evals/${eval_id}/runs/${runID}`, {
			...options,
			__security: { bearerAuth: true }
		});
	}
	/**
	* Cancel an ongoing evaluation run.
	*/
	cancel(runID, params, options) {
		const { eval_id } = params;
		return this._client.post(path`/evals/${eval_id}/runs/${runID}`, {
			...options,
			__security: { bearerAuth: true }
		});
	}
};
Runs.OutputItems = OutputItems;
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/evals/evals.mjs
/**
* Manage and run evals in the OpenAI platform.
*/
var Evals = class extends APIResource {
	constructor() {
		super(...arguments);
		this.runs = new Runs(this._client);
	}
	/**
	* Create the structure of an evaluation that can be used to test a model's
	* performance. An evaluation is a set of testing criteria and the config for a
	* data source, which dictates the schema of the data used in the evaluation. After
	* creating an evaluation, you can run it on different models and model parameters.
	* We support several types of graders and datasources. For more information, see
	* the [Evals guide](https://platform.openai.com/docs/guides/evals).
	*/
	create(body, options) {
		return this._client.post("/evals", {
			body,
			...options,
			__security: { bearerAuth: true }
		});
	}
	/**
	* Get an evaluation by ID.
	*/
	retrieve(evalID, options) {
		return this._client.get(path`/evals/${evalID}`, {
			...options,
			__security: { bearerAuth: true }
		});
	}
	/**
	* Update certain properties of an evaluation.
	*/
	update(evalID, body, options) {
		return this._client.post(path`/evals/${evalID}`, {
			body,
			...options,
			__security: { bearerAuth: true }
		});
	}
	/**
	* List evaluations for a project.
	*/
	list(query = {}, options) {
		return this._client.getAPIList("/evals", CursorPage, {
			query,
			...options,
			__security: { bearerAuth: true }
		});
	}
	/**
	* Delete an evaluation.
	*/
	delete(evalID, options) {
		return this._client.delete(path`/evals/${evalID}`, {
			...options,
			__security: { bearerAuth: true }
		});
	}
};
Evals.Runs = Runs;
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/files.mjs
/**
* Files are used to upload documents that can be used with features like Assistants and Fine-tuning.
*/
var Files$1 = class extends APIResource {
	/**
	* Upload a file that can be used across various endpoints. Individual files can be
	* up to 512 MB, and each project can store up to 2.5 TB of files in total. There
	* is no organization-wide storage limit. Uploads to this endpoint are rate-limited
	* to 1,000 requests per minute per authenticated user.
	*
	* - The Assistants API supports files up to 2 million tokens and of specific file
	*   types. See the
	*   [Assistants Tools guide](https://platform.openai.com/docs/assistants/tools)
	*   for details.
	* - The Fine-tuning API only supports `.jsonl` files. The input also has certain
	*   required formats for fine-tuning
	*   [chat](https://platform.openai.com/docs/api-reference/fine-tuning/chat-input)
	*   or
	*   [completions](https://platform.openai.com/docs/api-reference/fine-tuning/completions-input)
	*   models.
	* - The Batch API only supports `.jsonl` files up to 200 MB in size. The input
	*   also has a specific required
	*   [format](https://platform.openai.com/docs/api-reference/batch/request-input).
	* - For Retrieval or `file_search` ingestion, upload files here first. If you need
	*   to attach multiple uploaded files to the same vector store, use
	*   [`/vector_stores/{vector_store_id}/file_batches`](https://platform.openai.com/docs/api-reference/vector-stores-file-batches/createBatch)
	*   instead of attaching them one by one. Vector store attachment has separate
	*   limits from file upload, including 2,000 attached files per minute per
	*   organization.
	*
	* Please [contact us](https://help.openai.com/) if you need to increase these
	* storage limits.
	*/
	create(body, options) {
		return this._client.post("/files", multipartFormRequestOptions({
			body,
			...options,
			__security: { bearerAuth: true }
		}, this._client));
	}
	/**
	* Returns information about a specific file.
	*/
	retrieve(fileID, options) {
		return this._client.get(path`/files/${fileID}`, {
			...options,
			__security: { bearerAuth: true }
		});
	}
	/**
	* Returns a list of files.
	*/
	list(query = {}, options) {
		return this._client.getAPIList("/files", CursorPage, {
			query,
			...options,
			__security: { bearerAuth: true }
		});
	}
	/**
	* Delete a file and remove it from all vector stores.
	*/
	delete(fileID, options) {
		return this._client.delete(path`/files/${fileID}`, {
			...options,
			__security: { bearerAuth: true }
		});
	}
	/**
	* Returns the contents of the specified file.
	*/
	content(fileID, options) {
		return this._client.get(path`/files/${fileID}/content`, {
			...options,
			headers: buildHeaders([{ Accept: "application/binary" }, options?.headers]),
			__security: { bearerAuth: true },
			__binaryResponse: true
		});
	}
	/**
	* Waits for the given file to be processed, default timeout is 30 mins.
	*/
	async waitForProcessing(id, { pollInterval = 5e3, maxWait = 1800 * 1e3 } = {}) {
		const TERMINAL_STATES = new Set([
			"processed",
			"error",
			"deleted"
		]);
		const start = Date.now();
		let file = await this.retrieve(id);
		while (!file.status || !TERMINAL_STATES.has(file.status)) {
			await sleep(pollInterval);
			file = await this.retrieve(id);
			if (Date.now() - start > maxWait) throw new APIConnectionTimeoutError({ message: `Giving up on waiting for file ${id} to finish processing after ${maxWait} milliseconds.` });
		}
		return file;
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/fine-tuning/methods.mjs
var Methods = class extends APIResource {};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/fine-tuning/alpha/graders.mjs
/**
* Manage fine-tuning jobs to tailor a model to your specific training data.
*/
var Graders$1 = class extends APIResource {
	/**
	* Run a grader.
	*
	* @example
	* ```ts
	* const response = await client.fineTuning.alpha.graders.run({
	*   grader: {
	*     input: 'input',
	*     name: 'name',
	*     operation: 'eq',
	*     reference: 'reference',
	*     type: 'string_check',
	*   },
	*   model_sample: 'model_sample',
	* });
	* ```
	*/
	run(body, options) {
		return this._client.post("/fine_tuning/alpha/graders/run", {
			body,
			...options,
			__security: { bearerAuth: true }
		});
	}
	/**
	* Validate a grader.
	*
	* @example
	* ```ts
	* const response =
	*   await client.fineTuning.alpha.graders.validate({
	*     grader: {
	*       input: 'input',
	*       name: 'name',
	*       operation: 'eq',
	*       reference: 'reference',
	*       type: 'string_check',
	*     },
	*   });
	* ```
	*/
	validate(body, options) {
		return this._client.post("/fine_tuning/alpha/graders/validate", {
			body,
			...options,
			__security: { bearerAuth: true }
		});
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/fine-tuning/alpha/alpha.mjs
var Alpha = class extends APIResource {
	constructor() {
		super(...arguments);
		this.graders = new Graders$1(this._client);
	}
};
Alpha.Graders = Graders$1;
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/fine-tuning/checkpoints/permissions.mjs
/**
* Manage fine-tuning jobs to tailor a model to your specific training data.
*/
var Permissions = class extends APIResource {
	/**
	* **NOTE:** Calling this endpoint requires an [admin API key](../admin-api-keys).
	*
	* This enables organization owners to share fine-tuned models with other projects
	* in their organization.
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const permissionCreateResponse of client.fineTuning.checkpoints.permissions.create(
	*   'ft:gpt-4o-mini-2024-07-18:org:weather:B7R9VjQd',
	*   { project_ids: ['string'] },
	* )) {
	*   // ...
	* }
	* ```
	*/
	create(fineTunedModelCheckpoint, body, options) {
		return this._client.getAPIList(path`/fine_tuning/checkpoints/${fineTunedModelCheckpoint}/permissions`, Page, {
			body,
			method: "post",
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* **NOTE:** This endpoint requires an [admin API key](../admin-api-keys).
	*
	* Organization owners can use this endpoint to view all permissions for a
	* fine-tuned model checkpoint.
	*
	* @deprecated Retrieve is deprecated. Please swap to the paginated list method instead.
	*/
	retrieve(fineTunedModelCheckpoint, query = {}, options) {
		return this._client.get(path`/fine_tuning/checkpoints/${fineTunedModelCheckpoint}/permissions`, {
			query,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* **NOTE:** This endpoint requires an [admin API key](../admin-api-keys).
	*
	* Organization owners can use this endpoint to view all permissions for a
	* fine-tuned model checkpoint.
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const permissionListResponse of client.fineTuning.checkpoints.permissions.list(
	*   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
	* )) {
	*   // ...
	* }
	* ```
	*/
	list(fineTunedModelCheckpoint, query = {}, options) {
		return this._client.getAPIList(path`/fine_tuning/checkpoints/${fineTunedModelCheckpoint}/permissions`, ConversationCursorPage, {
			query,
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
	/**
	* **NOTE:** This endpoint requires an [admin API key](../admin-api-keys).
	*
	* Organization owners can use this endpoint to delete a permission for a
	* fine-tuned model checkpoint.
	*
	* @example
	* ```ts
	* const permission =
	*   await client.fineTuning.checkpoints.permissions.delete(
	*     'cp_zc4Q7MP6XxulcVzj4MZdwsAB',
	*     {
	*       fine_tuned_model_checkpoint:
	*         'ft:gpt-4o-mini-2024-07-18:org:weather:B7R9VjQd',
	*     },
	*   );
	* ```
	*/
	delete(permissionID, params, options) {
		const { fine_tuned_model_checkpoint } = params;
		return this._client.delete(path`/fine_tuning/checkpoints/${fine_tuned_model_checkpoint}/permissions/${permissionID}`, {
			...options,
			__security: { adminAPIKeyAuth: true }
		});
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/fine-tuning/checkpoints/checkpoints.mjs
var Checkpoints$1 = class extends APIResource {
	constructor() {
		super(...arguments);
		this.permissions = new Permissions(this._client);
	}
};
Checkpoints$1.Permissions = Permissions;
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/fine-tuning/jobs/checkpoints.mjs
/**
* Manage fine-tuning jobs to tailor a model to your specific training data.
*/
var Checkpoints = class extends APIResource {
	/**
	* List checkpoints for a fine-tuning job.
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const fineTuningJobCheckpoint of client.fineTuning.jobs.checkpoints.list(
	*   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
	* )) {
	*   // ...
	* }
	* ```
	*/
	list(fineTuningJobID, query = {}, options) {
		return this._client.getAPIList(path`/fine_tuning/jobs/${fineTuningJobID}/checkpoints`, CursorPage, {
			query,
			...options,
			__security: { bearerAuth: true }
		});
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/fine-tuning/jobs/jobs.mjs
/**
* Manage fine-tuning jobs to tailor a model to your specific training data.
*/
var Jobs = class extends APIResource {
	constructor() {
		super(...arguments);
		this.checkpoints = new Checkpoints(this._client);
	}
	/**
	* Creates a fine-tuning job which begins the process of creating a new model from
	* a given dataset.
	*
	* Response includes details of the enqueued job including job status and the name
	* of the fine-tuned models once complete.
	*
	* [Learn more about fine-tuning](https://platform.openai.com/docs/guides/model-optimization)
	*
	* @example
	* ```ts
	* const fineTuningJob = await client.fineTuning.jobs.create({
	*   model: 'gpt-4o-mini',
	*   training_file: 'file-abc123',
	* });
	* ```
	*/
	create(body, options) {
		return this._client.post("/fine_tuning/jobs", {
			body,
			...options,
			__security: { bearerAuth: true }
		});
	}
	/**
	* Get info about a fine-tuning job.
	*
	* [Learn more about fine-tuning](https://platform.openai.com/docs/guides/model-optimization)
	*
	* @example
	* ```ts
	* const fineTuningJob = await client.fineTuning.jobs.retrieve(
	*   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
	* );
	* ```
	*/
	retrieve(fineTuningJobID, options) {
		return this._client.get(path`/fine_tuning/jobs/${fineTuningJobID}`, {
			...options,
			__security: { bearerAuth: true }
		});
	}
	/**
	* List your organization's fine-tuning jobs
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const fineTuningJob of client.fineTuning.jobs.list()) {
	*   // ...
	* }
	* ```
	*/
	list(query = {}, options) {
		return this._client.getAPIList("/fine_tuning/jobs", CursorPage, {
			query,
			...options,
			__security: { bearerAuth: true }
		});
	}
	/**
	* Immediately cancel a fine-tune job.
	*
	* @example
	* ```ts
	* const fineTuningJob = await client.fineTuning.jobs.cancel(
	*   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
	* );
	* ```
	*/
	cancel(fineTuningJobID, options) {
		return this._client.post(path`/fine_tuning/jobs/${fineTuningJobID}/cancel`, {
			...options,
			__security: { bearerAuth: true }
		});
	}
	/**
	* Get status updates for a fine-tuning job.
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const fineTuningJobEvent of client.fineTuning.jobs.listEvents(
	*   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
	* )) {
	*   // ...
	* }
	* ```
	*/
	listEvents(fineTuningJobID, query = {}, options) {
		return this._client.getAPIList(path`/fine_tuning/jobs/${fineTuningJobID}/events`, CursorPage, {
			query,
			...options,
			__security: { bearerAuth: true }
		});
	}
	/**
	* Pause a fine-tune job.
	*
	* @example
	* ```ts
	* const fineTuningJob = await client.fineTuning.jobs.pause(
	*   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
	* );
	* ```
	*/
	pause(fineTuningJobID, options) {
		return this._client.post(path`/fine_tuning/jobs/${fineTuningJobID}/pause`, {
			...options,
			__security: { bearerAuth: true }
		});
	}
	/**
	* Resume a fine-tune job.
	*
	* @example
	* ```ts
	* const fineTuningJob = await client.fineTuning.jobs.resume(
	*   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
	* );
	* ```
	*/
	resume(fineTuningJobID, options) {
		return this._client.post(path`/fine_tuning/jobs/${fineTuningJobID}/resume`, {
			...options,
			__security: { bearerAuth: true }
		});
	}
};
Jobs.Checkpoints = Checkpoints;
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/fine-tuning/fine-tuning.mjs
var FineTuning = class extends APIResource {
	constructor() {
		super(...arguments);
		this.methods = new Methods(this._client);
		this.jobs = new Jobs(this._client);
		this.checkpoints = new Checkpoints$1(this._client);
		this.alpha = new Alpha(this._client);
	}
};
FineTuning.Methods = Methods;
FineTuning.Jobs = Jobs;
FineTuning.Checkpoints = Checkpoints$1;
FineTuning.Alpha = Alpha;
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/graders/grader-models.mjs
var GraderModels = class extends APIResource {};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/graders/graders.mjs
var Graders = class extends APIResource {
	constructor() {
		super(...arguments);
		this.graderModels = new GraderModels(this._client);
	}
};
Graders.GraderModels = GraderModels;
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/images.mjs
/**
* Given a prompt and/or an input image, the model will generate a new image.
*/
var Images = class extends APIResource {
	/**
	* Creates a variation of a given image. This endpoint only supports `dall-e-2`.
	*
	* @example
	* ```ts
	* const imagesResponse = await client.images.createVariation({
	*   image: fs.createReadStream('otter.png'),
	* });
	* ```
	*/
	createVariation(body, options) {
		return this._client.post("/images/variations", multipartFormRequestOptions({
			body,
			...options,
			__security: { bearerAuth: true }
		}, this._client));
	}
	edit(body, options) {
		return this._client.post("/images/edits", multipartFormRequestOptions({
			body,
			...options,
			stream: body.stream ?? false,
			__security: { bearerAuth: true }
		}, this._client));
	}
	generate(body, options) {
		return this._client.post("/images/generations", {
			body,
			...options,
			stream: body.stream ?? false,
			__security: { bearerAuth: true }
		});
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/models.mjs
/**
* List and describe the various models available in the API.
*/
var Models = class extends APIResource {
	/**
	* Retrieves a model instance, providing basic information about the model such as
	* the owner and permissioning.
	*/
	retrieve(model, options) {
		return this._client.get(path`/models/${model}`, {
			...options,
			__security: { bearerAuth: true }
		});
	}
	/**
	* Lists the currently available models, and provides basic information about each
	* one such as the owner and availability.
	*/
	list(options) {
		return this._client.getAPIList("/models", Page, {
			...options,
			__security: { bearerAuth: true }
		});
	}
	/**
	* Delete a fine-tuned model. You must have the Owner role in your organization to
	* delete a model.
	*/
	delete(model, options) {
		return this._client.delete(path`/models/${model}`, {
			...options,
			__security: { bearerAuth: true }
		});
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/moderations.mjs
/**
* Given text and/or image inputs, classifies if those inputs are potentially harmful.
*/
var Moderations = class extends APIResource {
	/**
	* Classifies if text and/or image inputs are potentially harmful. Learn more in
	* the [moderation guide](https://platform.openai.com/docs/guides/moderation).
	*/
	create(body, options) {
		return this._client.post("/moderations", {
			body,
			...options,
			__security: { bearerAuth: true }
		});
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/realtime/calls.mjs
var Calls = class extends APIResource {
	/**
	* Accept an incoming SIP call and configure the realtime session that will handle
	* it.
	*
	* @example
	* ```ts
	* await client.realtime.calls.accept('call_id', {
	*   type: 'realtime',
	* });
	* ```
	*/
	accept(callID, body, options) {
		return this._client.post(path`/realtime/calls/${callID}/accept`, {
			body,
			...options,
			headers: buildHeaders([{ Accept: "*/*" }, options?.headers]),
			__security: { bearerAuth: true }
		});
	}
	/**
	* End an active Realtime API call, whether it was initiated over SIP or WebRTC.
	*
	* @example
	* ```ts
	* await client.realtime.calls.hangup('call_id');
	* ```
	*/
	hangup(callID, options) {
		return this._client.post(path`/realtime/calls/${callID}/hangup`, {
			...options,
			headers: buildHeaders([{ Accept: "*/*" }, options?.headers]),
			__security: { bearerAuth: true }
		});
	}
	/**
	* Transfer an active SIP call to a new destination using the SIP REFER verb.
	*
	* @example
	* ```ts
	* await client.realtime.calls.refer('call_id', {
	*   target_uri: 'tel:+14155550123',
	* });
	* ```
	*/
	refer(callID, body, options) {
		return this._client.post(path`/realtime/calls/${callID}/refer`, {
			body,
			...options,
			headers: buildHeaders([{ Accept: "*/*" }, options?.headers]),
			__security: { bearerAuth: true }
		});
	}
	/**
	* Decline an incoming SIP call by returning a SIP status code to the caller.
	*
	* @example
	* ```ts
	* await client.realtime.calls.reject('call_id');
	* ```
	*/
	reject(callID, body = {}, options) {
		return this._client.post(path`/realtime/calls/${callID}/reject`, {
			body,
			...options,
			headers: buildHeaders([{ Accept: "*/*" }, options?.headers]),
			__security: { bearerAuth: true }
		});
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/realtime/client-secrets.mjs
var ClientSecrets = class extends APIResource {
	/**
	* Create a Realtime client secret with an associated session configuration.
	*
	* Client secrets are short-lived tokens that can be passed to a client app, such
	* as a web frontend or mobile client, which grants access to the Realtime API
	* without leaking your main API key. You can configure a custom TTL for each
	* client secret.
	*
	* You can also attach session configuration options to the client secret, which
	* will be applied to any sessions created using that client secret, but these can
	* also be overridden by the client connection.
	*
	* [Learn more about authentication with client secrets over WebRTC](https://platform.openai.com/docs/guides/realtime-webrtc).
	*
	* Returns the created client secret and the effective session object. The client
	* secret is a string that looks like `ek_1234`.
	*
	* @example
	* ```ts
	* const clientSecret =
	*   await client.realtime.clientSecrets.create();
	* ```
	*/
	create(body, options) {
		return this._client.post("/realtime/client_secrets", {
			body,
			...options,
			__security: { bearerAuth: true }
		});
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/realtime/realtime.mjs
var Realtime = class extends APIResource {
	constructor() {
		super(...arguments);
		this.clientSecrets = new ClientSecrets(this._client);
		this.calls = new Calls(this._client);
	}
};
Realtime.ClientSecrets = ClientSecrets;
Realtime.Calls = Calls;
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/lib/ResponsesParser.mjs
function maybeParseResponse(response, params) {
	if (!params || !hasAutoParseableInput(params)) return {
		...response,
		output_parsed: null,
		output: response.output.map((item) => {
			if (item.type === "function_call") return {
				...item,
				parsed_arguments: null
			};
			if (item.type === "message") return {
				...item,
				content: item.content.map((content) => ({
					...content,
					parsed: null
				}))
			};
			else return item;
		})
	};
	return parseResponse(response, params);
}
function parseResponse(response, params) {
	const output = response.output.map((item) => {
		if (item.type === "function_call") return {
			...item,
			parsed_arguments: parseToolCall(params, item)
		};
		if (item.type === "message") {
			const content = item.content.map((content) => {
				if (content.type === "output_text") return {
					...content,
					parsed: parseTextFormat(params, content.text)
				};
				return content;
			});
			return {
				...item,
				content
			};
		}
		return item;
	});
	const parsed = Object.assign({}, response, { output });
	if (!Object.getOwnPropertyDescriptor(response, "output_text")) addOutputText(parsed);
	Object.defineProperty(parsed, "output_parsed", {
		enumerable: true,
		get() {
			for (const output of parsed.output) {
				if (output.type !== "message") continue;
				for (const content of output.content) if (content.type === "output_text" && content.parsed !== null) return content.parsed;
			}
			return null;
		}
	});
	return parsed;
}
function parseTextFormat(params, content) {
	if (params.text?.format?.type !== "json_schema") return null;
	if ("$parseRaw" in params.text?.format) return (params.text?.format).$parseRaw(content);
	return JSON.parse(content);
}
function hasAutoParseableInput(params) {
	if (isAutoParsableResponseFormat(params.text?.format)) return true;
	return false;
}
function isAutoParsableTool(tool) {
	return tool?.["$brand"] === "auto-parseable-tool";
}
function getInputToolByName(input_tools, name) {
	return input_tools.find((tool) => tool.type === "function" && tool.name === name);
}
function parseToolCall(params, toolCall) {
	const inputTool = getInputToolByName(params.tools ?? [], toolCall.name);
	return {
		...toolCall,
		...toolCall,
		parsed_arguments: isAutoParsableTool(inputTool) ? inputTool.$parseRaw(toolCall.arguments) : inputTool?.strict ? JSON.parse(toolCall.arguments) : null
	};
}
function addOutputText(rsp) {
	const texts = [];
	for (const output of rsp.output) {
		if (output.type !== "message") continue;
		for (const content of output.content) if (content.type === "output_text") texts.push(content.text);
	}
	rsp.output_text = texts.join("");
}
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/lib/responses/ResponseStream.mjs
var _ResponseStream_instances, _ResponseStream_params, _ResponseStream_currentResponseSnapshot, _ResponseStream_finalResponse, _ResponseStream_beginRequest, _ResponseStream_addEvent, _ResponseStream_endRequest, _ResponseStream_accumulateResponse;
var ResponseStream = class ResponseStream extends EventStream {
	constructor(params) {
		super();
		_ResponseStream_instances.add(this);
		_ResponseStream_params.set(this, void 0);
		_ResponseStream_currentResponseSnapshot.set(this, void 0);
		_ResponseStream_finalResponse.set(this, void 0);
		__classPrivateFieldSet(this, _ResponseStream_params, params, "f");
	}
	static createResponse(client, params, options) {
		const runner = new ResponseStream(params);
		runner._run(() => runner._createOrRetrieveResponse(client, params, {
			...options,
			headers: {
				...options?.headers,
				"X-Stainless-Helper-Method": "stream"
			}
		}));
		return runner;
	}
	async _createOrRetrieveResponse(client, params, options) {
		const signal = options?.signal;
		if (signal) {
			if (signal.aborted) this.controller.abort();
			signal.addEventListener("abort", () => this.controller.abort());
		}
		__classPrivateFieldGet(this, _ResponseStream_instances, "m", _ResponseStream_beginRequest).call(this);
		let stream;
		let starting_after = null;
		if ("response_id" in params) {
			stream = await client.responses.retrieve(params.response_id, { stream: true }, {
				...options,
				signal: this.controller.signal,
				stream: true
			});
			starting_after = params.starting_after ?? null;
		} else stream = await client.responses.create({
			...params,
			stream: true
		}, {
			...options,
			signal: this.controller.signal
		});
		this._connected();
		for await (const event of stream) __classPrivateFieldGet(this, _ResponseStream_instances, "m", _ResponseStream_addEvent).call(this, event, starting_after);
		if (stream.controller.signal?.aborted) throw new APIUserAbortError();
		return __classPrivateFieldGet(this, _ResponseStream_instances, "m", _ResponseStream_endRequest).call(this);
	}
	[(_ResponseStream_params = /* @__PURE__ */ new WeakMap(), _ResponseStream_currentResponseSnapshot = /* @__PURE__ */ new WeakMap(), _ResponseStream_finalResponse = /* @__PURE__ */ new WeakMap(), _ResponseStream_instances = /* @__PURE__ */ new WeakSet(), _ResponseStream_beginRequest = function _ResponseStream_beginRequest() {
		if (this.ended) return;
		__classPrivateFieldSet(this, _ResponseStream_currentResponseSnapshot, void 0, "f");
	}, _ResponseStream_addEvent = function _ResponseStream_addEvent(event, starting_after) {
		if (this.ended) return;
		const maybeEmit = (name, event) => {
			if (starting_after == null || event.sequence_number > starting_after) this._emit(name, event);
		};
		const response = __classPrivateFieldGet(this, _ResponseStream_instances, "m", _ResponseStream_accumulateResponse).call(this, event);
		maybeEmit("event", event);
		switch (event.type) {
			case "response.output_text.delta": {
				const output = response.output[event.output_index];
				if (!output) throw new OpenAIError(`missing output at index ${event.output_index}`);
				if (output.type === "message") {
					const content = output.content[event.content_index];
					if (!content) throw new OpenAIError(`missing content at index ${event.content_index}`);
					if (content.type !== "output_text") throw new OpenAIError(`expected content to be 'output_text', got ${content.type}`);
					maybeEmit("response.output_text.delta", {
						...event,
						snapshot: content.text
					});
				}
				break;
			}
			case "response.function_call_arguments.delta": {
				const output = response.output[event.output_index];
				if (!output) throw new OpenAIError(`missing output at index ${event.output_index}`);
				if (output.type === "function_call") maybeEmit("response.function_call_arguments.delta", {
					...event,
					snapshot: output.arguments
				});
				break;
			}
			default:
				maybeEmit(event.type, event);
				break;
		}
	}, _ResponseStream_endRequest = function _ResponseStream_endRequest() {
		if (this.ended) throw new OpenAIError(`stream has ended, this shouldn't happen`);
		const snapshot = __classPrivateFieldGet(this, _ResponseStream_currentResponseSnapshot, "f");
		if (!snapshot) throw new OpenAIError(`request ended without sending any events`);
		__classPrivateFieldSet(this, _ResponseStream_currentResponseSnapshot, void 0, "f");
		const parsedResponse = finalizeResponse(snapshot, __classPrivateFieldGet(this, _ResponseStream_params, "f"));
		__classPrivateFieldSet(this, _ResponseStream_finalResponse, parsedResponse, "f");
		return parsedResponse;
	}, _ResponseStream_accumulateResponse = function _ResponseStream_accumulateResponse(event) {
		let snapshot = __classPrivateFieldGet(this, _ResponseStream_currentResponseSnapshot, "f");
		if (!snapshot) {
			if (event.type !== "response.created") throw new OpenAIError(`When snapshot hasn't been set yet, expected 'response.created' event, got ${event.type}`);
			snapshot = __classPrivateFieldSet(this, _ResponseStream_currentResponseSnapshot, event.response, "f");
			return snapshot;
		}
		switch (event.type) {
			case "response.output_item.added":
				snapshot.output.push(event.item);
				break;
			case "response.content_part.added": {
				const output = snapshot.output[event.output_index];
				if (!output) throw new OpenAIError(`missing output at index ${event.output_index}`);
				const type = output.type;
				const part = event.part;
				if (type === "message" && part.type !== "reasoning_text") output.content.push(part);
				else if (type === "reasoning" && part.type === "reasoning_text") {
					if (!output.content) output.content = [];
					output.content.push(part);
				}
				break;
			}
			case "response.output_text.delta": {
				const output = snapshot.output[event.output_index];
				if (!output) throw new OpenAIError(`missing output at index ${event.output_index}`);
				if (output.type === "message") {
					const content = output.content[event.content_index];
					if (!content) throw new OpenAIError(`missing content at index ${event.content_index}`);
					if (content.type !== "output_text") throw new OpenAIError(`expected content to be 'output_text', got ${content.type}`);
					content.text += event.delta;
				}
				break;
			}
			case "response.function_call_arguments.delta": {
				const output = snapshot.output[event.output_index];
				if (!output) throw new OpenAIError(`missing output at index ${event.output_index}`);
				if (output.type === "function_call") output.arguments += event.delta;
				break;
			}
			case "response.reasoning_text.delta": {
				const output = snapshot.output[event.output_index];
				if (!output) throw new OpenAIError(`missing output at index ${event.output_index}`);
				if (output.type === "reasoning") {
					const content = output.content?.[event.content_index];
					if (!content) throw new OpenAIError(`missing content at index ${event.content_index}`);
					if (content.type !== "reasoning_text") throw new OpenAIError(`expected content to be 'reasoning_text', got ${content.type}`);
					content.text += event.delta;
				}
				break;
			}
			case "response.completed":
				__classPrivateFieldSet(this, _ResponseStream_currentResponseSnapshot, event.response, "f");
				break;
		}
		return snapshot;
	}, Symbol.asyncIterator)]() {
		const pushQueue = [];
		const readQueue = [];
		let done = false;
		this.on("event", (event) => {
			const reader = readQueue.shift();
			if (reader) reader.resolve(event);
			else pushQueue.push(event);
		});
		this.on("end", () => {
			done = true;
			for (const reader of readQueue) reader.resolve(void 0);
			readQueue.length = 0;
		});
		this.on("abort", (err) => {
			done = true;
			for (const reader of readQueue) reader.reject(err);
			readQueue.length = 0;
		});
		this.on("error", (err) => {
			done = true;
			for (const reader of readQueue) reader.reject(err);
			readQueue.length = 0;
		});
		return {
			next: async () => {
				if (!pushQueue.length) {
					if (done) return {
						value: void 0,
						done: true
					};
					return new Promise((resolve, reject) => readQueue.push({
						resolve,
						reject
					})).then((event) => event ? {
						value: event,
						done: false
					} : {
						value: void 0,
						done: true
					});
				}
				return {
					value: pushQueue.shift(),
					done: false
				};
			},
			return: async () => {
				this.abort();
				return {
					value: void 0,
					done: true
				};
			}
		};
	}
	/**
	* @returns a promise that resolves with the final Response, or rejects
	* if an error occurred or the stream ended prematurely without producing a REsponse.
	*/
	async finalResponse() {
		await this.done();
		const response = __classPrivateFieldGet(this, _ResponseStream_finalResponse, "f");
		if (!response) throw new OpenAIError("stream ended without producing a ChatCompletion");
		return response;
	}
};
function finalizeResponse(snapshot, params) {
	return maybeParseResponse(snapshot, params);
}
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/responses/input-items.mjs
var InputItems = class extends APIResource {
	/**
	* Returns a list of input items for a given response.
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const responseItem of client.responses.inputItems.list(
	*   'response_id',
	* )) {
	*   // ...
	* }
	* ```
	*/
	list(responseID, query = {}, options) {
		return this._client.getAPIList(path`/responses/${responseID}/input_items`, CursorPage, {
			query,
			...options,
			__security: { bearerAuth: true }
		});
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/responses/input-tokens.mjs
var InputTokens = class extends APIResource {
	/**
	* Returns input token counts of the request.
	*
	* Returns an object with `object` set to `response.input_tokens` and an
	* `input_tokens` count.
	*
	* @example
	* ```ts
	* const response = await client.responses.inputTokens.count();
	* ```
	*/
	count(body = {}, options) {
		return this._client.post("/responses/input_tokens", {
			body,
			...options,
			__security: { bearerAuth: true }
		});
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/responses/responses.mjs
var Responses = class extends APIResource {
	constructor() {
		super(...arguments);
		this.inputItems = new InputItems(this._client);
		this.inputTokens = new InputTokens(this._client);
	}
	create(body, options) {
		return this._client.post("/responses", {
			body,
			...options,
			stream: body.stream ?? false,
			__security: { bearerAuth: true }
		})._thenUnwrap((rsp) => {
			if ("object" in rsp && rsp.object === "response") addOutputText(rsp);
			return rsp;
		});
	}
	retrieve(responseID, query = {}, options) {
		return this._client.get(path`/responses/${responseID}`, {
			query,
			...options,
			stream: query?.stream ?? false,
			__security: { bearerAuth: true }
		})._thenUnwrap((rsp) => {
			if ("object" in rsp && rsp.object === "response") addOutputText(rsp);
			return rsp;
		});
	}
	/**
	* Deletes a model response with the given ID.
	*
	* @example
	* ```ts
	* await client.responses.delete(
	*   'resp_677efb5139a88190b512bc3fef8e535d',
	* );
	* ```
	*/
	delete(responseID, options) {
		return this._client.delete(path`/responses/${responseID}`, {
			...options,
			headers: buildHeaders([{ Accept: "*/*" }, options?.headers]),
			__security: { bearerAuth: true }
		});
	}
	parse(body, options) {
		return this._client.responses.create(body, options)._thenUnwrap((response) => parseResponse(response, body));
	}
	/**
	* Creates a model response stream
	*/
	stream(body, options) {
		return ResponseStream.createResponse(this._client, body, options);
	}
	/**
	* Cancels a model response with the given ID. Only responses created with the
	* `background` parameter set to `true` can be cancelled.
	* [Learn more](https://platform.openai.com/docs/guides/background).
	*
	* @example
	* ```ts
	* const response = await client.responses.cancel(
	*   'resp_677efb5139a88190b512bc3fef8e535d',
	* );
	* ```
	*/
	cancel(responseID, options) {
		return this._client.post(path`/responses/${responseID}/cancel`, {
			...options,
			__security: { bearerAuth: true }
		});
	}
	/**
	* Compact a conversation. Returns a compacted response object.
	*
	* Learn when and how to compact long-running conversations in the
	* [conversation state guide](https://platform.openai.com/docs/guides/conversation-state#managing-the-context-window).
	* For ZDR-compatible compaction details, see
	* [Compaction (advanced)](https://platform.openai.com/docs/guides/conversation-state#compaction-advanced).
	*
	* @example
	* ```ts
	* const compactedResponse = await client.responses.compact({
	*   model: 'gpt-5.4',
	* });
	* ```
	*/
	compact(body, options) {
		return this._client.post("/responses/compact", {
			body,
			...options,
			__security: { bearerAuth: true }
		});
	}
};
Responses.InputItems = InputItems;
Responses.InputTokens = InputTokens;
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/skills/content.mjs
var Content$1 = class extends APIResource {
	/**
	* Download a skill zip bundle by its ID.
	*/
	retrieve(skillID, options) {
		return this._client.get(path`/skills/${skillID}/content`, {
			...options,
			headers: buildHeaders([{ Accept: "application/binary" }, options?.headers]),
			__security: { bearerAuth: true },
			__binaryResponse: true
		});
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/skills/versions/content.mjs
var Content = class extends APIResource {
	/**
	* Download a skill version zip bundle.
	*/
	retrieve(version, params, options) {
		const { skill_id } = params;
		return this._client.get(path`/skills/${skill_id}/versions/${version}/content`, {
			...options,
			headers: buildHeaders([{ Accept: "application/binary" }, options?.headers]),
			__security: { bearerAuth: true },
			__binaryResponse: true
		});
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/skills/versions/versions.mjs
var Versions = class extends APIResource {
	constructor() {
		super(...arguments);
		this.content = new Content(this._client);
	}
	/**
	* Create a new immutable skill version.
	*/
	create(skillID, body = {}, options) {
		return this._client.post(path`/skills/${skillID}/versions`, maybeMultipartFormRequestOptions({
			body,
			...options,
			__security: { bearerAuth: true }
		}, this._client));
	}
	/**
	* Get a specific skill version.
	*/
	retrieve(version, params, options) {
		const { skill_id } = params;
		return this._client.get(path`/skills/${skill_id}/versions/${version}`, {
			...options,
			__security: { bearerAuth: true }
		});
	}
	/**
	* List skill versions for a skill.
	*/
	list(skillID, query = {}, options) {
		return this._client.getAPIList(path`/skills/${skillID}/versions`, CursorPage, {
			query,
			...options,
			__security: { bearerAuth: true }
		});
	}
	/**
	* Delete a skill version.
	*/
	delete(version, params, options) {
		const { skill_id } = params;
		return this._client.delete(path`/skills/${skill_id}/versions/${version}`, {
			...options,
			__security: { bearerAuth: true }
		});
	}
};
Versions.Content = Content;
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/skills/skills.mjs
var Skills = class extends APIResource {
	constructor() {
		super(...arguments);
		this.content = new Content$1(this._client);
		this.versions = new Versions(this._client);
	}
	/**
	* Create a new skill.
	*/
	create(body = {}, options) {
		return this._client.post("/skills", maybeMultipartFormRequestOptions({
			body,
			...options,
			__security: { bearerAuth: true }
		}, this._client));
	}
	/**
	* Get a skill by its ID.
	*/
	retrieve(skillID, options) {
		return this._client.get(path`/skills/${skillID}`, {
			...options,
			__security: { bearerAuth: true }
		});
	}
	/**
	* Update the default version pointer for a skill.
	*/
	update(skillID, body, options) {
		return this._client.post(path`/skills/${skillID}`, {
			body,
			...options,
			__security: { bearerAuth: true }
		});
	}
	/**
	* List all skills for the current project.
	*/
	list(query = {}, options) {
		return this._client.getAPIList("/skills", CursorPage, {
			query,
			...options,
			__security: { bearerAuth: true }
		});
	}
	/**
	* Delete a skill by its ID.
	*/
	delete(skillID, options) {
		return this._client.delete(path`/skills/${skillID}`, {
			...options,
			__security: { bearerAuth: true }
		});
	}
};
Skills.Content = Content$1;
Skills.Versions = Versions;
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/uploads/parts.mjs
/**
* Use Uploads to upload large files in multiple parts.
*/
var Parts = class extends APIResource {
	/**
	* Adds a
	* [Part](https://platform.openai.com/docs/api-reference/uploads/part-object) to an
	* [Upload](https://platform.openai.com/docs/api-reference/uploads/object) object.
	* A Part represents a chunk of bytes from the file you are trying to upload.
	*
	* Each Part can be at most 64 MB, and you can add Parts until you hit the Upload
	* maximum of 8 GB.
	*
	* It is possible to add multiple Parts in parallel. You can decide the intended
	* order of the Parts when you
	* [complete the Upload](https://platform.openai.com/docs/api-reference/uploads/complete).
	*/
	create(uploadID, body, options) {
		return this._client.post(path`/uploads/${uploadID}/parts`, multipartFormRequestOptions({
			body,
			...options,
			__security: { bearerAuth: true }
		}, this._client));
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/uploads/uploads.mjs
/**
* Use Uploads to upload large files in multiple parts.
*/
var Uploads = class extends APIResource {
	constructor() {
		super(...arguments);
		this.parts = new Parts(this._client);
	}
	/**
	* Creates an intermediate
	* [Upload](https://platform.openai.com/docs/api-reference/uploads/object) object
	* that you can add
	* [Parts](https://platform.openai.com/docs/api-reference/uploads/part-object) to.
	* Currently, an Upload can accept at most 8 GB in total and expires after an hour
	* after you create it.
	*
	* Once you complete the Upload, we will create a
	* [File](https://platform.openai.com/docs/api-reference/files/object) object that
	* contains all the parts you uploaded. This File is usable in the rest of our
	* platform as a regular File object.
	*
	* For certain `purpose` values, the correct `mime_type` must be specified. Please
	* refer to documentation for the
	* [supported MIME types for your use case](https://platform.openai.com/docs/assistants/tools/file-search#supported-files).
	*
	* For guidance on the proper filename extensions for each purpose, please follow
	* the documentation on
	* [creating a File](https://platform.openai.com/docs/api-reference/files/create).
	*
	* Returns the Upload object with status `pending`.
	*/
	create(body, options) {
		return this._client.post("/uploads", {
			body,
			...options,
			__security: { bearerAuth: true }
		});
	}
	/**
	* Cancels the Upload. No Parts may be added after an Upload is cancelled.
	*
	* Returns the Upload object with status `cancelled`.
	*/
	cancel(uploadID, options) {
		return this._client.post(path`/uploads/${uploadID}/cancel`, {
			...options,
			__security: { bearerAuth: true }
		});
	}
	/**
	* Completes the
	* [Upload](https://platform.openai.com/docs/api-reference/uploads/object).
	*
	* Within the returned Upload object, there is a nested
	* [File](https://platform.openai.com/docs/api-reference/files/object) object that
	* is ready to use in the rest of the platform.
	*
	* You can specify the order of the Parts by passing in an ordered list of the Part
	* IDs.
	*
	* The number of bytes uploaded upon completion must match the number of bytes
	* initially specified when creating the Upload object. No Parts may be added after
	* an Upload is completed. Returns the Upload object with status `completed`,
	* including an additional `file` property containing the created usable File
	* object.
	*/
	complete(uploadID, body, options) {
		return this._client.post(path`/uploads/${uploadID}/complete`, {
			body,
			...options,
			__security: { bearerAuth: true }
		});
	}
};
Uploads.Parts = Parts;
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/lib/Util.mjs
/**
* Like `Promise.allSettled()` but throws an error if any promises are rejected.
*/
const allSettledWithThrow = async (promises) => {
	const results = await Promise.allSettled(promises);
	const rejected = results.filter((result) => result.status === "rejected");
	if (rejected.length) {
		for (const result of rejected) console.error(result.reason);
		throw new Error(`${rejected.length} promise(s) failed - see the above errors`);
	}
	const values = [];
	for (const result of results) if (result.status === "fulfilled") values.push(result.value);
	return values;
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/vector-stores/file-batches.mjs
var FileBatches = class extends APIResource {
	/**
	* Create a vector store file batch.
	*/
	create(vectorStoreID, body, options) {
		return this._client.post(path`/vector_stores/${vectorStoreID}/file_batches`, {
			body,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
			__security: { bearerAuth: true }
		});
	}
	/**
	* Retrieves a vector store file batch.
	*/
	retrieve(batchID, params, options) {
		const { vector_store_id } = params;
		return this._client.get(path`/vector_stores/${vector_store_id}/file_batches/${batchID}`, {
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
			__security: { bearerAuth: true }
		});
	}
	/**
	* Cancel a vector store file batch. This attempts to cancel the processing of
	* files in this batch as soon as possible.
	*/
	cancel(batchID, params, options) {
		const { vector_store_id } = params;
		return this._client.post(path`/vector_stores/${vector_store_id}/file_batches/${batchID}/cancel`, {
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
			__security: { bearerAuth: true }
		});
	}
	/**
	* Create a vector store batch and poll until all files have been processed.
	*/
	async createAndPoll(vectorStoreId, body, options) {
		const batch = await this.create(vectorStoreId, body);
		return await this.poll(vectorStoreId, batch.id, options);
	}
	/**
	* Returns a list of vector store files in a batch.
	*/
	listFiles(batchID, params, options) {
		const { vector_store_id, ...query } = params;
		return this._client.getAPIList(path`/vector_stores/${vector_store_id}/file_batches/${batchID}/files`, CursorPage, {
			query,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
			__security: { bearerAuth: true }
		});
	}
	/**
	* Wait for the given file batch to be processed.
	*
	* Note: this will return even if one of the files failed to process, you need to
	* check batch.file_counts.failed_count to handle this case.
	*/
	async poll(vectorStoreID, batchID, options) {
		const headers = buildHeaders([options?.headers, {
			"X-Stainless-Poll-Helper": "true",
			"X-Stainless-Custom-Poll-Interval": options?.pollIntervalMs?.toString() ?? void 0
		}]);
		while (true) {
			const { data: batch, response } = await this.retrieve(batchID, { vector_store_id: vectorStoreID }, {
				...options,
				headers
			}).withResponse();
			switch (batch.status) {
				case "in_progress":
					let sleepInterval = 5e3;
					if (options?.pollIntervalMs) sleepInterval = options.pollIntervalMs;
					else {
						const headerInterval = response.headers.get("openai-poll-after-ms");
						if (headerInterval) {
							const headerIntervalMs = parseInt(headerInterval);
							if (!isNaN(headerIntervalMs)) sleepInterval = headerIntervalMs;
						}
					}
					await sleep(sleepInterval);
					break;
				case "failed":
				case "cancelled":
				case "completed": return batch;
			}
		}
	}
	/**
	* Uploads the given files concurrently and then creates a vector store file batch.
	*
	* The concurrency limit is configurable using the `maxConcurrency` parameter.
	*/
	async uploadAndPoll(vectorStoreId, { files, fileIds = [] }, options) {
		if (files == null || files.length == 0) throw new Error(`No \`files\` provided to process. If you've already uploaded files you should use \`.createAndPoll()\` instead`);
		const configuredConcurrency = options?.maxConcurrency ?? 5;
		const concurrencyLimit = Math.min(configuredConcurrency, files.length);
		const client = this._client;
		const fileIterator = files.values();
		const allFileIds = [...fileIds];
		async function processFiles(iterator) {
			for (let item of iterator) {
				const fileObj = await client.files.create({
					file: item,
					purpose: "assistants"
				}, options);
				allFileIds.push(fileObj.id);
			}
		}
		await allSettledWithThrow(Array(concurrencyLimit).fill(fileIterator).map(processFiles));
		return await this.createAndPoll(vectorStoreId, { file_ids: allFileIds });
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/vector-stores/files.mjs
var Files = class extends APIResource {
	/**
	* Create a vector store file by attaching a
	* [File](https://platform.openai.com/docs/api-reference/files) to a
	* [vector store](https://platform.openai.com/docs/api-reference/vector-stores/object).
	*/
	create(vectorStoreID, body, options) {
		return this._client.post(path`/vector_stores/${vectorStoreID}/files`, {
			body,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
			__security: { bearerAuth: true }
		});
	}
	/**
	* Retrieves a vector store file.
	*/
	retrieve(fileID, params, options) {
		const { vector_store_id } = params;
		return this._client.get(path`/vector_stores/${vector_store_id}/files/${fileID}`, {
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
			__security: { bearerAuth: true }
		});
	}
	/**
	* Update attributes on a vector store file.
	*/
	update(fileID, params, options) {
		const { vector_store_id, ...body } = params;
		return this._client.post(path`/vector_stores/${vector_store_id}/files/${fileID}`, {
			body,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
			__security: { bearerAuth: true }
		});
	}
	/**
	* Returns a list of vector store files.
	*/
	list(vectorStoreID, query = {}, options) {
		return this._client.getAPIList(path`/vector_stores/${vectorStoreID}/files`, CursorPage, {
			query,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
			__security: { bearerAuth: true }
		});
	}
	/**
	* Delete a vector store file. This will remove the file from the vector store but
	* the file itself will not be deleted. To delete the file, use the
	* [delete file](https://platform.openai.com/docs/api-reference/files/delete)
	* endpoint.
	*/
	delete(fileID, params, options) {
		const { vector_store_id } = params;
		return this._client.delete(path`/vector_stores/${vector_store_id}/files/${fileID}`, {
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
			__security: { bearerAuth: true }
		});
	}
	/**
	* Attach a file to the given vector store and wait for it to be processed.
	*/
	async createAndPoll(vectorStoreId, body, options) {
		const file = await this.create(vectorStoreId, body, options);
		return await this.poll(vectorStoreId, file.id, options);
	}
	/**
	* Wait for the vector store file to finish processing.
	*
	* Note: this will return even if the file failed to process, you need to check
	* file.last_error and file.status to handle these cases
	*/
	async poll(vectorStoreID, fileID, options) {
		const headers = buildHeaders([options?.headers, {
			"X-Stainless-Poll-Helper": "true",
			"X-Stainless-Custom-Poll-Interval": options?.pollIntervalMs?.toString() ?? void 0
		}]);
		while (true) {
			const fileResponse = await this.retrieve(fileID, { vector_store_id: vectorStoreID }, {
				...options,
				headers
			}).withResponse();
			const file = fileResponse.data;
			switch (file.status) {
				case "in_progress":
					let sleepInterval = 5e3;
					if (options?.pollIntervalMs) sleepInterval = options.pollIntervalMs;
					else {
						const headerInterval = fileResponse.response.headers.get("openai-poll-after-ms");
						if (headerInterval) {
							const headerIntervalMs = parseInt(headerInterval);
							if (!isNaN(headerIntervalMs)) sleepInterval = headerIntervalMs;
						}
					}
					await sleep(sleepInterval);
					break;
				case "failed":
				case "completed": return file;
			}
		}
	}
	/**
	* Upload a file to the `files` API and then attach it to the given vector store.
	*
	* Note the file will be asynchronously processed (you can use the alternative
	* polling helper method to wait for processing to complete).
	*/
	async upload(vectorStoreId, file, options) {
		const fileInfo = await this._client.files.create({
			file,
			purpose: "assistants"
		}, options);
		return this.create(vectorStoreId, { file_id: fileInfo.id }, options);
	}
	/**
	* Add a file to a vector store and poll until processing is complete.
	*/
	async uploadAndPoll(vectorStoreId, file, options) {
		const fileInfo = await this.upload(vectorStoreId, file, options);
		return await this.poll(vectorStoreId, fileInfo.id, options);
	}
	/**
	* Retrieve the parsed contents of a vector store file.
	*/
	content(fileID, params, options) {
		const { vector_store_id } = params;
		return this._client.getAPIList(path`/vector_stores/${vector_store_id}/files/${fileID}/content`, Page, {
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
			__security: { bearerAuth: true }
		});
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/vector-stores/vector-stores.mjs
var VectorStores = class extends APIResource {
	constructor() {
		super(...arguments);
		this.files = new Files(this._client);
		this.fileBatches = new FileBatches(this._client);
	}
	/**
	* Create a vector store.
	*/
	create(body, options) {
		return this._client.post("/vector_stores", {
			body,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
			__security: { bearerAuth: true }
		});
	}
	/**
	* Retrieves a vector store.
	*/
	retrieve(vectorStoreID, options) {
		return this._client.get(path`/vector_stores/${vectorStoreID}`, {
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
			__security: { bearerAuth: true }
		});
	}
	/**
	* Modifies a vector store.
	*/
	update(vectorStoreID, body, options) {
		return this._client.post(path`/vector_stores/${vectorStoreID}`, {
			body,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
			__security: { bearerAuth: true }
		});
	}
	/**
	* Returns a list of vector stores.
	*/
	list(query = {}, options) {
		return this._client.getAPIList("/vector_stores", CursorPage, {
			query,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
			__security: { bearerAuth: true }
		});
	}
	/**
	* Delete a vector store.
	*/
	delete(vectorStoreID, options) {
		return this._client.delete(path`/vector_stores/${vectorStoreID}`, {
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
			__security: { bearerAuth: true }
		});
	}
	/**
	* Search a vector store for relevant chunks based on a query and file attributes
	* filter.
	*/
	search(vectorStoreID, body, options) {
		return this._client.getAPIList(path`/vector_stores/${vectorStoreID}/search`, Page, {
			body,
			method: "post",
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
			__security: { bearerAuth: true }
		});
	}
};
VectorStores.Files = Files;
VectorStores.FileBatches = FileBatches;
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/videos.mjs
var Videos = class extends APIResource {
	/**
	* Create a new video generation job from a prompt and optional reference assets.
	*/
	create(body, options) {
		return this._client.post("/videos", multipartFormRequestOptions({
			body,
			...options,
			__security: { bearerAuth: true }
		}, this._client));
	}
	/**
	* Fetch the latest metadata for a generated video.
	*/
	retrieve(videoID, options) {
		return this._client.get(path`/videos/${videoID}`, {
			...options,
			__security: { bearerAuth: true }
		});
	}
	/**
	* List recently generated videos for the current project.
	*/
	list(query = {}, options) {
		return this._client.getAPIList("/videos", ConversationCursorPage, {
			query,
			...options,
			__security: { bearerAuth: true }
		});
	}
	/**
	* Permanently delete a completed or failed video and its stored assets.
	*/
	delete(videoID, options) {
		return this._client.delete(path`/videos/${videoID}`, {
			...options,
			__security: { bearerAuth: true }
		});
	}
	/**
	* Create a character from an uploaded video.
	*/
	createCharacter(body, options) {
		return this._client.post("/videos/characters", multipartFormRequestOptions({
			body,
			...options,
			__security: { bearerAuth: true }
		}, this._client));
	}
	/**
	* Download the generated video bytes or a derived preview asset.
	*
	* Streams the rendered video content for the specified video job.
	*/
	downloadContent(videoID, query = {}, options) {
		return this._client.get(path`/videos/${videoID}/content`, {
			query,
			...options,
			headers: buildHeaders([{ Accept: "application/binary" }, options?.headers]),
			__security: { bearerAuth: true },
			__binaryResponse: true
		});
	}
	/**
	* Create a new video generation job by editing a source video or existing
	* generated video.
	*/
	edit(body, options) {
		return this._client.post("/videos/edits", multipartFormRequestOptions({
			body,
			...options,
			__security: { bearerAuth: true }
		}, this._client));
	}
	/**
	* Create an extension of a completed video.
	*/
	extend(body, options) {
		return this._client.post("/videos/extensions", multipartFormRequestOptions({
			body,
			...options,
			__security: { bearerAuth: true }
		}, this._client));
	}
	/**
	* Fetch a character.
	*/
	getCharacter(characterID, options) {
		return this._client.get(path`/videos/characters/${characterID}`, {
			...options,
			__security: { bearerAuth: true }
		});
	}
	/**
	* Create a remix of a completed video using a refreshed prompt.
	*/
	remix(videoID, body, options) {
		return this._client.post(path`/videos/${videoID}/remix`, maybeMultipartFormRequestOptions({
			body,
			...options,
			__security: { bearerAuth: true }
		}, this._client));
	}
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/resources/webhooks/webhooks.mjs
var _Webhooks_instances, _Webhooks_validateSecret, _Webhooks_getRequiredHeader;
var Webhooks = class extends APIResource {
	constructor() {
		super(...arguments);
		_Webhooks_instances.add(this);
	}
	/**
	* Validates that the given payload was sent by OpenAI and parses the payload.
	*/
	async unwrap(payload, headers, secret = this._client.webhookSecret, tolerance = 300) {
		await this.verifySignature(payload, headers, secret, tolerance);
		return JSON.parse(payload);
	}
	/**
	* Validates whether or not the webhook payload was sent by OpenAI.
	*
	* An error will be raised if the webhook payload was not sent by OpenAI.
	*
	* @param payload - The webhook payload
	* @param headers - The webhook headers
	* @param secret - The webhook secret (optional, will use client secret if not provided)
	* @param tolerance - Maximum age of the webhook in seconds (default: 300 = 5 minutes)
	*/
	async verifySignature(payload, headers, secret = this._client.webhookSecret, tolerance = 300) {
		if (typeof crypto === "undefined" || typeof crypto.subtle.importKey !== "function" || typeof crypto.subtle.verify !== "function") throw new Error("Webhook signature verification is only supported when the `crypto` global is defined");
		__classPrivateFieldGet(this, _Webhooks_instances, "m", _Webhooks_validateSecret).call(this, secret);
		const headersObj = buildHeaders([headers]).values;
		const signatureHeader = __classPrivateFieldGet(this, _Webhooks_instances, "m", _Webhooks_getRequiredHeader).call(this, headersObj, "webhook-signature");
		const timestamp = __classPrivateFieldGet(this, _Webhooks_instances, "m", _Webhooks_getRequiredHeader).call(this, headersObj, "webhook-timestamp");
		const webhookId = __classPrivateFieldGet(this, _Webhooks_instances, "m", _Webhooks_getRequiredHeader).call(this, headersObj, "webhook-id");
		const timestampSeconds = parseInt(timestamp, 10);
		if (isNaN(timestampSeconds)) throw new InvalidWebhookSignatureError("Invalid webhook timestamp format");
		const nowSeconds = Math.floor(Date.now() / 1e3);
		if (nowSeconds - timestampSeconds > tolerance) throw new InvalidWebhookSignatureError("Webhook timestamp is too old");
		if (timestampSeconds > nowSeconds + tolerance) throw new InvalidWebhookSignatureError("Webhook timestamp is too new");
		const signatures = signatureHeader.split(" ").map((part) => part.startsWith("v1,") ? part.substring(3) : part);
		const decodedSecret = secret.startsWith("whsec_") ? Buffer.from(secret.replace("whsec_", ""), "base64") : Buffer.from(secret, "utf-8");
		const signedPayload = webhookId ? `${webhookId}.${timestamp}.${payload}` : `${timestamp}.${payload}`;
		const key = await crypto.subtle.importKey("raw", decodedSecret, {
			name: "HMAC",
			hash: "SHA-256"
		}, false, ["verify"]);
		for (const signature of signatures) try {
			const signatureBytes = Buffer.from(signature, "base64");
			if (await crypto.subtle.verify("HMAC", key, signatureBytes, new TextEncoder().encode(signedPayload))) return;
		} catch {
			continue;
		}
		throw new InvalidWebhookSignatureError("The given webhook signature does not match the expected signature");
	}
};
_Webhooks_instances = /* @__PURE__ */ new WeakSet(), _Webhooks_validateSecret = function _Webhooks_validateSecret(secret) {
	if (typeof secret !== "string" || secret.length === 0) throw new Error(`The webhook secret must either be set using the env var, OPENAI_WEBHOOK_SECRET, on the client class, OpenAI({ webhookSecret: '123' }), or passed to this function`);
}, _Webhooks_getRequiredHeader = function _Webhooks_getRequiredHeader(headers, name) {
	if (!headers) throw new Error(`Headers are required`);
	const value = headers.get(name);
	if (value === null || value === void 0) throw new Error(`Missing required header: ${name}`);
	return value;
};
//#endregion
//#region ../../node_modules/.pnpm/openai@6.42.0_zod@4.4.3/node_modules/openai/client.mjs
var _OpenAI_instances, _a, _OpenAI_encoder, _OpenAI_baseURLOverridden;
const WORKLOAD_IDENTITY_API_KEY_PLACEHOLDER = "workload-identity-auth";
/**
* API Client for interfacing with the OpenAI API.
*/
var OpenAI = class {
	/**
	* API Client for interfacing with the OpenAI API.
	*
	* @param {string | null | undefined} [opts.apiKey=process.env['OPENAI_API_KEY'] ?? null]
	* @param {string | null | undefined} [opts.adminAPIKey=process.env['OPENAI_ADMIN_KEY'] ?? null]
	* @param {string | null | undefined} [opts.organization=process.env['OPENAI_ORG_ID'] ?? null]
	* @param {string | null | undefined} [opts.project=process.env['OPENAI_PROJECT_ID'] ?? null]
	* @param {string | null | undefined} [opts.webhookSecret=process.env['OPENAI_WEBHOOK_SECRET'] ?? null]
	* @param {string} [opts.baseURL=process.env['OPENAI_BASE_URL'] ?? https://api.openai.com/v1] - Override the default base URL for the API.
	* @param {number} [opts.timeout=10 minutes] - The maximum amount of time (in milliseconds) the client will wait for a response before timing out.
	* @param {MergedRequestInit} [opts.fetchOptions] - Additional `RequestInit` options to be passed to `fetch` calls.
	* @param {Fetch} [opts.fetch] - Specify a custom `fetch` function implementation.
	* @param {number} [opts.maxRetries=2] - The maximum number of times the client will retry a request.
	* @param {HeadersLike} opts.defaultHeaders - Default headers to include with every request to the API.
	* @param {Record<string, string | undefined>} opts.defaultQuery - Default query parameters to include with every request to the API.
	* @param {boolean} [opts.dangerouslyAllowBrowser=false] - By default, client-side use of this library is not allowed, as it risks exposing your secret API credentials to attackers.
	*/
	constructor({ baseURL = readEnv("OPENAI_BASE_URL"), apiKey = readEnv("OPENAI_API_KEY") ?? null, adminAPIKey = readEnv("OPENAI_ADMIN_KEY") ?? null, organization = readEnv("OPENAI_ORG_ID") ?? null, project = readEnv("OPENAI_PROJECT_ID") ?? null, webhookSecret = readEnv("OPENAI_WEBHOOK_SECRET") ?? null, workloadIdentity, ...opts } = {}) {
		_OpenAI_instances.add(this);
		_OpenAI_encoder.set(this, void 0);
		/**
		* Given a prompt, the model will return one or more predicted completions, and can also return the probabilities of alternative tokens at each position.
		*/
		this.completions = new Completions(this);
		this.chat = new Chat(this);
		/**
		* Get a vector representation of a given input that can be easily consumed by machine learning models and algorithms.
		*/
		this.embeddings = new Embeddings(this);
		/**
		* Files are used to upload documents that can be used with features like Assistants and Fine-tuning.
		*/
		this.files = new Files$1(this);
		/**
		* Given a prompt and/or an input image, the model will generate a new image.
		*/
		this.images = new Images(this);
		this.audio = new Audio(this);
		/**
		* Given text and/or image inputs, classifies if those inputs are potentially harmful.
		*/
		this.moderations = new Moderations(this);
		/**
		* List and describe the various models available in the API.
		*/
		this.models = new Models(this);
		this.fineTuning = new FineTuning(this);
		this.graders = new Graders(this);
		this.vectorStores = new VectorStores(this);
		this.webhooks = new Webhooks(this);
		this.beta = new Beta(this);
		/**
		* Create large batches of API requests to run asynchronously.
		*/
		this.batches = new Batches(this);
		/**
		* Use Uploads to upload large files in multiple parts.
		*/
		this.uploads = new Uploads(this);
		this.admin = new Admin(this);
		this.responses = new Responses(this);
		this.realtime = new Realtime(this);
		/**
		* Manage conversations and conversation items.
		*/
		this.conversations = new Conversations(this);
		/**
		* Manage and run evals in the OpenAI platform.
		*/
		this.evals = new Evals(this);
		this.containers = new Containers(this);
		this.skills = new Skills(this);
		this.videos = new Videos(this);
		const options = {
			apiKey,
			adminAPIKey,
			organization,
			project,
			webhookSecret,
			workloadIdentity,
			...opts,
			baseURL: baseURL || `https://api.openai.com/v1`
		};
		if (apiKey && workloadIdentity) throw new OpenAIError("The `apiKey` and `workloadIdentity` options are mutually exclusive");
		if (!apiKey && !adminAPIKey && !workloadIdentity) throw new OpenAIError("Missing credentials. Please pass an `apiKey`, `workloadIdentity`, `adminAPIKey`, or set the `OPENAI_API_KEY` or `OPENAI_ADMIN_KEY` environment variable.");
		if (!options.dangerouslyAllowBrowser && isRunningInBrowser()) throw new OpenAIError("It looks like you're running in a browser-like environment.\n\nThis is disabled by default, as it risks exposing your secret API credentials to attackers.\nIf you understand the risks and have appropriate mitigations in place,\nyou can set the `dangerouslyAllowBrowser` option to `true`, e.g.,\n\nnew OpenAI({ apiKey, dangerouslyAllowBrowser: true });\n\nhttps://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety\n");
		this.baseURL = options.baseURL;
		this.timeout = options.timeout ?? _a.DEFAULT_TIMEOUT;
		this.logger = options.logger ?? console;
		const defaultLogLevel = "warn";
		this.logLevel = defaultLogLevel;
		this.logLevel = parseLogLevel(options.logLevel, "ClientOptions.logLevel", this) ?? parseLogLevel(readEnv("OPENAI_LOG"), "process.env['OPENAI_LOG']", this) ?? defaultLogLevel;
		this.fetchOptions = options.fetchOptions;
		this.maxRetries = options.maxRetries ?? 2;
		this.fetch = options.fetch ?? getDefaultFetch();
		__classPrivateFieldSet(this, _OpenAI_encoder, FallbackEncoder, "f");
		const customHeadersEnv = readEnv("OPENAI_CUSTOM_HEADERS");
		if (customHeadersEnv) {
			const parsed = {};
			for (const line of customHeadersEnv.split("\n")) {
				const colon = line.indexOf(":");
				if (colon >= 0) parsed[line.substring(0, colon).trim()] = line.substring(colon + 1).trim();
			}
			options.defaultHeaders = buildHeaders([parsed, options.defaultHeaders]);
		}
		this._options = options;
		if (workloadIdentity) this._workloadIdentityAuth = new WorkloadIdentityAuth(workloadIdentity, this.fetch);
		this.apiKey = typeof apiKey === "string" ? apiKey : null;
		this.adminAPIKey = adminAPIKey;
		this.organization = organization;
		this.project = project;
		this.webhookSecret = webhookSecret;
	}
	/**
	* Create a new client instance re-using the same options given to the current client with optional overriding.
	*/
	withOptions(options) {
		return new this.constructor({
			...this._options,
			baseURL: this.baseURL,
			maxRetries: this.maxRetries,
			timeout: this.timeout,
			logger: this.logger,
			logLevel: this.logLevel,
			fetch: this.fetch,
			fetchOptions: this.fetchOptions,
			apiKey: this._options.apiKey,
			adminAPIKey: this.adminAPIKey,
			workloadIdentity: this._options.workloadIdentity,
			organization: this.organization,
			project: this.project,
			webhookSecret: this.webhookSecret,
			...options
		});
	}
	defaultQuery() {
		return this._options.defaultQuery;
	}
	validateHeaders({ values, nulls }, schemes = {
		bearerAuth: true,
		adminAPIKeyAuth: true
	}) {
		if (values.get("authorization") || values.get("api-key")) return;
		if (nulls.has("authorization") || nulls.has("api-key")) return;
		if (this._workloadIdentityAuth && schemes.bearerAuth) return;
		throw new Error("Could not resolve authentication method. Expected either apiKey or adminAPIKey to be set. Or for one of the \"Authorization\" or \"api-key\" headers to be explicitly omitted");
	}
	async authHeaders(opts, schemes = {
		bearerAuth: true,
		adminAPIKeyAuth: true
	}) {
		return buildHeaders([schemes.bearerAuth ? await this.bearerAuth(opts) : null, schemes.adminAPIKeyAuth ? await this.adminAPIKeyAuth(opts) : null]);
	}
	async bearerAuth(opts) {
		if (this._workloadIdentityAuth) return buildHeaders([{ Authorization: `Bearer ${await this._workloadIdentityAuth.getToken()}` }]);
		if (this.apiKey == null) return;
		return buildHeaders([{ Authorization: `Bearer ${this.apiKey}` }]);
	}
	async adminAPIKeyAuth(opts) {
		if (this.adminAPIKey == null) return;
		return buildHeaders([{ Authorization: `Bearer ${this.adminAPIKey}` }]);
	}
	stringifyQuery(query) {
		return stringifyQuery(query);
	}
	getUserAgent() {
		return `${this.constructor.name}/JS ${VERSION}`;
	}
	defaultIdempotencyKey() {
		return `stainless-node-retry-${uuid4()}`;
	}
	makeStatusError(status, error, message, headers) {
		return APIError.generate(status, error, message, headers);
	}
	async _callApiKey() {
		const apiKey = this._options.apiKey;
		if (typeof apiKey !== "function") return false;
		let token;
		try {
			token = await apiKey();
		} catch (err) {
			if (err instanceof OpenAIError) throw err;
			throw new OpenAIError(`Failed to get token from 'apiKey' function: ${err.message}`, { cause: err });
		}
		if (typeof token !== "string" || !token) throw new OpenAIError(`Expected 'apiKey' function argument to return a string but it returned ${token}`);
		this.apiKey = token;
		return true;
	}
	buildURL(path, query, defaultBaseURL) {
		const baseURL = !__classPrivateFieldGet(this, _OpenAI_instances, "m", _OpenAI_baseURLOverridden).call(this) && defaultBaseURL || this.baseURL;
		const url = isAbsoluteURL(path) ? new URL(path) : new URL(baseURL + (baseURL.endsWith("/") && path.startsWith("/") ? path.slice(1) : path));
		const defaultQuery = this.defaultQuery();
		const pathQuery = Object.fromEntries(url.searchParams);
		if (!isEmptyObj(defaultQuery) || !isEmptyObj(pathQuery)) query = {
			...pathQuery,
			...defaultQuery,
			...query
		};
		if (typeof query === "object" && query && !Array.isArray(query)) url.search = this.stringifyQuery(query);
		return url.toString();
	}
	/**
	* Used as a callback for mutating the given `FinalRequestOptions` object.
	*/
	async prepareOptions(options) {
		if ((options.__security ?? { bearerAuth: true }).bearerAuth) await this._callApiKey();
	}
	/**
	* Used as a callback for mutating the given `RequestInit` object.
	*
	* This is useful for cases where you want to add certain headers based off of
	* the request properties, e.g. `method` or `url`.
	*/
	async prepareRequest(request, { url, options }) {}
	get(path, opts) {
		return this.methodRequest("get", path, opts);
	}
	post(path, opts) {
		return this.methodRequest("post", path, opts);
	}
	patch(path, opts) {
		return this.methodRequest("patch", path, opts);
	}
	put(path, opts) {
		return this.methodRequest("put", path, opts);
	}
	delete(path, opts) {
		return this.methodRequest("delete", path, opts);
	}
	methodRequest(method, path, opts) {
		return this.request(Promise.resolve(opts).then((opts) => {
			return {
				method,
				path,
				...opts
			};
		}));
	}
	request(options, remainingRetries = null) {
		return new APIPromise(this, this.makeRequest(options, remainingRetries, void 0));
	}
	async makeRequest(optionsInput, retriesRemaining, retryOfRequestLogID) {
		const options = await optionsInput;
		const maxRetries = options.maxRetries ?? this.maxRetries;
		if (retriesRemaining == null) retriesRemaining = maxRetries;
		await this.prepareOptions(options);
		const { req, url, timeout } = await this.buildRequest(options, { retryCount: maxRetries - retriesRemaining });
		await this.prepareRequest(req, {
			url,
			options
		});
		/** Not an API request ID, just for correlating local log entries. */
		const requestLogID = "log_" + (Math.random() * (1 << 24) | 0).toString(16).padStart(6, "0");
		const retryLogStr = retryOfRequestLogID === void 0 ? "" : `, retryOf: ${retryOfRequestLogID}`;
		const startTime = Date.now();
		loggerFor(this).debug(`[${requestLogID}] sending request`, formatRequestDetails({
			retryOfRequestLogID,
			method: options.method,
			url,
			options,
			headers: req.headers
		}));
		if (options.signal?.aborted) throw new APIUserAbortError();
		const security = options.__security ?? { bearerAuth: true };
		const controller = new AbortController();
		const response = await this.fetchWithAuth(url, req, timeout, controller, security).catch(castToError);
		const headersTime = Date.now();
		if (response instanceof globalThis.Error) {
			const retryMessage = `retrying, ${retriesRemaining} attempts remaining`;
			if (options.signal?.aborted) throw new APIUserAbortError();
			const isTimeout = isAbortError(response) || /timed? ?out/i.test(String(response) + ("cause" in response ? String(response.cause) : ""));
			if (retriesRemaining) {
				loggerFor(this).info(`[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} - ${retryMessage}`);
				loggerFor(this).debug(`[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} (${retryMessage})`, formatRequestDetails({
					retryOfRequestLogID,
					url,
					durationMs: headersTime - startTime,
					message: response.message
				}));
				return this.retryRequest(options, retriesRemaining, retryOfRequestLogID ?? requestLogID);
			}
			loggerFor(this).info(`[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} - error; no more retries left`);
			loggerFor(this).debug(`[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} (error; no more retries left)`, formatRequestDetails({
				retryOfRequestLogID,
				url,
				durationMs: headersTime - startTime,
				message: response.message
			}));
			if (response instanceof OAuthError || response instanceof SubjectTokenProviderError) throw response;
			if (isTimeout) throw new APIConnectionTimeoutError();
			throw new APIConnectionError({
				message: getConnectionErrorMessage(response),
				cause: response
			});
		}
		const responseInfo = `[${requestLogID}${retryLogStr}${[...response.headers.entries()].filter(([name]) => name === "x-request-id").map(([name, value]) => ", " + name + ": " + JSON.stringify(value)).join("")}] ${req.method} ${url} ${response.ok ? "succeeded" : "failed"} with status ${response.status} in ${headersTime - startTime}ms`;
		if (!response.ok) {
			if (response.status === 401 && this._workloadIdentityAuth && security.bearerAuth && !options.__metadata?.["hasStreamingBody"] && !options.__metadata?.["workloadIdentityTokenRefreshed"]) {
				await CancelReadableStream(response.body);
				this._workloadIdentityAuth.invalidateToken();
				return this.makeRequest({
					...options,
					__metadata: {
						...options.__metadata,
						workloadIdentityTokenRefreshed: true
					}
				}, retriesRemaining, retryOfRequestLogID ?? requestLogID);
			}
			const shouldRetry = await this.shouldRetry(response);
			if (retriesRemaining && shouldRetry) {
				const retryMessage = `retrying, ${retriesRemaining} attempts remaining`;
				await CancelReadableStream(response.body);
				loggerFor(this).info(`${responseInfo} - ${retryMessage}`);
				loggerFor(this).debug(`[${requestLogID}] response error (${retryMessage})`, formatRequestDetails({
					retryOfRequestLogID,
					url: response.url,
					status: response.status,
					headers: response.headers,
					durationMs: headersTime - startTime
				}));
				return this.retryRequest(options, retriesRemaining, retryOfRequestLogID ?? requestLogID, response.headers);
			}
			const retryMessage = shouldRetry ? `error; no more retries left` : `error; not retryable`;
			loggerFor(this).info(`${responseInfo} - ${retryMessage}`);
			const errText = await response.text().catch((err) => castToError(err).message);
			const errJSON = safeJSON(errText);
			const errMessage = errJSON ? void 0 : errText;
			loggerFor(this).debug(`[${requestLogID}] response error (${retryMessage})`, formatRequestDetails({
				retryOfRequestLogID,
				url: response.url,
				status: response.status,
				headers: response.headers,
				message: errMessage,
				durationMs: Date.now() - startTime
			}));
			throw this.makeStatusError(response.status, errJSON, errMessage, response.headers);
		}
		loggerFor(this).info(responseInfo);
		loggerFor(this).debug(`[${requestLogID}] response start`, formatRequestDetails({
			retryOfRequestLogID,
			url: response.url,
			status: response.status,
			headers: response.headers,
			durationMs: headersTime - startTime
		}));
		return {
			response,
			options,
			controller,
			requestLogID,
			retryOfRequestLogID,
			startTime
		};
	}
	getAPIList(path, Page, opts) {
		return this.requestAPIList(Page, opts && "then" in opts ? opts.then((opts) => ({
			method: "get",
			path,
			...opts
		})) : {
			method: "get",
			path,
			...opts
		});
	}
	requestAPIList(Page, options) {
		const request = this.makeRequest(options, null, void 0);
		return new PagePromise(this, request, Page);
	}
	async fetchWithAuth(url, init, timeout, controller, schemes = {
		bearerAuth: true,
		adminAPIKeyAuth: true
	}) {
		if (this._workloadIdentityAuth && schemes.bearerAuth) {
			const headers = init.headers;
			const authHeader = headers.get("Authorization");
			if (!authHeader || authHeader === `Bearer ${WORKLOAD_IDENTITY_API_KEY_PLACEHOLDER}`) {
				const token = await this._workloadIdentityAuth.getToken();
				headers.set("Authorization", `Bearer ${token}`);
			}
		}
		return await this.fetchWithTimeout(url, init, timeout, controller);
	}
	async fetchWithTimeout(url, init, ms, controller) {
		const { signal, method, ...options } = init || {};
		const abort = this._makeAbort(controller);
		if (signal) signal.addEventListener("abort", abort, { once: true });
		const timeout = setTimeout(abort, ms);
		const isReadableBody = globalThis.ReadableStream && options.body instanceof globalThis.ReadableStream || typeof options.body === "object" && options.body !== null && Symbol.asyncIterator in options.body;
		const fetchOptions = {
			signal: controller.signal,
			...isReadableBody ? { duplex: "half" } : {},
			method: "GET",
			...options
		};
		if (method) fetchOptions.method = method.toUpperCase();
		try {
			return await this.fetch.call(void 0, url, fetchOptions);
		} finally {
			clearTimeout(timeout);
		}
	}
	async shouldRetry(response) {
		const shouldRetryHeader = response.headers.get("x-should-retry");
		if (shouldRetryHeader === "true") return true;
		if (shouldRetryHeader === "false") return false;
		if (response.status === 408) return true;
		if (response.status === 409) return true;
		if (response.status === 429) return true;
		if (response.status >= 500) return true;
		return false;
	}
	async retryRequest(options, retriesRemaining, requestLogID, responseHeaders) {
		let timeoutMillis;
		const retryAfterMillisHeader = responseHeaders?.get("retry-after-ms");
		if (retryAfterMillisHeader) {
			const timeoutMs = parseFloat(retryAfterMillisHeader);
			if (!Number.isNaN(timeoutMs)) timeoutMillis = timeoutMs;
		}
		const retryAfterHeader = responseHeaders?.get("retry-after");
		if (retryAfterHeader && !timeoutMillis) {
			const timeoutSeconds = parseFloat(retryAfterHeader);
			if (!Number.isNaN(timeoutSeconds)) timeoutMillis = timeoutSeconds * 1e3;
			else timeoutMillis = Date.parse(retryAfterHeader) - Date.now();
		}
		if (timeoutMillis === void 0) {
			const maxRetries = options.maxRetries ?? this.maxRetries;
			timeoutMillis = this.calculateDefaultRetryTimeoutMillis(retriesRemaining, maxRetries);
		}
		await sleep(timeoutMillis);
		return this.makeRequest(options, retriesRemaining - 1, requestLogID);
	}
	calculateDefaultRetryTimeoutMillis(retriesRemaining, maxRetries) {
		const initialRetryDelay = .5;
		const maxRetryDelay = 8;
		const numRetries = maxRetries - retriesRemaining;
		return Math.min(initialRetryDelay * Math.pow(2, numRetries), maxRetryDelay) * (1 - Math.random() * .25) * 1e3;
	}
	async buildRequest(inputOptions, { retryCount = 0 } = {}) {
		const options = { ...inputOptions };
		const { method, path, query, defaultBaseURL } = options;
		const url = this.buildURL(path, query, defaultBaseURL);
		if ("timeout" in options) validatePositiveInteger("timeout", options.timeout);
		options.timeout = options.timeout ?? this.timeout;
		const { bodyHeaders, body, isStreamingBody } = this.buildBody({ options });
		if (isStreamingBody) inputOptions.__metadata = {
			...inputOptions.__metadata,
			hasStreamingBody: true
		};
		return {
			req: {
				method,
				headers: await this.buildHeaders({
					options: inputOptions,
					method,
					bodyHeaders,
					retryCount
				}),
				...options.signal && { signal: options.signal },
				...globalThis.ReadableStream && body instanceof globalThis.ReadableStream && { duplex: "half" },
				...body && { body },
				...this.fetchOptions ?? {},
				...options.fetchOptions ?? {}
			},
			url,
			timeout: options.timeout
		};
	}
	async buildHeaders({ options, method, bodyHeaders, retryCount }) {
		let idempotencyHeaders = {};
		if (this.idempotencyHeader && method !== "get") {
			if (!options.idempotencyKey) options.idempotencyKey = this.defaultIdempotencyKey();
			idempotencyHeaders[this.idempotencyHeader] = options.idempotencyKey;
		}
		const headers = buildHeaders([
			idempotencyHeaders,
			{
				Accept: "application/json",
				"User-Agent": this.getUserAgent(),
				"X-Stainless-Retry-Count": String(retryCount),
				...options.timeout ? { "X-Stainless-Timeout": String(Math.trunc(options.timeout / 1e3)) } : {},
				...getPlatformHeaders(),
				"OpenAI-Organization": this.organization,
				"OpenAI-Project": this.project
			},
			await this.authHeaders(options, options.__security ?? { bearerAuth: true }),
			this._options.defaultHeaders,
			bodyHeaders,
			options.headers
		]);
		this.validateHeaders(headers, options.__security ?? { bearerAuth: true });
		return headers.values;
	}
	_makeAbort(controller) {
		return () => controller.abort();
	}
	buildBody({ options: { body, headers: rawHeaders } }) {
		if (!body) return {
			bodyHeaders: void 0,
			body: void 0,
			isStreamingBody: false
		};
		const headers = buildHeaders([rawHeaders]);
		const isReadableStream = typeof globalThis.ReadableStream !== "undefined" && body instanceof globalThis.ReadableStream;
		const isRetryableBody = !isReadableStream && (typeof body === "string" || body instanceof ArrayBuffer || ArrayBuffer.isView(body) || typeof globalThis.Blob !== "undefined" && body instanceof globalThis.Blob || body instanceof URLSearchParams || body instanceof FormData);
		if (ArrayBuffer.isView(body) || body instanceof ArrayBuffer || body instanceof DataView || typeof body === "string" && headers.values.has("content-type") || globalThis.Blob && body instanceof globalThis.Blob || body instanceof FormData || body instanceof URLSearchParams || isReadableStream) return {
			bodyHeaders: void 0,
			body,
			isStreamingBody: !isRetryableBody
		};
		else if (typeof body === "object" && (Symbol.asyncIterator in body || Symbol.iterator in body && "next" in body && typeof body.next === "function")) return {
			bodyHeaders: void 0,
			body: ReadableStreamFrom(body),
			isStreamingBody: true
		};
		else if (typeof body === "object" && headers.values.get("content-type") === "application/x-www-form-urlencoded") return {
			bodyHeaders: { "content-type": "application/x-www-form-urlencoded" },
			body: this.stringifyQuery(body),
			isStreamingBody: false
		};
		else return {
			...__classPrivateFieldGet(this, _OpenAI_encoder, "f").call(this, {
				body,
				headers
			}),
			isStreamingBody: false
		};
	}
};
_a = OpenAI, _OpenAI_encoder = /* @__PURE__ */ new WeakMap(), _OpenAI_instances = /* @__PURE__ */ new WeakSet(), _OpenAI_baseURLOverridden = function _OpenAI_baseURLOverridden() {
	return this.baseURL !== "https://api.openai.com/v1";
};
OpenAI.OpenAI = _a;
OpenAI.DEFAULT_TIMEOUT = 6e5;
OpenAI.OpenAIError = OpenAIError;
OpenAI.APIError = APIError;
OpenAI.APIConnectionError = APIConnectionError;
OpenAI.APIConnectionTimeoutError = APIConnectionTimeoutError;
OpenAI.APIUserAbortError = APIUserAbortError;
OpenAI.NotFoundError = NotFoundError;
OpenAI.ConflictError = ConflictError;
OpenAI.RateLimitError = RateLimitError;
OpenAI.BadRequestError = BadRequestError;
OpenAI.AuthenticationError = AuthenticationError;
OpenAI.InternalServerError = InternalServerError;
OpenAI.PermissionDeniedError = PermissionDeniedError;
OpenAI.UnprocessableEntityError = UnprocessableEntityError;
OpenAI.InvalidWebhookSignatureError = InvalidWebhookSignatureError;
OpenAI.toFile = toFile;
OpenAI.Completions = Completions;
OpenAI.Chat = Chat;
OpenAI.Embeddings = Embeddings;
OpenAI.Files = Files$1;
OpenAI.Images = Images;
OpenAI.Audio = Audio;
OpenAI.Moderations = Moderations;
OpenAI.Models = Models;
OpenAI.FineTuning = FineTuning;
OpenAI.Graders = Graders;
OpenAI.VectorStores = VectorStores;
OpenAI.Webhooks = Webhooks;
OpenAI.Beta = Beta;
OpenAI.Batches = Batches;
OpenAI.Uploads = Uploads;
OpenAI.Admin = Admin;
OpenAI.Responses = Responses;
OpenAI.Realtime = Realtime;
OpenAI.Conversations = Conversations;
OpenAI.Evals = Evals;
OpenAI.Containers = Containers;
OpenAI.Skills = Skills;
OpenAI.Videos = Videos;
function getConnectionErrorMessage(error) {
	if (isUndiciDispatcherVersionMismatchError(error)) return `Connection error. This may be caused by passing an undici dispatcher, such as ProxyAgent, that is incompatible with the fetch implementation. If you are using undici's ProxyAgent, pass the fetch implementation from the same undici package: import { fetch, ProxyAgent } from 'undici'; new OpenAI({ fetch, fetchOptions: { dispatcher: new ProxyAgent(...) } });`;
}
function isUndiciDispatcherVersionMismatchError(error) {
	let current = error;
	for (let i = 0; i < 8 && current && typeof current === "object"; i++) {
		const err = current;
		if (err.code === "UND_ERR_INVALID_ARG" && typeof err.message === "string" && err.message.includes("invalid onRequestStart method")) return true;
		current = err.cause;
	}
	return false;
}
//#endregion
//#region ../../packages/api/src/routers/ai-prompts.ts
const GUIDANCE_PROMPT = `你是一名专业的测量仪器操作助手，专注于全站仪和 GPS 设备的操作指引。
用户正在使用 Node-RED 低代码测量平台进行野外作业。

你的职责：
- 根据用户当前操作步骤，给出清晰、分步的操作指引
- 解释界面功能和参数含义
- 提醒可能的操作误区和注意事项
- 全程使用中文，技术术语附英文括注

语气：简洁专业，适合野外作业场景（不依赖复杂格式）。`;
const QA_PROMPT = `你是一名测绘仪器疑难解答专家，熟悉《工程测量规范》（GB 50026）、《全球定位系统测量规范》（GB/T 18314）等国家标准。

你的职责：
- 解答全站仪、GPS/GNSS 设备的故障诊断和参数设置问题
- 引用相关国家标准和行业规范给出权威解答
- 提供可操作的排查步骤
- 全程使用中文

若问题超出测绘领域，礼貌说明并引导回到测绘主题。`;
const ANALYSIS_PROMPT = `你是一名测量数据分析专家，专注于测量误差分析和精度评估。

你的职责：
- 对提供的测量数据进行统计分析（均值、标准差、中误差）
- 识别粗差和系统误差
- 评估测量成果是否满足精度要求
- 给出改善测量精度的建议
- 全程使用中文，分析结果以结构化方式输出

若用户提供了测量上下文数据，优先基于该数据进行分析。`;
function buildSystemPrompt(mode, measurementContext) {
	const basePrompt = mode === "guidance" ? GUIDANCE_PROMPT : mode === "qa" ? QA_PROMPT : ANALYSIS_PROMPT;
	if (mode === "analysis" && measurementContext) return `${basePrompt}\n\n当前测量数据上下文：\n\`\`\`json\n${measurementContext}\n\`\`\``;
	return basePrompt;
}
//#endregion
//#region ../../packages/api/src/routers/ai.ts
const openaiClient = new OpenAI({
	apiKey: env.OPENAI_API_KEY,
	...env.OPENAI_BASE_URL ? { baseURL: env.OPENAI_BASE_URL } : {}
});
const messageSchema = z.object({
	role: z.enum(["user", "assistant"]),
	content: z.string().max(2e3)
});
const aiRouter = router({ chat: protectedProcedure.input(z.object({
	mode: z.enum([
		"guidance",
		"qa",
		"analysis"
	]),
	messages: z.array(messageSchema).min(1).max(50),
	measurementContext: z.string().max(1e4).optional()
})).mutation(async function* ({ input }) {
	const systemPrompt = buildSystemPrompt(input.mode, input.measurementContext);
	let stream;
	try {
		stream = await openaiClient.chat.completions.create({
			model: "gpt-4o",
			stream: true,
			messages: [{
				role: "system",
				content: systemPrompt
			}, ...input.messages]
		});
	} catch (err) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to connect to AI service",
			cause: err
		});
	}
	for await (const chunk of stream) {
		const delta = chunk.choices[0]?.delta?.content;
		if (delta) yield delta;
	}
}) });
//#endregion
//#region ../../packages/api/src/routers/todo.ts
const todoRouter = router({
	getAll: publicProcedure.query(async () => {
		return await db.select().from(todo);
	}),
	create: publicProcedure.input(z$1.object({ text: z$1.string().min(1) })).mutation(async ({ input }) => {
		return await db.insert(todo).values({ text: input.text });
	}),
	toggle: publicProcedure.input(z$1.object({
		id: z$1.number(),
		completed: z$1.boolean()
	})).mutation(async ({ input }) => {
		return await db.update(todo).set({ completed: input.completed }).where(eq(todo.id, input.id));
	}),
	delete: publicProcedure.input(z$1.object({ id: z$1.number() })).mutation(async ({ input }) => {
		return await db.delete(todo).where(eq(todo.id, input.id));
	})
});
//#endregion
//#region ../../packages/api/src/routers/users.ts
const DEFAULT_ORG_ID = "default-org";
const roleSchema = z.enum([
	"admin",
	"student",
	"researcher"
]);
const usersRouter = router({
	list: adminProcedure.query(async () => {
		return await db.select({
			id: user.id,
			name: user.name,
			email: user.email,
			createdAt: user.createdAt,
			role: member.role
		}).from(user).leftJoin(member, and(eq(member.userId, user.id), eq(member.organizationId, DEFAULT_ORG_ID))).orderBy(user.createdAt);
	}),
	updateRole: adminProcedure.input(z.object({
		userId: z.string(),
		role: roleSchema
	})).mutation(async ({ input }) => {
		await db.insert(member).values({
			id: crypto.randomUUID(),
			organizationId: DEFAULT_ORG_ID,
			userId: input.userId,
			role: input.role,
			createdAt: /* @__PURE__ */ new Date()
		}).onConflictDoUpdate({
			target: [member.userId, member.organizationId],
			set: { role: input.role }
		});
		return { success: true };
	}),
	deactivate: adminProcedure.input(z.object({ userId: z.string() })).mutation(async ({ input, ctx }) => {
		if (ctx.session.user.id === input.userId) throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Cannot deactivate your own account"
		});
		await db.delete(member).where(and(eq(member.userId, input.userId), eq(member.organizationId, DEFAULT_ORG_ID)));
		return { success: true };
	})
});
//#endregion
//#region ../../packages/api/src/routers/index.ts
const appRouter = router({
	healthCheck: publicProcedure.query(() => {
		return "OK";
	}),
	privateData: protectedProcedure.query(({ ctx }) => {
		return {
			message: "This is private",
			user: ctx.session.user
		};
	}),
	ai: aiRouter,
	todo: todoRouter,
	users: usersRouter
});
//#endregion
//#region src/app.ts
const app = new Hono();
app.use(logger());
app.use("/*", cors({
	origin: env.CORS_ORIGIN,
	allowMethods: [
		"GET",
		"POST",
		"OPTIONS"
	],
	allowHeaders: ["Content-Type", "Authorization"],
	credentials: true
}));
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));
app.use("/trpc/*", trpcServer({
	router: appRouter,
	createContext: (_opts, context) => {
		return createContext({ context });
	}
}));
app.get("/", (c) => {
	return c.text("OK");
});
//#endregion
//#region src/lambda.ts
const handler = handle(app);
//#endregion
export { handler };
