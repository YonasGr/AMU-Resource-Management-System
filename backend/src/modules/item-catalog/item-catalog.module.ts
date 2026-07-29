import { Module } from '@nestjs/common';
import { ItemCatalogController } from './item-catalog.controller';
import { CategoryService } from './category.service';
import { ItemService } from './item.service';

@Module({
  controllers: [ItemCatalogController],
  providers: [CategoryService, ItemService],
  exports: [CategoryService, ItemService],
})
export class ItemCatalogModule {}
