import { Injectable } from '@nestjs/common';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { ArticleEntity } from '../DB/Entities/article.entity';
import { Repository } from 'typeorm';

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
      views: 3,
      user: userId,
    });
    this.articleRepository.save(article);
    return article;
  }

  findAll(sort, order, query) {
    console.log(sort, order, query);
    return this.articleRepository
      .createQueryBuilder('article')
      .where('article.title ILIKE :searchTerm', {
        searchTerm: `%${query}%`,
      })
      .orderBy(`article.${sort}`, order === 'asc' ? 'ASC' : 'DESC')
      .leftJoinAndSelect('article.user', 'user')
      .getMany();
  }

  findOne(id: string) {
    return this.articleRepository
      .createQueryBuilder('article')
      .where({ id })
      .leftJoinAndSelect('article.user', 'user')
      .getOne();
  }

  update(id: number, updateArticleDto: UpdateArticleDto) {
    return `This action updates a #${id} article`;
  }

  remove(id: string) {
    console.log(id);
    return this.articleRepository.delete({ id });
  }

  saveImage(id: any, url: string) {
    const result = this.articleRepository.update({ id }, { img: url });
    return result;
  }

  findAllForUser(id: string) {
    return this.articleRepository.find({ where: { user_id: id } });
  }
}
