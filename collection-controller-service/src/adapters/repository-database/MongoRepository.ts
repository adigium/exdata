import mongoose from 'mongoose';
import {
  CollectorServiceInstance,
  Exchange,
  TaskControlMessage,
  TaskDetails,
  TaskLogMessage,
  TaskType,
} from '@entities';
import { DatabaseRepository } from '@repositories';
import {
  CollectorServiceInstanceRepository,
  connectDatabase,
  disconnectDatabase,
  ExchangeRepository,
  TaskControlMessageRepository,
  TaskDetailsRepository,
  TaskLogMessageRepository,
} from '@frameworks/mongodb';

export class MongoRepository implements DatabaseRepository {
  private uri: string;

  private collectorServiceInstanceRepository: CollectorServiceInstanceRepository;
  private exchangeRepository: ExchangeRepository;
  private taskControlMessageRepository: TaskControlMessageRepository;
  private taskDetailsRepository: TaskDetailsRepository;
  private taskLogMessageRepository: TaskLogMessageRepository;

  constructor(input: { uri: string }) {
    const { uri } = input;

    this.uri = uri;

    this.collectorServiceInstanceRepository = new CollectorServiceInstanceRepository();
    this.exchangeRepository = new ExchangeRepository();
    this.taskControlMessageRepository = new TaskControlMessageRepository();
    this.taskDetailsRepository = new TaskDetailsRepository();
    this.taskLogMessageRepository = new TaskLogMessageRepository();
  }

  async createTaskControlMessage(taskControl: TaskControlMessage): Promise<Failable> {
    try {
      await this.taskControlMessageRepository.create(taskControl);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async createTaskLogMessage(taskLog: TaskLogMessage): Promise<Failable> {
    try {
      await this.taskLogMessageRepository.create(taskLog);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async getCollectorServiceInstance(id: string): Promise<Failable<CollectorServiceInstance>> {
    try {
      const data = await this.collectorServiceInstanceRepository.findById(id);

      return { success: true, data };
    } catch (error: any) {
      return { success: false, data: null, error: error.message };
    }
  }

  async getCollectorServiceInstances(): Promise<Failable<CollectorServiceInstance[]>> {
    try {
      const data = await this.collectorServiceInstanceRepository.findAll();

      return { success: true, data };
    } catch (error: any) {
      return { success: false, data: null, error: error.message };
    }
  }

  async createCollectorServiceInstance(instance: CollectorServiceInstance): Promise<Failable> {
    try {
      await this.collectorServiceInstanceRepository.create(instance);

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async updateCollectorServiceInstance(
    id: string,
    instance: Partial<CollectorServiceInstance>,
  ): Promise<Failable> {
    try {
      await this.collectorServiceInstanceRepository.update(id, instance);

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async deleteCollectorServiceInstance(id: string): Promise<Failable> {
    try {
      await this.collectorServiceInstanceRepository.delete(id);

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async getTasksDetails(): Promise<Failable<TaskDetails[]>> {
    try {
      const data = await this.taskDetailsRepository.findAll();

      return { success: true, data };
    } catch (error: any) {
      return { success: false, data: null, error: error.message };
    }
  }

  async getTaskDetails(task: TaskType): Promise<Failable<TaskDetails>> {
    try {
      const data = await this.taskDetailsRepository.findById(task);

      return { success: true, data };
    } catch (error: any) {
      return { success: false, data: null, error: error.message };
    }
  }

  async getExchanges(): Promise<Failable<Exchange[]>> {
    try {
      const data = await this.exchangeRepository.findAll();

      return { success: true, data };
    } catch (error: any) {
      return { success: false, data: null, error: error.message };
    }
  }

  async getExchange(id: string): Promise<Failable<Exchange>> {
    try {
      const data = await this.exchangeRepository.findById(id);

      return { success: true, data };
    } catch (error: any) {
      return { success: false, data: null, error: error.message };
    }
  }

  async connect(): Promise<Failable> {
    return { success: await connectDatabase(this.uri) };
  }

  async disconnect(): Promise<Failable> {
    return { success: await disconnectDatabase() };
  }

  async isHealthy(): Promise<Failable<boolean>> {
    const data = mongoose.connection.readyState === 1;

    return { success: true, data };
  }
}
