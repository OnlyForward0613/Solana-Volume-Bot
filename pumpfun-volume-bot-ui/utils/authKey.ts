// utils/token.js
import { nanoid } from "nanoid";

export default function generateUniqueKey() {
  return nanoid(32);
}

export const authHeader = (authKey: string) => ({
  headers: {
    Authorization: authKey,
  },
});
