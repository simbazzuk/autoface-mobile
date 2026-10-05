import {Platform} from 'react-native';
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesPackage,
} from 'react-native-purchases';

const IOS_API_KEY=process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;

export const AUTOFACE_PLUS_ENTITLEMENT='autoface_plus';

let configured=false;
let identifiedUid:string|null=null;

export async function configurePurchases(uid?:string|null){
  if(Platform.OS!=='ios')return;

  if(!IOS_API_KEY){
    throw new Error('RevenueCat iOS API key is not configured.');
  }

  if(!configured){
    if(__DEV__){
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }

    Purchases.configure({
      apiKey:IOS_API_KEY,
    });

    configured=true;
  }

  if(uid&&identifiedUid!==uid){
    await Purchases.logIn(uid);
    identifiedUid=uid;
  }
}

export async function getAutoFacePlusPackage():Promise<PurchasesPackage>{
  await configurePurchases();

  const offerings=await Purchases.getOfferings();
  const offering=offerings.current??offerings.all.default;

  if(!offering){
    throw new Error('AutoFace Plus offering is unavailable.');
  }

  const monthly=
    offering.monthly ??
    offering.availablePackages.find(
      item=>item.identifier==='$rc_monthly'
    );

  if(!monthly){
    throw new Error('AutoFace Plus monthly subscription is unavailable.');
  }

  return monthly;
}

export function hasAutoFacePlus(customerInfo:CustomerInfo){
  return Boolean(
    customerInfo.entitlements.active[AUTOFACE_PLUS_ENTITLEMENT]
  );
}

export async function purchaseAutoFacePlus(uid:string){
  await configurePurchases(uid);

  const pkg=await getAutoFacePlusPackage();
  const result=await Purchases.purchasePackage(pkg);

  return {
    customerInfo:result.customerInfo,
    active:hasAutoFacePlus(result.customerInfo),
    package:pkg,
  };
}

export async function restoreAutoFacePurchases(uid:string){
  await configurePurchases(uid);

  const customerInfo=await Purchases.restorePurchases();

  return {
    customerInfo,
    active:hasAutoFacePlus(customerInfo),
  };
}

export async function getAutoFaceCustomerInfo(uid:string){
  await configurePurchases(uid);
  return Purchases.getCustomerInfo();
}
