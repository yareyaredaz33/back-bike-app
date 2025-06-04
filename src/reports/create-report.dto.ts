import { IsString, IsEnum, IsNotEmpty } from 'class-validator';

export enum TargetType {
  ARTICLE = 'article',
  COMMENT = 'comment'
}

export class CreateReportDto {
  @IsEnum(TargetType)
  @IsNotEmpty()
  targetType: TargetType;

  @IsString()
  @IsNotEmpty()
  targetId: string;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
