export interface PipelineStep<Input, Output> {
  execute(input: Input): Promise<Output>;
}

export type PipeIn<T extends PipelineStep<any, any>> =
  T extends PipelineStep<infer Input, any> ? Input : never;
export type PipeOut<T extends PipelineStep<any, any>> =
  T extends PipelineStep<any, infer Output> ? Output : never;
