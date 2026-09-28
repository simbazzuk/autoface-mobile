import { NativeModule, requireNativeModule } from 'expo';

declare class AutofaceTestModule extends NativeModule<{}> {}

export default requireNativeModule<AutofaceTestModule>('AutofaceTest');
