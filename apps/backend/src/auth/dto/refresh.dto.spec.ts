/**
 * Validation du RefreshDto.
 *
 * Régression : avant Lot 8, ce DTO n'avait AUCUN décorateur class-validator.
 * Avec le `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`
 * global, n'importe quel champ était considéré comme "non whitelisté" et
 * rejeté avec "property refreshToken should not exist". Conséquence :
 * `POST /api/v1/auth/refresh` répondait 400 sur tout payload, y compris
 * un payload bien formé. Le frontend n'appelant jamais cet endpoint, le
 * bug est resté latent.
 *
 * Ces tests valident :
 *   - un refreshToken non-vide passe (pas d'erreur de validation)
 *   - un refreshToken vide est rejeté
 *   - un refreshToken absent est rejeté
 *   - un type non-string est rejeté
 */
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { RefreshDto } from './auth-response.dto';

describe('RefreshDto', () => {
  it('accepte un refreshToken non vide', () => {
    const dto = plainToInstance(RefreshDto, { refreshToken: 'eyJhbGciOiJIUzI1NiJ9.foo.bar' });
    const errors = validateSync(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejette un refreshToken vide', () => {
    const dto = plainToInstance(RefreshDto, { refreshToken: '' });
    const errors = validateSync(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toMatchObject({ isNotEmpty: expect.any(String) });
  });

  it('rejette un refreshToken absent', () => {
    const dto = plainToInstance(RefreshDto, {});
    const errors = validateSync(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejette un refreshToken non-string', () => {
    const dto = plainToInstance(RefreshDto, { refreshToken: 12345 as unknown as string });
    const errors = validateSync(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toMatchObject({ isString: expect.any(String) });
  });
});
