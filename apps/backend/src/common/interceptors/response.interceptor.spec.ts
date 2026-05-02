import { of } from 'rxjs';
import { ResponseInterceptor } from './response.interceptor';

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor<unknown>;
  let mockContext: { switchToHttp: jest.Mock };
  let mockCallHandler: { handle: jest.Mock };

  beforeEach(() => {
    interceptor = new ResponseInterceptor();
    mockContext = { switchToHttp: jest.fn() } as any;
    mockCallHandler = { handle: jest.fn() };
  });

  it('should wrap plain data in ApiResponse envelope', (done) => {
    const data = { id: 1, name: 'test' };
    mockCallHandler.handle.mockReturnValue(of(data));

    interceptor.intercept(mockContext as any, mockCallHandler).subscribe((result) => {
      expect(result).toEqual({
        success: true,
        data,
        timestamp: expect.any(String),
      });
      done();
    });
  });

  it('should not double-wrap data that is already an ApiResponse', (done) => {
    const alreadyWrapped = {
      success: true,
      data: { id: 1 },
      timestamp: '2026-01-01T00:00:00.000Z',
    };
    mockCallHandler.handle.mockReturnValue(of(alreadyWrapped));

    interceptor.intercept(mockContext as any, mockCallHandler).subscribe((result) => {
      expect(result).toBe(alreadyWrapped);
      done();
    });
  });

  it('should wrap null data', (done) => {
    mockCallHandler.handle.mockReturnValue(of(null));

    interceptor.intercept(mockContext as any, mockCallHandler).subscribe((result) => {
      expect(result).toEqual({
        success: true,
        data: null,
        timestamp: expect.any(String),
      });
      done();
    });
  });

  it('should wrap array data', (done) => {
    const data = [{ id: 1 }, { id: 2 }];
    mockCallHandler.handle.mockReturnValue(of(data));

    interceptor.intercept(mockContext as any, mockCallHandler).subscribe((result) => {
      expect(result).toEqual({
        success: true,
        data,
        timestamp: expect.any(String),
      });
      done();
    });
  });

  it('should wrap string data', (done) => {
    mockCallHandler.handle.mockReturnValue(of('hello'));

    interceptor.intercept(mockContext as any, mockCallHandler).subscribe((result) => {
      expect(result).toEqual({
        success: true,
        data: 'hello',
        timestamp: expect.any(String),
      });
      done();
    });
  });

  it('should produce valid ISO timestamp', (done) => {
    mockCallHandler.handle.mockReturnValue(of({}));

    interceptor.intercept(mockContext as any, mockCallHandler).subscribe((result: any) => {
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
      done();
    });
  });
});
