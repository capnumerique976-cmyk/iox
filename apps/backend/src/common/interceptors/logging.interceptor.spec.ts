import { of, throwError } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let mockContext: any;
  let mockRequest: Record<string, unknown>;
  let mockResponse: Record<string, unknown>;
  let mockCallHandler: { handle: jest.Mock };

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
    mockRequest = {
      method: 'GET',
      originalUrl: '/api/v1/products',
      url: '/api/v1/products',
      requestId: 'req-abc-123',
      user: { id: 'user-42' },
    };
    mockResponse = { statusCode: 200 };
    mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    };
    mockCallHandler = { handle: jest.fn() };
    // Suppress actual log output during tests
    jest.spyOn((interceptor as any).logger, 'log').mockImplementation(() => {});
    jest.spyOn((interceptor as any).logger, 'error').mockImplementation(() => {});
  });

  it('should log successful request with JSON format', (done) => {
    mockCallHandler.handle.mockReturnValue(of({ id: 1 }));
    const logSpy = jest.spyOn((interceptor as any).logger, 'log');

    interceptor.intercept(mockContext, mockCallHandler).subscribe(() => {
      expect(logSpy).toHaveBeenCalledTimes(1);
      const logged = JSON.parse(logSpy.mock.calls[0][0] as string);
      expect(logged.requestId).toBe('req-abc-123');
      expect(logged.method).toBe('GET');
      expect(logged.url).toBe('/api/v1/products');
      expect(logged.status).toBe(200);
      expect(logged.userId).toBe('user-42');
      expect(typeof logged.durationMs).toBe('number');
      done();
    });
  });

  it('should log error with status and message', (done) => {
    const error = { status: 404, message: 'Not Found' };
    mockCallHandler.handle.mockReturnValue(throwError(() => error));
    const errorSpy = jest.spyOn((interceptor as any).logger, 'error');

    interceptor.intercept(mockContext, mockCallHandler).subscribe({
      error: () => {
        expect(errorSpy).toHaveBeenCalledTimes(1);
        const logged = JSON.parse(errorSpy.mock.calls[0][0] as string);
        expect(logged.status).toBe(404);
        expect(logged.error).toBe('Not Found');
        expect(logged.requestId).toBe('req-abc-123');
        done();
      },
    });
  });

  it('should default to status 500 when error has no status', (done) => {
    const error = { message: 'Something broke' };
    mockCallHandler.handle.mockReturnValue(throwError(() => error));
    const errorSpy = jest.spyOn((interceptor as any).logger, 'error');

    interceptor.intercept(mockContext, mockCallHandler).subscribe({
      error: () => {
        const logged = JSON.parse(errorSpy.mock.calls[0][0] as string);
        expect(logged.status).toBe(500);
        done();
      },
    });
  });

  it('should handle missing user gracefully', (done) => {
    mockRequest.user = undefined;
    mockCallHandler.handle.mockReturnValue(of('ok'));
    const logSpy = jest.spyOn((interceptor as any).logger, 'log');

    interceptor.intercept(mockContext, mockCallHandler).subscribe(() => {
      const logged = JSON.parse(logSpy.mock.calls[0][0] as string);
      expect(logged.userId).toBeNull();
      done();
    });
  });

  it('should handle missing requestId', (done) => {
    mockRequest.requestId = undefined;
    mockCallHandler.handle.mockReturnValue(of('ok'));
    const logSpy = jest.spyOn((interceptor as any).logger, 'log');

    interceptor.intercept(mockContext, mockCallHandler).subscribe(() => {
      const logged = JSON.parse(logSpy.mock.calls[0][0] as string);
      expect(logged.requestId).toBeUndefined();
      done();
    });
  });

  it('should measure duration in milliseconds', (done) => {
    mockCallHandler.handle.mockReturnValue(of('ok'));
    const logSpy = jest.spyOn((interceptor as any).logger, 'log');

    interceptor.intercept(mockContext, mockCallHandler).subscribe(() => {
      const logged = JSON.parse(logSpy.mock.calls[0][0] as string);
      expect(logged.durationMs).toBeGreaterThanOrEqual(0);
      expect(logged.durationMs).toBeLessThan(1000); // test should be fast
      done();
    });
  });
});
