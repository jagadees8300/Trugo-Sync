import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { password, ...rest } = createUserDto;
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const createdUser = new this.userModel({ ...rest, password: hashedPassword });
    return createdUser.save();
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().populate('role').exec();
  }

  async login(loginDto: LoginDto): Promise<any> {
    const { email, password } = loginDto;
    const user = await this.userModel.findOne({ email }).populate('role').exec();

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password || '');
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const userObj = user.toObject();
    delete userObj.password;
    
    return {
      message: 'Login successful',
      user: userObj
    };
  }

  async setResetToken(email: string, token: string): Promise<boolean> {
    const expires = new Date();
    expires.setHours(expires.getHours() + 1); // 1 hour expiration
    
    const result = await this.userModel.updateOne(
      { email },
      { 
        $set: { 
          resetPasswordToken: token,
          resetPasswordExpires: expires 
        } 
      }
    );
    return result.modifiedCount > 0;
  }

  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    const user = await this.userModel.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save();
    return true;
  }
}
