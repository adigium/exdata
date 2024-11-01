import { PipelineStep } from './PipelineStep';

export class Pipeline<Input, Output> {
  private steps: PipelineStep<any, any>[];

  constructor(steps: PipelineStep<any, any>[]) {
    this.steps = steps;
  }

  async execute(input: Input): Promise<Output> {
    let result: any = input;

    for (const step of this.steps) {
      result = await step.execute(result);
    }

    return result;
  }
}
