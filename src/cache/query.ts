import cache from ".";
import { DynamicKeyType, Key, RoleType, WalletKey } from "./keys";

export enum TYPES {
  LIST = "list",
  STRING = "string",
  HASH = "hash",
  ZSET = "zset",
  SET = "set",
}

export async function keyExists(...keys: string[]) {
  return (await cache.exists(keys)) ? true : false;
}

export async function deleteKey(key: Key | DynamicKeyType, authKey: string) {
  const id = (await getIdFromAuthKey(authKey)) as string;
  return cache.del(`${id}:${key}`);
}

export async function deleteElementFromListWithValue(
  key: Key | DynamicKeyType,
  value: string
) {
  const type = await cache.type(key);
  if (type !== TYPES.LIST) return null;
  return cache.lRem(key, 1, value);
}

export async function deleteElementFromListWithIndex(
  key: Key | DynamicKeyType,
  index: number,
  authKey: string
) {
  const id = (await getIdFromAuthKey(authKey)) as string;
  const type = await cache.type(`${id}:${key}`);
  if (type !== TYPES.LIST) return null;

  const length = await cache.lLen(`${id}:${key}`);

  for (let i = 0; i < length; i++) {
    if (i != index) {
      const value = await cache.lIndex(`${id}:${key}`, i);
      if (value) await cache.rPush("temp_list", value);
    }
  }

  await cache.del(`${id}:${key}`);
  return cache.rename("temp_list", `${id}:${key}`);
}

export async function setValue(
  key: Key | DynamicKeyType,
  value: string | number,
  authKey: string,
  expireAt: Date | null = null
) {
  const id = (await getIdFromAuthKey(authKey)) as string;
  if (expireAt)
    return cache.pSetEx(`${id}:${key}`, expireAt.getTime(), `${value}`);
  else return cache.set(`${id}:${key}`, `${value}`);
}

export async function getValue(key: Key | DynamicKeyType, authKey: string) {
  const id = await getIdFromAuthKey(authKey);
  return cache.get(`${id}:${key}`);
}

export async function setHashValue(
  key: Key | DynamicKeyType,
  value: any,
  expireAt: Date | null = null
) {
  if (expireAt) return cache.hSet(key, expireAt.getTime(), `${value}`);
  else return cache.hSet(key, `${value}`, "");
}

export async function getHashValue(key: Key | DynamicKeyType) {
  return cache.hGetAll(key);
}

export async function delByKey(key: Key | DynamicKeyType) {
  return cache.del(key);
}

export async function setJson(
  key: Key | DynamicKeyType,
  value: Record<string, unknown>,
  authKey: string,
  expireAt: Date | null = null
) {
  const json = JSON.stringify(value);
  return await setValue(key, json, authKey, expireAt);
}

export async function getJson<T>(key: Key | DynamicKeyType, authKey: string) {
  const id = (await getIdFromAuthKey(authKey)) as string;
  const type = await cache.type(`${id}:${key}`);
  if (type !== TYPES.STRING) return null;

  const json = await getValue(key, authKey);
  if (json) return JSON.parse(json) as T;

  return null;
}

export async function setList(
  key: Key | DynamicKeyType,
  list: any[],
  authKey: string,
  expireAt: Date | null = null
) {
  const id = (await getIdFromAuthKey(authKey)) as string;
  const multi = cache.multi();
  const values: any[] = [];
  for (const i in list) {
    values[i] = JSON.stringify(list[i]);
  }
  multi.del(`${id}:${key}`);
  multi.rPush(`${id}:${key}`, values);
  if (expireAt) multi.pExpireAt(key, expireAt.getTime());
  return await multi.exec();
}

export async function addToList(
  key: Key | DynamicKeyType,
  value: string,
  authKey: string
) {
  const id = (await getIdFromAuthKey(authKey)) as string;
  const type = await cache.type(`${id}:${key}`);
  if (type !== TYPES.LIST) return null;

  const item = JSON.stringify(value);
  return await cache.rPushX(key, item);
}

export async function getListRange<T>(
  key: Key | DynamicKeyType,
  authKey: string,
  start = 0,
  end = -1
) {
  const id = (await getIdFromAuthKey(authKey)) as string;
  const type = await cache.type(`${id}:${key}`);
  if (type !== TYPES.LIST) return null;

  const list = await cache.lRange(`${id}:${key}`, start, end);
  if (!list) return null;

  const data = list.map((entry) => JSON.parse(entry) as T);
  return data;
}

export async function setHash(
  key: Key | DynamicKeyType,
  value: Record<string, unknown>,
  expireAt: Date | null = null
) {
  // const json = JSON.stringify(value);
  return await setHashValue(key, value, expireAt);
}

export async function getHash<T>(key: Key | DynamicKeyType) {
  const type = await cache.type(key);
  if (type !== TYPES.HASH) return null;

  return (await getHashValue(key)) as T;
  // if (json) return JSON.parse(json) as T;

  // return null;
}

// get counts of array stored in Json
export async function getCommonWalletsCounts(authKey: string) {
  const id = (await getIdFromAuthKey(authKey)) as string;
  return JSON.parse((await cache.get(`${id}:${WalletKey.COMMON}`)) as string)
    .length;
}

export async function setOrderedSet(
  key: Key,
  items: Array<{ score: number; value: any }>,
  expireAt: Date | null = null
) {
  const multi = cache.multi();
  for (const item of items) {
    item.value = JSON.stringify(item.value);
  }
  multi.del(key);
  multi.zAdd(key, items);
  if (expireAt) multi.pExpireAt(key, expireAt.getTime());
  return await multi.exec();
}

export async function addToOrderedSet(
  key: Key,
  items: Array<{ score: number; value: any }>
) {
  const type = await cache.type(key);
  if (type !== TYPES.ZSET) return null;

  for (const item of items) {
    item.value = JSON.stringify(item.value);
  }
  return await cache.zAdd(key, items);
}

export async function removeFromOrderedSet(key: Key, ...items: any[]) {
  const type = await cache.type(key);
  if (type !== TYPES.ZSET) return null;

  items = items.map((item) => JSON.stringify(item));
  return await cache.zRem(key, items);
}

export async function getOrderedSetRange<T>(key: Key, start = 0, end = -1) {
  const type = await cache.type(key);
  if (type !== TYPES.ZSET) return null;

  const set = await cache.zRangeWithScores(key, start, end);

  const data: { score: number; value: T }[] = set.map((entry) => ({
    score: entry.score,
    value: JSON.parse(entry.value),
  }));
  return data;
}

export async function getOrderedSetMemberScore(key: Key, member: any) {
  const type = await cache.type(key);
  if (type !== TYPES.ZSET) return null;

  return await cache.zScore(key, JSON.stringify(member));
}

export async function watch(key: Key | DynamicKeyType) {
  return await cache.watch(key);
}

export async function unwatch() {
  return await cache.unwatch();
}

export async function expire(expireAt: Date, key: Key | DynamicKeyType) {
  return await cache.pExpireAt(key, expireAt.getTime());
}

export async function expireMany(expireAt: Date, ...keys: string[]) {
  let script = "";
  for (const key of keys) {
    script += `redis.call('pExpireAt', '${key}',${expireAt.getTime()})`;
  }
  return await cache.eval(script);
}

// custom query for user management

async function getNewUserId() {
  return await cache.incr("nextUserId");
}

export async function addUser(name: string, authKey: string) {
  const keys = await cache.keys("user:*:authKey");
  for (const key of keys) {
    const existingAuthKey = await cache.get(key);
    if (existingAuthKey === authKey) {
      throw new Error(`AuthKey '${authKey}' is already in use.`);
    }
  }

  const userId = await getNewUserId();

  await cache.set(`user:${userId}:name`, name);
  await cache.set(`user:${userId}:authKey`, authKey);
  await cache.set(`user:${userId}:role`, RoleType.USER);
  await cache.set(`id:${authKey}`, userId);

  console.log(`User added with ID: ${userId}`);
}

export async function getAllUsers() {
  const users = [];
  const keys = await cache.keys("user:*:authKey");

  for (const key of keys) {
    const userId = key.split(":")[1];
    const name = await cache.get(`user:${userId}:name`);
    const authKey = await cache.get(`user:${userId}:authKey`);
    const role = await cache.get(`user:${userId}:role`);
    if (role !== RoleType.USER) continue;
    users.push({ name, authKey, role });
  }

  return users;
}

export async function deleteUserByAuthKey(authKey: string) {
  const id = await getIdFromAuthKey(authKey);
  if (!id) throw new Error("User not found.");
  await cache.del(`user:${id}:name`);
  await cache.del(`user:${id}:authKey`);
  await cache.del(`user:${id}:role`);
  await cache.del(`id:${authKey}`);
  console.log(`User deleted with ID: ${id}`);
}

export async function editUser(authKey: string, name: string) {
  const id = await getIdFromAuthKey(authKey);
  if (!id) throw new Error("User not found.");
  await cache.set(`user:${id}:name`, name);
  console.log(`User updated with ID: ${id}`);
  return;
}

export async function authKeyCheck(authKey: string) {
  const keys = await cache.keys(`user:*:authKey`);
  for (const key of keys) {
    const existingAuthKey = await cache.get(key);
    if (existingAuthKey === authKey) {
      return true;
    }
  }
  return false;
}

export async function adminCheck(authKey: string) {
  const keys = await cache.keys(`user:*:authKey`);
  for (const key of keys) {
    const existingAuthKey = await cache.get(key);
    if (existingAuthKey === authKey) {
      const role = await cache.get(`user:${key.split(":")[1]}:role`);
      return role === RoleType.ADMIN;
    }
  }
  return false;
}

export async function getIdFromAuthKey(authKey: string) {
  const id = await cache.get(`id:${authKey}`);
  if (id) return id;
}

// Array handle
export async function storeArray(
  key: Key | DynamicKeyType,
  array: any[],
  authKey: string
) {
  const id = (await getIdFromAuthKey(authKey)) as string;
  return await cache.set(`${id}:${key}`, JSON.stringify(array));
}

export async function getArray<T>(
  key: Key | DynamicKeyType,
  authKey: string
): Promise<T[] | null> {
  const id = (await getIdFromAuthKey(authKey)) as string;
  const type = await cache.type(`${id}:${key}`);
  if (type !== TYPES.STRING) return null;

  const json = await getValue(key, authKey);
  if (json) return JSON.parse(json) as T[];

  return [];
}

export async function editArrayByIndex(
  key: Key | DynamicKeyType,
  index: number,
  value: any,
  authKey: string
) {
  const id = (await getIdFromAuthKey(authKey)) as string;
  const type = await cache.type(`${id}:${key}`);
  if (type !== TYPES.STRING) return null;
  const array = await getArray(key, authKey);
  if (!array) return null;
  array[index] = value;
  return await storeArray(key, array, authKey);
}

export async function deleteArrayByIndex(
  key: Key | DynamicKeyType,
  index: number,
  authKey: string
) {
  const id = (await getIdFromAuthKey(authKey)) as string;
  const type = await cache.type(`${id}:${key}`);
  if (type !== TYPES.STRING) return null;
  const array = await getArray(key, authKey);
  if (!array) return null;
  array.splice(index, 1);
  return await storeArray(key, array, authKey);
}

export async function deleteArrayByWalletKey(
  key: Key | DynamicKeyType,
  walletKey: string,
  authKey: string
) {
  const id = (await getIdFromAuthKey(authKey)) as string;
  const type = await cache.type(`${id}:${key}`);
  if (type !== TYPES.STRING) return null;
  const array = await getArray(key, authKey);
  if (!array) return null;
  const index = array.indexOf(walletKey);
  if (index === -1) return null;
  array.splice(index, 1);
  return await storeArray(key, array, authKey);
}

export async function addValueToArray(
  key: Key | DynamicKeyType,
  value: any,
  authKey: string
) {
  const id = (await getIdFromAuthKey(authKey)) as string;
  const type = await cache.type(`${id}:${key}`);
  if (type !== TYPES.STRING) return null;
  const array = await getArray(key, authKey);
  if (!array) return null;
  array.push(value);
  return await storeArray(key, array, authKey);
}
