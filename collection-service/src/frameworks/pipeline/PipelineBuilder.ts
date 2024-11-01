import { PipelineActualBuilder } from './PipelineActualBuilder';
import { PipelineStep } from './PipelineStep';

export class PipelineBuilder {
  addStep<FirstInput, Output>(
    step: PipelineStep<FirstInput, Output>,
  ): PipelineActualBuilder<FirstInput, Output> {
    return new PipelineActualBuilder<FirstInput, Output>([step]);
  }
}
