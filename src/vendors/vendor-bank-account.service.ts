import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { VendorBankAccount, VendorBankAccountDocument } from 'src/schemas/VendorBankAccount.schema';
import { Bank, BankDocument } from 'src/schemas/Bank.schema';
import {
  CreateVendorBankAccountDto,
  UpdateVendorBankAccountDto,
  VendorBankAccountResponseDto,
} from './dto/create-vendor-bank-account.dto';
import { Model } from 'mongoose';

@Injectable()
export class VendorBankAccountService {
  constructor(
    @InjectModel(VendorBankAccount.name) private readonly accountModel: Model<VendorBankAccountDocument>,
    @InjectModel(Bank.name) private readonly bankModel: Model<BankDocument>,
  ) {}

  async create(vendorId: string, dto: CreateVendorBankAccountDto): Promise<VendorBankAccountResponseDto> {
    const validBank = await this.bankModel.findOne({ code: dto.bankCode, isDeleted: false }).exec();
    if (!validBank) {
      throw new BadRequestException(`Invalid bank code: ${dto.bankCode}. Please select a valid bank.`);
    }

    const existingAccount = await this.accountModel.findOne({
      vendorId,
      accountNumber: dto.accountNumber,
      bankCode: dto.bankCode,
      isDeleted: { $ne: true },
    }).exec();

    if (existingAccount) {
      throw new BadRequestException('Bank account already exists');
    }

    if (dto.isDefault) {
      await this.accountModel.updateMany(
        { vendorId },
        { isDefault: false },
      );
    }

    const account = await this.accountModel.create({
      ...dto,
      bankName: validBank.name, 
      vendorId,
    });

    return this.mapAccountResponse(account);
  }

  async findAll(vendorId: string): Promise<VendorBankAccountResponseDto[]> {
    const accounts = await this.accountModel
      .find({ 
        vendorId,
        isDeleted: { $ne: true },
       })
      .sort({
        isDefault: -1,
        createdAt: -1,
      }).exec();

    return accounts.map((account) =>
      this.mapAccountResponse(account),
    );
  }

  async findOne(vendorId: string, accountId: string): Promise<VendorBankAccountDocument> {
    const account = await this.accountModel.findOne({
      _id: accountId,
      vendorId,
      isDeleted: { $ne: true },
    }).exec();

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return account;
  }

  async getOne(vendorId: string, accountId: string): Promise<VendorBankAccountResponseDto> {
    const account = await this.findOne(vendorId, accountId);

    return this.mapAccountResponse(account);
  }

  async update(
    vendorId: string,
    accountId: string,
    dto: UpdateVendorBankAccountDto,
  ): Promise<VendorBankAccountResponseDto> {
    const account = await this.findOne(vendorId, accountId);

    if (dto.isDefault) {
      await this.accountModel.updateMany(
        { vendorId },
        { $set: { isDefault: false } },
      );
    }

    if (dto.bankCode !== undefined) {
      const validBank = await this.bankModel.findOne({ code: dto.bankCode, isDeleted: false }).exec();
      if (!validBank) {
        throw new BadRequestException(`Invalid bank code: ${dto.bankCode}`);
      }
      account.bankCode = dto.bankCode;
      account.bankName = validBank.name;
    }

    if (dto.accountName !== undefined) {
      account.accountName = dto.accountName;
    }

    if (dto.accountNumber !== undefined) {
      account.accountNumber = dto.accountNumber;
    }

    if (dto.isDefault !== undefined) {
      account.isDefault = dto.isDefault;
    }

    await account.save();

    return this.mapAccountResponse(account);
  }

  async remove(vendorId: string, accountId: string) {
    const account = await this.findOne(vendorId, accountId);

    account.isDeleted = true;
    await account.save();

    return {
      message: 'Account deleted successfully',
    };
  }

  async setDefault(vendorId: string, accountId: string): Promise<VendorBankAccountResponseDto> {
    const account = await this.findOne(vendorId, accountId);

    await this.accountModel.updateMany(
      { vendorId, isDeleted: { $ne: true } },
      { isDefault: false },
    ).exec();

    account.isDefault = true;
    await account.save();

    return this.mapAccountResponse(account);
  }

  private mapAccountResponse(
    account: VendorBankAccountDocument,
  ): VendorBankAccountResponseDto {
    return {
      id: account._id.toString(),
      vendorId: account.vendorId.toString(),
      accountName: account.accountName,
      accountNumber: account.accountNumber,
      bankName: account.bankName,
      bankCode: account.bankCode || '',
      isDefault: account.isDefault,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }
}