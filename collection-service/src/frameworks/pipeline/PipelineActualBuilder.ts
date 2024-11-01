import { Pipeline } from './Pipeline';
import { PipelineStep } from './PipelineStep';

type IsAssignable<T, U> = T extends U ? (U extends T ? true : false) : false;

type StepError = 'The input type of this step is not assignable to the output type of the previous one';

export class PipelineActualBuilder<Input, Output> {
  private steps: PipelineStep<any, any>[] = [];

  constructor(steps: PipelineStep<any, any>[] = []) {
    this.steps = steps;
  }

  addStep<NextInput, NextOutput>(
    step: PipelineStep<NextInput, NextOutput>,
  ): IsAssignable<Output, NextInput> extends true ? PipelineActualBuilder<Input, NextOutput> : StepError {
    this.steps.push(step);
    return new PipelineActualBuilder<Input, NextOutput>([...this.steps]) as any;
  }

  build(): Pipeline<Input, Output> {
    return new Pipeline<Input, Output>(this.steps);
  }
}
