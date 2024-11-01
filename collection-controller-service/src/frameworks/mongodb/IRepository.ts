export interface IRepository<T> {
  create(item: T): Promise<T>;
  delete(id: string): Promise<T | null | undefined>;
  findAll(): Promise<T[]>;
  findById(id: string): Promise<T | null | undefined>;
  update(id: string, item: T): Promise<T | null | undefined>;
}
