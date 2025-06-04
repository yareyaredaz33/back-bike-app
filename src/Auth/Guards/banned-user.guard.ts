import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserBanEntity } from '../../DB/Entities/user-ban.entity';

@Injectable()
export class BannedUserGuard implements CanActivate {
  constructor(
    @InjectRepository(UserBanEntity)
    private userBanRepository: Repository<UserBanEntity>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.userInfo) {
      return true;
    }

    const ban = await this.userBanRepository.findOne({
      where: {
        userId: user.userInfo.id,
        isActive: true
      }
    });

    if (!ban) {
      return true;
    }

    if (ban.expiresAt && new Date() > ban.expiresAt) {
      ban.isActive = false;
      await this.userBanRepository.save(ban);
      return true;
    }

    throw new ForbiddenException(
      `Ви забанені до ${ban.expiresAt.toLocaleDateString('uk-UA')}. Причина: ${ban.reason}`
    );
  }
}
