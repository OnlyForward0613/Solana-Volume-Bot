import { Schema, model } from "mongoose";
import Joi from "joi";

export const MovieSchemaValidate = Joi.object({
  title: Joi.string().required(),
  genre: Joi.string().required(),
  synopsis: Joi.string().required(),
});

// creating an interface
interface IMovies {
  title: string;
  genre: string;
  synopsis: string;
}

// MoviesSchema
const moviesSchema = new Schema<IMovies>({
  title: { type: String, required: true },
  genre: { type: String, required: true },
  synopsis: { type: String, required: true },
});

export const Movie = model<IMovies>("Movies", moviesSchema);
