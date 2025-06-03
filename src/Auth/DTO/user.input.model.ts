import { IsNotEmpty } from 'class-validator';

export class UserInputModel {
  //  @IsNotEmpty()
  username: string;

  @IsNotEmpty()
  //  @Matches(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/)
  email: string;

  // @IsNotEmpty()
  //@Length(6, 20)
  password: string;
  role: string;
  qualificationDocumentUrl?: string;
  isPendingTrainerApproval?: boolean;
  trainerRequestDate?: Date;
}
