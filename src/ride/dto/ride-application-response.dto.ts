import { ApplicationStatus } from '../../DB/Entities/ride-application.entity';

export class RideApplicationResponseDto {
  id: string;
  user_id: string;
  ride_id: string;
  status: ApplicationStatus;
  message?: string;
  trainer_notes?: string;
  created_at: Date;
  updated_at: Date;

  // Додаткова інформація
  user?: {
    id: string;
    username: string;
    first: string;
    lastname: string;
    avatar?: string;
  };

  ride?: {
    id: string;
    title: string;
    date: string;
  };
}
