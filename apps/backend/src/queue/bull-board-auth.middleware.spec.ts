// Spec — bullBoardAuthMiddleware (Mandat 54)
//
// Covers:
//   401 — missing Authorization header
//   401 — non-Bearer prefix
//   401 — invalid / expired token
//   403 — valid token but role !== ADMIN
//   200 — valid ADMIN token → next() called

import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@iox/shared';
import { bullBoardAuthMiddleware } from './bull-board-auth.middleware';

const SECRET = 'test-secret';
const jwt = new JwtService({ secret: SECRET });
const middleware = bullBoardAuthMiddleware(SECRET);

function makeRes() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

describe('bullBoardAuthMiddleware', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = jest.fn();
  });

  it('returns 401 when Authorization header is absent', () => {
    const req = { headers: {} } as Request;
    const res = makeRes();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization header is not Bearer', () => {
    const req = { headers: { authorization: 'Basic abc' } } as Request;
    const res = makeRes();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for an invalid token', () => {
    const req = { headers: { authorization: 'Bearer not-a-valid-jwt' } } as Request;
    const res = makeRes();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for a token signed with a wrong secret', () => {
    const wrongJwt = new JwtService({ secret: 'wrong-secret' });
    const token = wrongJwt.sign({ sub: 'u1', role: UserRole.ADMIN, email: 'a@b.com' });
    const req = { headers: { authorization: `Bearer ${token}` } } as Request;
    const res = makeRes();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when role is MARKETPLACE_SELLER', () => {
    const token = jwt.sign({ sub: 'u1', role: UserRole.MARKETPLACE_SELLER, email: 's@b.com' });
    const req = { headers: { authorization: `Bearer ${token}` } } as Request;
    const res = makeRes();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when role is MARKETPLACE_BUYER', () => {
    const token = jwt.sign({ sub: 'u1', role: UserRole.MARKETPLACE_BUYER, email: 'b@b.com' });
    const req = { headers: { authorization: `Bearer ${token}` } } as Request;
    const res = makeRes();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() for a valid ADMIN token', () => {
    const token = jwt.sign({ sub: 'u1', role: UserRole.ADMIN, email: 'admin@b.com' });
    const req = { headers: { authorization: `Bearer ${token}` } } as Request;
    const res = makeRes();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
