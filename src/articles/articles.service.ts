import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ArticleEntity } from '../DB/Entities/article.entity';
import { UserBanEntity } from '../DB/Entities/user-ban.entity';

@Injectable()
export class ArticlesService {
  constructor(
    @InjectRepository(ArticleEntity)
    private articleRepository: Repository<ArticleEntity>,
    @InjectRepository(UserBanEntity)
    private userBanRepository: Repository<UserBanEntity>,
  ) {}

  async create(createArticleDto: CreateArticleDto, userId: string) {
    await this.checkUserBan(userId);

    // @ts-ignore
    const article = this.articleRepository.create({
      ...createArticleDto,
      user_id: userId,
      created_at: new Date().toISOString(),
      views: 0,
      user: userId,
    });

    const savedArticle = await this.articleRepository.save(article);

    return this.articleRepository
      .createQueryBuilder('article')
      // @ts-ignore
      .where('article.id = :id', { id: savedArticle.id || savedArticle[0].id })
      .leftJoinAndSelect('article.user', 'user')
      .getOne();
  }

  async findAll(sort: string, order: string, query: string) {
    const queryBuilder = this.articleRepository
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.user', 'user');

    if (query) {
      queryBuilder.where('article.title ILIKE :searchTerm', {
        searchTerm: `%${query}%`,
      });
    }

    if (sort) {
      queryBuilder.orderBy(
        `article.${sort}`,
        order === 'asc' ? 'ASC' : 'DESC'
      );
    }

    return queryBuilder.getMany();
  }

  async findOne(id: string) {
    const article = await this.articleRepository
      .createQueryBuilder('article')
      .where({ id })
      .leftJoinAndSelect('article.user', 'user')
      .getOne();

    if (!article) {
      throw new NotFoundException(`Стаття з ID ${id} не знайдена`);
    }

    return article;
  }

  async update(id: number, updateArticleDto: UpdateArticleDto, userId?: string) {
    const article = await this.findOne(id.toString());

    if (userId && article.user.id !== userId) {
      throw new ForbiddenException('Ви можете редагувати тільки свої статті');
    }

    await this.articleRepository.update(id, {
      ...updateArticleDto,
    });

    return this.findOne(id.toString());
  }

  async remove(id: string, userId?: string) {
    const article = await this.findOne(id);

    if (userId && article.user.id !== userId) {
      throw new ForbiddenException('Ви можете видаляти тільки свої статті');
    }

    await this.articleRepository.delete({ id });
    return { message: `Стаття з ID ${id} успішно видалена` };
  }

  async adminRemove(id: string) {
    const article = await this.findOne(id);
    await this.articleRepository.delete({ id });
    return { message: `Стаття з ID ${id} успішно видалена адміністратором` };
  }

  async saveImage(id: any, url: string) {
    const result = await this.articleRepository.update({ id }, { img: url });
    return result;
  }

  async findAllForUser(id: string) {
    return this.articleRepository
      .createQueryBuilder('article')
      .where('article.user_id = :id', { id })
      .leftJoinAndSelect('article.user', 'user')
      .orderBy('article.created_at', 'DESC')
      .getMany();
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
