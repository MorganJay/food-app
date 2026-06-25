import { Injectable, OnModuleInit, Logger, ConflictException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Bank, BankDocument } from '../schemas/Bank.schema';
import { NIGERIAN_BANKS_SEED } from './banks.seed';
import axios from 'axios';

@Injectable()
export class BanksService implements OnModuleInit {
  private readonly logger = new Logger(BanksService.name);

  constructor(@InjectModel(Bank.name) private bankModel: Model<BankDocument>) {}

  // Auto-seeds on system startup using a loop so pre-save hooks (serialNumber) trigger perfectly
  async onModuleInit() {
    const count = await this.bankModel.countDocuments().exec();
    if (count === 0) {
      this.logger.log('Banks collection is empty. Initializing Nigerian banks seed entries...');
      for (const bankData of NIGERIAN_BANKS_SEED) {
        await this.bankModel.create(bankData);
      }
      this.logger.log(`Successfully seeded ${NIGERIAN_BANKS_SEED.length} banks into the database.`);
    }
  }

  async findAll() {
    const banks = await this.bankModel.find({ isDeleted: false }).sort({ name: 1 }).exec();
    return banks.map((bank) => this.mapBankResponse(bank));
  }

  async create(name: string, code: string) {
    const cleanName = name.trim();
    const cleanCode = code.trim();

    const existing = await this.bankModel.findOne({ 
      $or: [{ name: { $regex: new RegExp(`^${cleanName}$`, 'i') } }, { code: cleanCode }] 
    }).exec();
    
    if (existing) {
      throw new ConflictException('A bank with this name or routing code already exists.');
    }
    
    const newBank = await this.bankModel.create({ name: cleanName, code: cleanCode });
    return this.mapBankResponse(newBank);
  }

  async update(id: string, updateData: { name?: string; code?: string }) {
    if (updateData.name) updateData.name = updateData.name.trim();
    if (updateData.code) updateData.code = updateData.code.trim();

    const updated = await this.bankModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException('Requested bank record not found');
    }
    return this.mapBankResponse(updated);
  }

  async remove(id: string) {
    const deleted = await this.bankModel
      .findByIdAndUpdate(id, { isDeleted: true }, { new: true })
      .exec();
    if (!deleted) {
      throw new NotFoundException('Requested bank record not found');
    }
    return { message: 'Bank successfully deactivated' };
  }

  // Paystack Integration Sync Method
  async syncWithPaystack() {
    try {
      const response = await axios.get('https://api.paystack.co/bank', {
        params: { country: 'nigeria' }
      });

      if (!response.data || !response.data.status) {
        throw new InternalServerErrorException('Invalid response structure from Paystack');
      }

      const externalBanks = response.data.data;
      let newlyAdded = 0;

      for (const externalBank of externalBanks) {
        const cleanName = externalBank.name.trim();
        const cleanCode = externalBank.code.trim();

        const duplicate = await this.bankModel.findOne({
          $or: [{ code: cleanCode }, { name: { $regex: new RegExp(`^${cleanName}$`, 'i') } }]
        }).exec();

        if (!duplicate) {
          await this.bankModel.create({
            name: cleanName,
            code: cleanCode,
            isDeleted: !externalBank.active
          });
          newlyAdded++;
        }
      }

      return {
        status: 'success',
        processed: externalBanks.length,
        added: newlyAdded,
        message: 'Bank directory synced successfully with Paystack'
      };
    } catch (error: any) {
      throw new InternalServerErrorException(`Sync failed: ${error.message}`);
    }
  }

  private mapBankResponse(bank: BankDocument) {
    return {
      id: bank._id.toString(),
      name: bank.name,
      code: bank.code,
      serialNumber: (bank as any).serialNumber || null, // Included seamlessly here
      createdAt: (bank as any).createdAt,
      updatedAt: (bank as any).updatedAt,
    };
  }
}