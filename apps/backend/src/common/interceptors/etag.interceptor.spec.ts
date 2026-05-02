import { ETagInterceptor } from './etag.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

describe('ETagInterceptor', () => {
  let interceptor: ETagInterceptor;
  let mockSetHeader: jest.Mock;
  let mockStatus: jest.Mock;

  function createContext(method: string, ifNoneMatch?: string) {
    mockSetHeader = jest.fn();
    mockStatus = jest.fn();
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          method,
          headers: ifNoneMatch ? { 'if-none-match': ifNoneMatch } : {},
        }),
        getResponse: () => ({ setHeader: mockSetHeader, status: mockStatus }),
      }),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    interceptor = new ETagInterceptor();
  });

  it('sets ETag header on GET responses', (done) => {
    const body = { data: [1, 2, 3] };
    const ctx = createContext('GET');
    const handler: CallHandler = { handle: () => of(body) };

    interceptor.intercept(ctx, handler).subscribe((result) => {
      expect(result).toEqual(body);
      expect(mockSetHeader).toHaveBeenCalledWith('ETag', expect.stringMatching(/^W\/"[a-f0-9]{16}"$/));
      done();
    });
  });

  it('returns 304 when If-None-Match matches', (done) => {
    const body = { data: 'stable' };
    const ctx1 = createContext('GET');
    const handler: CallHandler = { handle: () => of(body) };

    // First call to get the ETag
    interceptor.intercept(ctx1, handler).subscribe(() => {
      const etag = mockSetHeader.mock.calls[0][1];

      // Second call with matching If-None-Match
      const ctx2 = createContext('GET', etag);
      interceptor.intercept(ctx2, { handle: () => of(body) }).subscribe((result) => {
        expect(result).toBeUndefined();
        expect(mockStatus).toHaveBeenCalledWith(304);
        done();
      });
    });
  });

  it('skips ETag on non-GET methods', (done) => {
    const body = { id: 1 };
    const ctx = createContext('POST');
    const handler: CallHandler = { handle: () => of(body) };

    interceptor.intercept(ctx, handler).subscribe((result) => {
      expect(result).toEqual(body);
      expect(mockSetHeader).not.toHaveBeenCalled();
      done();
    });
  });

  it('handles null body gracefully', (done) => {
    const ctx = createContext('GET');
    const handler: CallHandler = { handle: () => of(null) };

    interceptor.intercept(ctx, handler).subscribe((result) => {
      expect(result).toBeNull();
      expect(mockSetHeader).not.toHaveBeenCalled();
      done();
    });
  });
});
