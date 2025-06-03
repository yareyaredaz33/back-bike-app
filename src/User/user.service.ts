import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from '../DB/Entities/user.entity';
import { In, Not, Repository } from 'typeorm';
import { UserInputModel } from '../Auth/DTO/user.input.model';
import * as bcrypt from 'bcrypt';
import { UserModel } from './Model/user.model';
import { UserProfileView } from './DTO/user.profile.view';
import { SubscriptionsEntity } from '../DB/Entities/subscriptionsEntity';
import { ChatEntity } from '../DB/Entities/chat.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(ChatEntity)
    private chatEntityRepository: Repository<ChatEntity>,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    @InjectRepository(SubscriptionsEntity)
    private subscriptionsRepository: Repository<SubscriptionsEntity>,
    private userModel: UserModel,
  ) {}

  async getUserByUsernameOrEmail({
    username,
    email = '',
  }: {
    username: string;
    email?: string;
  }): Promise<UserEntity> {
    return this.userRepository.findOne({
      where: [{ username }, { email }],
    });
  }

  async createUser(user: UserInputModel): Promise<UserEntity> {
    const passwordSalt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(user.password, passwordSalt);
    if (user.role === 'trainer') {
      user.role = 'user'; // Start as regular user
      user.isPendingTrainerApproval = true; // Mark as pending approval
      user.trainerRequestDate = new Date(); // Record request timestamp
    } else {
      user.role = user.role || 'user';
    }
    const newUser = this.userRepository.create({
      ...user,
      password_salt: passwordSalt,
      password: passwordHash,
    });
    await this.userRepository.save(newUser);
    return newUser;
  }

  async getUserById(id: string, userId?): Promise<UserProfileView> {
    let subscription;
    if (userId && id &&  id !== userId) {
      subscription = await this.subscriptionsRepository.findOne({
        where: { user_id: userId, celebrity_id: id },
      });
    }
    const user = await this.userRepository.findOne({ where: { id } });
    if (subscription) {
      // @ts-expect-error-ignore
      user.isSubscribed = true;
    }
    return this.userModel.mapUserToProfileInfoView(user);
  }

  async updateUserById(id: string, updateData: UserProfileView) {
    const { isSubscribed, ...filteredUpdateData } = updateData;
    const user = await this.userRepository.update(
      { id },
      { ...filteredUpdateData },
    );
    return user.affected > 0 ? updateData : null;
  }

  saveImage(userInfo: string, filename: string) {
    this.userRepository.update({ id: userInfo }, { avatar: filename });
  }

  async getUsers(userId: string, sort, order, query = '') {
    if (sort == 'title') {
      sort = 'username';
    }

    const users = await this.userRepository
      .createQueryBuilder('user')
      .where('user.username ILIKE :searchTerm', {
        searchTerm: `%${query}%`,
      })
      .andWhere({ id: Not(userId) })
      .orderBy(
        `user.${sort?.toString()?.toLowerCase() || 'username'}`,
        order === 'asc' ? 'ASC' : 'DESC',
      )
      .getMany();
    return users.map(this.userModel.mapUserToProfileInfoView);
  }

  async getUsersForChat(userId: string) {
    const usersIds = await this.chatEntityRepository.find({
      where: [{ user_id1: userId }, { user_id2: userId }],
    });

    const newIds = [];
    for (let i = 0; i < usersIds.length; i++) {
      newIds.push(usersIds[i].user_id1);
      newIds.push(usersIds[i].user_id2);
    }
    const filteredIds = newIds.filter((id) => id !== userId);

    return this.userRepository.find({ where: { id: In(filteredIds) } });
  }

  async subscribeToUser(id: string, userId: string) {
    const subscriptions = await this.subscriptionsRepository.save({
      celebrity_id: id,
      user_id: userId,
    });
    return subscriptions;
  }

  async unSubscribeToUser(id: string, userId: string) {
    const result = await this.subscriptionsRepository
      .createQueryBuilder('subscriptions')
      .delete()
      .where({
        celebrity_id: id,
        user_id: userId,
      })
      .execute();
    return result;
  }
  async getPendingTrainerApprovals(): Promise<UserEntity[]> {
    return this.userRepository.find({
      // @ts-ignore
      where: { isPendingTrainerApproval: true, isApproved: false },
    });
  }

  // Approve trainer request
  async approveTrainer(userId: number, notes?: string): Promise<UserEntity> {
    const user = await this.userRepository.findOne({
      // @ts-ignore
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    user.isPendingTrainerApproval = false;
    // @ts-ignore
    user.isApproved = true;
    user.role = 'trainer';
    if (notes) {
      user.approvalNotes = notes;
    }

    return this.userRepository.save(user);
  }

  // Reject trainer request
  async rejectTrainer(userId: number, notes?: string): Promise<UserEntity> {
    const user = await this.userRepository.findOne({
      // @ts-ignore
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    user.isPendingTrainerApproval = false;
    // @ts-ignore
    user.isApproved = false;
    // Keep role as 'user'
    if (notes) {
      user.approvalNotes = notes;
    }

    return this.userRepository.save(user);
  }

  // Get user approval status
  async getUserApprovalStatus(userId: number): Promise<{
    isPendingApproval: boolean;
    isApproved: boolean;
    role: string;
    notes?: string;
  }> {
    const user = await this.userRepository.findOne({
      // @ts-ignore
      where: { id: userId },
    });
    console.log(userId);

    if (!user) {
      throw new Error('User not found');
    }
    console.log(user);
    return {
      isPendingApproval: user.isPendingTrainerApproval,
      // @ts-ignore
      isApproved: user.isApproved,
      role: user.role,
      notes: user.approvalNotes,
    };
  }
}
