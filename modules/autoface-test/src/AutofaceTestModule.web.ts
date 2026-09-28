import { registerWebModule, NativeModule } from 'expo';

class AutofaceTestModule extends NativeModule<{}> {}

export default registerWebModule(AutofaceTestModule, 'AutofaceTestModule');
