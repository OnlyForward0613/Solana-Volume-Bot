import { createMovie, getMovies, updateMovie, deleteMovie } from "./service";
import { Request, Response } from "express";
import { MovieSchemaValidate } from "../model/schema";

export async function insertMovie(req: Request, res: Response) {
  const data = {
    title: req.body.title,
    genre: req.body.genre,
    synopsis: req.body.synopsis,
  };

  const { error, value } = MovieSchemaValidate.validate(data);
  if (error) {
    res.send(error.message);
  } else {
    const service = await createMovie(value);
    res.status(201).json(service);
  }
}

export async function Movies(req: Request, res: Response) {
  const service = await getMovies();
  res.status(201).send(service);
}

export async function Update(req: Request, res: Response) {
  const service = await updateMovie(req.body.id, req.body);
  res.status(201).send(service);
}

export async function Delete(req: Request, res: Response) {
  const service = await deleteMovie(req.body.id);
  res.status(201).send(service);
}
