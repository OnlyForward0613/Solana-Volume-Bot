import { Movie } from '../model/schema';

export async function createMovie(data: any) {
  try {
    const newMovie = await Movie.create(data);
    console.log(newMovie);
    return {
      status: "Success",
      data: newMovie
    }
  } catch (err) {
    console.error(err);
    return {
      status: "Error",
      message: "Failed to create movie"
    }
  }
}

export async function getMovies() {
  try {
    const movies = await Movie.find({});
    return movies
  } catch(err) {
    return {
      status: "Failed",
      message: err
    }
  }
}

export async function updateMovie(id: string, data: any) {
  try {
    const movie = await Movie.findByIdAndUpdate({"_id":id}, data, {new: true});

    if (!movie) {
      return {
        status: "Failed",
        message: "Post not available"
      }
    }
    return {
      status: "Success",
      data: movie
    }
  } catch(err) {
    return {
      status: "Failed",
      data: err
    }
  }
}

export async function deleteMovie(id: string) {
  try {
    const movie = await Movie.findByIdAndDelete({"_id": id});

    if (!movie) {
      return {
        status: "Failed",
        message: "Post not available"
      }
    } else {
      return {
        status: "Success",
        message: "Movie deleted successfully"
      }
    }
  } catch (err) {
    return {
      status: "Failed",
      message: "Failed to delete movie"
    }
  }
}

