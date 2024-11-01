import { CollectorServiceInstance } from '@entities';
import { IRepository } from '../IRepository';
import { CollectorServiceInstanceModel } from '../models';

export class CollectorServiceInstanceRepository implements IRepository<CollectorServiceInstance> {
  async create(collectorServiceInstanceData: CollectorServiceInstance): Promise<CollectorServiceInstance> {
    return new CollectorServiceInstanceModel(collectorServiceInstanceData).save();
  }

  async findById(id: string): Promise<CollectorServiceInstance | null> {
    return CollectorServiceInstanceModel.findById(id).lean({ virtuals: true });
  }

  async findAll(): Promise<CollectorServiceInstance[]> {
    return CollectorServiceInstanceModel.find().lean({ virtuals: true });
  }

  async update(
    id: string,
    collectorServiceInstanceData: Partial<CollectorServiceInstance>,
  ): Promise<CollectorServiceInstance | null> {
    return CollectorServiceInstanceModel.findByIdAndUpdate(id, collectorServiceInstanceData, {
      new: true,
    }).lean({ virtuals: true });
  }

  async delete(id: string): Promise<CollectorServiceInstance | null> {
    return CollectorServiceInstanceModel.findByIdAndDelete(id).lean({ virtuals: true });
  }
}
