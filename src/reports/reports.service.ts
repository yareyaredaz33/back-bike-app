import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportEntity, ReportStatus } from '../DB/Entities/report.entity';
import { UserBanEntity } from '../DB/Entities/user-ban.entity';
import { ArticleEntity } from '../DB/Entities/article.entity';
import { CommentEntity } from '../DB/Entities/comment.entity';
import { UserEntity } from '../DB/Entities/user.entity';
import { CreateReportDto } from './create-report.dto';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(ReportEntity)
    private reportRepository: Repository<ReportEntity>,
    @InjectRepository(UserBanEntity)
    private userBanRepository: Repository<UserBanEntity>,
    @InjectRepository(ArticleEntity)
    private articleRepository: Repository<ArticleEntity>,
    @InjectRepository(CommentEntity)
    private commentRepository: Repository<CommentEntity>,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
  ) {}

  async create(createReportDto: CreateReportDto, reportedBy: string) {
    const isBanned = await this.isUserBanned(reportedBy);
    if (isBanned) {
      throw new BadRequestException(
        'Забанені користувачі не можуть створювати репорти',
      );
    }

    let targetUser: UserEntity;
    let targetContent: any;

    if (createReportDto.targetType === 'article') {
      const article = await this.articleRepository.findOne({
        where: { id: createReportDto.targetId },
        relations: ['user'],
      });
      if (!article) {
        throw new NotFoundException('Стаття не знайдена');
      }
      targetUser = article.user;
      targetContent = {
        title: article.title,
        content: article.blocks[0]?.paragraphs[0] || '',
      };
    } else if (createReportDto.targetType === 'comment') {
      const comment = await this.commentRepository.findOne({
        where: { id: createReportDto.targetId },
        relations: ['user'],
      });
      if (!comment) {
        throw new NotFoundException('Коментар не знайдений');
      }
      targetUser = comment.user;
      targetContent = {
        text: comment.text,
      };
    } else {
      throw new BadRequestException('Невірний тип контенту');
    }

    if (targetUser.id === reportedBy) {
      throw new BadRequestException('Не можна скаржитись на власний контент');
    }

    const existingReport = await this.reportRepository.findOne({
      where: {
        // @ts-ignore
        targetType: createReportDto.targetType,
        targetId: createReportDto.targetId,
        reportedBy: reportedBy,
        // @ts-ignore
        status: 'pending',
      },
    });

    if (existingReport) {
      throw new BadRequestException('Ви вже скаржились на цей контент');
    }
    // @ts-ignore
    const report = this.reportRepository.create({
      ...createReportDto,
      reportedBy,
      targetUser: targetUser.id,
      targetContent,
      status: 'pending',
      createdAt: new Date(),
    });

    return this.reportRepository.save(report);
  }

  async findMyReports(userId: string) {
    return this.reportRepository.find({
      where: { reportedBy: userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findAllReports(status?: string) {
    const queryBuilder = this.reportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.reportedByUser', 'reportedByUser')
      .leftJoinAndSelect('report.targetUserEntity', 'targetUserEntity')
      .orderBy('report.createdAt', 'DESC');

    if (status && status !== 'all') {
      queryBuilder.where('report.status = :status', { status });
    }

    return queryBuilder.getMany();
  }

  async dismissReport(reportId: number, adminId: string) {
    const report = await this.reportRepository.findOne({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException('Репорт не знайдений');
    }

    // @ts-ignore
    report.status = 'dismissed';
    report.resolvedBy = adminId;
    report.resolvedAt = new Date();

    return this.reportRepository.save(report);
  }

  async resolveReport(reportId: number, action: string, adminId: string) {
    const report = await this.reportRepository.findOne({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException('Репорт не знайдений');
    }

    report.status = ReportStatus.RESOLVED;
    report.resolvedBy = adminId;
    report.resolvedAt = new Date();
    report.adminAction = action;

    return this.reportRepository.save(report);
  }

  async banUser(
    userId: string,
    reason: string,
    duration: number,
    adminId: string,
  ) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Користувач не знайдений');
    }

    const existingBan = await this.userBanRepository.findOne({
      where: {
        userId,
        isActive: true,
      },
    });

    if (existingBan) {
      throw new BadRequestException('Користувач вже забанений');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + duration);

    const ban = this.userBanRepository.create({
      userId,
      reason,
      duration,
      bannedBy: adminId,
      bannedAt: new Date(),
      expiresAt,
      isActive: true,
    });

    return this.userBanRepository.save(ban);
  }

  async getBannedUsers() {
    return this.userBanRepository
      .createQueryBuilder('ban')
      .leftJoinAndSelect('ban.user', 'user')
      .leftJoinAndSelect('ban.bannedByUser', 'bannedByUser')
      .where('ban.isActive = :isActive', { isActive: true })
      .orderBy('ban.bannedAt', 'DESC')
      .getMany();
  }

  async unbanUser(userId: string, adminId: string) {
    const ban = await this.userBanRepository.findOne({
      where: {
        userId,
        isActive: true,
      },
    });

    if (!ban) {
      throw new NotFoundException('Активний бан не знайдений');
    }

    ban.isActive = false;
    ban.unbannedBy = adminId;
    ban.unbannedAt = new Date();

    return this.userBanRepository.save(ban);
  }

  async isUserBanned(userId: string): Promise<boolean> {
    const ban = await this.userBanRepository.findOne({
      where: {
        userId,
        isActive: true,
      },
    });

    if (!ban) {
      return false;
    }

    if (ban.expiresAt && new Date() > ban.expiresAt) {
      ban.isActive = false;
      await this.userBanRepository.save(ban);
      return false;
    }

    return true;
  }

  async getReportStats() {
    const totalReports = await this.reportRepository.count();
    const pendingReports = await this.reportRepository.count({
      where: { status: ReportStatus.PENDING },
    });
    const resolvedReports = await this.reportRepository.count({
      where: { status: ReportStatus.RESOLVED },
    });
    const dismissedReports = await this.reportRepository.count({
      where: { status: ReportStatus.DISMISSED },
    });

    return {
      totalReports,
      pendingReports,
      resolvedReports,
      dismissedReports,
    };
  }
}
