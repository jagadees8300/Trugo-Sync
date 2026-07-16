import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { LoginDto } from '../users/dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }

  async updateProfile(
    userId: string,
    data: { name?: string; designation?: string },
    file?: Express.Multer.File,
  ) {
    return this.usersService.updateProfile(userId, data, file);
  }

  async login(loginDto: LoginDto) {
    const userRes = await this.usersService.login(loginDto);
    if (!userRes || !userRes.user) {
      throw new UnauthorizedException();
    }

    const payload = { email: userRes.user.email, sub: userRes.user._id };
    return {
      access_token: this.jwtService.sign(payload),
      user: userRes.user,
    };
  }

  async forgotPassword(email: string) {
    const token = randomBytes(24).toString('hex');
    const updated = await this.usersService.setResetToken(email, token);

    if (!updated) {
      return {
        message:
          'If that email is in our database, we will send a password reset link to it.',
      };
    }

    const frontendUrl = (
      process.env.FRONTEND_URL || 'http://localhost:3000'
    ).replace(/\/$/, '');
    const resetLink = `${frontendUrl}/reset-password/${token}`;

    const mailResult = await this.mailService.sendPasswordResetEmail(
      email,
      resetLink,
    );

    if (mailResult.sent) {
      return {
        message: 'Password reset link has been sent to your email.',
        emailSent: true,
      };
    }

    return {
      message:
        'If that email is in our database, we will send a password reset link to it.',
      emailSent: false,
    };
  }

  async validateResetToken(token: string) {
    const user = await this.usersService.findByResetToken(token);
    if (!user) {
      throw new UnauthorizedException(
        'This reset link was already used or has expired. Please login with your new password, or request a new link.',
      );
    }
    return { valid: true, email: (user as { email?: string }).email };
  }

  async resetPassword(token: string, newPassword: string) {
    await this.usersService.resetPassword(token, newPassword);
    return { message: 'Password has been successfully reset' };
  }
}
