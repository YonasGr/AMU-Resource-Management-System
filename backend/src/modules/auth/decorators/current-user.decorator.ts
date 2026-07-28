import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@prisma/client';

export type SafeUser = Omit<User, 'passwordHash'>;

/**
 * Pulls the authenticated user off the request, populated by JwtAccessStrategy.
 * Usage: findMe(@CurrentUser() user: SafeUser)
 */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): SafeUser => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
