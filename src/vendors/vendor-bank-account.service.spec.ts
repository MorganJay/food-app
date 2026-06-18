import { Test, TestingModule } from '@nestjs/testing';
import { VendorBankAccountService } from './vendor-bank-account.service';

describe('VendorBankAccountService', () => {
  let service: VendorBankAccountService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VendorBankAccountService],
    }).compile();

    service = module.get<VendorBankAccountService>(VendorBankAccountService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
