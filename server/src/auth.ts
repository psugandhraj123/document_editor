import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import { User, AuthRequest, JWTPayload } from './types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SALT_ROUNDS = 10;

// In-memory user store (replace with database in production)
const users: Map<string, User> = new Map();

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateToken = (user: User): string => {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  };
  return jwt.sign(payload, JWT_SECRET);
};

export const verifyToken = (token: string): JWTPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
};

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  
  if (!payload) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  const user = users.get(payload.userId);
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }
  
  req.user = user;
  next();
};

export const createUser = async (email: string, password: string, name: string): Promise<User> => {
  const existingUser = Array.from(users.values()).find(u => u.email === email);
  if (existingUser) {
    throw new Error('User already exists');
  }
  
  const passwordHash = await hashPassword(password);
  const user: User = {
    id: `user-${Date.now()}`,
    email,
    name,
    passwordHash,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  users.set(user.id, user);
  return user;
};

export const findUserByEmail = (email: string): User | undefined => {
  return Array.from(users.values()).find(u => u.email === email);
};

export const findUserById = (id: string): User | undefined => {
  return users.get(id);
};
