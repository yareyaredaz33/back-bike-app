import { PartialType } from '@nestjs/mapped-types';
import { CreateRoadDto } from './create-road.dto';

export class UpdateRoadDto extends PartialType(CreateRoadDto) {}
