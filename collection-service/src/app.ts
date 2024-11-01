import { applicationContainer, DI } from '@di';
import { ApplicationService } from '@services';

export const start = async () => {
  const application = applicationContainer.get<ApplicationService>(DI.ApplicationService);

  await application.initialize();

  await application.start();
};
