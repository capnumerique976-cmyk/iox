import { PaginationHeaderInterceptor } from './pagination-header.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

describe('PaginationHeaderInterceptor', () => {
  let interceptor: PaginationHeaderInterceptor;
  let mockSetHeader: jest.Mock;
  let mockContext: ExecutionContext;
  let mockCallHandler: CallHandler;

  beforeEach(() => {
    interceptor = new PaginationHeaderInterceptor();
    mockSetHeader = jest.fn();
    mockContext = {
      switchToHttp: () => ({
        getResponse: () => ({ setHeader: mockSetHeader }),
      }),
    } as unknown as ExecutionContext;
  });

  it('sets X-Total-Count and X-Total-Pages when meta.total present', (done) => {
    const body = { data: [{ id: 1 }], meta: { total: 42, page: 1, limit: 10, totalPages: 5 } };
    mockCallHandler = { handle: () => of(body) };

    interceptor.intercept(mockContext, mockCallHandler).subscribe(() => {
      expect(mockSetHeader).toHaveBeenCalledWith('X-Total-Count', '42');
      expect(mockSetHeader).toHaveBeenCalledWith('X-Total-Pages', '5');
      expect(mockSetHeader).toHaveBeenCalledWith(
        'Access-Control-Expose-Headers',
        'X-Total-Count, X-Total-Pages',
      );
      done();
    });
  });

  it('sets only X-Total-Count when totalPages missing', (done) => {
    const body = { data: [], meta: { total: 0 } };
    mockCallHandler = { handle: () => of(body) };

    interceptor.intercept(mockContext, mockCallHandler).subscribe(() => {
      expect(mockSetHeader).toHaveBeenCalledWith('X-Total-Count', '0');
      expect(mockSetHeader).not.toHaveBeenCalledWith('X-Total-Pages', expect.anything());
      done();
    });
  });

  it('does nothing when body has no meta', (done) => {
    const body = { message: 'ok' };
    mockCallHandler = { handle: () => of(body) };

    interceptor.intercept(mockContext, mockCallHandler).subscribe(() => {
      expect(mockSetHeader).not.toHaveBeenCalled();
      done();
    });
  });

  it('does nothing when body is null', (done) => {
    mockCallHandler = { handle: () => of(null) };

    interceptor.intercept(mockContext, mockCallHandler).subscribe(() => {
      expect(mockSetHeader).not.toHaveBeenCalled();
      done();
    });
  });
});
