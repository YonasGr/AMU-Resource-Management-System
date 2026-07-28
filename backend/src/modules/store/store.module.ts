import { Module } from '@nestjs/common';
import { StoreController } from './store.controller';
import { StoreService } from './store.service';
import { OrganizationModule } from '../organization/organization.module';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [OrganizationModule, RbacModule],
  controllers: [StoreController],
  providers: [StoreService],
  exports: [StoreService],
})
export class StoreModule {}
