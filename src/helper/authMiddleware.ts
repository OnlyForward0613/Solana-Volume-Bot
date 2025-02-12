import { Request, Response, NextFunction } from 'express';
import { adminCheck, authKeyCheck } from '../cache/query';

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