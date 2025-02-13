"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAuthKey = checkAuthKey;
exports.checkAuthAdmin = checkAuthAdmin;
const query_1 = require("../cache/query");
async function checkAuthKey(req, res, next) {
    try {
        const authKey = req.headers['authorization'];
        if (!authKey) {
            res.status(401).json({ message: 'Authentication key is missing' });
            return;
        }
        // Check if authKey exists in Redis
        const exists = await (0, query_1.authKeyCheck)(authKey);
        if (!exists) {
            res.status(403).json({ message: 'Invalid authentication key' });
            return;
        }
        // Proceed if authKey is valid
        next();
    }
    catch (error) {
        console.error('Error fetching authKey from Redis:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
async function checkAuthAdmin(req, res, next) {
    try {
        const authKey = req.headers['authorization'];
        if (!authKey) {
            res.status(401).json({ message: 'Authentication key is missing' });
            return;
        }
        // Check if authKey exists in Redis
        const exists = await (0, query_1.authKeyCheck)(authKey);
        if (!exists) {
            res.status(403).json({ message: 'Invalid authentication key' });
            return;
        }
        const admin = await (0, query_1.adminCheck)(authKey);
        if (!admin) {
            res.status(403).json({ message: 'Unauthorized admin' });
            return;
        }
        next();
    }
    catch (error) {
        console.error('Error fetching authKey from Redis:', error);
        res.status(500).json({ message: 'Internal server error' });
        return;
    }
}
