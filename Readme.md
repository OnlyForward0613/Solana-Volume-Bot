# Express TypeScript Starter

Welcome to the **Express TypeScript Starter** project! This starter kit helps you quickly set up and develop an Express server using TypeScript, making it easier to build scalable and maintainable Node.js applications.

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the Application](#running-the-application)
- [Scripts](#scripts)
- [Dependencies](#dependencies)
- [Development Dependencies](#development-dependencies)
- [License](#license)

## Project Overview

This project contains a starter setup for building RESTful APIs with Express and TypeScript. It supports environment configuration through `.env` files, input validation with Joi, and database interactions via Mongoose.

## Features

- Built with [Express](https://expressjs.com/) for fast server-side development.
- Written in [TypeScript](https://www.typescriptlang.org/) for type safety and modern JavaScript features.
- Environment variable management with `dotenv`.
- Schema validation using `joi`.
- MongoDB support through `mongoose`.
- Automated dev-restart with `nodemon`.

## Getting Started

### Prerequisites

- **Node.js**: Make sure you have Node.js installed on your machine. You can download it from [nodejs.org](https://nodejs.org/).
- **NPM**: Comes bundled with Node.js, but ensure it's updated.

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Ekans111/express-typescript-mongodb-starter.git
   cd express-typescript-mongodb-starter
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   - Create a `.env` file in the root directory.
   - Define your environment variables referring .env.example (e.g., `PORT=5000`, `DB_HOST=localhost`, `DB_NAME=mydb`, `DB_PORT=27017`).

### Running the Application

- **Development Server**: To start the application in development mode with hot-reloading:
  ```bash
  npm run dev
  ```

- **Production Build**: Compile TypeScript into JavaScript:
  ```bash
  npm run build
  ```

- **Serve Compiled Code**: Run the compiled code in `dist` directory:
  ```bash
  npm run serve
  ```

## Scripts

- `npm run test`: Run tests (currently not specified).
- `npm run start`: Run the app using `ts-node` (without nodemon).
- `npm run dev`: Start the development server with `nodemon`.
- `npm run build`: Compile TypeScript to JavaScript.
- `npm run serve`: Start the server using compiled files.

## Dependencies

- **[dotenv](https://github.com/motdotla/dotenv)**: Manages environment variables.
- **[express](https://expressjs.com/)**: Web framework for Node.js.
- **[joi](https://joi.dev/)**: Data validation library.
- **[mongoose](https://mongoosejs.com/)**: MongoDB object modeling tool.

## Development Dependencies

- **[@types/express](https://www.npmjs.com/package/@types/express)**: Type definitions for Express.
- **[@types/node](https://www.npmjs.com/package/@types/node)**: Type definitions for Node.js.
- **[nodemon](https://nodemon.io/)**: Tool that helps develop Node.js applications by automatically restarting the application when file changes are detected.
- **[ts-node](https://github.com/TypeStrong/ts-node)**: TypeScript execution environment and REPL for Node.js.
- **[typescript](https://www.typescriptlang.org/)**: TypeScript language package.

## License

This project is licensed under the ISC License. See the [LICENSE](LICENSE) file for details.

---

Feel free to contribute to this starter kit by opening issues or pull requests. Happy coding! 🎉 

## Contact

**Author:** [Ekans111](https://t.me/Ecrypto_1)