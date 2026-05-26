import { Module, Global } from '@nestjs/common';
import { CodeGeneratorService } from './services/code-generator.service';
import { StorageService } from './services/storage.service';
import { SellerOwnershipService } from './services/seller-ownership.service';
import { BuyerOwnershipService } from './services/buyer-ownership.service';

@Global()
@Module({
  providers: [
    CodeGeneratorService,
    StorageService,
    SellerOwnershipService,
    BuyerOwnershipService,
  ],
  exports: [
    CodeGeneratorService,
    StorageService,
    SellerOwnershipService,
    BuyerOwnershipService,
  ],
})
export class CommonModule {}
