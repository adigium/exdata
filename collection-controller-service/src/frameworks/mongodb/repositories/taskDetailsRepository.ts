import { TaskDetails } from '@entities';
import { IRepository } from '../IRepository';
import { TaskDetailsModel } from '../models';

export class TaskDetailsRepository implements IRepository<TaskDetails> {
  async create(taskDetailsData: TaskDetails): Promise<TaskDetails> {
    return new TaskDetailsModel(taskDetailsData).save();
  }

  async findById(id: string): Promise<TaskDetails | null> {
    return TaskDetailsModel.findById(id).lean({ virtuals: true });
  }

  async findAll(): Promise<TaskDetails[]> {
    return TaskDetailsModel.find({ active: true }).lean({ virtuals: true });
  }

  async update(id: string, taskDetailsData: Partial<TaskDetails>): Promise<TaskDetails | null> {
    return TaskDetailsModel.findByIdAndUpdate(id, taskDetailsData, {
      new: true,
    }).lean({ virtuals: true });
  }

  async delete(id: string): Promise<TaskDetails | null> {
    return TaskDetailsModel.findByIdAndDelete(id).lean({ virtuals: true });
  }
}
