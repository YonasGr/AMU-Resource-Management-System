import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY, Public } from '../decorators/public.decorator';

describe('JwtAuthGuard (Public vs Authenticated Endpoints Challenge)', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector);
  });

  const createMockContext = (
    handler: Function = () => {},
    controllerClass: Function = class TestController {},
  ): ExecutionContext => {
    return {
      getHandler: () => handler,
      getClass: () => controllerClass,
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }),
        getResponse: () => ({}),
        getNext: () => ({}),
      }),
    } as unknown as ExecutionContext;
  };

  it('should return true immediately if route handler is marked with @Public()', () => {
    class MockController {
      @Public()
      publicEndpoint() {}
    }
    const controller = new MockController();
    const context = createMockContext(controller.publicEndpoint, MockController);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should delegate to passport jwt strategy if route is NOT marked @Public()', () => {
    class MockController {
      protectedEndpoint() {}
    }
    const controller = new MockController();
    const context = createMockContext(controller.protectedEndpoint, MockController);

    // Mock super.canActivate
    const superCanActivateSpy = jest
      .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
      .mockReturnValue(true);

    expect(guard.canActivate(context)).toBe(true);
    expect(superCanActivateSpy).toHaveBeenCalledWith(context);
    superCanActivateSpy.mockRestore();
  });
});
