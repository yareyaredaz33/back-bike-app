import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from '../DB/Entities/user.entity';
import { Repository } from 'typeorm';
import { UserService } from '../User/user.service';
import { SessionEntity } from '../DB/Entities/session.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    @InjectRepository(SessionEntity)
    private sessionRepository: Repository<SessionEntity>,
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {}

  // async validateUser(username: string, pass: string): Promise<any> {
  //   const user = {
  //     password: 'fdsf',
  //   };
  //   if (user && user.password === pass) {
  //     const { password, ...result } = user;
  //     return result;
  //   }
  //   return null;
  // }

  async login(user: any) {
    const payload = { username: user.username, sub: user.userId, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async checkCredentials(
    username: string,
    password: string,
  ): Promise<UserEntity> {
    const matchedUser = await this.userService.getUserByUsernameOrEmail({
      username,
    });
    if (!matchedUser) return null;
    const passwordHash = await bcrypt.hash(password, matchedUser.password_salt);
    if (matchedUser.password === passwordHash) {
      return matchedUser;
    }
  }

  generateTokens(user: UserEntity, deviceId?: string) {
    const accessToken = this.jwtService.sign(
      {
        user: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
      { secret: this.configService.get('SECRET') },
    );
    const refreshToken = this.jwtService.sign(
      { user: user.id, deviceId: deviceId },
      { secret: this.configService.get('SECRET'), expiresIn: '20s' },
    );
    return {
      accessToken,
      refreshToken,
    };
  }

  // async getUserByRecoveryCode(code: string) {
  //   return await this.authRepository.getUserByRecoveryCode(code);
  // }

  // async getUserIdByToken(token: string) {
  //   try {
  //     const result: any = await this.jwtService.verifyAsync(token, {
  //       secret: 'Ok',
  //     });
  //     return result;
  //   } catch (e) {
  //     return null;
  //   }
  // }

  // async processPasswordRecovery(newPassword: string, userId: string) {
  //   const passwordSalt = await bcrypt.genSalt(10);
  //   const passwordHash = await bcrypt.hash(newPassword, passwordSalt);
  //   const updateStatus = await this.authRepository.updateUserPassword(
  //     userId,
  //     passwordHash,
  //     passwordSalt,
  //   );
  //   return updateStatus;
  // }

  async saveToken(
    userId: string,
    refreshToken: string,
    ip: string,
  ): Promise<boolean> {
    const { deviceId } = await this.jwtService.verifyAsync(refreshToken, {
      secret: this.configService.get('SECRET'),
    });
    const tokenData = await this.sessionRepository.findOne({
      where: { user_id: userId, device_id: deviceId },
    });

    if (tokenData?.device_id === deviceId) {
      const status = await this.sessionRepository.update(
        { user_id: userId, device_id: deviceId },
        { refresh_token: refreshToken },
      );
      return status.affected > 0;
    }

    const session = this.sessionRepository.create({
      device_id: deviceId,
      ip,
      user_id: userId,
      refresh_token: refreshToken,
    });
    const result = await this.sessionRepository.save(session);

    return !!result;
  }

  async refresh(refreshToken: string, device: string, ip: string) {
    const userData = await this.validateRefreshToken(refreshToken);
    const tokenFromDb = await this.sessionRepository.findOne({
      where: { refresh_token: refreshToken },
    });
    if (!userData || !tokenFromDb) {
      throw new Error();
    }
    const user = await this.userRepository.findOne({
      where: { id: userData.user },
    });
    const tokens = this.generateTokens(user, userData.deviceId);
    await this.saveToken(user.id, tokens.refreshToken, ip);
    return { ...tokens };
  }
  async validateRefreshToken(refreshToken: string) {
    try {
      const { user, deviceId } = await this.jwtService.verifyAsync(
        refreshToken,
        { secret: this.configService.get('SECRET') },
      );
      return {
        user,
        deviceId,
      };
    } catch (e) {
      return null;
    }
  }

  // async logout(refreshToken: string) {
  //   const { user, deviceId } = await this.jwtService.verifyAsync<{
  //     user: string;
  //     deviceId: string;
  //   }>(refreshToken, { secret: process.env.SECRET || 'Ok' });
  //   const tokenData = await this.authRepository.deleteToken(refreshToken);
  //   if (!tokenData) {
  //     throw new Error();
  //   }
  //   return tokenData;
  // }
}
