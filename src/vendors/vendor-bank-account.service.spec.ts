import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { VendorBankAccountService } from './vendor-bank-account.service';
import { VendorBankAccount } from 'src/schemas/VendorBankAccount.schema';
import { Bank } from 'src/schemas/Bank.schema';
import { Vendor } from 'src/schemas/Vendor.schema';

describe('VendorBankAccountService', () => {
  let service: VendorBankAccountService;

  beforeEach(async () => {
    const mockAccountModel = {};
    const mockBankModel = {};
    const mockVendorModel = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorBankAccountService,
        { provide: getModelToken(VendorBankAccount.name), useValue: mockAccountModel },
        { provide: getModelToken(Bank.name), useValue: mockBankModel },
        { provide: getModelToken(Vendor.name), useValue: mockVendorModel },
      ],
    }).compile();
    service = module.get<VendorBankAccountService>(VendorBankAccountService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
