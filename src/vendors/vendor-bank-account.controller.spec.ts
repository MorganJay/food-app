import { Test, TestingModule } from '@nestjs/testing';
import { VendorBankAccountController } from './vendor-bank-account.controller';

describe('VendorBankAccountController', () => {
  let controller: VendorBankAccountController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VendorBankAccountController],
    }).compile();

    controller = module.get<VendorBankAccountController>(VendorBankAccountController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
