import { Exchange } from '@entities';
import { IRepository } from '../IRepository';
import { ExchangeModel } from '../models';

export class ExchangeRepository implements IRepository<Exchange> {
  async create(exchangeData: Exchange): Promise<Exchange> {
    return new ExchangeModel(exchangeData).save();
  }

  async findById(id: string): Promise<Exchange | null> {
    return ExchangeModel.findById(id).lean({ virtuals: true });
  }

  async findAll(): Promise<Exchange[]> {
    return ExchangeModel.find().lean({ virtuals: true });
  }

  async update(id: string, exchangeData: Partial<Exchange>): Promise<Exchange | null> {
    return ExchangeModel.findByIdAndUpdate(id, exchangeData, {
      new: true,
    }).lean({ virtuals: true });
  }

  async delete(id: string): Promise<Exchange | null> {
    return ExchangeModel.findByIdAndDelete(id).lean({ virtuals: true });
  }
}
