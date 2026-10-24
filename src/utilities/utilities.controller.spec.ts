import 'reflect-metadata';
import { UtilitiesController } from './utilities.controller';
import { UtilitiesService } from './utilities.service';

describe('UtilitiesController', () => {
  it('should not require auth guards or roles for image upload', () => {
    const controller = new UtilitiesController({} as UtilitiesService);

    const guards = Reflect.getMetadata(
      'guards',
      UtilitiesController.prototype.uploadImage,
    );
    const roles = Reflect.getMetadata(
      'roles',
      UtilitiesController.prototype.uploadImage,
    );

    expect(guards).toBeUndefined();
    expect(roles).toBeUndefined();
  });
});
