// Bull Board JWT admin middleware.
//
// Protects /admin/queues: verifies Bearer token + enforces ADMIN role.
// Used via `app.use('/admin/queues', bullBoardAuthMiddleware(secret))`.
//
// Returns:
//   401 — missing or invalid token
//   403 — authenticated but not ADMIN

import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@iox/shared';

interface JwtPayload {
  sub: string;
  role: UserRole;
  email: string;
}

export function bullBoardAuthMiddleware(jwtSecret: string) {
  // Instantiated once per factory call — lightweight, no DI needed.
  const jwtService = new JwtService({ secret: jwtSecret });

  return (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Accès non autorisé — token manquant' });
      return;
    }

    const token = authHeader.slice(7);
    try {
      const payload = jwtService.verify<JwtPayload>(token);
      if (payload.role !== UserRole.ADMIN) {
        res.status(403).json({ message: 'Accès interdit — rôle ADMIN requis' });
        return;
      }
      next();
    } catch {
      res.status(401).json({ message: 'Accès non autorisé — token invalide ou expiré' });
    }
  };
}
