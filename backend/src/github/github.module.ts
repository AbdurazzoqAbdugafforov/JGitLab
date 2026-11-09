import { Global, Module } from '@nestjs/common';
import { GitHubAppService } from './github-app.service';
import { GitHubController } from './github.controller';

@Global()
@Module({
  controllers: [GitHubController],
  providers: [GitHubAppService, GitHubController],
  exports: [GitHubAppService, GitHubController],
})
export class GitHubModule {}
