"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TYPES = void 0;
exports.keyExists = keyExists;
exports.deleteKey = deleteKey;
exports.deleteElementFromListWithValue = deleteElementFromListWithValue;
exports.deleteElementFromListWithIndex = deleteElementFromListWithIndex;
exports.setValue = setValue;
exports.getValue = getValue;
exports.setHashValue = setHashValue;
exports.getHashValue = getHashValue;
exports.delByKey = delByKey;
exports.setJson = setJson;
exports.getJson = getJson;
exports.setList = setList;
exports.addToList = addToList;
exports.getListRange = getListRange;
exports.setHash = setHash;
exports.getHash = getHash;
exports.getCommonWalletsCounts = getCommonWalletsCounts;
exports.setOrderedSet = setOrderedSet;
exports.addToOrderedSet = addToOrderedSet;
exports.removeFromOrderedSet = removeFromOrderedSet;
exports.getOrderedSetRange = getOrderedSetRange;
exports.getOrderedSetMemberScore = getOrderedSetMemberScore;
exports.watch = watch;
exports.unwatch = unwatch;
exports.expire = expire;
exports.expireMany = expireMany;
exports.addUser = addUser;
exports.getAllUsers = getAllUsers;
exports.deleteUserByAuthKey = deleteUserByAuthKey;
exports.editUser = editUser;
exports.authKeyCheck = authKeyCheck;
exports.adminCheck = adminCheck;
const _1 = __importDefault(require("."));
const keys_1 = require("./keys");
var TYPES;
(function (TYPES) {
    TYPES["LIST"] = "list";
    TYPES["STRING"] = "string";
    TYPES["HASH"] = "hash";
    TYPES["ZSET"] = "zset";
    TYPES["SET"] = "set";
})(TYPES || (exports.TYPES = TYPES = {}));
async function keyExists(...keys) {
    return (await _1.default.exists(keys)) ? true : false;
}
async function deleteKey(key) {
    return _1.default.del(key);
}
async function deleteElementFromListWithValue(key, value) {
    const type = await _1.default.type(key);
    if (type !== TYPES.LIST)
        return null;
    return _1.default.lRem(key, 1, value);
}
async function deleteElementFromListWithIndex(key, index) {
    const type = await _1.default.type(key);
    if (type !== TYPES.LIST)
        return null;
    const length = await _1.default.lLen(key);
    for (let i = 0; i < length; i++) {
        if (i != index) {
            const value = await _1.default.lIndex(key, i);
            if (value)
                await _1.default.rPush("temp_list", value);
        }
    }
    await _1.default.del(key);
    return _1.default.rename("temp_list", key);
}
async function setValue(key, value, expireAt = null) {
    if (expireAt)
        return _1.default.pSetEx(key, expireAt.getTime(), `${value}`);
    else
        return _1.default.set(key, `${value}`);
}
async function getValue(key) {
    return _1.default.get(key);
}
async function setHashValue(key, value, expireAt = null) {
    if (expireAt)
        return _1.default.hSet(key, expireAt.getTime(), `${value}`);
    else
        return _1.default.hSet(key, `${value}`, "");
}
async function getHashValue(key) {
    return _1.default.hGetAll(key);
}
async function delByKey(key) {
    return _1.default.del(key);
}
async function setJson(key, value, expireAt = null) {
    const json = JSON.stringify(value);
    return await setValue(key, json, expireAt);
}
async function getJson(key) {
    const type = await _1.default.type(key);
    if (type !== TYPES.STRING)
        return null;
    const json = await getValue(key);
    if (json)
        return JSON.parse(json);
    return null;
}
async function setList(key, list, expireAt = null) {
    const multi = _1.default.multi();
    const values = [];
    for (const i in list) {
        values[i] = JSON.stringify(list[i]);
    }
    multi.del(key);
    multi.rPush(key, values);
    if (expireAt)
        multi.pExpireAt(key, expireAt.getTime());
    return await multi.exec();
}
async function addToList(key, value) {
    const type = await _1.default.type(key);
    if (type !== TYPES.LIST)
        return null;
    const item = JSON.stringify(value);
    return await _1.default.rPushX(key, item);
}
async function getListRange(key, start = 0, end = -1) {
    const type = await _1.default.type(key);
    if (type !== TYPES.LIST)
        return null;
    const list = await _1.default.lRange(key, start, end);
    if (!list)
        return null;
    const data = list.map((entry) => JSON.parse(entry));
    return data;
}
async function setHash(key, value, expireAt = null) {
    // const json = JSON.stringify(value);
    return await setHashValue(key, value, expireAt);
}
async function getHash(key) {
    const type = await _1.default.type(key);
    if (type !== TYPES.HASH)
        return null;
    return (await getHashValue(key));
    // if (json) return JSON.parse(json) as T;
    // return null;
}
async function getCommonWalletsCounts() {
    return await _1.default.lLen(keys_1.WalletKey.COMMON);
}
async function setOrderedSet(key, items, expireAt = null) {
    const multi = _1.default.multi();
    for (const item of items) {
        item.value = JSON.stringify(item.value);
    }
    multi.del(key);
    multi.zAdd(key, items);
    if (expireAt)
        multi.pExpireAt(key, expireAt.getTime());
    return await multi.exec();
}
async function addToOrderedSet(key, items) {
    const type = await _1.default.type(key);
    if (type !== TYPES.ZSET)
        return null;
    for (const item of items) {
        item.value = JSON.stringify(item.value);
    }
    return await _1.default.zAdd(key, items);
}
async function removeFromOrderedSet(key, ...items) {
    const type = await _1.default.type(key);
    if (type !== TYPES.ZSET)
        return null;
    items = items.map((item) => JSON.stringify(item));
    return await _1.default.zRem(key, items);
}
async function getOrderedSetRange(key, start = 0, end = -1) {
    const type = await _1.default.type(key);
    if (type !== TYPES.ZSET)
        return null;
    const set = await _1.default.zRangeWithScores(key, start, end);
    const data = set.map((entry) => ({
        score: entry.score,
        value: JSON.parse(entry.value),
    }));
    return data;
}
async function getOrderedSetMemberScore(key, member) {
    const type = await _1.default.type(key);
    if (type !== TYPES.ZSET)
        return null;
    return await _1.default.zScore(key, JSON.stringify(member));
}
async function watch(key) {
    return await _1.default.watch(key);
}
async function unwatch() {
    return await _1.default.unwatch();
}
async function expire(expireAt, key) {
    return await _1.default.pExpireAt(key, expireAt.getTime());
}
async function expireMany(expireAt, ...keys) {
    let script = "";
    for (const key of keys) {
        script += `redis.call('pExpireAt', '${key}',${expireAt.getTime()})`;
    }
    return await _1.default.eval(script);
}
// custom query for user management
async function getNewUserId() {
    return await _1.default.incr("nextUserId");
}
async function addUser(name, authKey) {
    const keys = await _1.default.keys("user:*:authKey");
    for (const key of keys) {
        const existingAuthKey = await _1.default.get(key);
        if (existingAuthKey === authKey) {
            throw new Error(`AuthKey '${authKey}' is already in use.`);
        }
    }
    const userId = await getNewUserId();
    await _1.default.set(`user:${userId}:name`, name);
    await _1.default.set(`user:${userId}:authKey`, authKey);
    await _1.default.set(`user:${userId}:role`, keys_1.RoleType.USER);
    console.log(`User added with ID: ${userId}`);
}
async function getAllUsers() {
    const users = [];
    const keys = await _1.default.keys("user:*:authKey");
    for (const key of keys) {
        const userId = key.split(":")[1];
        const name = await _1.default.get(`user:${userId}:name`);
        const authKey = await _1.default.get(`user:${userId}:authKey`);
        const role = await _1.default.get(`user:${userId}:role`);
        if (role !== keys_1.RoleType.USER)
            continue;
        users.push({ name, authKey, role });
    }
    return users;
}
async function deleteUserByAuthKey(authKey) {
    const keys = await _1.default.keys(`user:*:authKey`);
    for (const key of keys) {
        const existingAuthKey = await _1.default.get(key);
        if (existingAuthKey === authKey) {
            const userId = key.split(":")[1];
            await _1.default.del(`user:${userId}:name`);
            await _1.default.del(`user:${userId}:authKey`);
            await _1.default.del(`user:${userId}:role`);
            console.log(`User deleted with ID: ${userId}`);
            return;
        }
    }
}
async function editUser(authKey, name) {
    const keys = await _1.default.keys(`user:*:authKey`);
    for (const key of keys) {
        const existingAuthKey = await _1.default.get(key);
        if (existingAuthKey === authKey) {
            const userId = key.split(":")[1];
            await _1.default.set(`user:${userId}:name`, name);
            console.log(`User updated with ID: ${userId}`);
            return;
        }
    }
}
async function authKeyCheck(authKey) {
    const keys = await _1.default.keys(`user:*:authKey`);
    for (const key of keys) {
        const existingAuthKey = await _1.default.get(key);
        if (existingAuthKey === authKey) {
            return true;
        }
    }
    return false;
}
async function adminCheck(authKey) {
    const keys = await _1.default.keys(`user:*:authKey`);
    for (const key of keys) {
        const existingAuthKey = await _1.default.get(key);
        if (existingAuthKey === authKey) {
            const role = await _1.default.get(`user:${key.split(":")[1]}:role`);
            return role === keys_1.RoleType.ADMIN;
        }
    }
    return false;
}
