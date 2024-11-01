import { TaskControlMessage } from '@entities';
import { IRepository } from '../IRepository';
import { TaskControlMessageModel } from '../models';

export class TaskControlMessageRepository implements IRepository<TaskControlMessage> {
  async create(taskControlMessageData: TaskControlMessage): Promise<TaskControlMessage> {
    return new TaskControlMessageModel(taskControlMessageData).save();
  }

  async findById(id: string): Promise<TaskControlMessage | null> {
    return TaskControlMessageModel.findById(id).lean({ virtuals: true });
  }

  async findAll(): Promise<TaskControlMessage[]> {
    return TaskControlMessageModel.find().lean({ virtuals: true });
  }

  async update(
    id: string,
    taskControlMessageData: Partial<TaskControlMessage>,
  ): Promise<TaskControlMessage | null> {
    return TaskControlMessageModel.findByIdAndUpdate(id, taskControlMessageData, {
      new: true,
    }).lean({ virtuals: true });
  }

  async delete(id: string): Promise<TaskControlMessage | null> {
    return TaskControlMessageModel.findByIdAndDelete(id).lean({ virtuals: true });
  }
}
