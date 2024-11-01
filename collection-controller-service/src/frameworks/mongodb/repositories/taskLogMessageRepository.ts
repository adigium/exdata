import { TaskLogMessage } from '@entities';
import { IRepository } from '../IRepository';
import { TaskLogMessageModel } from '../models';

export class TaskLogMessageRepository implements IRepository<TaskLogMessage> {
  async create(taskLogMessageData: TaskLogMessage): Promise<TaskLogMessage> {
    return new TaskLogMessageModel(taskLogMessageData).save();
  }

  async findById(id: string): Promise<TaskLogMessage | null> {
    return TaskLogMessageModel.findById(id).lean({ virtuals: true });
  }

  async findAll(): Promise<TaskLogMessage[]> {
    return TaskLogMessageModel.find().lean({ virtuals: true });
  }

  async update(id: string, taskLogMessageData: Partial<TaskLogMessage>): Promise<TaskLogMessage | null> {
    return TaskLogMessageModel.findByIdAndUpdate(id, taskLogMessageData, {
      new: true,
    }).lean({ virtuals: true });
  }

  async delete(id: string): Promise<TaskLogMessage | null> {
    return TaskLogMessageModel.findByIdAndDelete(id).lean({ virtuals: true });
  }
}
