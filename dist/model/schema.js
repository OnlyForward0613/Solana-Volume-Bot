"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Movie = exports.MovieSchemaValidate = void 0;
const mongoose_1 = require("mongoose");
const joi_1 = __importDefault(require("joi"));
exports.MovieSchemaValidate = joi_1.default.object({
    title: joi_1.default.string().required(),
    genre: joi_1.default.string().required(),
    synopsis: joi_1.default.string().required(),
});
// MoviesSchema
const moviesSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    genre: { type: String, required: true },
    synopsis: { type: String, required: true },
});
exports.Movie = (0, mongoose_1.model)("Movies", moviesSchema);
