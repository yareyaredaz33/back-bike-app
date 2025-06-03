import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommentEntity } from '../DB/Entities/comment.entity';
import { UserBanEntity } from '../DB/Entities/user-ban.entity';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(CommentEntity)
    private commentEntityRepository: Repository<CommentEntity>,
    @InjectRepository(UserBanEntity)
    private userBanRepository: Repository<UserBanEntity>,
  ) {}

  async create(createCommentDto: CreateCommentDto, userId: string) {
    await this.checkUserBan(userId);
    // @ts-ignore
    const comment = this.commentEntityRepository.create({
      text: createCommentDto.text,
      article_id: createCommentDto.articleId,
      // @ts-ignore
      user: userId,
    });

    const savedComment = await this.commentEntityRepository.save(comment);

    return this.commentEntityRepository
      .createQueryBuilder('comment')
      // @ts-ignore
      .where('comment.id = :id', { id: savedComment.id })
      .leftJoinAndSelect('comment.user', 'user')
      .getOne();
  }

  async findAll(id: string) {
    return this.commentEntityRepository
      .createQueryBuilder('comment')
      .where({ article_id: id })
      .leftJoinAndSelect('comment.user', 'user')
      .orderBy('comment.createdAt', 'DESC')
      .getMany();
  }

  async findOne(id: string) {
    const comment = await this.commentEntityRepository
      .createQueryBuilder('comment')
      .where('comment.id = :id', { id })
      .leftJoinAndSelect('comment.user', 'user')
      .getOne();

    if (!comment) {
      throw new NotFoundException(`Коментар з ID ${id} не знайдений`);
    }

    return comment;
  }

  async update(id: string, updateCommentDto: UpdateCommentDto, userId?: string) {
    const comment = await this.findOne(id);

    if (userId && comment.user.id !== userId) {
      throw new ForbiddenException('Ви можете редагувати тільки свої коментарі');
    }

    await this.commentEntityRepository.update(id, {
      text: updateCommentDto.text
    });

    return this.findOne(id);
  }

  async remove(id: string, userId?: string) {
    const comment = await this.findOne(id);

    await this.commentEntityRepository.delete(id);
    return { message: `Коментар з ID ${id} успішно видалений` };
  }

  async adminRemove(id: string) {
    const comment = await this.findOne(id);
    await this.commentEntityRepository.delete(id);
    return { message: `Коментар з ID ${id} успішно видалений адміністратором` };
  }

  private async checkUserBan(userId: string) {
    const ban = await this.userBanRepository.findOne({
      where: {
        userId,
        isActive: true
      }
    });

    if (!ban) {
      return;
    }

    if (ban.expiresAt && new Date() > ban.expiresAt) {
      ban.isActive = false;
      await this.userBanRepository.save(ban);
      return;
    }

    throw new ForbiddenException(`Ви забанені до ${ban.expiresAt.toLocaleDateString()}. Причина: ${ban.reason}`);
  }
}
