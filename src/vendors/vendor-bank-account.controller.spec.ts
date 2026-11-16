import { Test, TestingModule } from '@nestjs/testing';
import { VendorBankAccountController } from './vendor-bank-account.controller';
import { VendorBankAccountService } from './vendor-bank-account.service';
import { JwtAuthGuard } from '../auth/strategies/jwt.strategy';
import { RolesGuard } from '../auth/roles.guard';

describe('VendorBankAccountController', () => {
  let controller: VendorBankAccountController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VendorBankAccountController],
      providers: [
        { provide: VendorBankAccountService, useValue: {} },
        { provide: JwtAuthGuard, useValue: { canActivate: () => true } },
        { provide: RolesGuard, useValue: { canActivate: () => true } },
      ],
    }).compile();

    controller = module.get<VendorBankAccountController>(
      VendorBankAccountController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
