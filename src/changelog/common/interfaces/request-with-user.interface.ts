import { Request } from 'express';

export interface JwtPayload {
  sub: string;
  email: string;
}

export interface RequestWithUser extends Request {
  user: JwtPayload;
}
