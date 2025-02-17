import { Request, Response, NextFunction } from 'express';
import { adminCheck, authKeyCheck, getValue } from '../cache/query';
import { configNetwork, DEFAULT_JITO_FEE, jitoFees, PRIVATE_RPC_ENDPOINT, PRIVATE_RPC_WEBSOCKET_ENDPOINT } from '../config';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { NetworkType } from '../cache/keys';

export async function checkAuthKey(req: Request, res: Response, next: NextFunction) {
  try {
    const authKey = req.headers['authorization'] as string;

    if (!authKey) {
      res.status(401).json({ message: 'Authentication key is missing' });
      return;
    }

    // Check if authKey exists in Redis
    const exists = await authKeyCheck(authKey);

    if (!exists) {
      res.status(403).json({ message: 'Invalid authentication key' });
      return;
    }

    const RPC_ENDPOINT = await getValue(NetworkType.RPC_ENDPOINT, authKey) ?? null;
    const RPC_WEBSOCKET_ENDPOINT = await getValue(NetworkType.RPC_WEBSOCKET_ENDPOINT, authKey) ?? null;
    const jitoFee = await getValue(NetworkType.JITO_FEE, authKey) ?? null;
    console.log("RPC_ENDPOINT", RPC_ENDPOINT);
    console.log("RPC_WEBSOCKET_ENDPOINT", RPC_WEBSOCKET_ENDPOINT);
    console.log("jitoFee", jitoFee);
    
    // inital setting of userConnections and pumpfunSDKs based on user authKey
    if (RPC_ENDPOINT && RPC_WEBSOCKET_ENDPOINT) {
      configNetwork(RPC_ENDPOINT, RPC_WEBSOCKET_ENDPOINT, authKey);
    }
    else {
      configNetwork(PRIVATE_RPC_ENDPOINT, PRIVATE_RPC_WEBSOCKET_ENDPOINT, authKey);
    }

    if (jitoFee) {
      jitoFees[authKey] = Number(jitoFee) * LAMPORTS_PER_SOL;
    } else {
      jitoFees[authKey] = DEFAULT_JITO_FEE;
    }
  
    // Proceed if authKey is valid
    next();
  } catch (error) {
    console.error('Error fetching authKey from Redis:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function checkAuthAdmin(req: Request, res: Response, next:NextFunction) {
  try {
    const authKey = req.headers['authorization'] as string;
    if (!authKey) {
      res.status(401).json({ message: 'Authentication key is missing' });
      return;
    }
    // Check if authKey exists in Redis
    const exists = await authKeyCheck(authKey);
    if (!exists) {
      res.status(403).json({ message: 'Invalid authentication key' });
      return;
    }
    const admin = await adminCheck(authKey);
    if (!admin) {
      res.status(403).json({ message: 'Unauthorized admin' });
      return;
    }
    next();
  } catch (error) {
    console.error('Error fetching authKey from Redis:', error);
    res.status(500).json({ message: 'Internal server error' });
    return;
  }
}