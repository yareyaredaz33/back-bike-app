import { ApplicationStatus } from '../../DB/Entities/ride-application.entity';

export class UpdateRideApplicationDto {
  status: ApplicationStatus;
  trainer_notes?: string;
}
