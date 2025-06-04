import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res, UploadedFile,
  UseGuards, UseInterceptors,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Request, Response } from 'express';
import { ThrottlerGuard } from '@nestjs/throttler';
import { UserInputModel } from './DTO/user.input.model';
import { UserService } from '../User/user.service';
import { JwtAuthGuard } from './Guards/jwt.auth.guards';
import { FileService } from '../User/file.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

const storage = diskStorage({
  destination: './uploads',
  filename: (req, file, cb) => {
    const randomName = Array(32)
      .fill(null)
      .map(() => Math.round(Math.random() * 16).toString(16))
      .join('');
    return cb(null, `${randomName}${extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {

  cb(null, true);
};
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly fileService: FileService,
  ) {}
  @UseGuards(ThrottlerGuard)
  @Post('registration')
  @UseInterceptors(
    FileInterceptor('qualificationDocument', {
      storage: storage,
      fileFilter: fileFilter
    })
  )
  async registration(
    @Body() userModel: UserInputModel,
    @UploadedFile() file: Express.Multer.File,
    @Res() response: Response,
  ) {
    try {
      const isUserExists = await this.userService.getUserByUsernameOrEmail({
        username: userModel.username,
        email: userModel.email,
      });

      if (isUserExists) {
        response.status(400).json({
          message: 'User with this username or email already exists',
          field: isUserExists.username === userModel.username ? 'username' : 'email',
        });
        return;
      }

      // Handle file upload if trainer role is requested and file exists
      let qualificationDocUrl = null;
      if (userModel.role === 'trainer') {
        if (!file) {
          response.status(400).json({ message: 'Qualification document is required for trainer requests' });
          return;
        }

        try {
          const uploadResult = await this.fileService.uploadFile(file);
          qualificationDocUrl = uploadResult.url;
        } catch (error) {
          console.error('Error uploading file:', error);
          response.status(500).json({ message: 'Error uploading qualification document' });
          return;
        }
      }

      // Create user with qualification document URL
      const userData = {
        ...userModel,
        qualificationDocumentUrl: qualificationDocUrl,
      };

      const user = await this.userService.createUser(userData);
      console.log("user", user);
      // Send appropriate response based on role request
      if (userModel.role === 'trainer') {
        response.status(200).json({
          message: 'Registration successful. Your trainer request is pending approval.',
          isPendingApproval: true
        });
        return
      } else {
        response.sendStatus(200);
        return
      }
    } catch (error) {
      console.error('Registration error:', error);
      response.status(500).json({ message: 'Registration failed', error: error.message });
    }
  }

  @UseGuards(ThrottlerGuard)
  @Post('login')
  async login(
    @Req() req: Request,
    @Body() userModel: { username: string; password: string },
    @Res() response: Response,
  ) {
    const user = await this.authService.checkCredentials(
      userModel.username,
      userModel.password,
    );
    if (!(user && req.headers['user-agent'])) {
      response.sendStatus(401);
    }

    const deviceId = new Date().toISOString();
    const token = this.authService.generateTokens(user, deviceId);
    await this.authService.saveToken(user.id, token.refreshToken, req.ip);
    response.cookie('refreshToken', token.refreshToken, {
      secure: true,
      httpOnly: true,
    });
    response.status(200).json({ accessToken: token.accessToken });
  }
  // @UseGuards(ThrottlerGuard)
  // @Post('registration-email-resending')
  // async registrationEmailResending(
  //   @Request() req,
  //   @Body() userModel: { email: string },
  //   @Res() response: Response,
  // ) {
  //   const user = await this.userService.getUserByLoginOrEmail(
  //     '',
  //     userModel.email,
  //   );
  //   if (user?.result?.emailConfirmation?.isConfirmed || !user?.result) {
  //     throw new BadRequestException([
  //       {
  //         message: 'User is already confirmed',
  //         field: 'email',
  //       },
  //     ]);
  //   }
  //   const newCode = v4();
  //   await this.userService.updateUser(
  //     user.result.id,
  //     'emailConfirmation.confirmationCode',
  //     newCode,
  //   );
  //   await this.mailService.sendMailConfirmation(user.result, true, newCode);
  //   response.sendStatus(204);
  // }
  //
  // @UseGuards(ThrottlerGuard)
  // @Post('registration-confirmation')
  // async registrationConfirmation(
  //   @Request() req,
  //   @Body() userModel: { code: string },
  //   @Res() response: Response,
  // ) {
  //   const user = await this.userService.getUserByField(userModel.code);
  //
  //   if (
  //     !user ||
  //     user.emailConfirmation?.isConfirmed ||
  //     !user.emailConfirmation?.confirmationCode
  //   ) {
  //     throw new BadRequestException([
  //       {
  //         message: 'User Alredy Exists',
  //         field: 'code',
  //       },
  //     ]);
  //   }
  //
  //   const status = await this.userService.confirmCode(user, userModel.code);
  //   if (status) {
  //     response.sendStatus(204);
  //   } else response.sendStatus(400);
  // }
  // @UseGuards(ThrottlerGuard)
  // @Post('new-password')
  // async newPassword(
  //   @Request() req,
  //   @Body() recoveryInfo: { newPassword: string; recoveryCode: string },
  //   @Res() response: Response,
  // ) {
  //   const { newPassword, recoveryCode } = req.body;
  //   const user = await this.authService.getUserByRecoveryCode(recoveryCode);
  //   if (user) {
  //     const updateStatus = this.authService.processPasswordRecovery(
  //       newPassword,
  //       user.id.toString(),
  //     );
  //     if (updateStatus) {
  //       response.sendStatus(204);
  //     } else {
  //       response.sendStatus(400);
  //     }
  //   } else {
  //     throw new BadRequestException([
  //       {
  //         message: 'incorrect recovery code',
  //         field: 'recoveryCode',
  //       },
  //     ]);
  //   }
  // }
  // @UseGuards(ThrottlerGuard)
  // @Post('password-recovery')
  // async passwordRecovery(
  //   @Request() req,
  //   @Body() recoveryInfo: { email: string },
  //   @Res() response: Response,
  // ) {
  //   const { email } = req.body;
  //   try {
  //     const user = await this.userService.getUserByLoginOrEmail('', email);
  //     const code = v4();
  //     await this.mailService.sendRecoveryPasswordCode(user.result, false, code);
  //     await this.authService.savePasswordRecoveryCode(user.result.id, code);
  //     response.sendStatus(204);
  //   } catch (e) {
  //     response.sendStatus(204);
  //   }
  // }

  @Post('refresh-token')
  async refreshToken(@Req() req, @Res() response: Response) {
    try {
      const { refreshToken } = req.cookies;
      let tokens;
      if (req.headers['user-agent']) {
        tokens = await this.authService.refresh(
          refreshToken,
          req.headers['user-agent'],
          req.ip,
        );
      }
      if (tokens) {
        response.cookie('refreshToken', tokens.refreshToken, {
          secure: true,
          httpOnly: true,
        });
        return response.status(200).json({ accessToken: tokens.accessToken });
      }
    } catch (e) {
      response.sendStatus(401);
    }
  }
  // @UseGuards(ThrottlerGuard)
  // @Post('logout')
  // async logout(
  //   @Req() req,
  //   @Body() recoveryInfo: { email: string },
  //   @Res() response: Response,
  // ) {
  //   try {
  //     const { refreshToken } = req.cookies;
  //     await this.authService.logout(refreshToken);
  //     response.clearCookie('refreshToken');
  //     response.sendStatus(204);
  //   } catch (e) {
  //     response.sendStatus(401);
  //   }
  // }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() request) {
    return request.user.userInfo;
  }
}
