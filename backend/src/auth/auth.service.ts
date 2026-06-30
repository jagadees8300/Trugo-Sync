import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from '../users/dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService
  ) {}

  async login(loginDto: LoginDto) {
    const userRes = await this.usersService.login(loginDto);
    if (!userRes || !userRes.user) {
      throw new UnauthorizedException();
    }
    
    const payload = { email: userRes.user.email, sub: userRes.user._id };
    return {
      access_token: this.jwtService.sign(payload),
      user: userRes.user
    };
  }

  async forgotPassword(email: string) {
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const updated = await this.usersService.setResetToken(email, token);
    
    if (updated) {
      const nodemailer = require('nodemailer');
      nodemailer.createTestAccount((err: any, account: any) => {
        if (err) {
          console.error('Failed to create a testing account. ' + err.message);
          return;
        }

        const transporter = nodemailer.createTransport({
          host: account.smtp.host,
          port: account.smtp.port,
          secure: account.smtp.secure,
          auth: {
            user: account.user,
            pass: account.pass
          }
        });

        const resetLink = `http://localhost:3000/reset-password?token=${token}`;
        
        const message = {
          from: 'Sender Name <sender@example.com>',
          to: email,
          subject: 'Password Reset Request',
          text: `You requested a password reset. Click the link to reset: ${resetLink}`,
          html: `<p>You requested a password reset. Click the link to reset:</p><a href="${resetLink}">${resetLink}</a>`
        };

        transporter.sendMail(message, (err: any, info: any) => {
          if (err) {
            console.log('Error occurred. ' + err.message);
            return;
          }
          console.log('Message sent: %s', info.messageId);
          console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
        });
      });
    }

    return { message: 'If that email is in our database, we will send a password reset link to it.' };
  }

  async resetPassword(token: string, newPassword: string) {
    await this.usersService.resetPassword(token, newPassword);
    return { message: 'Password has been successfully reset' };
  }
}
