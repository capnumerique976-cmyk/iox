import { Module, Global } from '@nestjs/common';
import { CodeGeneratorService } from './services/code-generator.service';
import { StorageService } from './services/storage.service';
import { SellerOwnershipService } from './services/seller-ownership.service';

@Global()
@Module({
  providers: [CodeGeneratorService, StorageService, SellerOwnershipService],
  exports: [CodeGeneratorService, StorageService, SellerOwnershipService],
})
export class CommonModule {}
