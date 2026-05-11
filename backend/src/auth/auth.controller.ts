import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Request,
  Logger,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/auth.dto";

@Controller("auth")
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private authService: AuthService) {}

  @Post("login")
  async login(@Body() loginDto: LoginDto) {
    try {
      this.logger.log(`用户登录请求: ${loginDto.username}`);
      const user = await this.authService.validateUser(
        loginDto.username,
        loginDto.password,
      );
      const result = await this.authService.login(user);
      this.logger.log(`用户登录成功: ${loginDto.username}`);
      return result;
    } catch (error) {
      this.logger.error(
        `用户登录失败: ${loginDto.username}, 错误: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  @UseGuards(AuthGuard("jwt"))
  @Get("profile")
  getProfile(@Request() req) {
    return this.authService.getProfile(req.user.userId);
  }
}
