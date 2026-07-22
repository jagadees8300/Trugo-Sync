import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { MailModule } from '../mail/mail.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { RolesGuard } from './roles.guard';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    MailModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super-secret',
      // Default 12h work day; override with JWT_EXPIRES_IN (e.g. 8h, 24h)
      signOptions: {
        expiresIn: (process.env.JWT_EXPIRES_IN || '12h') as `${number}h` | `${number}m` | number,
      },
    }),
  ],
  providers: [AuthService, JwtStrategy, RolesGuard],
  exports: [RolesGuard, JwtModule],
  controllers: [AuthController],
})
export class AuthModule {}
