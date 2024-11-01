/* eslint-disable func-names */
export const lazy = (): MethodDecorator =>
  function (target: Object, propertyKey: string | symbol, descriptor: PropertyDescriptor): void {
    const originalMethod = descriptor.get;

    if (!originalMethod) {
      throw new Error('LazyProperty decorator can only be applied to getters.');
    }

    Object.defineProperty(target, propertyKey, {
      configurable: true,
      enumerable: true,
      get() {
        const value = originalMethod.apply(this);
        Object.defineProperty(this, propertyKey, {
          value,
          writable: true,
          configurable: true,
          enumerable: true,
        });
        return value;
      },
    });
  };
